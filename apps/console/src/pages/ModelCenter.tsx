import type {
  ChatCompletionChunk,
  GatewayErrorResponse,
} from "@minimaas/contracts";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  PaperPlaneTiltIcon,
  StopCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useModels } from "../hooks/useModels";

const gatewayUrl = import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:8080";

export function ModelCenter() {
  const { data: models, status, refresh } = useModels();
  const [selectedModel, setSelectedModel] = useState("smart-chat");
  const [prompt, setPrompt] = useState("用三句话解释 MaaS 的核心价值。");
  const [apiKey, setApiKey] = useState(
    () => sessionStorage.getItem("minimaas.gatewayApiKey") ?? "",
  );
  const [answer, setAnswer] = useState("");
  const [governance, setGovernance] = useState<{
    remainingRequests: string;
    remainingTokens: string;
    remainingDailyTokens: string;
    remainingBudgetCny: string;
  } | null>(null);
  const [runStatus, setRunStatus] = useState<
    "idle" | "running" | "success" | "error" | "cancelled"
  >("idle");
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);

  const runTest = async () => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setAnswer("");
    setError("");
    setGovernance(null);
    setRunStatus("running");
    try {
      const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey.trim()
            ? { authorization: `Bearer ${apiKey.trim()}` }
            : {}),
        },
        body: JSON.stringify({
          model: selectedModel,
          stream: true,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });
      const remainingRequests = response.headers.get(
        "x-ratelimit-remaining-requests",
      );
      const remainingTokens = response.headers.get(
        "x-ratelimit-remaining-tokens",
      );
      const remainingDailyTokens = response.headers.get(
        "x-quota-remaining-tokens-daily",
      );
      const remainingBudgetCny = response.headers.get(
        "x-budget-remaining-cny-monthly",
      );
      if (
        remainingRequests &&
        remainingTokens &&
        remainingDailyTokens &&
        remainingBudgetCny
      ) {
        setGovernance({
          remainingRequests,
          remainingTokens,
          remainingDailyTokens,
          remainingBudgetCny,
        });
      }
      if (!response.ok) {
        const payload = (await response.json()) as GatewayErrorResponse;
        if (payload.error?.code === "invalid_api_key") {
          throw new Error("API Key 无效、已撤销或尚未设置。");
        }
        if (payload.error?.code === "model_access_denied") {
          throw new Error(`当前租户无权调用 ${selectedModel}。`);
        }
        if (payload.error?.code === "rate_limit_exceeded") {
          throw new Error("已达到本分钟的请求或 Token 配额，请稍后重试。");
        }
        if (payload.error?.code === "quota_exceeded") {
          throw new Error(
            payload.error.message === "Monthly budget exceeded"
              ? "本月预算已经用尽，请调整预算后重试。"
              : "今日 Token 配额已经用尽，请调整配额或明日重试。",
          );
        }
        throw new Error(payload.error?.message ?? `HTTP ${response.status}`);
      }
      if (!response.body) throw new Error("网关没有返回响应流");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const dataLine = event
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          const payloadText = dataLine.slice(6);
          if (payloadText === "[DONE]") continue;
          const payload = JSON.parse(payloadText) as
            ChatCompletionChunk | GatewayErrorResponse;
          if ("error" in payload) throw new Error(payload.error.message);
          const content = payload.choices[0]?.delta.content;
          if (content) setAnswer((current) => current + content);
        }
        if (done) break;
      }
      setRunStatus("success");
    } catch (caught) {
      if (controller.signal.aborted) {
        setRunStatus("cancelled");
      } else {
        setError(caught instanceof Error ? caught.message : "调用失败");
        setRunStatus("error");
      }
    } finally {
      controllerRef.current = null;
    }
  };

  const stopTest = () => controllerRef.current?.abort();

  return (
    <main className="module-main model-center-page">
      <section className="model-registry">
        <div className="module-section-heading">
          <div>
            <span className="section-index">01</span>
            <h3>模型注册表</h3>
          </div>
          <button className="quiet-action" type="button" onClick={refresh}>
            <ArrowClockwiseIcon size={16} weight="light" />
            {status === "loading" ? "刷新中" : "刷新状态"}
          </button>
        </div>
        {status === "error" ? (
          <div className="inline-error" role="alert">
            无法连接 MaaS 网关，请确认 8080 端口已经启动。
          </div>
        ) : null}
        <div className="model-registry-table">
          <div className="registry-row registry-head">
            <span>虚拟模型</span>
            <span>物理模型</span>
            <span>供应商</span>
            <span>状态</span>
            <span>默认</span>
          </div>
          {models.map((model) => (
            <button
              className={`registry-row ${selectedModel === model.id ? "selected" : ""}`}
              key={model.id}
              type="button"
              onClick={() => setSelectedModel(model.id)}
            >
              <strong>{model.id}</strong>
              <span>{model.physical_model ?? "—"}</span>
              <span>{model.owned_by.replace("minimaas/", "")}</span>
              <span className={`registry-status ${model.status}`}>
                <i />
                {model.status === "healthy" ? "可用" : "离线"}
              </span>
              <span>{model.is_default ? "是" : "—"}</span>
            </button>
          ))}
          {status === "loading" && models.length === 0 ? (
            <div className="registry-loading">正在读取模型注册表…</div>
          ) : null}
        </div>
      </section>

      <section className="model-playground">
        <div className="module-section-heading">
          <div>
            <span className="section-index">02</span>
            <h3>调用试验台</h3>
          </div>
          <span className="selected-model-label">MODEL / {selectedModel}</span>
        </div>
        <div className="playground-grid">
          <div className="prompt-editor">
            <div className="gateway-key-field">
              <label htmlFor="gateway-api-key">API Key</label>
              <input
                id="gateway-api-key"
                type="password"
                value={apiKey}
                placeholder="mm_live_…"
                autoComplete="off"
                onChange={(event) => {
                  const value = event.target.value;
                  setApiKey(value);
                  if (value)
                    sessionStorage.setItem("minimaas.gatewayApiKey", value);
                  else sessionStorage.removeItem("minimaas.gatewayApiKey");
                }}
              />
              <span>{apiKey ? "当前会话已设置" : "需要租户密钥"}</span>
            </div>
            <label htmlFor="model-prompt">用户消息</label>
            <textarea
              id="model-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className="prompt-actions">
              <span>STREAM · SSE</span>
              {runStatus === "running" ? (
                <button
                  className="run-button stop"
                  type="button"
                  onClick={stopTest}
                >
                  <StopCircleIcon size={17} />
                  停止生成
                </button>
              ) : (
                <button
                  className="run-button"
                  type="button"
                  disabled={!prompt.trim() || !apiKey.trim()}
                  onClick={() => void runTest()}
                >
                  <PaperPlaneTiltIcon size={17} />
                  发送测试
                </button>
              )}
            </div>
          </div>
          <div className={`response-view ${runStatus}`} aria-live="polite">
            <div className="response-heading">
              <span>模型响应</span>
              {runStatus === "success" ? (
                <CheckCircleIcon size={17} weight="fill" />
              ) : null}
              {runStatus === "error" ? (
                <WarningCircleIcon size={17} weight="fill" />
              ) : null}
            </div>
            <div className="response-body">
              {answer ||
                error ||
                (runStatus === "running"
                  ? "正在等待第一个 Token…"
                  : "选择一个可用模型，然后发送测试消息。")}
              {runStatus === "running" && answer ? (
                <span className="stream-caret" />
              ) : null}
            </div>
            <div className="response-meta">
              <span>
                {runStatus === "cancelled"
                  ? "请求已取消，上游生成已停止"
                  : "OpenAI compatible / chat.completion.chunk"}
              </span>
              {governance ? (
                <span>
                  RPM {governance.remainingRequests} · TPM{" "}
                  {Number(governance.remainingTokens).toLocaleString()} · 今日{" "}
                  {Number(governance.remainingDailyTokens).toLocaleString()} ·
                  本月 ¥{Number(governance.remainingBudgetCny).toFixed(4)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
