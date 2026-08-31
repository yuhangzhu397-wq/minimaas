import type { Endpoint, TrafficPolicy, ValidationIssue } from "./types";
import { simulatePolicy } from "./policyMath";

export function validatePolicy(
  policy: TrafficPolicy,
  candidateEndpoints: Endpoint[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!policy.name.trim()) {
    issues.push({ severity: "error", field: "name", message: "请填写策略名称。" });
  }
  if (policy.scope.pinId === "") {
    issues.push({ severity: "error", field: "pinId", message: "请选择客户或 PIN。" });
  }
  if (policy.scope.modelId === "") {
    issues.push({ severity: "error", field: "modelId", message: "请选择模型。" });
  }
  if (!Number.isInteger(policy.baseQuota.rpm) || policy.baseQuota.rpm <= 0) {
    issues.push({ severity: "error", field: "rpm", message: "基础 RPM 需填写大于0的整数。" });
  }
  if (!Number.isInteger(policy.baseQuota.tpm) || policy.baseQuota.tpm <= 0) {
    issues.push({ severity: "error", field: "tpm", message: "基础 TPM 需填写大于0的整数。" });
  }
  const overlap = policy.constraints.allowProviderIds.filter((id) => policy.constraints.denyProviderIds.includes(id));
  if (overlap.length > 0) {
    issues.push({ severity: "error", field: "provider", message: "指定通道与排除通道存在交集，请先解决冲突。" });
  }
  const endpointAllowIds = policy.constraints.allowEndpointIds ?? [];
  const endpointDenyIds = policy.constraints.denyEndpointIds ?? [];
  const endpointMode = policy.constraints.endpointMode ?? (endpointAllowIds.length > 0 ? "allow" : endpointDenyIds.length > 0 ? "deny" : "all");
  const endpointOverlap = endpointAllowIds.filter((id) => endpointDenyIds.includes(id));
  if (endpointOverlap.length > 0) {
    issues.push({ severity: "error", field: "endpoint", message: "指定 EP 与排除 EP 存在交集，请先解决冲突。" });
  }
  if (endpointMode === "allow" && endpointAllowIds.length === 0) {
    issues.push({ severity: "error", field: "endpoint", message: "指定 EP 模式下至少选择一个 EP。" });
  }
  if (endpointMode === "all" && (endpointAllowIds.length > 0 || endpointDenyIds.length > 0)) {
    issues.push({ severity: "error", field: "endpoint", message: "当前为不限制模式，请清空指定或排除的 EP。" });
  }
  const scoringWeights = policy.scoringWeights;
  if (scoringWeights) {
    const values = Object.values(scoringWeights);
    if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
      issues.push({ severity: "error", field: "scoringWeights", message: "成本、性能、健康和饥渴权重需填写0%到100%。" });
    } else {
      const total = values.reduce((sum, value) => sum + value, 0);
      if (Math.abs(total - 1) > 0.0001) {
        issues.push({ severity: "error", field: "scoringWeights", message: `四项评分权重合计必须为100%，当前为${Math.round(total * 100)}%。` });
      }
    }
  }
  const possible = candidateEndpoints.filter((endpoint) => endpoint.modelIds.includes(policy.scope.modelId));
  if (possible.length === 0) {
    issues.push({ severity: "error", field: "modelId", message: "该模型当前没有可用 Endpoint。" });
  }
  if (policy.priority === 2 && !policy.changeReason.trim()) {
    issues.push({ severity: "error", field: "changeReason", message: "重保策略必须填写变更原因。" });
  }
  if (policy.effective.mode === "scheduled" && !policy.effective.from) {
    issues.push({ severity: "error", field: "effective", message: "定时生效需要填写开始时间。" });
  }
  if (policy.constraints.maxTtftMs !== undefined && possible.length > 0 && possible.every((endpoint) => endpoint.ttftMs > policy.constraints.maxTtftMs!)) {
    issues.push({ severity: "warning", field: "maxTtftMs", message: "当前所有候选 Endpoint 的 TTFT 都超过目标，发布后可能没有可用候选。" });
  }
  if (policy.constraints.maxTpotMs !== undefined && possible.length > 0 && possible.every((endpoint) => endpoint.tpotMs > policy.constraints.maxTpotMs!)) {
    issues.push({ severity: "warning", field: "maxTpotMs", message: "当前所有候选 Endpoint 的 TPOT 都超过目标，建议放宽目标或调整硬约束。" });
  }
  const invalidPreference = policy.preferences.find(({ weight }) => weight !== undefined && (!Number.isFinite(weight) || weight < 0 || weight > 100));
  if (invalidPreference) {
    issues.push({ severity: "error", field: "preferences", message: "通道偏好权重需填写0到100之间的数值。" });
  }
  const candidatePreferenceWeights = possible.map((endpoint) => {
    const configured = policy.preferences.find((preference) => preference.epId === endpoint.id)?.weight;
    return typeof configured === "number" && Number.isFinite(configured) ? configured : 50;
  });
  if (candidatePreferenceWeights.length > 0 && candidatePreferenceWeights.every((weight) => weight <= 0)) {
    issues.push({ severity: "error", field: "preferences", message: "至少保留一个通道的偏好权重大于0。" });
  }
  if (possible.length > 0 && simulatePolicy(policy, candidateEndpoints, 0.72).endpoints.every((row) => !row.passed)) {
    issues.push({ severity: "error", field: "endpoint", message: "硬约束过滤后没有可用 EP，请放宽条件或调整 EP 范围。" });
  }
  return issues;
}
