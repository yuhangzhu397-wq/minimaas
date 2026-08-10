import type { DashboardOverview } from "@minimaas/contracts";

export function dashboardSeed(now = new Date()): DashboardOverview {
  return {
    generatedAt: now.toISOString(),
    source: "seed",
    metrics: {
      requests: 12840,
      successRate: 99.92,
      p95LatencyMs: 1840,
      costTodayCny: 38.6,
    },
    trend: [
      { time: "00:00", requests: 340, tokens: 42000 },
      { time: "04:00", requests: 210, tokens: 28000 },
      { time: "08:00", requests: 720, tokens: 74000 },
      { time: "12:00", requests: 920, tokens: 96000 },
      { time: "16:00", requests: 1180, tokens: 121000 },
      { time: "20:00", requests: 1030, tokens: 108000 },
      { time: "现在", requests: 860, tokens: 92000 },
    ],
    models: [
      {
        id: "mock-v1",
        name: "Mock Provider",
        status: "healthy",
        successRate: 100,
        p95LatencyMs: 120,
        requestsToday: 2341,
      },
      {
        id: "ollama-qwen",
        name: "Ollama",
        status: "offline",
        successRate: 0,
        p95LatencyMs: 0,
        requestsToday: 0,
      },
    ],
    events: [
      {
        id: "event-1",
        type: "deployment",
        title: "配置发布",
        detail: "路由策略 default v1 已装载",
        occurredAt: new Date(now.getTime() - 2 * 60_000).toISOString(),
      },
      {
        id: "event-2",
        type: "fallback",
        title: "统一接入",
        detail: "Ollama Adapter 已接入，Mock 仍是默认上游",
        occurredAt: new Date(now.getTime() - 8 * 60_000).toISOString(),
      },
      {
        id: "event-3",
        type: "quota",
        title: "配额治理",
        detail: "RPM/TPM、日 Token 与月预算已经启用",
        occurredAt: new Date(now.getTime() - 15 * 60_000).toISOString(),
      },
    ],
  };
}
