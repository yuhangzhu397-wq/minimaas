import type { Pool } from "pg";
import { newDb } from "pg-mem";
import { describe, expect, it } from "vitest";
import { PostgresTenantStore } from "./postgres-tenant-store.js";

const createDatabase = () => {
  const database = newDb({ autoCreateForeignKeyIndices: true });
  database.public.none(`
    CREATE TABLE tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      allowed_models JSONB NOT NULL DEFAULT '["smart-chat"]'::jsonb,
      monthly_budget NUMERIC(18, 4) NOT NULL,
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
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE tenant_quotas (
      tenant_id TEXT PRIMARY KEY REFERENCES tenants(id),
      rpm_limit INTEGER NOT NULL,
      tpm_limit BIGINT NOT NULL,
      daily_token_limit BIGINT NOT NULL
    );
  `);
  const createPool = () => {
    const adapter = database.adapters.createPg();
    return new adapter.Pool() as unknown as Pool;
  };
  return { createPool };
};

describe("PostgresTenantStore", () => {
  it("persists tenants, API keys and quotas across store instances", async () => {
    const database = createDatabase();
    const first = new PostgresTenantStore(database.createPool());
    const created = await first.create({
      name: "Persistent Lab",
      allowedModels: ["smart-chat"],
      rpmLimit: 30,
      tpmLimit: 60000,
      dailyTokenQuota: 900000,
      monthlyBudgetCny: 1200,
    });
    const generated = await first.createApiKey(created.id, "integration-test");
    expect(generated?.secret).toMatch(/^mm_live_/u);

    await first.updateQuota(created.id, {
      rpmLimit: 45,
      tpmLimit: 80000,
      monthlyBudgetCny: 1800,
    });
    await first.close();

    const second = new PostgresTenantStore(database.createPool());
    const [persisted] = await second.list();
    expect(persisted).toMatchObject({
      id: created.id,
      rpmLimit: 45,
      tpmLimit: 80000,
      dailyTokenQuota: 900000,
      monthlyBudgetCny: 1800,
    });
    expect(persisted.apiKeys[0]).not.toHaveProperty("secretHash");

    const snapshot = await second.authSnapshot();
    expect(snapshot[0]).toMatchObject({
      tenantId: created.id,
      rpmLimit: 45,
      tpmLimit: 80000,
      dailyTokenQuota: 900000,
      monthlyBudgetCny: 1800,
    });
    expect(snapshot[0].keyHash).toHaveLength(64);

    await second.revokeApiKey(persisted.apiKeys[0].id);
    expect(await second.authSnapshot()).toEqual([]);
    await second.close();
  });
});
