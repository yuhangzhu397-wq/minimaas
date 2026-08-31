import { servicePresetWeights } from "./AlgorithmMapping";
import type {
  Endpoint,
  PolicySimulation,
  ServicePreset,
  SimulationEndpoint,
  TrafficPolicy,
} from "./types";

export function borrowFactor(groupPressure: number) {
  const pressure = Math.max(0, Math.min(1, groupPressure));
  if (pressure <= 0.6) return 1;
  if (pressure >= 0.85) return 0;
  return (0.85 - pressure) / 0.25;
}

export function dynamicLimit(
  baseLimit: number,
  maxMultiplier: number,
  groupPressure: number,
  enabled: boolean,
) {
  if (!enabled) return baseLimit;
  return Math.round(
    baseLimit * (1 + (maxMultiplier - 1) * borrowFactor(groupPressure)),
  );
}

function preferenceWeightFor(policy: TrafficPolicy, endpointId: string) {
  const configured = policy.preferences.find((preference) => preference.epId === endpointId)?.weight;
  return typeof configured === "number" && Number.isFinite(configured)
    ? Math.max(0, Math.min(100, configured))
    : 50;
}

export function normalizePreferenceWeights(weights: number[]) {
  if (weights.length === 0) return [];
  const safeWeights = weights.map((weight) => Math.max(0, Number.isFinite(weight) ? weight : 0));
  const total = safeWeights.reduce((sum, weight) => sum + weight, 0);
  return total === 0 ? safeWeights.map(() => 0) : safeWeights.map((weight) => weight / total);
}

function scoreHealth(endpoint: Endpoint) {
  return endpoint.health === "healthy"
    ? 1
    : endpoint.health === "warning"
      ? 0.62
      : 0.18;
}

function scorePerformance(endpoint: Endpoint, endpoints: Endpoint[]) {
  const maxLatency = Math.max(...endpoints.map((item) => item.ttftMs));
  return maxLatency === 0 ? 1 : Math.max(0.08, 1 - endpoint.ttftMs / maxLatency);
}

function scoreCost(endpoint: Endpoint, endpoints: Endpoint[]) {
  const maxCost = Math.max(...endpoints.map((item) => item.costPer1m));
  return maxCost === 0 ? 1 : Math.max(0.08, 1 - endpoint.costPer1m / maxCost);
}

function scoreHunger(endpoint: Endpoint) {
  return Math.max(0.05, Math.min(1, endpoint.hungerWeight));
}

function hardFilters(policy: TrafficPolicy, endpoint: Endpoint): string[] {
  const filteredBy: string[] = [];
  const allowEndpointIds = policy.constraints.allowEndpointIds ?? [];
  const denyEndpointIds = policy.constraints.denyEndpointIds ?? [];
  if (policy.constraints.origin === "internal-only" && endpoint.origin !== "internal") {
    filteredBy.push("资源来源不满足：仅自部署");
  }
  if (policy.constraints.origin === "external-only" && endpoint.origin !== "external") {
    filteredBy.push("资源来源不满足：仅外采");
  }
  if (policy.constraints.allowProviderIds.length > 0 && !policy.constraints.allowProviderIds.includes(endpoint.supplierId)) {
    filteredBy.push("不在指定通道");
  }
  if (policy.constraints.denyProviderIds.includes(endpoint.supplierId)) {
    filteredBy.push("命中排除通道");
  }
  if (allowEndpointIds.length > 0 && !allowEndpointIds.includes(endpoint.id)) {
    filteredBy.push("不在指定 EP");
  }
  if (denyEndpointIds.includes(endpoint.id)) {
    filteredBy.push("命中排除 EP");
  }
  if (endpoint.securityLevel < policy.constraints.securityRequirement) {
    filteredBy.push("安全等级不足");
  }
  if (policy.constraints.maxTtftMs !== undefined && endpoint.ttftMs > policy.constraints.maxTtftMs) {
    filteredBy.push("TTFT超过目标");
  }
  if (policy.constraints.maxTpotMs !== undefined && endpoint.tpotMs > policy.constraints.maxTpotMs) {
    filteredBy.push("TPOT超过目标");
  }
  if (policy.constraints.minKvCacheHitRate !== undefined && endpoint.cacheHitRate < policy.constraints.minKvCacheHitRate) {
    filteredBy.push("KV缓存命中率不足");
  }
  if (endpoint.health === "degraded") {
    filteredBy.push("健康状态不满足");
  }
  return filteredBy;
}

