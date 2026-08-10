import type { ChatCompletionRequest } from "@minimaas/contracts";
import type {
  AdapterResult,
  AdapterStreamChunk,
  ModelAdapter,
} from "./adapter.js";

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 3));
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new Error("aborted"));
      },
      { once: true },
    );
  });
}

export class MockAdapter implements ModelAdapter {
  readonly provider = "mock";

  async chat(
    request: ChatCompletionRequest,
    signal?: AbortSignal,
  ): Promise<AdapterResult> {
    await delay(80, signal);
    const lastMessage = request.messages.at(-1)?.content ?? "";
    const text = `这是来自 MiniMaaS Mock Provider 的响应。你刚才的问题是：“${lastMessage}”。当前链路已经经过统一协议、虚拟模型路由和用量计量骨架。`;
    const promptTokens = request.messages.reduce(
      (sum, message) => sum + estimateTokens(message.content),
      0,
    );
    const completionTokens = estimateTokens(text);

    return {
      text,
      finishReason: "stop",
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        estimated: true,
      },
    };
  }

  async *stream(
    request: ChatCompletionRequest,
    signal?: AbortSignal,
  ): AsyncIterable<AdapterStreamChunk> {
    const result = await this.chat(request, signal);
    const chunks = result.text.match(/.{1,8}/gu) ?? [result.text];
    for (const chunk of chunks) {
      await delay(35, signal);
      yield { text: chunk };
    }
    yield {
      text: "",
      finishReason: result.finishReason,
      usage: result.usage,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
