import { simulatePolicy } from "./policyMath";
import type {
  Endpoint,
  ModelPolicyState,
  PinModelAccess,
  PinModelPolicySummary,
  TrafficPolicy,
} from "./types";

const statePriority: Record<ModelPolicyState, number> = {
  active: 6,
  pending: 5,
  scheduled: 4,
  draft: 3,
  disabled: 2,
  unconfigured: 1,
};

function policyState(policy?: TrafficPolicy): ModelPolicyState {
  return policy?.status ?? "unconfigured";
}

function choosePolicy(policies: TrafficPolicy[], pinId: string, modelId: string) {
  return policies
    .filter((policy) => policy.scope.pinId === pinId && policy.scope.modelId === modelId)
    .sort((a, b) => statePriority[policyState(b)] - statePriority[policyState(a)] || b.version - a.version)[0];
}

export function buildPinModelPolicySummaries(
  pinId: string,
  access: PinModelAccess[],
  policies: TrafficPolicy[],
  models: Array<{ id: string; name: string }>,
  endpoints: Endpoint[],
): PinModelPolicySummary[] {
  return access
    .filter((item) => item.pinId === pinId)
    .map((item) => {
      const model = models.find((candidate) => candidate.id === item.modelId);
      const policy = choosePolicy(policies, pinId, item.modelId);
      const modelEndpoints = endpoints.filter((endpoint) => endpoint.modelIds.includes(item.modelId));
      const eligibleEndpointCount = policy
        ? simulatePolicy(policy, endpoints, 0.72).endpoints.filter((row) => row.passed).length
        : 0;
      const riskMessages: string[] = [];
      if (item.status === "disabled") riskMessages.push("模型授权已停用");
      if (!policy) riskMessages.push("尚未配置模型策略");
      if (modelEndpoints.length === 0) riskMessages.push("当前没有支持该模型的 EP");
      if (policy && modelEndpoints.length > 0 && eligibleEndpointCount === 0) riskMessages.push("硬约束过滤后没有可用 EP");
      return {
        pinId,
        modelId: item.modelId,
        modelName: model?.name ?? item.modelId,
        accessStatus: item.status,
        policy,
        state: policyState(policy),
        supportingEndpointCount: modelEndpoints.length,
        eligibleEndpointCount,
        riskMessages,
      };
    });
}

export function policyGroupId(pinId: string, modelId: string) {
  return `${pinId}::${modelId}`;
}
