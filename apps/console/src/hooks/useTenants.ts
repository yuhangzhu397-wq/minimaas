import type {
  CreateApiKeyResponse,
  CreateTenantRequest,
  TenantDescriptor,
  TenantsResponse,
  UpdateTenantQuotaRequest,
} from "@minimaas/contracts";
import { useCallback, useEffect, useState } from "react";

const controlPlaneUrl =
  import.meta.env.VITE_CONTROL_PLANE_URL ?? "http://localhost:8081";

export function useTenants() {
  const [data, setData] = useState<TenantDescriptor[]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const response = await fetch(`${controlPlaneUrl}/admin/tenants`, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as TenantsResponse;
      setData(payload.data);
      setStatus("live");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const createTenant = async (input: CreateTenantRequest) => {
    const response = await fetch(`${controlPlaneUrl}/admin/tenants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error("创建租户失败");
    const tenant = (await response.json()) as TenantDescriptor;
    setData((current) => [...current, tenant]);
    return tenant;
  };

  const createApiKey = async (tenantId: string, name: string) => {
    const response = await fetch(
      `${controlPlaneUrl}/admin/tenants/${tenantId}/api-keys`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      },
    );
    if (!response.ok) throw new Error("创建密钥失败");
    const payload = (await response.json()) as CreateApiKeyResponse;
    setData((current) =>
      current.map((tenant) =>
        tenant.id === tenantId
          ? { ...tenant, apiKeys: [...tenant.apiKeys, payload.apiKey] }
          : tenant,
      ),
    );
    return payload;
  };

  const revokeApiKey = async (keyId: string) => {
    const response = await fetch(`${controlPlaneUrl}/admin/api-keys/${keyId}/revoke`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("撤销密钥失败");
    setData((current) =>
      current.map((tenant) => ({
        ...tenant,
        apiKeys: tenant.apiKeys.map((apiKey) =>
          apiKey.id === keyId ? { ...apiKey, status: "revoked" } : apiKey,
        ),
      })),
    );
  };

  const updateQuota = async (
    tenantId: string,
    input: UpdateTenantQuotaRequest,
  ) => {
    const response = await fetch(
      `${controlPlaneUrl}/admin/tenants/${tenantId}/quota`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    if (!response.ok) throw new Error("更新配额失败");
    const payload = (await response.json()) as { tenant: TenantDescriptor };
    setData((current) =>
      current.map((tenant) =>
        tenant.id === tenantId ? payload.tenant : tenant,
      ),
    );
    return payload.tenant;
  };

  return {
    data,
    status,
    refresh: () => void refresh(),
    createTenant,
    createApiKey,
    revokeApiKey,
    updateQuota,
  };
}
