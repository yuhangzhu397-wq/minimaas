import { randomUUID } from "node:crypto";
import type { ChatCompletionRequest, Usage } from "@minimaas/contracts";
import type { ModelPricing, RoutedModel } from "./adapter.js";
import type { AuthService, Principal } from "./auth.js";
import { ModelAccessDeniedError } from "./auth.js";
import type { MeteringService } from "./metering.js";
import type { QuotaDecision, QuotaManager, QuotaReservation } from "./quota.js";
import type { RateLimitDecision, RateLimiter } from "./rate-limit.js";
import type { ModelRouter } from "./router.js";

export interface PreparedRequest {
  principal: Principal;
  routedModel: RoutedModel;
  startedAt: number;
  rateLimit: RateLimitDecision;
  quota: QuotaDecision;
  quotaReservation: QuotaReservation;
  estimatedPromptTokens: number;
}

function costOf(
  pricing: ModelPricing,
  promptTokens: number,
  completionTokens: number,
) {
  return (
    (promptTokens * pricing.inputCnyPerMillionTokens +
      completionTokens * pricing.outputCnyPerMillionTokens) /
    1_000_000
  );
}

export class GatewayPipeline {
  constructor(
    private readonly auth: AuthService,
    private readonly rateLimiter: RateLimiter,
    private readonly quotaManager: QuotaManager,
    private readonly router: ModelRouter,
    readonly metering: MeteringService,
  ) {}

  async prepare(
    request: ChatCompletionRequest,
    authorization?: string,
    reservationId: string = randomUUID(),
  ): Promise<PreparedRequest> {
    const principal = await this.auth.authenticate(authorization);
    if (
      !principal.allowedModels.includes("*") &&
      !principal.allowedModels.includes(request.model)
    ) {
      throw new ModelAccessDeniedError(request.model);
    }
    const routedModel = await this.router.route(request.model);
    const promptTokens = request.messages.reduce(
      (sum, message) => sum + Math.ceil(message.content.length / 3),
      0,
    );
    const completionTokens = request.max_tokens ?? 512;
    const estimatedTokens = promptTokens + completionTokens;
    const decision = await this.rateLimiter.check(principal, estimatedTokens);
    if (!decision.allowed) {
      throw new RateLimitError(decision);
    }
    const quota = await this.quotaManager.reserve(
      principal,
      {
        tokens: estimatedTokens,
        costCny: costOf(routedModel.pricing, promptTokens, completionTokens),
      },
      reservationId,
    );
    if (!quota.decision.allowed || !quota.reservation) {
      throw new QuotaExceededError(quota.decision);
    }
    return {
      principal,
      routedModel,
      rateLimit: decision,
      quota: quota.decision,
      quotaReservation: quota.reservation,
      estimatedPromptTokens: promptTokens,
      startedAt: Date.now(),
    };
  }

  async settle(prepared: PreparedRequest, usage: Usage) {
    await this.quotaManager.settle(prepared.quotaReservation, {
      tokens: usage.total_tokens,
      costCny: costOf(
        prepared.routedModel.pricing,
        usage.prompt_tokens,
        usage.completion_tokens,
      ),
    });
  }

  async release(prepared: PreparedRequest) {
    await this.quotaManager.settle(prepared.quotaReservation, {
      tokens: 0,
      costCny: 0,
    });
  }
}

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(readonly decision: RateLimitDecision) {
    super("Rate limit exceeded");
    this.retryAfterSeconds = decision.retryAfterSeconds ?? 1;
  }
}

export class QuotaExceededError extends Error {
  readonly retryAfterSeconds: number;

  constructor(readonly decision: QuotaDecision) {
    super(
      decision.reason === "monthly_budget"
        ? "Monthly budget exceeded"
        : "Daily token quota exceeded",
    );
    this.retryAfterSeconds = decision.retryAfterSeconds ?? 1;
  }
}
