export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: "stop" | "length" | null;
  }>;
  usage: Usage;
}

export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<ChatMessage>;
    finish_reason: "stop" | "length" | null;
  }>;
}

export interface ModelDescriptor {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
  kind: "virtual" | "physical";
  status: "healthy" | "degraded" | "offline";
  physical_model?: string;
  is_default?: boolean;
}

export interface ModelsResponse {
  object: "list";
  data: ModelDescriptor[];
}

export type ApiKeyStatus = "active" | "revoked";

export interface ApiKeyDescriptor {
  id: string;
  tenantId: string;
  name: string;
  prefix: string;
  status: ApiKeyStatus;
  createdAt: string;
  lastUsedAt?: string;
}

export interface TenantDescriptor {
  id: string;
  name: string;
  status: "active" | "suspended";
  allowedModels: string[];
  rpmLimit: number;
  tpmLimit: number;
  dailyTokenQuota: number;
  monthlyBudgetCny: number;
  apiKeys: ApiKeyDescriptor[];
  createdAt: string;
}

export interface TenantsResponse {
  data: TenantDescriptor[];
  meta: { source: "memory" | "database"; total: number };
}

export interface CreateTenantRequest {
  name: string;
  allowedModels: string[];
  rpmLimit?: number;
  tpmLimit?: number;
  dailyTokenQuota: number;
  monthlyBudgetCny: number;
}

export interface UpdateTenantQuotaRequest {
  rpmLimit?: number;
  tpmLimit?: number;
  dailyTokenQuota?: number;
  monthlyBudgetCny?: number;
}

export interface CreateApiKeyRequest {
  name: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKeyDescriptor;
  secret: string;
}

export interface GatewayAuthSnapshotEntry {
  keyId: string;
  keyHash: string;
  tenantId: string;
  environment: "development" | "production";
  allowedModels: string[];
  rpmLimit: number;
  tpmLimit: number;
  dailyTokenQuota: number;
  monthlyBudgetCny: number;
}

export interface GatewayAuthSnapshot {
  version: number;
  generatedAt: string;
  keys: GatewayAuthSnapshotEntry[];
}

export interface GatewayErrorResponse {
  error: {
    message: string;
    type: string;
    code: string;
    request_id: string;
  };
}

export interface DashboardOverview {
  generatedAt: string;
  source: "seed" | "live";
  metrics: {
    requests: number;
    successRate: number;
    p95LatencyMs: number;
    costTodayCny: number;
  };
  trend: Array<{
    time: string;
    requests: number;
    tokens: number;
  }>;
  models: Array<{
    id: string;
    name: string;
    status: "healthy" | "degraded" | "offline";
    successRate: number;
    p95LatencyMs: number;
    requestsToday: number;
  }>;
  events: Array<{
    id: string;
    type: "deployment" | "fallback" | "quota";
    title: string;
    detail: string;
    occurredAt: string;
  }>;
}
