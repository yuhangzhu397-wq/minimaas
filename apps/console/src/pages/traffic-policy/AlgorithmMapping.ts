export const algorithmMapping = {
  priority: "a9.priority",
  servicePreset: "a5.sla_requirement + b10.level affinity",
  scoringWeights: "layer3.weights: w_cost / w_performance / w_health / w_hunger",
  candidateSet: "all EP supporting selected model → hard filters → eligible EP set",
  baseRpm: "base_quota.rpm → optimistic rate-limit base RPM",
  baseTpm: "base_quota.tpm → optimistic rate-limit base TPM",
  optimisticEnabled: "optimistic_rate_limit.enabled",
  maxMultiplier: "M",
  origin: "a4.must_internal/must_external ↔ b9.type",
  allowProviderIds: "a4.provider_requirement.whitelist（通道快捷筛选）",
  denyProviderIds: "a4.provider_requirement.blacklist（通道快捷筛选）",
  endpointMode: "业务侧 EP 范围模式：all / allow / deny",
  allowEndpointIds: "a4.provider_requirement.whitelist（EP指定）",
  denyEndpointIds: "a4.provider_requirement.blacklist（EP排除）",
  securityRequirement: "a8.security_requirement ↔ b13.security_level",
  maxTtftMs: "a6.max_ttft ↔ b1.p95_ttft",
  maxTpotMs: "a6.max_tpot ↔ b2.p95_tpot",
  minKvCacheHitRate: "a7.kv_cache_hit_requirement ↔ b5.kv_cache_hit_rate",
  preferences: "b15(e,u) raw 0–100 → normalize within eligible candidate set → softmax",
} as const;

export const servicePresetWeights = {
  performance: { cost: 0.3, performance: 0.6, health: 0.05, hunger: 0.05 },
  balanced: { cost: 0.55, performance: 0.35, health: 0.05, hunger: 0.05 },
  cost: { cost: 0.75, performance: 0.1, health: 0.05, hunger: 0.1 },
  // Fallback only for older records without scoringWeights; edited policies persist their actual values.
  custom: { cost: 0.55, performance: 0.35, health: 0.05, hunger: 0.05 },
} as const;

export const servicePresetMeta = {
  performance: {
    label: "高性能保障",
    sla: "A",
    levels: "A → B → C",
    description: "优先低延迟和高等级资源",
  },
  balanced: {
    label: "均衡",
    sla: "B",
    levels: "B → A → C",
    description: "在成本、性能和稳定性之间保持均衡",
  },
  cost: {
    label: "成本优先",
    sla: "C",
    levels: "C → B → A",
    description: "优先选择成本较低的可用资源",
  },
  custom: {
    label: "自定义",
    sla: "自定义",
    levels: "按权重计算",
    description: "业务自定义成本、性能、健康和饥渴权重",
  },
} as const;
