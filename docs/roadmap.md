# MiniMaaS 路线图

## Phase 0：可运行骨架（已完成）

- OpenAI 兼容接口与 Mock Provider
- 控制面、数据面、控制台
- 领域模型与基础数据库迁移
- 本地开发和监控配置

## Phase 1：统一模型接入（已完成）

- [x] Ollama Adapter
- [x] 供应商与已安装模型健康检查
- [x] 统一错误模型
- [x] 完整 SSE 生命周期、流式计量与客户端取消传播

## Phase 2：多租户治理（当前）

- [x] 租户管理与 API Key 哈希存储
- [x] 租户、密钥与配额 PostgreSQL 持久化
- [x] 网关 API Key 鉴权与模型访问授权
- [x] Redis RPM/TPM 原子限流与本地开发实现
- [x] 日 Token 配额和月预算预占/结算

## Phase 3：动态路由与韧性

- 虚拟模型和物理模型映射
- 加权灰度和条件路由
- 超时、有限重试、熔断和 Fallback
- 配置快照、热更新和回滚

## Phase 4：计量与可观测性

- Token 预占与结算
- Prometheus 指标
- OpenTelemetry Trace
- 租户用量和模拟账单

## Phase 5：评测与运营闭环

- 评测集与离线任务
- 发布门禁
- 灰度对比
- 生命周期和下线流程
