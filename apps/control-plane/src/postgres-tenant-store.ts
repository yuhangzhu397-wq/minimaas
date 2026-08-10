import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  ApiKeyDescriptor,
  CreateTenantRequest,
  GatewayAuthSnapshotEntry,
  TenantDescriptor,
  UpdateTenantQuotaRequest,
} from "@minimaas/contracts";
import { Pool } from "pg";
import type { TenantRepository } from "./tenant-store.js";

interface TenantRow {
  tenant_id: string;
  tenant_name: string;
  tenant_status: TenantDescriptor["status"];
  allowed_models: string[];
  daily_token_limit: string | number;
  monthly_budget: string | number;
  rpm_limit: number;
  tpm_limit: string | number;
  tenant_created_at: Date | string;
  key_id: string | null;
  key_name: string | null;
  key_prefix: string | null;
  key_status: ApiKeyDescriptor["status"] | null;
  key_created_at: Date | string | null;
  key_last_used_at: Date | string | null;
}

interface ApiKeyRow {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  status: ApiKeyDescriptor["status"];
  created_at: Date | string;
  last_used_at: Date | string | null;
}

const iso = (value: Date | string) => new Date(value).toISOString();
const number = (value: string | number) => Number(value);

const publicApiKey = (row: ApiKeyRow): ApiKeyDescriptor => ({
  id: row.id,
  tenantId: row.tenant_id,
  name: row.name,
  prefix: row.key_prefix,
  status: row.status,
  createdAt: iso(row.created_at),
  ...(row.last_used_at ? { lastUsedAt: iso(row.last_used_at) } : {}),
});

export class PostgresTenantStore implements TenantRepository {
  readonly backend = "postgres" as const;

  constructor(private readonly pool: Pool) {}

  static async connect(databaseUrl: string) {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await pool.query("SELECT 1");
      return new PostgresTenantStore(pool);
    } catch (error) {
      await pool.end();
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }

  private async loadTenants(tenantId?: string): Promise<TenantDescriptor[]> {
    const result = await this.pool.query(
      `SELECT
         t.id AS tenant_id,
         t.name AS tenant_name,
         t.status AS tenant_status,
         t.allowed_models,
         q.daily_token_limit,
         t.monthly_budget,
         q.rpm_limit,
         q.tpm_limit,
         t.created_at AS tenant_created_at,
         k.id AS key_id,
         k.name AS key_name,
         k.key_prefix,
         k.status AS key_status,
         k.created_at AS key_created_at,
         k.last_used_at AS key_last_used_at
       FROM tenants t
       JOIN tenant_quotas q ON q.tenant_id = t.id
       LEFT JOIN api_keys k ON k.tenant_id = t.id
       WHERE ($1::text IS NULL OR t.id = $1)
       ORDER BY t.created_at, k.created_at`,
      [tenantId ?? null],
    );
    const rows = result.rows as TenantRow[];
    const tenants = new Map<string, TenantDescriptor>();
    for (const row of rows) {
      let tenant = tenants.get(row.tenant_id);
      if (!tenant) {
        tenant = {
          id: row.tenant_id,
          name: row.tenant_name,
          status: row.tenant_status,
          allowedModels: row.allowed_models,
          rpmLimit: row.rpm_limit,
          tpmLimit: number(row.tpm_limit),
          dailyTokenQuota: number(row.daily_token_limit),
          monthlyBudgetCny: number(row.monthly_budget),
          createdAt: iso(row.tenant_created_at),
          apiKeys: [],
        };
        tenants.set(tenant.id, tenant);
      }
      if (
        row.key_id &&
        row.key_name &&
        row.key_prefix &&
        row.key_status &&
        row.key_created_at
      ) {
        tenant.apiKeys.push({
          id: row.key_id,
          tenantId: row.tenant_id,
          name: row.key_name,
          prefix: row.key_prefix,
          status: row.key_status,
          createdAt: iso(row.key_created_at),
          ...(row.key_last_used_at
            ? { lastUsedAt: iso(row.key_last_used_at) }
            : {}),
        });
      }
    }
    return [...tenants.values()];
  }

  async list() {
    return this.loadTenants();
  }

