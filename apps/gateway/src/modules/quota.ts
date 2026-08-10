import type { Principal } from "./auth.js";
import type { RedisEvalClient } from "./rate-limit.js";

const CNY_MICROS = 1_000_000;

export interface QuotaUsage {
  tokens: number;
  costCny: number;
}

export interface QuotaDecision {
  allowed: boolean;
  reason?: "daily_token_quota" | "monthly_budget";
  dailyTokenLimit: number;
  dailyTokenRemaining: number;
  monthlyBudgetCny: number;
  monthlyBudgetRemainingCny: number;
  retryAfterSeconds?: number;
}

export interface QuotaReservation {
  id: string;
  tenantId: string;
  dayId: string;
  monthId: string;
  dayExpiresAt: number;
  monthExpiresAt: number;
  reservedTokens: number;
  reservedCostMicros: number;
  settled?: boolean;
}

export interface QuotaManager {
  reserve(
    principal: Principal,
    estimated: QuotaUsage,
    reservationId: string,
  ): Promise<{ decision: QuotaDecision; reservation?: QuotaReservation }>;
  settle(reservation: QuotaReservation, actual: QuotaUsage): Promise<void>;
}

interface Periods {
  dayId: string;
  monthId: string;
  dayExpiresAt: number;
  monthExpiresAt: number;
}

function periods(now: number): Periods {
  const date = new Date(now);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return {
    dayId: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    monthId: `${year}-${String(month + 1).padStart(2, "0")}`,
    dayExpiresAt: Date.UTC(year, month, day + 1),
    monthExpiresAt: Date.UTC(year, month + 1, 1),
  };
}

const toMicros = (costCny: number) =>
  Math.max(0, Math.round(costCny * CNY_MICROS));
const fromMicros = (micros: number) => micros / CNY_MICROS;

function decision(
  principal: Principal,
  dailyTokens: number,
  monthlyCostMicros: number,
  period: Periods,
  now: number,
): QuotaDecision {
  const budgetLimitMicros = toMicros(principal.monthlyBudgetCny);
  const dailyExceeded = dailyTokens > principal.dailyTokenQuota;
  const budgetExceeded = monthlyCostMicros > budgetLimitMicros;
  const reason = dailyExceeded
    ? "daily_token_quota"
    : budgetExceeded
      ? "monthly_budget"
      : undefined;
  const retryAt = dailyExceeded ? period.dayExpiresAt : period.monthExpiresAt;
  return {
    allowed: !reason,
    reason,
    dailyTokenLimit: principal.dailyTokenQuota,
    dailyTokenRemaining: Math.max(0, principal.dailyTokenQuota - dailyTokens),
    monthlyBudgetCny: principal.monthlyBudgetCny,
    monthlyBudgetRemainingCny: fromMicros(
      Math.max(0, budgetLimitMicros - monthlyCostMicros),
    ),
    retryAfterSeconds: reason
      ? Math.max(1, Math.ceil((retryAt - now) / 1_000))
      : undefined,
  };
}

export function quotaHeaders(value: QuotaDecision) {
  return {
    "x-quota-limit-tokens-daily": String(value.dailyTokenLimit),
    "x-quota-remaining-tokens-daily": String(value.dailyTokenRemaining),
    "x-budget-limit-cny-monthly": String(value.monthlyBudgetCny),
    "x-budget-remaining-cny-monthly":
      value.monthlyBudgetRemainingCny.toFixed(6),
  };
}

export class InMemoryQuotaManager implements QuotaManager {
  private readonly dailyTokens = new Map<string, number>();
  private readonly monthlyCostMicros = new Map<string, number>();

  constructor(private readonly now: () => number = Date.now) {}

