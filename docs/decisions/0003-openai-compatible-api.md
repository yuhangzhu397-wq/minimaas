# ADR-0003：对外采用 OpenAI 兼容协议

状态：已接受

## 决策

第一批对外接口为 `/v1/models` 和 `/v1/chat/completions`，并支持 SSE 流式响应。

## 原因

兼容现有 SDK 生态能降低迁移成本。内部仍使用供应商无关的领域对象，避免把外部协议直接扩散到 Adapter。
