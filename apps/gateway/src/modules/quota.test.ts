import { describe, expect, it } from "vitest";
import type { Principal } from "./auth.js";
import { InMemoryQuotaManager, RedisQuotaManager } from "./quota.js";
import type { RedisEvalClient } from "./rate-limit.js";

const principal: Principal = {
  tenantId: "tenant-quota-test",
  apiKeyId: "key-quota-test",
  environment: "development",
  allowedModels: ["smart-chat"],
  rpmLimit: 60,
  tpmLimit: 100_000,
  dailyTokenQuota: 700,
  monthlyBudgetCny: 10,
};

describe("quota management", () => {
  it("reserves estimated usage and refunds the difference after settlement", async () => {
    const quota = new InMemoryQuotaManager(() => Date.UTC(2026, 6, 21, 12));
    const first = await quota.reserve(
      principal,
      { tokens: 600, costCny: 1 },
      "request-1",
    );
    expect(first.decision).toMatchObject({
      allowed: true,
      dailyTokenRemaining: 100,
      monthlyBudgetRemainingCny: 9,
    });
    await quota.settle(first.reservation!, { tokens: 100, costCny: 0.25 });

    const second = await quota.reserve(
      principal,
      { tokens: 600, costCny: 1 },
      "request-2",
    );
    expect(second.decision).toMatchObject({
      allowed: true,
      dailyTokenRemaining: 0,
      monthlyBudgetRemainingCny: 8.75,
    });
  });

  it("rejects daily token and monthly budget overages without consuming quota", async () => {
    const quota = new InMemoryQuotaManager(() => Date.UTC(2026, 6, 21, 12));
    const daily = await quota.reserve(
      principal,
      { tokens: 701, costCny: 0 },
      "daily-over",
    );
    expect(daily.decision).toMatchObject({
      allowed: false,
      reason: "daily_token_quota",
      dailyTokenRemaining: 700,
    });

    const budget = await quota.reserve(
      { ...principal, dailyTokenQuota: 10_000, monthlyBudgetCny: 0.5 },
      { tokens: 100, costCny: 0.51 },
      "budget-over",
    );
    expect(budget.decision).toMatchObject({
      allowed: false,
      reason: "monthly_budget",
      monthlyBudgetRemainingCny: 0.5,
    });
  });

  it("maps the Redis Lua result and period keys into a quota decision", async () => {
    let received: { keys: string[]; arguments: string[] } | undefined;
    const redis: RedisEvalClient = {
      eval: async (_script, options) => {
        received = options;
        return [0, 1, 123, 9_500_000];
      },
    };
    const quota = new RedisQuotaManager(redis, () => Date.UTC(2026, 6, 21, 12));
    const result = await quota.reserve(
      principal,
      { tokens: 800, costCny: 0.5 },
      "redis-request",
    );
    expect(result.decision).toMatchObject({
      allowed: false,
      reason: "daily_token_quota",
      dailyTokenRemaining: 123,
      monthlyBudgetRemainingCny: 9.5,
    });
    expect(received?.keys).toEqual(
      expect.arrayContaining([
        expect.stringContaining("day:2026-07-21:tokens"),
        expect.stringContaining("month:2026-07:cost"),
        expect.stringContaining("reservation:redis-request"),
      ]),
    );
    expect(received?.arguments.slice(0, 4)).toEqual([
      "700",
      "10000000",
      "800",
      "500000",
    ]);
  });
});
