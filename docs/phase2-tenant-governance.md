# Phase 2：多租户鉴权与模型授权

## 这一阶段解决什么问题

统一模型接口只能说明“调用方式一致”，还不能说明“谁可以调用、能调用什么”。多租户治理把每次模型请求绑定到明确的租户和 API Key，并在进入模型路由前完成权限判断。

```text
Bearer API Key
  → SHA-256 哈希
  → 网关本地鉴权快照
  → tenantId / apiKeyId
  → allowedModels
  → RPM/TPM 原子限流
  → 路由
```

## 控制面

控制面负责低频、强一致的管理操作：

- 创建租户，配置允许使用的虚拟模型
- 生成高熵 API Key，明文只返回一次
- 只保存 SHA-256 哈希和可识别前缀
- 撤销 API Key
- 通过 `/internal/gateway/auth-snapshot` 发布有效密钥和模型权限

API Key 使用 24 字节随机数生成。它与人类密码不同，具有足够高的随机熵，因此可直接使用 SHA-256 做不可逆索引；密码则应使用 Argon2、scrypt 或 bcrypt 等慢哈希。

## 数据面

网关不在每次请求中同步查询控制面。它缓存鉴权快照，并通过密钥哈希做 O(1) 查找：

- 缺失或错误密钥：`401 invalid_api_key`
- 密钥有效但模型未授权：`403 model_access_denied`
- 鉴权与授权通过：继续进入限流、路由、适配器和计量

缓存未命中时，网关会主动刷新一次快照，以便新生成的密钥立即可用。正常命中不访问控制面。密钥撤销通过短 TTL 收敛，当前开发配置最长约 2 秒生效。

## RPM/TPM 限流

每个租户的鉴权快照同时携带：

- `rpmLimit`：每分钟最多允许多少个请求
- `tpmLimit`：每分钟最多预占多少 Token

请求进入路由前，网关把消息字符数换算为输入 Token，并在没有指定 `max_tokens` 时预留 512 个输出 Token。这样可以在昂贵的模型调用发生前完成准入判断。

Redis 后端使用单段 Lua 脚本读取并更新请求数、Token 数和过期时间，保证多个网关实例并发时不会出现“先读后写”的竞态。当前采用自然分钟固定窗口，拒绝时返回：

- `429 rate_limit_exceeded`
- `Retry-After`
- `X-RateLimit-Limit-Requests`
- `X-RateLimit-Remaining-Requests`
- `X-RateLimit-Limit-Tokens`
- `X-RateLimit-Remaining-Tokens`

本地默认使用同语义的内存实现，确保项目开箱即用。设置 `RATE_LIMIT_BACKEND=redis` 后启用真实 Redis；Redis 连接失败时网关启动失败，不会静默降级为无限流。

## 日配额与月预算

RPM/TPM 解决短时间突发流量，日 Token 和月预算解决更长周期的资源与成本边界。网关使用“预占—结算”模型：

```text
估算输入 Token + 最大输出 Token
  → 按模型单价计算预估成本
  → 原子预占日 Token 与月预算
  → 调用模型
  → 按实际 Usage 结算，多退少补
```

预占发生在供应商调用之前，因此并发请求不能一起穿透剩余额度。Redis 模式用一段 Lua 同时检查并增加日 Token 和月成本；结算脚本以请求 ID 对预占记录做幂等调整。本地内存实现保持相同语义。

当前静态模型注册表为 Mock 模型配置输入 `¥2/百万 Token`、输出 `¥8/百万 Token`；本地 Ollama 成本记为 0。后续动态模型注册阶段会把价格迁移到控制面模型配置。

额度不足返回：

- `429 quota_exceeded`
- `retry-after`：日额度指向下一个 UTC 自然日，月预算指向下一个 UTC 自然月
- `x-quota-limit-tokens-daily` / `x-quota-remaining-tokens-daily`
- `x-budget-limit-cny-monthly` / `x-budget-remaining-cny-monthly`

成功响应也携带这些头，控制台调用试验台会展示本分钟、今日和本月的剩余额度。设置 `QUOTA_BACKEND=redis` 后启用多实例共享配额。

## 动态配置接口

配额属于控制面配置，不能写死在控制台或网关代码中。控制面提供部分更新接口：

```http
PATCH /admin/tenants/:tenantId/quota
Content-Type: application/json

{
  "rpmLimit": 120,
  "tpmLimit": 200000,
  "dailyTokenQuota": 5000000,
  "monthlyBudgetCny": 5000
}
```

四个字段都可以单独更新。控制面校验后更新租户配置，下一次生成鉴权快照时带上新值；网关在快照 TTL 内自动加载，不需要重启。控制台的“配置配额”操作调用的就是同一个接口。

## 配置持久化

控制面通过 `TenantRepository` 隔离存储实现：

- `memory`：默认模式，零依赖，适合快速学习和单元测试
- `postgres`：持久化租户、API Key 哈希、模型权限与 RPM/TPM/预算配置

设置 `TENANT_STORE_BACKEND=postgres` 后，控制面启动时连接 PostgreSQL；创建租户时使用事务同时写入租户和配额，更新配额时锁定租户记录并在同一事务内更新配额与预算。网关仍然不访问 PostgreSQL，只消费控制面生成的短 TTL 鉴权快照。

这使控制面和数据面的依赖关系保持清晰：数据库短暂不可用会影响管理操作，但已经加载快照的网关仍可继续处理模型请求。

## 面试表达

可以这样概括：

> MaaS 网关的鉴权不是简单判断 Header 是否存在，而是先把高熵 API Key 哈希映射为租户主体，再基于主体执行模型授权、RPM/TPM 限流以及日 Token/月预算预占，最后才进入模型调用。模型返回后按实际 Usage 结算。控制面负责密钥和策略发布，数据面消费本地快照与 Redis，避免把控制面的可用性和延迟带入请求热路径。

## 当前边界

- 本地默认内存存储；PostgreSQL 模式已经支持配置持久化
- 内部快照接口尚未增加 mTLS 或服务身份认证
- 撤销采用 TTL 收敛，后续可用 Redis Pub/Sub 或配置版本推送加速
- 模型价格暂时来自网关静态注册表，后续迁移到控制面动态配置
- Redis 真实进程仍需在具备 Docker/Redis 的环境做集成验证
