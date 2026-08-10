# Phase 1：统一模型接入

## 这一阶段解决什么

客户端继续调用 OpenAI 兼容的 `/v1/chat/completions`，网关把统一请求路由到 Mock 或 Ollama，再把供应商协议转换回统一响应。业务方不需要知道底层模型名称、部署方式或流式协议。

```text
OpenAI 请求
  → 鉴权与限流接口
  → 虚拟模型路由（smart-chat / mock-chat / ollama-chat）
  → ModelAdapter
  → Mock 或 Ollama /api/chat
  → OpenAI JSON 或 SSE
  → 用量记录
```

## 关键实现

### 适配器边界

`ModelAdapter` 统一定义普通调用、流式调用和健康检查。Ollama 的消息、生成参数、token 统计和停止原因只存在于 `OllamaAdapter` 内部，不泄漏到路由和 HTTP 层。

### 两层模型标识

- 虚拟模型：客户端看到的稳定名字，例如 `smart-chat`。
- 物理模型：供应商实际运行的模型，例如 `qwen2.5:0.5b`。

这层解耦让平台以后可以在不修改客户端的前提下做灰度、故障切换、成本路由和版本升级。

### 流式协议转换

Ollama 返回 newline-delimited JSON；MiniMaaS 逐行解析后转换成 OpenAI `chat.completion.chunk` SSE。最后一个上游 chunk 携带真实 token 用量，网关在流结束后完成计量。

### 取消传播

客户端断开 SSE 连接时，网关触发 `AbortController`，取消上游 `fetch` 和流读取。它避免模型继续消耗 GPU 时间，也是数据面资源治理的重要组成部分。

### 错误归一化

连接失败、超时、供应商拒绝和协议解析错误统一为 `GatewayErrorResponse`。普通请求返回一致的 HTTP 错误；已经开始的 SSE 使用 `event: error` 发送同构错误，再结束流。

### 健康与就绪

`/health/ready` 同时报告各供应商状态。当默认供应商不可用时返回 503；非默认供应商异常只会降级该模型，不影响 Mock 默认路径。Ollama 健康检查还会确认配置的物理模型已经安装。

## 面试时可以这样说

“MaaS 的统一接入不只是把不同厂商 SDK 包一层。我们需要稳定的客户端协议、虚拟模型到物理模型的映射、适配器隔离、流式协议转换、真实用量回收、取消传播、健康检查和统一错误语义。这样路由、治理和计量才能建立在稳定的数据面契约上。”

## 演示检查点

1. 默认配置调用 `smart-chat`，展示 Mock 的开箱即用路径。
2. 调用 `/v1/models`，观察 Ollama 未启动或模型未安装时的 `offline` 状态。
3. 启动 Ollama 并拉取配置模型，再观察状态变为 `healthy`。
4. 调用 `ollama-chat` 的普通与流式请求，展示协议转换。
5. 把 `DEFAULT_MODEL_PROVIDER` 改为 `ollama`，说明虚拟模型如何屏蔽供应商切换。
