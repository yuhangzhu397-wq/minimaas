import { randomUUID } from "node:crypto";
import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  GatewayErrorResponse,
  Usage,
} from "@minimaas/contracts";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { toCompletionResponse } from "../modules/adapter.js";
import { ProviderError } from "../modules/errors.js";
import type { GatewayPipeline } from "../modules/pipeline.js";
import { quotaHeaders } from "../modules/quota.js";
import { rateLimitHeaders } from "../modules/rate-limit.js";

const requestSchema = z.object({
  model: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool"]),
        content: z.string(),
      }),
    )
    .min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
});

function requestIdOf(request: FastifyRequest): string {
  return (request.id || randomUUID()).toString();
}

function writeData(
  reply: { raw: { write(data: string): boolean } },
  data: unknown,
) {
  reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function registerChatRoutes(
  app: FastifyInstance,
  pipeline: GatewayPipeline,
) {
  app.post("/v1/chat/completions", async (request, reply) => {
    const body = requestSchema.parse(request.body) as ChatCompletionRequest;
    const requestId = requestIdOf(request);
    const prepared = await pipeline.prepare(
      body,
      request.headers.authorization,
      requestId,
    );

    if (!body.stream) {
      for (const [name, value] of Object.entries(
        rateLimitHeaders(prepared.rateLimit),
      )) {
        reply.header(name, value);
      }
      for (const [name, value] of Object.entries(
        quotaHeaders(prepared.quota),
      )) {
        reply.header(name, value);
      }
      try {
        const result = await prepared.routedModel.adapter.chat(
          body,
          request.signal,
        );
        await pipeline.settle(prepared, result.usage);
        await pipeline.metering.record({
          requestId,
          principal: prepared.principal,
          routedModel: prepared.routedModel,
          usage: result.usage,
          latencyMs: Date.now() - prepared.startedAt,
          status: "success",
        });
        reply.header("x-request-id", requestId);
        return toCompletionResponse(requestId, prepared.routedModel, result);
      } catch (error) {
        const usage: Usage = {
          prompt_tokens: prepared.estimatedPromptTokens,
          completion_tokens: 0,
          total_tokens: prepared.estimatedPromptTokens,
          estimated: true,
        };
        await pipeline.settle(prepared, usage);
        await pipeline.metering.record({
          requestId,
          principal: prepared.principal,
          routedModel: prepared.routedModel,
          usage,
          latencyMs: Date.now() - prepared.startedAt,
          status: "error",
        });
        throw error;
      }
    }

    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
      "x-request-id": requestId,
      "access-control-allow-origin": request.headers.origin ?? "*",
      "access-control-expose-headers":
        "x-request-id, x-ratelimit-limit-requests, x-ratelimit-remaining-requests, x-ratelimit-limit-tokens, x-ratelimit-remaining-tokens, x-quota-limit-tokens-daily, x-quota-remaining-tokens-daily, x-budget-limit-cny-monthly, x-budget-remaining-cny-monthly",
      vary: "origin",
      ...rateLimitHeaders(prepared.rateLimit),
      ...quotaHeaders(prepared.quota),
    });

    const streamController = new AbortController();
    const abortStream = () =>
      streamController.abort(
        new DOMException("Client disconnected", "AbortError"),
      );
    request.signal.addEventListener("abort", abortStream, { once: true });
    reply.raw.on("close", abortStream);

    const baseChunk = {
      id: requestId,
      object: "chat.completion.chunk" as const,
      created: Math.floor(Date.now() / 1000),
      model: prepared.routedModel.virtualModel,
    };
    let usage: Usage = {
      prompt_tokens: prepared.estimatedPromptTokens,
      completion_tokens: 0,
      total_tokens: prepared.estimatedPromptTokens,
      estimated: true,
    };
    let finishReason: "stop" | "length" = "stop";

    try {
      const roleChunk: ChatCompletionChunk = {
        ...baseChunk,
        choices: [
          { index: 0, delta: { role: "assistant" }, finish_reason: null },
        ],
      };
      writeData(reply, roleChunk);

      for await (const adapterChunk of prepared.routedModel.adapter.stream(
        body,
        streamController.signal,
      )) {
        if (adapterChunk.usage) usage = adapterChunk.usage;
        if (adapterChunk.finishReason) finishReason = adapterChunk.finishReason;
        if (!adapterChunk.text) continue;
        if (usage.estimated) {
          usage = {
            ...usage,
            completion_tokens:
              usage.completion_tokens + Math.ceil(adapterChunk.text.length / 3),
            total_tokens:
              usage.prompt_tokens +
              usage.completion_tokens +
              Math.ceil(adapterChunk.text.length / 3),
          };
        }
        const chunk: ChatCompletionChunk = {
          ...baseChunk,
          choices: [
            {
              index: 0,
              delta: { content: adapterChunk.text },
              finish_reason: null,
            },
          ],
        };
        writeData(reply, chunk);
      }

      const finishChunk: ChatCompletionChunk = {
        ...baseChunk,
        choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
      };
      writeData(reply, finishChunk);
      reply.raw.end("data: [DONE]\n\n");
      await pipeline.settle(prepared, usage);
      await pipeline.metering.record({
        requestId,
        principal: prepared.principal,
        routedModel: prepared.routedModel,
        usage,
        latencyMs: Date.now() - prepared.startedAt,
        status: "success",
      });
    } catch (error) {
      await pipeline.settle(prepared, usage);
      await pipeline.metering.record({
        requestId,
        principal: prepared.principal,
        routedModel: prepared.routedModel,
        usage,
        latencyMs: Date.now() - prepared.startedAt,
        status: "error",
      });
      if (!streamController.signal.aborted && !reply.raw.destroyed) {
        const providerError =
          error instanceof ProviderError
            ? error
            : new ProviderError(
                "Provider stream failed",
                "provider_unavailable",
                prepared.routedModel.adapter.provider,
              );
        const body: GatewayErrorResponse = {
          error: {
            message: providerError.message,
            type: "provider_error",
            code: providerError.code,
            request_id: requestId,
          },
        };
        reply.raw.write(`event: error\ndata: ${JSON.stringify(body)}\n\n`);
        reply.raw.end("data: [DONE]\n\n");
      }
      request.log.warn(
        { error, requestId, aborted: streamController.signal.aborted },
        "provider stream ended with an error",
      );
    } finally {
      request.signal.removeEventListener("abort", abortStream);
      reply.raw.off("close", abortStream);
    }
  });
}
