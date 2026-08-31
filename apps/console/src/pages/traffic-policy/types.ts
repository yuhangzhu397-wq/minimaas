export type PolicyStatus =
  | "draft"
  | "pending"
  | "scheduled"
  | "active"
  | "disabled";

export type ServicePreset = "performance" | "balanced" | "cost" | "custom";
export type BusinessPriority = 0 | 1 | 2;
export type ProviderOrigin =
  | "internal-only"
  | "internal-preferred"
  | "all"
  | "external-only";
export type PreferenceMode = "preferred" | "allowed" | "disabled";

export interface BaseQuota {
  rpm: number;
  tpm: number;
  /** Legacy compatibility only; the V1 product does not expose concurrency. */
  concurrency?: number;
  observedAt: string;
}

export interface ScoringWeights {
  cost: number;
  performance: number;
  health: number;
  hunger: number;
}

export interface TrafficPolicy {
  id: string;
  version: number;
  /** Stable management grouping for a reusable model strategy or a PIN + model override. */
  policyGroupId?: string;
  name: string;
  status: PolicyStatus;
  scope: {
    /** `global` is reserved for model-level strategies that are assigned to users elsewhere. */
    pinId: string;
    pinName: string;
    /** Legacy compatibility fields; not configurable in the PIN × model flow. */
    apiKeyIds?: string[];
    apiKeyNames?: string[];
    modelId: string;
    modelName: string;
  };
  priority: BusinessPriority;
  servicePreset: ServicePreset;
  /** Layer-3 scoring weights. Optional for backward compatibility with saved preset-only policies. */
  scoringWeights?: ScoringWeights;
  effective: {
    mode: "now" | "scheduled";
    from: string;
    to?: string;
  };
  baseQuota: BaseQuota;
  optimisticLimit: {
    enabled: boolean;
    /** M in the dynamic quota formula. Presets are 1/2/3; custom values are supported up to 10. */
    maxMultiplier: number;
    poolMode: "candidate-set" | "selected-pool";
    poolId?: string;
  };
  constraints: {
    origin: ProviderOrigin;
    allowProviderIds: string[];
    denyProviderIds: string[];
    /** V1 uses one mutually exclusive EP selection mode. */
    endpointMode?: "all" | "allow" | "deny";
    /** Optional endpoint-level hard constraints. Legacy policies may only have provider IDs. */
    allowEndpointIds?: string[];
    denyEndpointIds?: string[];
    securityRequirement: 1 | 2 | 3;
    maxTtftMs?: number;
    maxTpotMs?: number;
    minKvCacheHitRate?: number;
  };
  preferences: Array<{
    epId: string;
    mode: PreferenceMode;
    /** Raw business preference entered on a 0–100 scale; the algorithm normalizes it per candidate set. */
    weight?: number;
  }>;
  changeReason: string;
  createdBy: string;
  updatedAt: string;
}

export interface PinModelAccess {
  pinId: string;
  modelId: string;
  /** Legacy compatibility only; the V1 product does not expose API Keys. */
  apiKeyIds?: string[];
  status: "enabled" | "disabled";
  grantedAt?: string;
}

export type ModelPolicyState =
  | "unconfigured"
  | "draft"
  | "pending"
  | "scheduled"
  | "active"
  | "disabled";

export interface PinModelPolicySummary {
  pinId: string;
  modelId: string;
  modelName: string;
  accessStatus: "enabled" | "disabled";
  policy?: TrafficPolicy;
  state: ModelPolicyState;
  supportingEndpointCount: number;
  eligibleEndpointCount: number;
  riskMessages: string[];
}

export interface Endpoint {
  id: string;
  supplierId: string;
  supplierName: string;
  name: string;
  modelIds: string[];
  origin: "internal" | "external";
  level: "A" | "B" | "C";
  securityLevel: 1 | 2 | 3;
  health: "healthy" | "warning" | "degraded";
  availableWindow: string;
  rpm: number;
  rpmLimit: number;
  tpm: number;
  tpmLimit: number;
  ttftMs: number;
  tpotMs: number;
  cacheHitRate: number;
  costPer1m: number;
  hungerWeight: number;
  observedAt: string;
}

export interface ValidationIssue {
  severity: "error" | "warning";
  field?: string;
  message: string;
}

export interface SimulationEndpoint {
  endpoint: Endpoint;
  passed: boolean;
  filteredBy: string[];
  preference: PreferenceMode;
  preferenceWeight: number;
  normalizedPreference: number;
  scores: {
    cost: number;
    performance: number;
    health: number;
    hunger: number;
    weighted: number;
  };
  probability: number;
}

export interface PolicySimulation {
  pressure: number;
  borrowFactor: number;
  dynamicRpm: number;
  dynamicTpm: number;
  admission: "放行" | "收紧" | "仅高优先级" | "拒绝新请求";
  admissionReason: string;
  endpoints: SimulationEndpoint[];
  stale: boolean;
  observedAt: string;
}

export type TrafficPolicyRoute =
  | { view: "overview" }
  | { view: "new" }
  | { view: "detail"; id: string };
