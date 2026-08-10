# 本地依赖

当前应用进程由 `pnpm dev` 启动，Docker Compose 只启动基础设施：

```bash
docker compose -f deploy/docker-compose.yml up -d postgres redis prometheus grafana
```

控制面默认使用内存存储。启用 PostgreSQL 持久化时设置：

```bash
TENANT_STORE_BACKEND=postgres \
DATABASE_URL=postgresql://minimaas:minimaas@localhost:5432/minimaas \
pnpm dev
```

控制面会在启动时检查数据库连接；连接失败则拒绝启动，避免看似成功但配置实际没有落库。

多网关实例需要共享限流和配额状态：

```bash
RATE_LIMIT_BACKEND=redis QUOTA_BACKEND=redis pnpm dev
```

两套治理状态复用同一个 `REDIS_URL` 连接，分别通过 Lua 脚本完成分钟限流，以及日 Token/月预算的原子预占和结算。

需要本地模型时再启用 Ollama profile：

```bash
docker compose -f deploy/docker-compose.yml --profile ollama up -d ollama
docker compose -f deploy/docker-compose.yml exec ollama ollama pull qwen2.5:0.5b
```

网关通过 `OLLAMA_BASE_URL` 和 `OLLAMA_MODEL` 连接 Ollama；将 `DEFAULT_MODEL_PROVIDER` 设置为 `ollama` 后，`smart-chat` 会切换到本地模型。

Phase 1 尚未暴露 Prometheus `/metrics`，Prometheus 配置作为 Phase 4 接入点保留。
