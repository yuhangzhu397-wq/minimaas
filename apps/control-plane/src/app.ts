import cors from "@fastify/cors";
import Fastify from "fastify";
import type {
  CreateApiKeyRequest,
  CreateTenantRequest,
  UpdateTenantQuotaRequest,
} from "@minimaas/contracts";
import { dashboardSeed } from "./seed.js";
import { TenantStore, type TenantRepository } from "./tenant-store.js";

const quotaFields = new Set([
  "rpmLimit",
  "tpmLimit",
  "dailyTokenQuota",
  "monthlyBudgetCny",
]);

export async function buildControlPlane(
  options: { tenantStore?: TenantRepository } = {},
) {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });
  await app.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "OPTIONS"],
  });
  const tenantStore: TenantRepository =
    options.tenantStore ?? new TenantStore();
  app.addHook("onClose", async () => {
    await tenantStore.close?.();
  });

  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async () => ({
    status: "ready",
    checks: {
      database:
        tenantStore.backend === "postgres" ? "connected" : "not-configured",
      redis: "not-configured",
      configurationSnapshot: "loaded",
    },
  }));

  app.get("/admin/overview", async () => dashboardSeed());

  app.get("/admin/models", async () => ({
    data: dashboardSeed().models,
    meta: { source: "seed", total: 2 },
  }));

  app.get("/admin/route-policies", async () => ({
    data: [
      {
        id: "default-v1",
        virtualModel: "smart-chat",
        version: 1,
        status: "published",
        targets: [{ model: "mock-v1", weight: 100, priority: 1 }],
      },
    ],
  }));

  app.get("/admin/tenants", async () => {
    const data = await tenantStore.list();
    return {
      data,
      meta: {
        source: tenantStore.backend === "postgres" ? "database" : "memory",
        total: data.length,
      },
    };
  });

  app.get("/internal/gateway/auth-snapshot", async () => ({
    version: Date.now(),
    generatedAt: new Date().toISOString(),
    keys: await tenantStore.authSnapshot(),
  }));

  app.post<{ Body: CreateTenantRequest }>(
    "/admin/tenants",
    async (request, reply) => {
      const { name, allowedModels, dailyTokenQuota, monthlyBudgetCny } =
        request.body ?? {};
      if (
        typeof name !== "string" ||
        !name.trim() ||
        !Array.isArray(allowedModels) ||
        !allowedModels.every((model) => typeof model === "string") ||
        typeof dailyTokenQuota !== "number" ||
        dailyTokenQuota <= 0 ||
        (request.body.rpmLimit !== undefined &&
          (typeof request.body.rpmLimit !== "number" ||
            request.body.rpmLimit <= 0)) ||
        (request.body.tpmLimit !== undefined &&
          (typeof request.body.tpmLimit !== "number" ||
            request.body.tpmLimit <= 0)) ||
        typeof monthlyBudgetCny !== "number" ||
        monthlyBudgetCny <= 0
      ) {
        return reply.status(400).send({ error: "invalid_tenant_payload" });
      }
      return reply.status(201).send(await tenantStore.create(request.body));
    },
  );

  app.post<{ Params: { tenantId: string }; Body: CreateApiKeyRequest }>(
    "/admin/tenants/:tenantId/api-keys",
    async (request, reply) => {
      if (typeof request.body?.name !== "string" || !request.body.name.trim()) {
        return reply.status(400).send({ error: "invalid_api_key_payload" });
      }
      const result = await tenantStore.createApiKey(
        request.params.tenantId,
        request.body.name,
      );
      if (!result) return reply.status(404).send({ error: "tenant_not_found" });
      return reply.status(201).send(result);
    },
  );

  app.patch<{ Params: { tenantId: string }; Body: UpdateTenantQuotaRequest }>(
    "/admin/tenants/:tenantId/quota",
    async (request, reply) => {
      const body = request.body ?? {};
      const entries = Object.entries(body);
      if (
        entries.length === 0 ||
        entries.some(
          ([field, value]) =>
            !quotaFields.has(field) ||
            typeof value !== "number" ||
            !Number.isFinite(value) ||
            value <= 0,
        )
      ) {
        return reply.status(400).send({ error: "invalid_quota_payload" });
      }
      const tenant = await tenantStore.updateQuota(
        request.params.tenantId,
        body,
      );
      if (!tenant) return reply.status(404).send({ error: "tenant_not_found" });
      return { tenant };
    },
  );

  app.post<{ Params: { keyId: string } }>(
    "/admin/api-keys/:keyId/revoke",
    async (request, reply) => {
      const apiKey = await tenantStore.revokeApiKey(request.params.keyId);
      if (!apiKey)
        return reply.status(404).send({ error: "api_key_not_found" });
      return { apiKey };
    },
  );

  return app;
}
