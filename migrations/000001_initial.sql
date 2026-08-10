CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  base_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disabled',
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE physical_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id),
  model_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  context_window INTEGER,
  input_price_per_million NUMERIC(18, 8),
  output_price_per_million NUMERIC(18, 8),
  status TEXT NOT NULL DEFAULT 'draft',
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, model_code)
);

CREATE TABLE virtual_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE route_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  virtual_model_id UUID NOT NULL REFERENCES virtual_models(id),
  physical_model_id UUID NOT NULL REFERENCES physical_models(id),
  weight INTEGER NOT NULL DEFAULT 100 CHECK (weight BETWEEN 0 AND 100),
  priority INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  plan TEXT NOT NULL DEFAULT 'developer',
  allowed_models JSONB NOT NULL DEFAULT '["smart-chat"]'::jsonb,
  monthly_budget NUMERIC(18, 4) NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_quotas (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id),
  rpm_limit INTEGER NOT NULL DEFAULT 60,
  tpm_limit BIGINT NOT NULL DEFAULT 100000,
  daily_token_limit BIGINT NOT NULL DEFAULT 1000000
);

CREATE TABLE usage_records (
  id BIGSERIAL PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT REFERENCES tenants(id),
  api_key_id TEXT REFERENCES api_keys(id),
  virtual_model TEXT NOT NULL,
  physical_model TEXT NOT NULL,
  provider TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  ttft_ms INTEGER,
  latency_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  error_type TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC(18, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX usage_records_tenant_created_idx
  ON usage_records (tenant_id, created_at DESC);
CREATE INDEX usage_records_model_created_idx
  ON usage_records (virtual_model, created_at DESC);

INSERT INTO providers (name, type, base_url, status)
VALUES ('Mock Provider', 'mock', 'in-memory://mock', 'enabled');

INSERT INTO virtual_models (name, description, status)
VALUES ('smart-chat', 'MiniMaaS 默认虚拟对话模型', 'published');

INSERT INTO tenants
  (id, name, status, allowed_models, monthly_budget)
VALUES
  ('tenant-joylab', 'JoyLab 产品团队', 'active', '["smart-chat", "mock-chat"]', 3000);

INSERT INTO tenant_quotas
  (tenant_id, rpm_limit, tpm_limit, daily_token_limit)
VALUES
  ('tenant-joylab', 60, 100000, 2000000);

-- 仅供本地学习环境使用，对应明文 mm_dev_minimaas_local。
INSERT INTO api_keys
  (id, tenant_id, name, key_prefix, key_hash, status)
VALUES
  (
    'key-development',
    'tenant-joylab',
    '开发环境',
    'mm_dev_minimaas',
    encode(digest('mm_dev_minimaas_local', 'sha256'), 'hex'),
    'active'
  );