  async reserve(
    principal: Principal,
    estimated: QuotaUsage,
    reservationId: string,
  ) {
    const now = this.now();
    const period = periods(now);
    const dailyKey = `${principal.tenantId}:${period.dayId}`;
    const monthlyKey = `${principal.tenantId}:${period.monthId}`;
    const currentTokens = this.dailyTokens.get(dailyKey) ?? 0;
    const currentCost = this.monthlyCostMicros.get(monthlyKey) ?? 0;
    const reservedTokens = Math.max(0, Math.ceil(estimated.tokens));
    const reservedCostMicros = toMicros(estimated.costCny);
    const nextTokens = currentTokens + reservedTokens;
    const nextCost = currentCost + reservedCostMicros;
    const quotaDecision = decision(
      principal,
      nextTokens,
      nextCost,
      period,
      now,
    );
    if (!quotaDecision.allowed) {
      return {
        decision: {
          ...quotaDecision,
          dailyTokenRemaining: Math.max(
            0,
            principal.dailyTokenQuota - currentTokens,
          ),
          monthlyBudgetRemainingCny: fromMicros(
            Math.max(0, toMicros(principal.monthlyBudgetCny) - currentCost),
          ),
        },
      };
    }
    this.dailyTokens.set(dailyKey, nextTokens);
    this.monthlyCostMicros.set(monthlyKey, nextCost);
    if (this.dailyTokens.size > 1_000) {
      for (const key of this.dailyTokens.keys()) {
        if (!key.endsWith(period.dayId)) this.dailyTokens.delete(key);
      }
    }
    if (this.monthlyCostMicros.size > 1_000) {
      for (const key of this.monthlyCostMicros.keys()) {
        if (!key.endsWith(period.monthId)) this.monthlyCostMicros.delete(key);
      }
    }
    return {
      decision: quotaDecision,
      reservation: {
        id: reservationId,
        tenantId: principal.tenantId,
        ...period,
        reservedTokens,
        reservedCostMicros,
      },
    };
  }

  async settle(reservation: QuotaReservation, actual: QuotaUsage) {
    if (reservation.settled) return;
    reservation.settled = true;
    const dailyKey = `${reservation.tenantId}:${reservation.dayId}`;
    const monthlyKey = `${reservation.tenantId}:${reservation.monthId}`;
    const actualTokens = Math.max(0, Math.ceil(actual.tokens));
    const actualCostMicros = toMicros(actual.costCny);
    this.dailyTokens.set(
      dailyKey,
      Math.max(
        0,
        (this.dailyTokens.get(dailyKey) ?? 0) -
          reservation.reservedTokens +
          actualTokens,
      ),
    );
    this.monthlyCostMicros.set(
      monthlyKey,
      Math.max(
        0,
        (this.monthlyCostMicros.get(monthlyKey) ?? 0) -
          reservation.reservedCostMicros +
          actualCostMicros,
      ),
    );
  }
}

const reserveScript = `
local daily = tonumber(redis.call('GET', KEYS[1]) or '0')
local monthly = tonumber(redis.call('GET', KEYS[2]) or '0')
local daily_limit = tonumber(ARGV[1])
local monthly_limit = tonumber(ARGV[2])
local tokens = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

if daily + tokens > daily_limit then
  return {0, 1, math.max(0, daily_limit - daily), math.max(0, monthly_limit - monthly)}
end
if monthly + cost > monthly_limit then
  return {0, 2, math.max(0, daily_limit - daily), math.max(0, monthly_limit - monthly)}
end

local next_daily = redis.call('INCRBY', KEYS[1], tokens)
local next_monthly = redis.call('INCRBY', KEYS[2], cost)
redis.call('PEXPIREAT', KEYS[1], ARGV[5])
redis.call('PEXPIREAT', KEYS[2], ARGV[6])
redis.call('HSET', KEYS[3], 'tokens', tokens, 'cost', cost, 'settled', 0)
redis.call('PEXPIREAT', KEYS[3], ARGV[6])
return {1, 0, daily_limit - next_daily, monthly_limit - next_monthly}
`;

