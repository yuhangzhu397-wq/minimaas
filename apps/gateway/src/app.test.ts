import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildGateway as buildGatewayApp } from "./app.js";
import { DevelopmentAuthService } from "./modules/auth.js";
import { InMemoryRateLimiter } from "./modules/rate-limit.js";

type BuildGatewayOptions = Parameters<typeof buildGatewayApp>[0];
const buildGateway = (options: BuildGatewayOptions = {}) =>
  buildGatewayApp({
    ...options,
    authService: options.authService ?? new DevelopmentAuthService(),
  });

const apps: Awaited<ReturnType<typeof buildGatewayApp>>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("MiniMaaS gateway", () => {
  it("reports readiness", async () => {
    const app = await buildGateway();
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ready" });
  });

  it("lists virtual models", async () => {
    const app = await buildGateway();
    apps.push(app);
    const response = await app.inject({ method: "GET", url: "/v1/models" });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "smart-chat" })]),
    );
  });

  it("returns an OpenAI-shaped completion", async () => {
    const app = await buildGateway();
    apps.push(app);
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "smart-chat",
        messages: [{ role: "user", content: "MaaS 是什么？" }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      object: "chat.completion",
      model: "smart-chat",
    });
    expect(response.json().usage.total_tokens).toBeGreaterThan(0);
  });

  it("authenticates API keys and enforces tenant model access", async () => {
    const secret = "mm_live_gateway_integration_test";
    const authFetch = async () =>
      new Response(
        JSON.stringify({
          version: 1,
          generatedAt: new Date().toISOString(),
          keys: [
            {
              keyId: "key-test",
              keyHash: createHash("sha256").update(secret).digest("hex"),
              tenantId: "tenant-test",
              environment: "development",
              allowedModels: ["smart-chat"],
              rpmLimit: 60,
              tpmLimit: 100000,
              dailyTokenQuota: 2000000,
              monthlyBudgetCny: 3000,
            },
          ],
        }),
      );
    const app = await buildGatewayApp({ authFetch });
    apps.push(app);

    const missing = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "smart-chat",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    expect(missing.statusCode).toBe(401);
    expect(missing.json().error.code).toBe("invalid_api_key");

    const allowed = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${secret}` },
      payload: {
        model: "smart-chat",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.headers["x-ratelimit-limit-requests"]).toBe("60");

    const denied = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${secret}` },
      payload: {
        model: "ollama-chat",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error.code).toBe("model_access_denied");
  });

  it("returns 429 and limit headers when a tenant exceeds RPM", async () => {
    const app = await buildGatewayApp({
      authService: {
        authenticate: async () => ({
          tenantId: "tenant-limited",
          apiKeyId: "key-limited",
          environment: "development",
          allowedModels: ["smart-chat"],
          rpmLimit: 1,
          tpmLimit: 10000,
          dailyTokenQuota: 2000000,
          monthlyBudgetCny: 3000,
        }),
      },
      rateLimiter: new InMemoryRateLimiter(() => 30_000),
    });
    apps.push(app);
    const request = {
      method: "POST" as const,
      url: "/v1/chat/completions",
      payload: {
        model: "smart-chat",
        messages: [{ role: "user", content: "hello" }],
      },
    };

    const first = await app.inject(request);
    const limited = await app.inject(request);
    expect(first.statusCode).toBe(200);
    expect(first.headers["x-ratelimit-remaining-requests"]).toBe("0");
    expect(limited.statusCode).toBe(429);
    expect(limited.headers["retry-after"]).toBe("30");
    expect(limited.json().error.code).toBe("rate_limit_exceeded");
  });

  it("rejects requests that would exceed the daily token quota", async () => {
    const app = await buildGatewayApp({
      authService: {
        authenticate: async () => ({
          tenantId: "tenant-daily-quota",
          apiKeyId: "key-daily-quota",
          environment: "development",
          allowedModels: ["smart-chat"],
          rpmLimit: 60,
          tpmLimit: 10000,
          dailyTokenQuota: 100,
          monthlyBudgetCny: 100,
        }),
      },
    });
    apps.push(app);
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "smart-chat",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    expect(response.statusCode).toBe(429);
    expect(response.json().error).toMatchObject({
      code: "quota_exceeded",
      type: "quota_error",
      message: "Daily token quota exceeded",
    });
    expect(response.headers["x-quota-limit-tokens-daily"]).toBe("100");
    expect(response.headers["x-quota-remaining-tokens-daily"]).toBe("100");
  });

  it("rejects requests whose reserved model cost exceeds the monthly budget", async () => {
    const app = await buildGatewayApp({
      authService: {
        authenticate: async () => ({
          tenantId: "tenant-budget-quota",
          apiKeyId: "key-budget-quota",
          environment: "development",
          allowedModels: ["smart-chat"],
          rpmLimit: 60,
          tpmLimit: 10000,
          dailyTokenQuota: 10000,
          monthlyBudgetCny: 0.001,
        }),
      },
    });
    apps.push(app);
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "smart-chat",
        messages: [{ role: "user", content: "hello" }],
      },
    });
    expect(response.statusCode).toBe(429);
    expect(response.json().error).toMatchObject({
      code: "quota_exceeded",
      message: "Monthly budget exceeded",
    });
    expect(response.headers["x-budget-limit-cny-monthly"]).toBe("0.001");
  });

  it("normalizes unknown-model errors", async () => {
    const app = await buildGateway();
    apps.push(app);
    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "missing-model",
        messages: [{ role: "user", content: "hello" }],
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("model_not_found");
  });

  it("routes ollama-chat through the Ollama adapter", async () => {
    const ollamaFetch = async (input: string | URL | Request) => {
      const url = input.toString();
      if (url.endsWith("/api/tags")) {
        return new Response(
          JSON.stringify({ models: [{ name: "qwen-test" }] }),
        );
      }
      return new Response(
        JSON.stringify({
          message: { role: "assistant", content: "来自本地 Ollama" },
          done: true,
          done_reason: "stop",
          prompt_eval_count: 6,
          eval_count: 4,
        }),
      );
    };
    const app = await buildGateway({
      config: { ollamaModel: "qwen-test" },
      ollamaFetch,
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "ollama-chat",
        messages: [{ role: "user", content: "hello" }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      model: "ollama-chat",
      choices: [{ message: { content: "来自本地 Ollama" } }],
      usage: { total_tokens: 10, estimated: false },
    });
  });

  it("marks the gateway not ready when the configured default provider is down", async () => {
    const app = await buildGateway({
      config: { defaultProvider: "ollama", ollamaModel: "qwen-test" },
      ollamaFetch: async () => {
        throw new TypeError("connection refused");
      },
    });
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/health/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: "not_ready",
      defaultProvider: "ollama",
      checks: { providers: { mock: "up", ollama: "down" } },
    });
  });

  it("normalizes upstream failures", async () => {
    const app = await buildGateway({
      ollamaFetch: async () => new Response("model failed", { status: 500 }),
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      payload: {
        model: "ollama-chat",
        messages: [{ role: "user", content: "hello" }],
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().error).toMatchObject({
      type: "provider_error",
      code: "provider_rejected_request",
    });
  });

  it("translates an Ollama NDJSON stream into OpenAI-compatible SSE", async () => {
    const ollamaFetch = async (input: string | URL | Request) => {
      if (input.toString().endsWith("/api/tags")) {
        return new Response(
          JSON.stringify({ models: [{ name: "qwen-test" }] }),
        );
      }
      const body = [
        { message: { content: "统一" }, done: false },
        { message: { content: "接入" }, done: false },
        {
          message: { content: "" },
          done: true,
          done_reason: "stop",
          prompt_eval_count: 3,
          eval_count: 2,
        },
      ]
        .map((item) => JSON.stringify(item))
        .join("\n");
      return new Response(`${body}\n`, {
        headers: { "content-type": "application/x-ndjson" },
      });
    };
    const app = await buildGateway({
      config: { ollamaModel: "qwen-test" },
      ollamaFetch,
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: { origin: "http://console.test" },
      payload: {
        model: "ollama-chat",
        stream: true,
        messages: [{ role: "user", content: "hello" }],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://console.test",
    );
    expect(response.body).toContain('"content":"统一"');
    expect(response.body).toContain('"content":"接入"');
    expect(response.body).toContain('"finish_reason":"stop"');
    expect(response.body).toContain("data: [DONE]");
  });
});