  async authSnapshot(): Promise<GatewayAuthSnapshotEntry[]> {
    const result = await this.pool.query(
      `SELECT
         k.id AS key_id,
         k.key_hash,
         k.tenant_id,
         t.allowed_models,
         q.rpm_limit,
         q.tpm_limit,
         q.daily_token_limit,
         t.monthly_budget
       FROM api_keys k
       JOIN tenants t ON t.id = k.tenant_id
       JOIN tenant_quotas q ON q.tenant_id = t.id
       WHERE k.status = 'active' AND t.status = 'active'`,
    );
    return result.rows.map((row) => ({
      keyId: String(row.key_id),
      keyHash: String(row.key_hash),
      tenantId: String(row.tenant_id),
      environment: "development" as const,
      allowedModels: row.allowed_models as string[],
      rpmLimit: Number(row.rpm_limit),
      tpmLimit: Number(row.tpm_limit),
      dailyTokenQuota: Number(row.daily_token_limit),
      monthlyBudgetCny: Number(row.monthly_budget),
    }));
  }

  async create(input: CreateTenantRequest): Promise<TenantDescriptor> {
    const id = `tenant-${randomUUID()}`;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO tenants
           (id, name, status, allowed_models, monthly_budget)
         VALUES ($1, $2, 'active', $3::jsonb, $4)`,
        [
          id,
          input.name.trim(),
          JSON.stringify([...new Set(input.allowedModels)]),
          input.monthlyBudgetCny,
        ],
      );
      await client.query(
        `INSERT INTO tenant_quotas
           (tenant_id, rpm_limit, tpm_limit, daily_token_limit)
         VALUES ($1, $2, $3, $4)`,
        [
          id,
          input.rpmLimit ?? 60,
          input.tpmLimit ?? 100_000,
          input.dailyTokenQuota,
        ],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    const [tenant] = await this.loadTenants(id);
    if (!tenant) throw new Error("created tenant could not be loaded");
    return tenant;
  }

  async updateQuota(
    tenantId: string,
    input: UpdateTenantQuotaRequest,
  ): Promise<TenantDescriptor | undefined> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query(
        "SELECT id FROM tenants WHERE id = $1 FOR UPDATE",
        [tenantId],
      );
      if (locked.rowCount === 0) {
        await client.query("ROLLBACK");
        return undefined;
      }
      await client.query(
        `UPDATE tenant_quotas
         SET rpm_limit = COALESCE($2, rpm_limit),
             tpm_limit = COALESCE($3, tpm_limit),
             daily_token_limit = COALESCE($4, daily_token_limit)
         WHERE tenant_id = $1`,
        [
          tenantId,
          input.rpmLimit ?? null,
          input.tpmLimit ?? null,
          input.dailyTokenQuota ?? null,
        ],
      );
      await client.query(
        `UPDATE tenants
         SET monthly_budget = COALESCE($2, monthly_budget), updated_at = now()
         WHERE id = $1`,
        [tenantId, input.monthlyBudgetCny ?? null],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return (await this.loadTenants(tenantId))[0];
  }

  async createApiKey(tenantId: string, name: string) {
    const tenant = await this.pool.query(
      "SELECT id FROM tenants WHERE id = $1",
      [tenantId],
    );
    if (tenant.rowCount === 0) return undefined;

    const raw = randomBytes(24).toString("base64url");
    const secret = `mm_live_${raw}`;
    const id = `key-${randomUUID()}`;
    const result = await this.pool.query(
      `INSERT INTO api_keys
         (id, tenant_id, name, key_prefix, key_hash, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, tenant_id, name, key_prefix, status, created_at, last_used_at`,
      [
        id,
        tenantId,
        name.trim(),
        secret.slice(0, 16),
        createHash("sha256").update(secret).digest("hex"),
      ],
    );
    return {
      apiKey: publicApiKey(result.rows[0] as ApiKeyRow),
      secret,
    };
  }

  async revokeApiKey(keyId: string): Promise<ApiKeyDescriptor | undefined> {
    const result = await this.pool.query(
      `UPDATE api_keys
       SET status = 'revoked'
       WHERE id = $1
       RETURNING id, tenant_id, name, key_prefix, status, created_at, last_used_at`,
      [keyId],
    );
    const row = result.rows[0] as ApiKeyRow | undefined;
    return row ? publicApiKey(row) : undefined;
  }
}
