# MiniMaaS

MiniMaaS 是一个用于学习 MaaS 全链路的迷你平台。它以兼容 OpenAI 的多模型网关为数据面，以模型、租户、策略和发布管理为控制面，逐步实现统一接入、治理、计量、观测和运营。

当前版本已完成 **Phase 1：统一模型接入**，并进入 **Phase 2：多租户治理**。默认使用 Mock Provider 保持开箱即用，也可以把同一个 OpenAI 兼容入口切换到本地 Ollama，不需要云供应商 API Key。

## 当前能力

- `GET /v1/models`：OpenAI 兼容模型列表
- `POST /v1/chat/completions`：Mock Provider，支持普通响应和 SSE 流式响应
- Ollama Adapter：普通响应、NDJSON 上游流到 OpenAI SSE 的协议转换
- `smart-chat` 默认模型切换，以及 `mock-chat` / `ollama-chat` 显式模型
- 供应商和已安装模型健康检查
- 供应商错误归一化、超时控制、客户端取消传播和流式计量
- 租户与 API Key 管理、一次性密钥展示和哈希存储
- 租户、API Key 与配额支持内存/PostgreSQL 双存储后端
- 网关 Bearer Key 鉴权、鉴权快照缓存和租户模型权限校验
- 租户级 RPM/TPM 固定窗口限流、Redis Lua 原子检查和标准限流响应头
- 日 Token/月预算原子预占、实际用量结算和超额拒绝
- 网关与控制面的存活、就绪检查
- 控制面总览、模型列表和事件流只读 API
- `PATCH /admin/tenants/:tenantId/quota`：动态配置 RPM、TPM、日配额和月预算
- React 管理控制台
- PostgreSQL、Redis、Prometheus 和 Grafana 的 Docker Compose 骨架
- 统一协议、模型适配器、路由、鉴权、限流和计量的模块边界

## 快速开始

要求 Node.js 20+ 和 pnpm 9+。

```bash
pnpm install
pnpm dev
```

服务地址：

- 控制台：http://localhost:5173
- MaaS 网关：http://localhost:8080
- 控制面：http://localhost:8081

测试普通请求：

先在控制台的“租户与密钥”页面生成 API Key，复制仅展示一次的密钥：

```bash
curl http://localhost:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_MINIMAAS_API_KEY' \
  -d '{"model":"smart-chat","messages":[{"role":"user","content":"MaaS 的核心是什么？"}]}'
```

默认本地演示密钥是 `mm_dev_minimaas_local`，仅用于学习环境。也可以在控制台生成只展示一次的新密钥。

成功响应会同时返回分钟限流、日配额和月预算剩余量。日配额或月预算不足时返回 `429 quota_exceeded`，请求不会进入模型供应商。

## 启用 PostgreSQL 持久化

默认 `TENANT_STORE_BACKEND=memory`，无需外部依赖。要验证控制面重启后配置仍然存在：

```bash
docker compose -f deploy/docker-compose.yml up -d postgres
TENANT_STORE_BACKEND=postgres \
DATABASE_URL=postgresql://minimaas:minimaas@localhost:5432/minimaas \
pnpm dev
```

数据库首次启动时自动执行 `migrations/000001_initial.sql`。如果之前已经用旧版迁移创建过本地 volume，需要在确认不保留旧学习数据后执行 `docker compose -f deploy/docker-compose.yml down -v` 再重新启动。

测试流式请求：

```bash
curl -N http://localhost:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_MINIMAAS_API_KEY' \
  -d '{"model":"smart-chat","stream":true,"messages":[{"role":"user","content":"解释模型网关"}]}'
```

## 接入本地 Ollama

先启动 Ollama 并准备一个模型：

```bash
docker compose -f deploy/docker-compose.yml --profile ollama up -d ollama
docker compose -f deploy/docker-compose.yml exec ollama ollama pull qwen2.5:0.5b
```

显式调用 Ollama 虚拟模型：

```bash
curl http://localhost:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_MINIMAAS_API_KEY' \
  -d '{"model":"ollama-chat","messages":[{"role":"user","content":"用三句话解释 MaaS"}]}'
```

让 `smart-chat` 默认路由到 Ollama：

```bash
DEFAULT_MODEL_PROVIDER=ollama \
OLLAMA_MODEL=qwen2.5:0.5b \
pnpm --filter @minimaas/gateway dev
```

相关配置见 `.env.example`，实现与面试讲解要点见 [Phase 1 说明](docs/phase1-unified-model-access.md) 和 [Phase 2 说明](docs/phase2-tenant-governance.md)。

## 项目结构

```text
apps/gateway          MaaS 数据面
apps/control-plane    MaaS 控制面
apps/console          运营控制台
packages/contracts    共享协议与领域类型
migrations            数据库演进
deploy                本地环境和可观测性
docs                  架构、决策和路线图
```

## 设计原则

1. 控制面和数据面分离。
2. 客户端只认识虚拟模型，底层供应商可以替换。
3. 模型调用先标准化，再治理、计量和运营。
4. 先模块化单体，边界稳定后再按压力拆服务。
5. 默认路径必须可离线运行，真实模型接入通过适配器和配置显式启用。

后续开发顺序见 [路线图](docs/roadmap.md)。
