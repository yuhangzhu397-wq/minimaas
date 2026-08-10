import { describe, expect, it, vi } from "vitest";
import { OllamaAdapter } from "./ollama-adapter.js";

const request = {
  model: "ollama-chat",
  messages: [{ role: "user" as const, content: "解释 MaaS" }],
  temperature: 0.3,
  max_tokens: 64,
};

describe("OllamaAdapter", () => {
  it("maps a non-streaming Ollama response to the shared adapter contract", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          message: { role: "assistant", content: "统一接入与治理" },
          done: true,
          done_reason: "stop",
          prompt_eval_count: 8,
          eval_count: 5,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const adapter = new OllamaAdapter({
      baseUrl: "http://ollama.test/",
      model: "qwen-test",
      timeoutMs: 1_000,
      fetch: fetchMock,
    });

    const result = await adapter.chat(request);

    expect(result).toEqual({
      text: "统一接入与治理",
      finishReason: "stop",
      usage: {
        prompt_tokens: 8,
        completion_tokens: 5,
        total_tokens: 13,
        estimated: false,
      },
    });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "qwen-test",
      stream: false,
      options: { temperature: 0.3, num_predict: 64 },
    });
  });

  it("parses Ollama NDJSON chunks and preserves final usage", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            '{"message":{"content":"统一"},"done":false}\n' +
              '{"message":{"content":"治理"},"done":false}\n',
          ),
        );
        controller.enqueue(
          encoder.encode(
            '{"message":{"content":""},"done":true,"done_reason":"stop","prompt_eval_count":4,"eval_count":2}\n',
          ),
        );
        controller.close();
      },
    });
    const adapter = new OllamaAdapter({
      baseUrl: "http://ollama.test",
      model: "qwen-test",
      timeoutMs: 1_000,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response(body)),
    });

    const chunks = [];
    for await (const chunk of adapter.stream(request)) chunks.push(chunk);

    expect(chunks.map((chunk) => chunk.text).join("")).toBe("统一治理");
    expect(chunks.at(-1)?.usage?.total_tokens).toBe(6);
  });

  it("reports unhealthy when the configured model is not installed", async () => {
    const adapter = new OllamaAdapter({
      baseUrl: "http://ollama.test",
      model: "missing-model",
      timeoutMs: 1_000,
      fetch: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify({ models: [{ name: "other-model" }] })),
        ),
    });

    await expect(adapter.healthCheck()).resolves.toBe(false);
  });

  it("propagates caller cancellation to the provider request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      async (_input, init) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    );
    const adapter = new OllamaAdapter({
      baseUrl: "http://ollama.test",
      model: "qwen-test",
      timeoutMs: 5_000,
      fetch: fetchMock,
    });
    const controller = new AbortController();
    const pending = adapter.chat(request, controller.signal);

    controller.abort(new DOMException("client left", "AbortError"));

    await expect(pending).rejects.toMatchObject({
      code: "provider_timeout",
      statusCode: 504,
    });
  });
});
