import type { ModelAdapter, ModelPricing, RoutedModel } from "./adapter.js";

export interface RegisteredModel {
  id: string;
  physicalModel: string;
  provider: string;
  adapter: ModelAdapter;
  pricing: ModelPricing;
  isDefault: boolean;
}

export interface ModelRouter {
  route(virtualModel: string): Promise<RoutedModel>;
  listModels(): RegisteredModel[];
  providerHealth(): Promise<Record<string, "up" | "down">>;
  defaultProvider(): string;
}

export class StaticModelRouter implements ModelRouter {
  private readonly models: RegisteredModel[];

  constructor(
    mockAdapter: ModelAdapter,
    ollamaAdapter: ModelAdapter,
    private readonly configuredDefault: "mock" | "ollama",
    ollamaPhysicalModel: string,
  ) {
    this.models = [
      {
        id: "mock-chat",
        physicalModel: "mock-v1",
        provider: mockAdapter.provider,
        adapter: mockAdapter,
        pricing: {
          inputCnyPerMillionTokens: 2,
          outputCnyPerMillionTokens: 8,
        },
        isDefault: configuredDefault === "mock",
      },
      {
        id: "ollama-chat",
        physicalModel: ollamaPhysicalModel,
        provider: ollamaAdapter.provider,
        adapter: ollamaAdapter,
        pricing: {
          inputCnyPerMillionTokens: 0,
          outputCnyPerMillionTokens: 0,
        },
        isDefault: configuredDefault === "ollama",
      },
    ];
  }

  async route(virtualModel: string): Promise<RoutedModel> {
    const selected =
      virtualModel === "smart-chat"
        ? this.models.find((model) => model.isDefault)
        : this.models.find((model) => model.id === virtualModel);
    if (!selected) throw new UnknownModelError(virtualModel);
    return {
      virtualModel,
      physicalModel: selected.physicalModel,
      adapter: selected.adapter,
      pricing: selected.pricing,
    };
  }

  listModels(): RegisteredModel[] {
    const defaultModel = this.models.find((model) => model.isDefault);
    return [
      {
        id: "smart-chat",
        physicalModel: defaultModel?.physicalModel ?? "unknown",
        provider: defaultModel?.provider ?? this.configuredDefault,
        adapter: defaultModel?.adapter ?? this.models[0].adapter,
        pricing: defaultModel?.pricing ?? this.models[0].pricing,
        isDefault: true,
      },
      ...this.models,
    ];
  }

  async providerHealth(): Promise<Record<string, "up" | "down">> {
    const adapters = new Map(
      this.models.map((model) => [model.provider, model.adapter]),
    );
    const checks = await Promise.all(
      [...adapters.entries()].map(
        async ([provider, adapter]) =>
          [provider, (await adapter.healthCheck()) ? "up" : "down"] as const,
      ),
    );
    return Object.fromEntries(checks);
  }

  defaultProvider(): string {
    return this.configuredDefault;
  }
}

export class UnknownModelError extends Error {
  constructor(readonly model: string) {
    super(`Unknown model: ${model}`);
  }
}
