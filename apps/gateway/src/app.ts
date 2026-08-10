import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import type { GatewayErrorResponse } from "@minimaas/contracts";
import Fastify from "fastify";
import { createClient } from "redis";
import { ZodError } from "zod";
import { type GatewayConfig, loadConfig } from "./config.js";
import {
  AuthenticationError,
  AuthenticationServiceUnavailableError,
  DevelopmentAuthService,
  type AuthService,
  ModelAccessDeniedError,
  SnapshotAuthService,
} from "./modules/auth.js";
import { ProviderError } from "./modules/errors.js";
import { InMemoryMeteringService } from "./modules/metering.js";
import { MockAdapter } from "./modules/mock-adapter.js";
import { OllamaAdapter } from "./modules/ollama-adapter.js";
import {
  GatewayPipeline,
  QuotaExceededError,
  RateLimitError,
} from "./modules/pipeline.js";
import {
  InMemoryQuotaManager,
  type QuotaManager,
  quotaHeaders,
  RedisQuotaManager,
} from "./modules/quota.js";
import {
  InMemoryRateLimiter,
  type RateLimiter,
  RedisRateLimiter,
  rateLimitHeaders,
} from "./modules/rate-limit.js";
import { StaticModelRouter, UnknownModelError } from "./modules/router.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerModelRoutes } from "./routes/models.js";

export interface BuildGatewayOptions {
  config?: Partial<GatewayConfig>;
  ollamaFetch?: typeof fetch;
  authFetch?: typeof fetch;
  authService?: AuthService;
  rateLimiter?: RateLimiter;
  quotaManager?: QuotaManager;
}

export async function buildGateway(options: BuildGatewayOptions = {}) {
  const config = { ...loadConfig(), ...options.config };
  const app = Fastify({
    logger: { level: config.logLevel },
    genReqId: (request) =>
      request.headers["x-request-id"]?.toString() ?? randomUUID(),
  });
  await app.register(cors, {
    origin: true,
    exposedHeaders: [
      "x-request-id",
      "x-ratelimit-limit-requests",
      "x-ratelimit-remaining-requests",
      "x-ratelimit-limit-tokens",
      "x-ratelimit-remaining-tokens",
      "x-quota-limit-tokens-daily",
      "x-quota-remaining-tokens-daily",
      "x-budget-limit-cny-monthly",
      "x-budget-remaining-cny-monthly",
    ],
  });

  const router = new StaticModelRouter(
    new MockAdapter(),
    new OllamaAdapter({
      baseUrl: config.ollamaBaseUrl,
      model: config.ollamaModel,
      timeoutMs: config.providerTimeoutMs,
      fetch: options.ollamaFetch,
    }),
    config.defaultProvider,
    config.ollamaModel,
  );
  const authService =
    options.authService ??
    (config.authMode === "development"
      ? new DevelopmentAuthService()
      : new SnapshotAuthService(
          `${config.controlPlaneUrl}/internal/gateway/auth-snapshot`,
          config.authSnapshotTtlMs,
          options.authFetch,
        ));
  let rateLimiter = options.rateLimiter;
  let quotaManager = options.quotaManager;
  const needsRedis =
    (!rateLimiter && config.rateLimitBackend === "redis") ||
    (!quotaManager && config.quotaBackend === "redis");
  const redis = needsRedis ? createClient({ url: config.redisUrl }) : undefined;
  if (redis) {
    redis.on("error", (error) =>
      app.log.error({ error }, "redis client error"),
    );
    await redis.connect();
    app.addHook("onClose", async () => {
      if (redis.isOpen) await redis.quit();
    });
  }
  if (!rateLimiter && config.rateLimitBackend === "redis" && redis) {
    rateLimiter = new RedisRateLimiter(redis);
  }
  if (!quotaManager && config.quotaBackend === "redis" && redis) {
    quotaManager = new RedisQuotaManager(redis);
  }
  rateLimiter ??= new InMemoryRateLimiter();
  quotaManager ??= new InMemoryQuotaManager();
  const pipeline = new GatewayPipeline(
    authService,
    rateLimiter,
    quotaManager,
    router,
    new InMemoryMeteringService(),
  );

  await registerHealthRoutes(app, router);
  await registerModelRoutes(app, router);
  await registerChatRoutes(app, pipeline);

  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;
    let status = 500;
    let code = "internal_error";
    let type = "gateway_error";

    if (error instanceof ZodError) {
      status = 400;
      code = "invalid_request";
      type = "invalid_request_error";
    } else if (error instanceof AuthenticationError) {
      status = 401;
      code = "invalid_api_key";
      type = "authentication_error";
      reply.header("www-authenticate", "Bearer");
    } else if (error instanceof AuthenticationServiceUnavailableError) {
      status = 503;
      code = "authentication_service_unavailable";
      type = "gateway_error";
      reply.header("retry-after", 1);
    } else if (error instanceof ModelAccessDeniedError) {
      status = 403;
      code = "model_access_denied";
      type = "permission_error";
    } else if (error instanceof UnknownModelError) {
      status = 404;
      code = "model_not_found";
      type = "invalid_request_error";
    } else if (error instanceof RateLimitError) {
      status = 429;
      code = "rate_limit_exceeded";
      type = "rate_limit_error";
      reply.header("retry-after", error.retryAfterSeconds);
      for (const [name, value] of Object.entries(
        rateLimitHeaders(error.decision),
      )) {
        reply.header(name, value);
      }
    } else if (error instanceof QuotaExceededError) {
      status = 429;
      code = "quota_exceeded";
      type = "quota_error";
      reply.header("retry-after", error.retryAfterSeconds);
      for (const [name, value] of Object.entries(
        quotaHeaders(error.decision),
      )) {
        reply.header(name, value);
      }
    } else if (error instanceof ProviderError) {
      status = error.statusCode;
      code = error.code;
      type = "provider_error";
      if (error.retryable) reply.header("retry-after", 1);
    }

    const message =
      error instanceof Error ? error.message : "Unknown gateway error";
    const body: GatewayErrorResponse = {
      error: { message, type, code, request_id: requestId },
    };
    return reply.status(status).send(body);
  });

  return app;
}
