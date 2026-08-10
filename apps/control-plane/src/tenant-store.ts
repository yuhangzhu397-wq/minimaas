import { createHash, randomBytes, randomUUID } from "node:crypto";
import type {
  ApiKeyDescriptor,
  CreateTenantRequest,
  GatewayAuthSnapshotEntry,
  TenantDescriptor,
  UpdateTenantQuotaRequest,
} from "@minimaas/contracts";

interface StoredApiKey extends ApiKeyDescriptor {
  secretHash: string;
}

interface StoredTenant extends Omit<TenantDescriptor, "apiKeys"> {
  apiKeys: StoredApiKey[];
}

type Awaitable<T> = T | Promise<T>;

export interface TenantRepository {
  readonly backend: "memory" | "postgres";
  list(): Awaitable<TenantDescriptor[]>;
  authSnapshot(): Awaitable<GatewayAuthSnapshotEntry[]>;
  create(input: CreateTenantRequest): Awaitable<TenantDescriptor>;
  updateQuota(
    tenantId: string,
    input: UpdateTenantQuotaRequest,
  ): Awaitable<TenantDescriptor | undefined>;
  createApiKey(
    tenantId: string,
    name: string,
  ): Awaitable<{ apiKey: ApiKeyDescriptor; secret: string } | undefined>;
  revokeApiKey(keyId: string): Awaitable<ApiKeyDescriptor | undefined>;
  close?(): Awaitable<void>;
}

const publicTenant = (tenant: StoredTenant): TenantDescriptor => ({
  ...tenant,
  apiKeys: tenant.apiKeys.map(
    ({ secretHash: _secretHash, ...apiKey }) => apiKey,
  ),
});

export class TenantStore implements TenantRepository {
  readonly backend = "memory" as const;
  private readonly tenants = new Map<string, StoredTenant>();

  constructor(now = new Date()) {
    const createdAt = now.toISOString();
    this.tenants.set("tenant-joylab", {
      id: "tenant-joylab",
      name: "JoyLab 产品团队",
      status: "active",
      allowedModels: ["smart-chat", "mock-chat"],
      rpmLimit: 60,
      tpmLimit: 100_000,
      dailyTokenQuota: 2_000_000,
      monthlyBudgetCny: 3000,
      createdAt,
      apiKeys: [
        {
          id: "key-development",
          tenantId: "tenant-joylab",
          name: "开发环境",
          prefix: "mm_dev_minimaas",
          secretHash: createHash("sha256")
            .update("mm_dev_minimaas_local")
            .digest("hex"),
          status: "active",
          createdAt,
          lastUsedAt: new Date(now.getTime() - 18 * 60_000).toISOString(),
        },
      ],
    });
  }

  list(): TenantDescriptor[] {
    return [...this.tenants.values()].map(publicTenant);
  }

  authSnapshot(): GatewayAuthSnapshotEntry[] {
    return [...this.tenants.values()].flatMap((tenant) =>
      tenant.status === "active"
        ? tenant.apiKeys
            .filter((apiKey) => apiKey.status === "active")
            .map((apiKey) => ({
              keyId: apiKey.id,
              keyHash: apiKey.secretHash,
              tenantId: tenant.id,
              environment: "development" as const,
              allowedModels: [...tenant.allowedModels],
              rpmLimit: tenant.rpmLimit,
              tpmLimit: tenant.tpmLimit,
              dailyTokenQuota: tenant.dailyTokenQuota,
              monthlyBudgetCny: tenant.monthlyBudgetCny,
            }))
        : [],
    );
  }

  create(input: CreateTenantRequest): TenantDescriptor {
    const id = `tenant-${randomUUID()}`;
    const tenant: StoredTenant = {
      id,
      name: input.name.trim(),
      status: "active",
      allowedModels: [...new Set(input.allowedModels)],
      rpmLimit: input.rpmLimit ?? 60,
      tpmLimit: input.tpmLimit ?? 100_000,
      dailyTokenQuota: input.dailyTokenQuota,
      monthlyBudgetCny: input.monthlyBudgetCny,
      apiKeys: [],
      createdAt: new Date().toISOString(),
    };
    this.tenants.set(id, tenant);
    return publicTenant(tenant);
  }

  updateQuota(
    tenantId: string,
    input: UpdateTenantQuotaRequest,
  ): TenantDescriptor | undefined {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return undefined;
    if (input.rpmLimit !== undefined) tenant.rpmLimit = input.rpmLimit;
    if (input.tpmLimit !== undefined) tenant.tpmLimit = input.tpmLimit;
    if (input.dailyTokenQuota !== undefined) {
      tenant.dailyTokenQuota = input.dailyTokenQuota;
    }
    if (input.monthlyBudgetCny !== undefined) {
      tenant.monthlyBudgetCny = input.monthlyBudgetCny;
    }
    return publicTenant(tenant);
  }

  createApiKey(tenantId: string, name: string) {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return undefined;

    const raw = randomBytes(24).toString("base64url");
    const secret = `mm_live_${raw}`;
    const apiKey: StoredApiKey = {
      id: `key-${randomUUID()}`,
      tenantId,
      name: name.trim(),
      prefix: secret.slice(0, 16),
      secretHash: createHash("sha256").update(secret).digest("hex"),
      status: "active",
      createdAt: new Date().toISOString(),
    };
    tenant.apiKeys.push(apiKey);
    const { secretHash: _secretHash, ...descriptor } = apiKey;
    return { apiKey: descriptor, secret };
  }

  revokeApiKey(keyId: string): ApiKeyDescriptor | undefined {
    for (const tenant of this.tenants.values()) {
      const apiKey = tenant.apiKeys.find((item) => item.id === keyId);
      if (!apiKey) continue;
      apiKey.status = "revoked";
      const { secretHash: _secretHash, ...descriptor } = apiKey;
      return descriptor;
    }
    return undefined;
  }
}
