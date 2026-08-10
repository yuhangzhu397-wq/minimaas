import type { ChatCompletionRequest, Usage } from "@minimaas/contracts";
import type {
  AdapterResult,
  AdapterStreamChunk,
  ModelAdapter,
} from "./adapter.js";
import { ProviderError, normalizeProviderFailure } from "./errors.js";

interface OllamaChatResponse {
  message?: { role?: string; content?: string };
  done?: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

export interface OllamaAdapterOptions {
  baseUrl: string;
  model: string;
  timeoutMs: number;
  fetch?: typeof fetch;
}

function usageOf(response: OllamaChatResponse): Usage {
  const promptTokens = response.prompt_eval_count ?? 0;
  const completionTokens = response.eval_count ?? 0;
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    estimated:
      response.prompt_eval_count === undefined ||
      response.eval_count === undefined,
  };
}

function finishReasonOf(reason?: string): "stop" | "length" {
  return reason === "length" ? "length" : "stop";
}

export class OllamaAdapter implements ModelAdapter {
  readonly provider = "ollama";
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: OllamaAdapterOptions) {
    this.fetchImpl = options.fetch ?? fetch;
    this.baseUrl = options.baseUrl.replace(/\/$/u, "");
  }

  private requestBody(request: ChatCompletionRequest, stream: boolean) {
    return {
      model: this.options.model,
      messages: request.messages,
      stream,
      options: {
        ...(request.temperature === undefined
          ? {}
          : { temperature: request.temperature }),
        ...(request.max_tokens === undefined
          ? {}
          : { num_predict: request.max_tokens }),
        ...(request.stop === undefined ? {} : { stop: request.stop }),
      },
    };
  }

  private timeoutSignal(signal?: AbortSignal): AbortSignal {
    const timeout = AbortSignal.timeout(this.options.timeoutMs);
    return signal ? AbortSignal.any([signal, timeout]) : timeout;
  }

  private async open(
    request: ChatCompletionRequest,
    stream: boolean,
    signal?: AbortSignal,
  ): Promise<Response> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(this.requestBody(request, stream)),
        signal: this.timeoutSignal(signal),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new ProviderError(
          `Ollama rejected the request (${response.status})${detail ? `: ${detail}` : ""}`,
          "provider_rejected_request",
          this.provider,
          response.status >= 500 ? 502 : 400,
          response.status >= 500,
        );
      }
      return response;
    } catch (error) {
      throw normalizeProviderFailure(error, this.provider);
    }
  }

  async chat(
    request: ChatCompletionRequest,
    signal?: AbortSignal,
  ): Promise<AdapterResult> {
    const response = await this.open(request, false, signal);
    let payload: OllamaChatResponse;
    try {
      payload = (await response.json()) as OllamaChatResponse;
    } catch (error) {
      throw new ProviderError(
        "Ollama returned invalid JSON",
        "provider_protocol_error",
        this.provider,
        502,
        true,
        { cause: error },
      );
    }
    if (payload.error) {
      throw new ProviderError(
        `Ollama error: ${payload.error}`,
        "provider_rejected_request",
        this.provider,
        502,
      );
    }
    return {
      text: payload.message?.content ?? "",
      finishReason: finishReasonOf(payload.done_reason),
      usage: usageOf(payload),
    };
  }

  async *stream(
    request: ChatCompletionRequest,
    signal?: AbortSignal,
  ): AsyncIterable<AdapterStreamChunk> {
    const response = await this.open(request, true, signal);
    if (!response.body) {
      throw new ProviderError(
        "Ollama returned an empty stream",
        "provider_protocol_error",
        this.provider,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          yield this.parseStreamLine(line);
        }
        if (done) break;
      }
      if (buffer.trim()) yield this.parseStreamLine(buffer);
    } catch (error) {
      throw normalizeProviderFailure(error, this.provider);
    } finally {
      reader.releaseLock();
    }
  }

  private parseStreamLine(line: string): AdapterStreamChunk {
    let payload: OllamaChatResponse;
    try {
      payload = JSON.parse(line) as OllamaChatResponse;
    } catch (error) {
      throw new ProviderError(
        "Ollama returned invalid NDJSON",
        "provider_protocol_error",
        this.provider,
        502,
        true,
        { cause: error },
      );
    }
    if (payload.error) {
      throw new ProviderError(
        `Ollama error: ${payload.error}`,
        "provider_rejected_request",
        this.provider,
      );
    }
    return {
      text: payload.message?.content ?? "",
      ...(payload.done
        ? {
            finishReason: finishReasonOf(payload.done_reason),
            usage: usageOf(payload),
          }
        : {}),
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(Math.min(this.options.timeoutMs, 2_000)),
      });
      if (!response.ok) return false;
      const payload = (await response.json()) as {
        models?: Array<{ name?: string; model?: string }>;
      };
      return (payload.models ?? []).some(
        (model) =>
          model.name === this.options.model ||
          model.model === this.options.model,
      );
    } catch {
      return false;
    }
  }
}
