import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  Usage,
} from "@minimaas/contracts";

export interface AdapterResult {
  text: string;
  finishReason: "stop" | "length";
  usage: Usage;
}

export interface AdapterStreamChunk {
  text: string;
  finishReason?: "stop" | "length";
  usage?: Usage;
}

export interface ModelAdapter {
  readonly provider: string;
  chat(
    request: ChatCompletionRequest,
    signal?: AbortSignal,
  ): Promise<AdapterResult>;
  stream(
    request: ChatCompletionRequest,
    signal?: AbortSignal,
  ): AsyncIterable<AdapterStreamChunk>;
  healthCheck(): Promise<boolean>;
}

export interface RoutedModel {
  virtualModel: string;
  physicalModel: string;
  adapter: ModelAdapter;
  pricing: ModelPricing;
}

export interface ModelPricing {
  inputCnyPerMillionTokens: number;
  outputCnyPerMillionTokens: number;
}

export function toCompletionResponse(
  id: string,
  routed: RoutedModel,
  result: AdapterResult,
): ChatCompletionResponse {
  return {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: routed.virtualModel,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: result.text },
        finish_reason: result.finishReason,
      },
    ],
    usage: result.usage,
  };
}
