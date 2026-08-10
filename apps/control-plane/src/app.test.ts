import { afterEach, describe, expect, it } from "vitest";
import { buildControlPlane } from "./app.js";

const apps: Awaited<ReturnType<typeof buildControlPlane>>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("MiniMaaS control plane", () => {
  it("serves the dashboard overview", async () => {
    const app = await buildControlPlane();
    apps.push(app);
    const response = await app.inject({
      method: "GET",
      url: "/admin/overview",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      source: "seed",
      metrics: { requests: 12840 },
    });
  });

  it("creates tenants and only returns an API key secret once", async () => {
    const app = await buildControlPlane();
    apps.push(app);
    const created = await app.inject({
      method: "POST",
      url: "/admin/tenants",
      payload: {
        name: "Interview Lab",
        allowedModels: ["smart-chat"],
        dailyTokenQuota: 100000,
        monthlyBudgetCny: 500,
      },
    });
    expect(created.statusCode).toBe(201);
    const tenant = created.json();

    const keyResponse = await app.inject({
      method: "POST",
      url: `/admin/tenants/${tenant.id}/api-keys`,
      payload: { name: "面试演示" },
    });
    expect(keyResponse.statusCode).toBe(201);
    expect(keyResponse.json().secret).toMatch(/^mm_live_/u);

    const list = await app.inject({ method: "GET", url: "/admin/tenants" });
    const listedKey = list
      .json()
      .data.find((item: { id: string }) => item.id === tenant.id).apiKeys[0];
    expect(listedKey.prefix).toMatch(/^mm_live_/u);
    expect(listedKey).not.toHaveProperty("secret");
    expect(listedKey).not.toHaveProperty("secretHash");
  });

  it("revokes an API key", async () => {
    const app = await buildControlPlane();
    apps.push(app);
    const list = await app.inject({ method: "GET", url: "/admin/tenants" });
    const keyId = list.json().data[0].apiKeys[0].id;
    const revoked = await app.inject({
      method: "POST",
      url: `/admin/api-keys/${keyId}/revoke`,
    });
    expect(revoked.statusCode).toBe(200);
    expect(revoked.json().apiKey.status).toBe("revoked");
  });

  it("publishes active key hashes to the gateway snapshot", async () => {
    const app = await buildControlPlane();
    apps.push(app);
    const tenants = await app.inject({ method: "GET", url: "/admin/tenants" });
    const tenantId = tenants.json().data[0].id;
    const created = await app.inject({
      method: "POST",
      url: `/admin/tenants/${tenantId}/api-keys`,
      payload: { name: "gateway-test" },
    });
    const { secret, apiKey } = created.json();

    const snapshot = await app.inject({
      method: "GET",
      url: "/internal/gateway/auth-snapshot",
    });
    const entry = snapshot
      .json()
      .keys.find((item: { keyId: string }) => item.keyId === apiKey.id);
    expect(entry).toMatchObject({
      tenantId,
      allowedModels: ["smart-chat", "mock-chat"],
    });
    expect(entry.keyHash).not.toBe(secret);
    expect(entry.keyHash).toHaveLength(64);
  });

  it("updates tenant quotas and publishes them in the gateway snapshot", async () => {
    const app = await buildControlPlane();
    apps.push(app);
    const updated = await app.inject({
      method: "PATCH",
      url: "/admin/tenants/tenant-joylab/quota",
      payload: { rpmLimit: 12, tpmLimit: 24000, dailyTokenQuota: 500000 },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().tenant).toMatchObject({
      rpmLimit: 12,
      tpmLimit: 24000,
      dailyTokenQuota: 500000,
    });

    const snapshot = await app.inject({
      method: "GET",
      url: "/internal/gateway/auth-snapshot",
    });
    expect(snapshot.json().keys[0]).toMatchObject({
      rpmLimit: 12,
      tpmLimit: 24000,
      dailyTokenQuota: 500000,
      monthlyBudgetCny: 3000,
    });
  });

  it("rejects invalid quota updates", async () => {
    const app = await buildControlPlane();
    apps.push(app);
    const response = await app.inject({
      method: "PATCH",
      url: "/admin/tenants/tenant-joylab/quota",
      payload: { rpmLimit: 0 },
    });
    expect(response.statusCode).toBe(400);
  });

  it("allows browser clients to preflight quota updates", async () => {
    const app = await buildControlPlane();
    apps.push(app);
    const response = await app.inject({
      method: "OPTIONS",
      url: "/admin/tenants/tenant-joylab/quota",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "PATCH",
      },
    });
    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toContain("PATCH");
  });
});