const settleScript = `
if redis.call('EXISTS', KEYS[3]) == 0 then return {0} end
if redis.call('HGET', KEYS[3], 'settled') == '1' then return {0} end

local reserved_tokens = tonumber(redis.call('HGET', KEYS[3], 'tokens') or '0')
local reserved_cost = tonumber(redis.call('HGET', KEYS[3], 'cost') or '0')
local daily = tonumber(redis.call('GET', KEYS[1]) or '0')
local monthly = tonumber(redis.call('GET', KEYS[2]) or '0')
local next_daily = math.max(0, daily - reserved_tokens + tonumber(ARGV[1]))
local next_monthly = math.max(0, monthly - reserved_cost + tonumber(ARGV[2]))

redis.call('SET', KEYS[1], next_daily, 'PXAT', ARGV[3])
redis.call('SET', KEYS[2], next_monthly, 'PXAT', ARGV[4])
redis.call('HSET', KEYS[3], 'settled', 1)
return {1}
`;

export class RedisQuotaManager implements QuotaManager {
  constructor(
    private readonly redis: RedisEvalClient,
    private readonly now: () => number = Date.now,
  ) {}

  async reserve(
    principal: Principal,
    estimated: QuotaUsage,
    reservationId: string,
  ) {
    const now = this.now();
    const period = periods(now);
    const reservedTokens = Math.max(0, Math.ceil(estimated.tokens));
    const reservedCostMicros = toMicros(estimated.costCny);
    const budgetLimitMicros = toMicros(principal.monthlyBudgetCny);
    const prefix = `minimaas:quota:${principal.tenantId}`;
    const raw = await this.redis.eval(reserveScript, {
      keys: [
        `${prefix}:day:${period.dayId}:tokens`,
        `${prefix}:month:${period.monthId}:cost`,
        `${prefix}:reservation:${reservationId}`,
      ],
      arguments: [
        String(principal.dailyTokenQuota),
        String(budgetLimitMicros),
        String(reservedTokens),
        String(reservedCostMicros),
        String(period.dayExpiresAt),
        String(period.monthExpiresAt),
      ],
    });
    if (!Array.isArray(raw) || raw.length < 4) {
      throw new Error("Invalid Redis quota response");
    }
    const allowed = Number(raw[0]) === 1;
    const reasonCode = Number(raw[1]);
    const reason =
      reasonCode === 1
        ? "daily_token_quota"
        : reasonCode === 2
          ? "monthly_budget"
          : undefined;
    const quotaDecision: QuotaDecision = {
      allowed,
      reason,
      dailyTokenLimit: principal.dailyTokenQuota,
      dailyTokenRemaining: Number(raw[2]),
      monthlyBudgetCny: principal.monthlyBudgetCny,
      monthlyBudgetRemainingCny: fromMicros(Number(raw[3])),
      retryAfterSeconds: allowed
        ? undefined
        : Math.max(
            1,
            Math.ceil(
              ((reason === "daily_token_quota"
                ? period.dayExpiresAt
                : period.monthExpiresAt) -
                now) /
                1_000,
            ),
          ),
    };
    return {
      decision: quotaDecision,
      reservation: allowed
        ? {
            id: reservationId,
            tenantId: principal.tenantId,
            ...period,
            reservedTokens,
            reservedCostMicros,
          }
        : undefined,
    };
  }

  async settle(reservation: QuotaReservation, actual: QuotaUsage) {
    const prefix = `minimaas:quota:${reservation.tenantId}`;
    await this.redis.eval(settleScript, {
      keys: [
        `${prefix}:day:${reservation.dayId}:tokens`,
        `${prefix}:month:${reservation.monthId}:cost`,
        `${prefix}:reservation:${reservation.id}`,
      ],
      arguments: [
        String(Math.max(0, Math.ceil(actual.tokens))),
        String(toMicros(actual.costCny)),
        String(reservation.dayExpiresAt),
        String(reservation.monthExpiresAt),
      ],
    });
  }
}