function getAdmission(pressure: number, priority: TrafficPolicy["priority"]) {
  if (pressure >= 0.98) {
    return {
      admission: "拒绝新请求" as const,
      reason: "资源池达到98%水位，平台规则拒绝所有新请求。",
    };
  }
  if (pressure >= 0.95 && priority < 2) {
    return {
      admission: "仅高优先级" as const,
      reason: "资源池达到95%水位，仅允许重保业务继续进入。",
    };
  }
  if (pressure >= 0.9 && priority === 0) {
    return {
      admission: "收紧" as const,
      reason: "资源池达到90%水位，普通业务不再获得临时借用额度。",
    };
  }
  if (pressure >= 0.85) {
    return {
      admission: "收紧" as const,
      reason: "资源池达到85%水位，平台开始回收临时额度。",
    };
  }
  return {
    admission: "放行" as const,
    reason: pressure <= 0.6 ? "资源池宽松，可按上限借用。" : "资源池进入平滑回收区。",
  };
}

export function simulatePolicy(
  policy: TrafficPolicy,
  candidateEndpoints: Endpoint[],
  pressure = 0.72,
): PolicySimulation {
  const normalizedPressure = Math.max(0, Math.min(1, pressure));
  const factor = borrowFactor(normalizedPressure);
  const scoringWeights = policy.scoringWeights ?? servicePresetWeights[policy.servicePreset];
  const eligible = candidateEndpoints.filter((endpoint) => endpoint.modelIds.includes(policy.scope.modelId));
  const rows: SimulationEndpoint[] = eligible.map((endpoint) => {
    const filteredBy = hardFilters(policy, endpoint);
    const preferenceWeight = preferenceWeightFor(policy, endpoint.id);
    if (preferenceWeight <= 0) filteredBy.push("偏好权重为0");
    const cost = scoreCost(endpoint, eligible);
    const performance = scorePerformance(endpoint, eligible);
    const health = scoreHealth(endpoint);
    const hunger = scoreHunger(endpoint);
    const rawWeighted =
      cost * scoringWeights.cost +
      performance * scoringWeights.performance +
      health * scoringWeights.health +
      hunger * scoringWeights.hunger;
    return {
      endpoint,
      passed: filteredBy.length === 0,
      filteredBy,
      // Kept for compatibility with older saved policies; routing now uses the numeric weight below.
      preference: "allowed",
      preferenceWeight,
      normalizedPreference: 0,
      scores: {
        cost,
        performance,
        health,
        hunger,
        weighted: rawWeighted,
      },
      probability: 0,
    };
  });
  const passedRows = rows.filter((row) => row.passed);
  const normalizedPreferences = normalizePreferenceWeights(passedRows.map((row) => row.preferenceWeight));
  passedRows.forEach((row, index) => {
    const normalizedPreference = normalizedPreferences[index] ?? 0;
    row.normalizedPreference = normalizedPreference;
    // Rescale to a mean of 1 so the default value 50 is neutral while relative preferences remain effective.
    row.scores.weighted *= normalizedPreference * passedRows.length;
  });
  const temperature = 0.05;
  const expScores = passedRows.map((row) => Math.exp(row.scores.weighted / temperature));
  const expTotal = expScores.reduce((sum, score) => sum + score, 0);
  passedRows.forEach((row, index) => {
    row.probability = expTotal === 0 ? 0 : expScores[index] / expTotal;
  });
  const admissionState = getAdmission(normalizedPressure, policy.priority);
  return {
    pressure: normalizedPressure,
    borrowFactor: factor,
    dynamicRpm: dynamicLimit(policy.baseQuota.rpm, policy.optimisticLimit.maxMultiplier, normalizedPressure, policy.optimisticLimit.enabled),
    dynamicTpm: dynamicLimit(policy.baseQuota.tpm, policy.optimisticLimit.maxMultiplier, normalizedPressure, policy.optimisticLimit.enabled),
    admission: admissionState.admission,
    admissionReason: admissionState.reason,
    endpoints: rows,
    stale: false,
    observedAt: eligible[0]?.observedAt ?? policy.baseQuota.observedAt,
  };
}
