import { describe, expect, it } from "vitest";
import type { Principal } from "./auth.js";
import {
  InMemoryRateLimiter,
  type RedisEvalClient,
  RedisRateLimiter,
} from "./rate-limit.js";

const principal: Principal = {
  tenantId: "tenant-test",
  apiKeyId: "key-test",
  environment: "development",
  allowedModels: ["smart-chat"],
  rpmLimit: 2,
  tpmLimit: 100,
  dailyTokenQuota: 10_000,
  monthlyBudgetCny: 100,
};

describe("rate limiting", () => {
  it("enforces RPM and resets at the next fixed window", async () => {
    let now = 15_000;
    const limiter = new InMemoryRateLimiter(() => now);
    expect((await limiter.check(principal, 10)).remainingRequests).toBe(1);
    expect((await limiter.check(principal, 10)).remainingRequests).toBe(0);
    const denied = await limiter.check(principal, 10);
    expect(denied).toMatchObject({ allowed: false, retryAfterSeconds: 45 });

    now = 60_001;
    expect(await limiter.check(principal, 10)).toMatchObject({
      allowed: true,
      remainingRequests: 1,
    });
  });

  it("rejects a request that would exceed TPM without consuming tokens", async () => {
    const limiter = new InMemoryRateLimiter(() => 1_000);
    expect((await limiter.check(principal, 60)).remainingTokens).toBe(40);
    const denied = await limiter.check(principal, 50);
    expect(denied).toMatchObject({ allowed: false, remainingTokens: 40 });
  });

  it("maps the atomic Redis Lua result into a decision", async () => {
    let received: { keys: string[]; arguments: string[] } | undefined;
    const redis: RedisEvalClient = {
      eval: async (_script, options) => {
        received = options;
        return [1, 1, 75];
      },
    };
    const limiter = new RedisRateLimiter(redis, () => 1_000);
    const decision = await limiter.check(principal, 25);
    expect(decision).toMatchObject({
      allowed: true,
      remainingRequests: 1,
      remainingTokens: 75,
    });
    expect(received?.keys).toHaveLength(2);
    expect(received?.arguments.slice(0, 3)).toEqual(["2", "100", "25"]);
  });
});
