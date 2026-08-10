export interface GatewayConfig {
  host: string;
  port: number;
  logLevel: string;
  defaultProvider: "mock" | "ollama";
  ollamaBaseUrl: string;
  ollamaModel: string;
  providerTimeoutMs: number;
  authMode: "development" | "control-plane";
  controlPlaneUrl: string;
  authSnapshotTtlMs: number;
  rateLimitBackend: "memory" | "redis";
  quotaBackend: "memory" | "redis";
  redisUrl: string;
}

export function loadConfig(): GatewayConfig {
  return {
    host: process.env.GATEWAY_HOST ?? "0.0.0.0",
    port: Number(process.env.GATEWAY_PORT ?? 8080),
    logLevel: process.env.LOG_LEVEL ?? "info",
    defaultProvider:
      process.env.DEFAULT_MODEL_PROVIDER === "ollama" ? "ollama" : "mock",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
    ollamaModel: process.env.OLLAMA_MODEL ?? "qwen2.5:0.5b",
    providerTimeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS ?? 30_000),
    authMode:
      process.env.AUTH_MODE === "development" ? "development" : "control-plane",
    controlPlaneUrl: process.env.CONTROL_PLANE_URL ?? "http://127.0.0.1:8081",
    authSnapshotTtlMs: Number(process.env.AUTH_SNAPSHOT_TTL_MS ?? 2_000),
    rateLimitBackend:
      process.env.RATE_LIMIT_BACKEND === "redis" ? "redis" : "memory",
    quotaBackend: process.env.QUOTA_BACKEND === "redis" ? "redis" : "memory",
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  };
}
