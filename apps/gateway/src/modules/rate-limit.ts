import type { Principal } from "./auth.js";

export interface RateLimitDecision {
  allowed: boolean;
  limitRequests: number;
  remainingRequests: number;
  limitTokens: number;
  remainingTokens: number;
  retryAfterSeconds?: number;
}

export interface RateLimiter {
  check(
    principal: Principal,
    estimatedTokens: number,
  ): Promise<RateLimitDecision>;
}

export function rateLimitHeaders(decision: RateLimitDecision) {
  return {
    "x-ratelimit-limit-requests": String(decision.limitRequests),
    "x-ratelimit-remaining-requests": String(decision.remainingRequests),
    "x-ratelimit-limit-tokens": String(decision.limitTokens),
    "x-ratelimit-remaining-tokens": String(decision.remainingTokens),
  };
}

interface WindowUsage {
  requests: number;
  tokens: number;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, WindowUsage>();

  constructor(private readonly now: () => number = Date.now) {}

  async check(
    principal: Principal,
    estimatedTokens: number,
  ): Promise<RateLimitDecision> {
    const now = this.now();
    const windowId = Math.floor(now / 60_000);
    const key = `${principal.tenantId}:${windowId}`;
    const usage = this.windows.get(key) ?? { requests: 0, tokens: 0 };
    const allowed =
      usage.requests + 1 <= principal.rpmLimit &&
      usage.tokens + estimatedTokens <= principal.tpmLimit;

    if (allowed) {
      usage.requests += 1;
      usage.tokens += estimatedTokens;
      this.windows.set(key, usage);
    }
    if (this.windows.size > 1_000) {
      for (const oldKey of this.windows.keys()) {
        if (!oldKey.endsWith(`:${windowId}`)) this.windows.delete(oldKey);
      }
    }
    return {
      allowed,
      limitRequests: principal.rpmLimit,
      remainingRequests: Math.max(0, principal.rpmLimit - usage.requests),
      limitTokens: principal.tpmLimit,
      remainingTokens: Math.max(0, principal.tpmLimit - usage.tokens),
      retryAfterSeconds: allowed
        ? undefined
        : Math.max(1, Math.ceil((60_000 - (now % 60_000)) / 1_000)),
    };
  }
}

export interface RedisEvalClient {
  eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown>;
}

const fixedWindowScript = `
local requests = tonumber(redis.call('GET', KEYS[1]) or '0')
local tokens = tonumber(redis.call('GET', KEYS[2]) or '0')
local request_limit = tonumber(ARGV[1])
local token_limit = tonumber(ARGV[2])
local token_cost = tonumber(ARGV[3])
local expires_at = tonumber(ARGV[4])

if requests + 1 > request_limit or tokens + token_cost > token_limit then
  return {0, math.max(0, request_limit - requests), math.max(0, token_limit - tokens)}
end

local next_requests = redis.call('INCR', KEYS[1])
local next_tokens = redis.call('INCRBY', KEYS[2], token_cost)
if next_requests == 1 then redis.call('PEXPIREAT', KEYS[1], expires_at) end
if next_tokens == token_cost then redis.call('PEXPIREAT', KEYS[2], expires_at) end
return {1, request_limit - next_requests, token_limit - next_tokens}
`;

export class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly redis: RedisEvalClient,
    private readonly now: () => number = Date.now,
  ) {}

  async check(
    principal: Principal,
    estimatedTokens: number,
  ): Promise<RateLimitDecision> {
    const now = this.now();
    const windowId = Math.floor(now / 60_000);
    const expiresAt = (windowId + 1) * 60_000;
    const prefix = `minimaas:rate:${principal.tenantId}:${windowId}`;
    const raw = await this.redis.eval(fixedWindowScript, {
      keys: [`${prefix}:requests`, `${prefix}:tokens`],
      arguments: [
        String(principal.rpmLimit),
        String(principal.tpmLimit),
        String(estimatedTokens),
        String(expiresAt),
      ],
    });
    if (!Array.isArray(raw) || raw.length < 3) {
      throw new Error("Invalid Redis rate limit response");
    }
    const allowed = Number(raw[0]) === 1;
    return {
      allowed,
      limitRequests: principal.rpmLimit,
      remainingRequests: Number(raw[1]),
      limitTokens: principal.tpmLimit,
      remainingTokens: Number(raw[2]),
      retryAfterSeconds: allowed
        ? undefined
        : Math.max(1, Math.ceil((expiresAt - now) / 1_000)),
    };
  }
}
