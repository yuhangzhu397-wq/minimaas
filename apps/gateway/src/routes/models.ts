import type { ModelsResponse } from "@minimaas/contracts";
import type { FastifyInstance } from "fastify";
import type { ModelRouter } from "../modules/router.js";

export async function registerModelRoutes(
  app: FastifyInstance,
  router: ModelRouter,
) {
  app.get("/v1/models", async (): Promise<ModelsResponse> => {
    const health = await router.providerHealth();
    return {
      object: "list",
      data: router.listModels().map((model) => ({
        id: model.id,
        object: "model",
        created: 0,
        owned_by: `minimaas/${model.provider}`,
        kind: "virtual",
        status: health[model.provider] === "up" ? "healthy" : "offline",
        physical_model: model.physicalModel,
        is_default: model.id === "smart-chat",
      })),
    };
  });
}
