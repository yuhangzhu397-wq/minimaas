import type { FastifyInstance } from "fastify";
import type { ModelRouter } from "../modules/router.js";

export async function registerHealthRoutes(
  app: FastifyInstance,
  router: ModelRouter,
) {
  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async (_request, reply) => {
    const providers = await router.providerHealth();
    const ready = providers[router.defaultProvider()] === "up";
    return reply.status(ready ? 200 : 503).send({
      status: ready ? "ready" : "not_ready",
      defaultProvider: router.defaultProvider(),
      checks: { providers },
    });
  });
}
