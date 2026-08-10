import { buildControlPlane } from "./app.js";
import { PostgresTenantStore } from "./postgres-tenant-store.js";
import { TenantStore, type TenantRepository } from "./tenant-store.js";

const host = process.env.CONTROL_PLANE_HOST ?? "0.0.0.0";
const port = Number(process.env.CONTROL_PLANE_PORT ?? 8081);
const tenantStoreBackend =
  process.env.TENANT_STORE_BACKEND === "postgres" ? "postgres" : "memory";
let tenantStore: TenantRepository = new TenantStore();
if (tenantStoreBackend === "postgres") {
  tenantStore = await PostgresTenantStore.connect(
    process.env.DATABASE_URL ??
      "postgresql://minimaas:minimaas@127.0.0.1:5432/minimaas",
  );
}
const app = await buildControlPlane({ tenantStore });
app.log.info({ tenantStoreBackend }, "tenant store initialized");

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ host, port });
