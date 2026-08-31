# PIN × 模型限流与路由策略 V1 开发方案

> 用途：交给 Luna 直接开发。  
> 最终范围：只做 PIN 层，不做 API Key 层。每个 PIN 下的每个授权模型，独立拥有一套限流与路由策略。  
> 设计边界：不改模型中心、租户与密钥、监控、调用日志等其他模块；需要查看其他模块时只跳转。

## 1. 一句话结论

产品主路径固定为：

```text
全部 PIN → 某个 PIN 的全部授权模型 → 某个 PIN + 模型的独立策略
```

- PIN 是一级业务管理对象，不能省略。
- 模型是策略配置和发布的最小单元。
- 同一个 PIN 下，不同模型的策略互不影响、独立审批、独立发布、独立回滚。
- 本期不展示、不选择、不校验 API Key，也不设计 API Key 继承或例外策略。
- 算法运行时按照 `environment + pinId + modelId` 定位策略。

本期不再保留首页“按模型”视图。跨 PIN 查看某个模型不是当前业务主路径，后续如有运营审计需求，再做独立查询页。

## 2. 业务目标

运营人员需要完成三件事：

1. 快速确认每个 PIN 获得了多少模型权限，以及哪些模型尚未配置策略。
2. 进入具体 PIN 后，逐个管理其模型的限流、弹性额度和 EP 调度策略。
3. 发布前看懂该模型能否放行、会经过哪些硬过滤、最终可能如何分配到各 EP。

需要避免的问题：

- 只列出已有策略，导致未配置模型不可见。
- 一个 PIN 共用一套策略，导致不同模型的额度和 EP 配置互相污染。
- 在编辑过程中切换 PIN 或模型，遗留上一模型的 EP、权重和硬约束。
- 修改一个模型时连带审批、发布或回滚同 PIN 下的其他模型。
- 把算法字段直接暴露给业务，缺少业务含义、风险提示和结果预览。

## 3. 本期范围

### 3.1 必须实现

1. `#/routes` 默认展示所有 PIN。
2. 点击 PIN 下钻到其全部授权模型，包含尚未配置策略的模型。
3. 每个 `PIN + 模型` 只维护一个策略组，组内允许一个当前生效版本和一个可编辑草稿。
4. 每个模型可以独立新建、编辑、仿真、提交审批、发布和查看版本。
5. 编辑页锁定 PIN 和模型，不允许中途切换。
6. RPM、TPM 在当前页面直接配置。
7. 乐观限流只开放开关和最高弹性倍数；倍数支持预设及自定义。
8. 服务策略模板只负责初始化成本、性能、健康、饥饿四项评分权重；权重可继续编辑。
9. 硬约束和评分偏好明确分区。
10. EP 指定与排除互斥，并覆盖支持当前模型的全部 EP。
11. 每个 EP 偏好默认 50，可输入 0–100，算法在最终候选集中归一化。
12. 发布前展示准入结果、候选 EP、过滤原因、综合得分和预估调度分布。

### 3.2 本期明确不做

- 不做 API Key 选择、覆盖率、例外配置或继承关系。
- 不做跨模型 Auto 切换。
- 不做一个 PIN 内多个模型的批量编辑或一次性发布。
- 不做 PIN 级运行时默认策略。
- 不在路由策略模块编辑模型、EP、供应商、监控或租户资料。
- 不开放算法压力阈值、回收曲线、评分公式温度等高级参数。
- 不承诺具体网关错误码；无可用资源时由网关统一返回实际错误。

## 4. 核心对象与唯一性

### 4.1 对象关系

```text
PIN
├── 授权模型 A
│   └── 策略组 A：生效版本 + 可选草稿
├── 授权模型 B
│   └── 策略组 B：生效版本 + 可选草稿
└── 授权模型 C
    └── 尚未配置
```

模型列表的数据源必须是“PIN 模型授权关系”，不能从策略列表反推。这样才能显示授权但尚未配置的模型。

### 4.2 策略业务主键

```text
environment + pinId + modelId
```

推荐策略组标识：

```ts
policyGroupId = `${environment}::${pinId}::${modelId}`;
```

规则：

- 同一环境、PIN、模型只能有一个策略组。
- 一个策略组最多有一个 `active` 版本。
- 一个策略组最多有一个可编辑 `draft`。
- 编辑生效策略时生成新草稿，不直接覆盖生效版本。
- 同 PIN 不同模型拥有不同 `policyGroupId`，互不影响。

## 5. 页面信息架构

### 5.1 一级页：全部 PIN

路由：

```text
#/routes
```

页面标题：`限流与路由`

页面说明：`按 PIN 管理其授权模型的限流与调度策略。`

顶部指标：

| 指标 | 口径 |
| --- | --- |
| 接入 PIN | 当前环境中可用 PIN 数量 |
| 授权模型 | 所有 PIN 的授权模型关系总数 |
| 已配置模型 | 存在草稿、待审批、已排期或生效策略的 PIN + 模型数量 |
| 待处理 | 未配置、无可用 EP、冲突、待审批等需要处理的数量 |

主表字段：

| 字段 | 内容 |
| --- | --- |
| PIN / 业务方 | PIN 名称、PIN ID |
| 可用模型 | 当前 PIN 已授权模型总数；可补充模型名称摘要 |
| 已配置 | `已配置数 / 可用模型数` 和覆盖进度 |
| 生效中 | 生效中的模型策略数 |
| 未配置 | 尚未建立策略的模型数 |
| 风险 | 无可用 EP、授权停用、策略冲突、数据过期等风险数 |
| 最近更新 | PIN 下所有模型策略的最近更新时间 |
| 操作 | `管理模型策略` |

筛选与交互：

- 搜索 PIN 名称或 PIN ID。
- 覆盖状态：全部、全部已配置、部分配置、全部未配置。
- 风险状态：全部、有风险、无风险。
- 点击整行或“管理模型策略”进入 PIN 模型页。
- 首页不展示“按模型”切换。
- 首页不提供无作用域的“新建策略”按钮；新建必须从具体模型发起。
- 保留“版本记录”作为次级入口，但版本记录每条都必须显示 PIN 和模型。

空状态：

- 没有 PIN：提示先去“租户与密钥”完成接入，并仅提供跳转。
- 有 PIN 但没有授权模型：显示“尚未授权模型”，提供跳转到模型权限页面。
- 筛选无结果：提示调整筛选条件，不展示创建空 PIN 的按钮。

### 5.2 二级页：PIN 模型策略

路由：

```text
#/routes/pins/:pinId
```

页头：

- 返回“限流与路由”。
- PIN 名称和 PIN ID。
- `X 个可用模型 · Y 个已配置 · Z 个生效中 · N 个待处理`。
- 不展示 API Key 数量或覆盖率。

模型策略表：

| 字段 | 内容 |
| --- | --- |
| 模型 | 模型名称、模型 ID |
| 策略状态 | 未配置、草稿、待审批、已排期、生效中、已停用 |
| 基础额度 | RPM、TPM；未配置时显示 `—` |
| 弹性额度 | 未启用或最高 `M×` |
| 调度策略 | 高性能、均衡、成本优先、自定义 |
| 候选 EP | `硬过滤后可用数 / 支持该模型总数` |
| 预估分布 | 仿真得到的 Top EP 或“尚未仿真” |
| 风险 | 无候选 EP、数据过期、待审批等 |
| 最近更新 | 版本和时间 |
| 操作 | 根据状态提供新建、继续配置、编辑、仿真、查看 |

状态与操作：

| 状态 | 主操作 | 次操作 |
| --- | --- | --- |
| 未配置 | 新建策略 | 从同 PIN 其他模型复制 |
| 草稿 | 继续配置 | 删除草稿、仿真 |
| 待审批 | 查看审批 | 仿真 |
| 已排期 | 查看详情 | 仿真 |
| 生效中 | 编辑策略 | 仿真、查看详情、版本记录 |
| 已停用 | 新建草稿 | 查看历史 |

模型表必须满足：

- 只展示当前 PIN 已授权模型。
- 授权但未配置的模型仍然显示。
- 授权停用后保留模型行和历史策略，但禁止提交新版本。
- 修改任一模型不会改变其他模型的表格数据、状态或版本。

### 5.3 三级页：模型策略向导

新建路由：

```text
#/routes/pins/:pinId/models/:modelId/new
```

编辑、详情和仿真路由可以继续使用策略 ID：

```text
#/routes/:policyId/edit
#/routes/:policyId
#/routes/:policyId/simulate
```

所有页面顶部都必须展示固定对象：

```text
PIN 名称 / 模型名称
```

PIN 和模型不可编辑。返回时回到当前 PIN 的模型策略页。

## 6. 四步配置向导

### 第一步：策略基础信息

展示：

- PIN：只读。
- 模型：只读。
- 策略名称：默认 `{PIN名称}-{模型名称}-路由策略`，可修改。
- 业务重要度：普通、重要、核心。
- 生效方式：立即生效或指定时间。
- 变更原因：提交审批时必填。

不展示：

- API Key 选择。
- PIN 或模型下拉框。
- 跨模型适用范围。

算法映射：

- `pinId + modelId` 用于定位策略。
- 业务重要度映射 `priority`，用于资源紧张时的保护顺序。

### 第二步：容量与弹性

配置项：

| 产品项 | 交互 | 规则 |
| --- | --- | --- |
| 基础 RPM | 正整数输入 | 必填，直接在本页配置 |
| 基础 TPM | 正整数输入 | 必填，直接在本页配置 |
| 启用弹性额度 | 开关 | 默认关闭或由现有草稿带入 |
| 最高弹性倍数 | `1× / 2× / 3× / 自定义` | 开启弹性后必填；自定义建议范围 1–10 |

不展示：

- 并发。
- “来自用户模型限额”。
- “调整基础额度”跳转。
- 弹性资源范围。
- 压力水位、保护阈值、窗口大小和回收曲线。

业务说明：

- RPM、TPM 是当前 PIN 调用当前模型的基础额度。
- 弹性倍数是允许算法在资源宽松时临时扩大的上限，不代表始终获得该倍数。
- 实际借用与回收仍由算法模板维护，运营不能修改底层阈值。

### 第三步：路由与保障

页面必须分成三个清晰区域。

#### A. 调度评分策略

提供模板：

- 高性能保障。
- 均衡。
- 成本优先。

模板点击后只初始化四项权重：

| 产品项 | 算法字段 |
| --- | --- |
| 成本 | `w_cost` |
| 性能 | `w_performance` |
| 健康 | `w_health` |
| 饥饿度 | `w_hunger` |

交互规则：

- 四项权重均可编辑。
- 使用百分比表达，单项范围 0–100。
- 总和必须为 100；修改后模板状态显示“自定义”。
- 模板只是快捷起点，不是不可修改的固定策略。
- 页面展示一句业务解释，例如“更倾向低延迟和稳定资源”。

#### B. EP 硬约束

硬约束先于评分执行，不满足即从候选集中删除。

配置项：

- 资源来源：全部、自建、外采。
- 数据安全最低等级。
- 首 Token 最大耗时 TTFT。
- 生成速度最大耗时 TPOT。
- KV 缓存命中率下限。
- EP 范围：不限制、指定 EP、排除 EP。

EP 范围交互使用一个全局模式选择器：

```text
不限制 | 指定 EP | 排除 EP
```

- “指定 EP”和“排除 EP”不能同时出现。
- 指定模式可以多选，最终只保留指定 EP。
- 排除模式可以多选，最终从候选集中删除所选 EP。
- 切换模式时必须二次确认并清空上一模式的选择，避免隐式冲突。
- EP 选择器必须加载支持当前模型的全部 EP，并支持搜索、来源、安全等级和健康状态筛选。
- 安全、黑名单、采购和模型支持关系不可被乐观限流放宽。

#### C. EP 偏好权重

- 只展示支持当前模型且未被硬约束排除的 EP。
- 每个 EP 默认值为 50。
- 用户输入范围 0–100。
- 前端保存原始值；算法在最终可用候选集内归一化。
- `0` 表示不希望调度到该 EP；算法实现需要先将其移出软调度集合，再对正权重候选归一化。
- 偏好权重不是最终流量比例，页面必须明确提示。
- 当所有可用 EP 权重都为 0 时禁止提交。

### 第四步：影响预估与发布

页面展示：

1. 固定对象：PIN、模型、环境。
2. 当前版本与目标版本。
3. RPM、TPM、最大弹性额度。
4. 支持模型的 EP 总数。
5. 每项硬约束过滤掉的 EP 及原因。
6. 最终候选 EP 数。
7. 各候选 EP 的成本、性能、健康、饥饿度、偏好和综合得分。
8. softmax 后的预估调度概率。
9. 无可用 EP、数据过期、额度异常等阻断或告警。
10. 明确提示“本次发布仅影响当前 PIN 的当前模型”。

操作：

- 保存草稿。
- 重新仿真。
- 提交审批。
- 审批通过后立即发布或按计划时间发布。

## 7. 算法映射与执行顺序

### 7.1 产品字段映射

| 产品配置 | 前端字段建议 | 算法作用 |
| --- | --- | --- |
| 环境 | `environment` | 隔离开发、预发和生产策略 |
| PIN | `scope.pinId` | 定位业务归属；不直接进入评分 |
| 模型 | `scope.modelId` | 候选集第一层，只保留支持当前模型的 EP |
| 业务重要度 | `priority` | 映射 `a9.priority`，高压时决定保护顺序 |
| 基础 RPM | `baseQuota.rpm` | 乐观限流的 RPM 基线 |
| 基础 TPM | `baseQuota.tpm` | 乐观限流的 TPM 基线 |
| 启用弹性 | `optimisticLimit.enabled` | 对应 `optimistic_rate_limit.enabled` |
| 最高弹性倍数 | `optimisticLimit.maxMultiplier` | 动态额度公式中的上限 `M` |
| 服务模板 | `servicePreset` | 只初始化评分权重和业务解释 |
| 四项评分权重 | `scoringWeights` | `w_cost / w_performance / w_health / w_hunger` |
| 资源来源 | `constraints.origin` | 对比 EP `type/origin`，硬过滤 |
| 安全等级 | `constraints.securityRequirement` | 对比 EP `security_level`，硬过滤 |
| TTFT / TPOT | `maxTtftMs / maxTpotMs` | 对比 EP 延迟指标，硬过滤 |
| 缓存命中率 | `minKvCacheHitRate` | 对比 EP KV 缓存指标，硬过滤 |
| EP 模式 | `endpointMode` | 不限制、指定或排除 |
| EP 选择 | `endpointIds` | 形成最终硬约束候选集 |
| EP 偏好 | `preferences[].weight` | 原始 0–100 值，候选集内归一化后进入调度 |

### 7.2 执行链路

```text
请求进入
→ 解析当前环境、PIN 和模型
→ 获取 PIN + 模型的生效策略
→ 按基础 RPM/TPM 执行准入
→ 按资源压力和 M 计算乐观额度
→ 获取支持当前模型的全部 EP
→ 依次执行资源来源、安全、TTFT、TPOT、缓存、指定/排除硬过滤
→ 移除偏好权重为 0 的 EP
→ 在剩余候选集中归一化 EP 偏好
→ 计算成本、性能、健康、饥饿度加权得分
→ softmax 得到预估调度概率
→ 选择 EP
```

重要约束：

- 乐观限流只影响是否放行和可用额度，不扩大模型或 EP 权限。
- 硬约束永远先于加权评分。
- 模板权重和 EP 偏好都只影响最终候选集内的相对倾向。
- 无生效策略时使用系统默认策略还是拒绝请求，需要后端明确；前端 V1 默认标记为“未配置”，不虚构运行结果。

## 8. 状态、审批与版本

状态：

```text
未配置 → 草稿 → 待审批 → 已排期/生效中 → 已停用
```

规则：

1. 未配置模型点击“新建策略”产生第一个草稿。
2. 已有草稿时再次点击新建，直接打开原草稿并提示。
3. 编辑生效策略时，从当前版本复制生成新草稿。
4. 草稿提交后变为待审批，草稿内容不可继续修改；撤回后重新变为草稿。
5. 审批通过后立即生效或进入已排期。
6. 新版本生效后替换旧 active，旧版本进入历史，但可以回滚。
7. 回滚同样需要审批，并生成新版本，不能直接复活历史记录。
8. 一个模型的状态变化不能改变同 PIN 下其他模型。

## 9. 校验规则

### 9.1 可保存草稿

保存草稿只要求：

- PIN 和模型合法且授权关系存在。
- 策略名称非空。
- 数字字段格式合法。

允许尚未填写完整的额度、EP 和变更原因。

### 9.2 可提交审批

提交时必须满足：

1. 当前 PIN 仍被允许使用当前模型。
2. 不存在同一策略组的第二个草稿或第二个待审批版本。
3. RPM、TPM 为大于 0 的整数。
4. 开启弹性时 `maxMultiplier` 在允许范围内。
5. 四项评分权重均在 0–100 且总和为 100。
6. TTFT、TPOT、缓存命中率等输入范围合法。
7. 指定和排除不能同时存在。
8. 所选 EP 都支持当前模型。
9. 经过硬约束后至少剩余一个 EP。
10. 至少一个候选 EP 的偏好权重大于 0。
11. 变更原因必填。
12. 定时生效时间晚于当前时间，结束时间晚于开始时间。

### 9.3 告警但不阻断

- 运行数据超过约定时效。
- 只有一个候选 EP，缺少容灾。
- 最高弹性倍数较高。
- 成本、性能或安全配置与上个版本变化明显。
- 预估主要流量过度集中到单个 EP。

## 10. 数据结构建议

### 10.1 PIN 模型授权

```ts
export interface PinModelAccess {
  pinId: string;
  modelId: string;
  status: "enabled" | "disabled";
  grantedAt?: string;
}
```

注意：本期结构不包含 `apiKeyIds`。如果旧接口为了兼容仍返回该字段，前端忽略，不在页面和校验中使用。

### 10.2 策略作用域

```ts
export interface PolicyScope {
  pinId: string;
  pinName: string;
  modelId: string;
  modelName: string;
}
```

旧数据中的 `apiKeyIds/apiKeyNames` 可以暂时保留为可选兼容字段，但新建流程不读取、不展示、不要求填写。

### 10.3 策略结构

```ts
export interface TrafficPolicy {
  id: string;
  environment: "development" | "staging" | "production";
  policyGroupId: string;
  version: number;
  name: string;
  status: "draft" | "pending" | "scheduled" | "active" | "disabled";
  scope: PolicyScope;
  priority: 0 | 1 | 2;
  servicePreset: "performance" | "balanced" | "cost" | "custom";
  scoringWeights: {
    cost: number;
    performance: number;
    health: number;
    hunger: number;
  };
  effective: {
    mode: "now" | "scheduled";
    from: string;
    to?: string;
  };
  baseQuota: {
    rpm: number;
    tpm: number;
    observedAt?: string;
  };
  optimisticLimit: {
    enabled: boolean;
    maxMultiplier: number;
  };
  constraints: {
    origin: "internal-only" | "all" | "external-only";
    securityRequirement: 1 | 2 | 3;
    maxTtftMs?: number;
    maxTpotMs?: number;
    minKvCacheHitRate?: number;
    endpointMode: "all" | "allow" | "deny";
    endpointIds: string[];
  };
  preferences: Array<{
    epId: string;
    weight: number;
  }>;
  changeReason: string;
  createdBy: string;
  updatedAt: string;
}
```

兼容说明：

- 旧 `baseQuota.concurrency` 改为可选兼容字段，页面不展示。
- 旧 `optimisticLimit.poolMode/poolId` 改为后端默认值，页面不展示。
- 旧 Provider 指定/排除需要迁移为 EP 级 `endpointMode + endpointIds`，供应商信息只作为 EP 筛选条件。

### 10.4 PIN 模型策略摘要

```ts
export interface PinModelPolicySummary {
  pinId: string;
  modelId: string;
  modelName: string;
  accessStatus: "enabled" | "disabled";
  state: "unconfigured" | "draft" | "pending" | "scheduled" | "active" | "disabled";
  policy?: TrafficPolicy;
  supportingEndpointCount: number;
  eligibleEndpointCount: number;
  topEndpoint?: {
    epId: string;
    probability: number;
  };
  riskMessages: string[];
}
```

聚合函数必须为纯函数并增加测试：

```ts
buildPinModelPolicySummaries(pinId, pinModelAccess, policies, models, endpoints)
```

## 11. 接口契约建议

前端原型可以继续使用 mock；对接后端时建议提供：

```text
GET  /routing/pins?environment=:env
GET  /routing/pins/:pinId/models?environment=:env
GET  /routing/pins/:pinId/models/:modelId/policy?environment=:env
POST /routing/pins/:pinId/models/:modelId/policy/drafts
PUT  /routing/policies/:policyId/draft
POST /routing/policies/:policyId/simulate
POST /routing/policies/:policyId/submit
POST /routing/policies/:policyId/withdraw
POST /routing/policies/:policyId/disable
POST /routing/policies/:policyId/rollback
GET  /routing/policies/:policyId/versions
```

返回 PIN 模型列表时，后端最好直接返回授权与策略摘要，避免前端逐模型发送请求：

```ts
interface PinModelPolicyListResponse {
  pin: { id: string; name: string };
  summary: {
    totalModels: number;
    configured: number;
    active: number;
    risks: number;
  };
  models: PinModelPolicySummary[];
}
```

## 12. 前端组件与文件建议

不要继续把所有页面堆在 `TrafficPolicyPage.tsx`。

```text
apps/console/src/pages/traffic-policy/
├── PinPolicyOverview.tsx
├── PinModelPolicyPage.tsx
├── ModelPolicyEditor.tsx
├── PolicyDetail.tsx
├── PolicySimulation.tsx
├── PolicyHistory.tsx
├── steps/
│   ├── BasicInfoStep.tsx
│   ├── CapacityElasticityStep.tsx
│   ├── RoutingGuaranteeStep.tsx
│   └── ImpactPublishStep.tsx
├── components/
│   ├── ModelPolicyTable.tsx
│   ├── EndpointConstraintPicker.tsx
│   ├── EndpointPreferenceTable.tsx
│   ├── ScoringWeightEditor.tsx
│   └── PolicyStatusBadge.tsx
├── policySelectors.ts
├── policyValidation.ts
├── policySimulation.ts
├── mockData.ts
└── types.ts
```

必须保持：

- 表单状态局部化，避免任一输入导致整个路由模块重渲染。
- 聚合、校验和仿真逻辑放在纯函数中，不写进 JSX。
- 复杂 EP 列表使用稳定 key；数量较大时支持分页或虚拟列表。
- 环境、PIN、模型变化时清空不兼容的草稿缓存。

## 13. 当前原型需要具体调整的内容

1. 删除首页“按 PIN / 按模型”切换，只保留 PIN 表。
2. 删除“查看全部模型策略”入口。
3. 删除首页无作用域“新建策略”入口。
4. PIN 表删除 API Key 数量文案。
5. PIN 模型表删除“适用 API Key”和 API Key 覆盖率。
6. 新建向导第一步删除 API Key 选择。
7. 策略详情、仿真、发布摘要删除 API Key 范围。
8. `PinModelAccess` 聚合不再依赖 `apiKeyIds`。
9. 重复策略校验只使用当前环境的 `pinId + modelId`。
10. PIN 模型页的“配置模型策略”总按钮删除，改为每个模型行内新建。
11. 版本记录增加 PIN、模型和环境，确保能够定位策略归属。
12. 保留其他模块和侧边导航，不做结构调整。

## 14. 开发顺序

### 阶段一：收口数据和路由

1. 将策略唯一作用域固定为 `environment + pinId + modelId`。
2. 调整 `PinModelAccess`，移除页面对 API Key 的依赖。
3. 更新路由解析和模型策略聚合函数。
4. 为授权未配置、授权停用、一个 active 加一个 draft 等状态补充单元测试。

### 阶段二：首页和 PIN 模型页

1. 首页只保留 PIN 聚合表。
2. 完成覆盖、风险和更新时间计算。
3. PIN 模型页加载全部授权模型并展示独立状态。
4. 完成模型行新建、编辑、查看、仿真和复制入口。

### 阶段三：向导收口

1. 锁定 PIN 和模型。
2. 删除 API Key、并发、用户模型限额跳转和弹性资源范围。
3. 实现模板权重可编辑且合计为 100。
4. 将指定/排除改为全局互斥模式。
5. 加载当前模型全部 EP，默认偏好 50。

### 阶段四：仿真和发布

1. 按当前模型构造 EP 初始候选集。
2. 展示逐项过滤原因和最终候选集。
3. 展示评分与预估调度分布。
4. 完成保存草稿、提交审批和版本隔离。

### 阶段五：验证

1. 类型检查。
2. 聚合、校验、仿真单元测试。
3. 构建验证。
4. 浏览器走通核心路径。
5. 检查原有详情、仿真、版本记录和侧边导航没有回归。

## 15. 验收标准

### A. 信息架构

1. 进入 `#/routes` 默认看到所有 PIN，不出现“按模型”视图。
2. 点击任一 PIN 能看到该 PIN 授权的全部模型，包括未配置模型。
3. 页面不存在 API Key 选择、覆盖率或配置入口。

### B. 策略隔离

4. 每个模型拥有独立状态、额度、弹性、硬约束、偏好和版本。
5. 修改或发布一个模型不会改变同 PIN 其他模型。
6. 同环境、PIN、模型不能创建第二个并行策略组。
7. 已有草稿时点击新建会打开原草稿。

### C. 容量与弹性

8. RPM、TPM 可直接输入并正确保存。
9. 页面不展示并发、用户模型限额来源和弹性资源范围。
10. 弹性倍数支持 1×、2×、3×和合法自定义值。

### D. 路由与算法

11. 服务模板选择后四项评分权重可以继续修改，总和必须为 100。
12. 硬约束与评分权重视觉和逻辑分区。
13. 指定与排除互斥，切换模式会清理冲突数据。
14. EP 选择范围覆盖支持当前模型的全部 EP。
15. EP 偏好默认 50，可输入 0–100，并由算法归一化。
16. 不支持当前模型的 EP 不会出现在选择器、偏好表或仿真结果中。

### E. 发布与风险

17. 无可用 EP 或所有 EP 权重为 0 时可以保存草稿，但不能提交审批。
18. 仿真展示每个 EP 的通过/过滤状态、过滤原因和预估概率。
19. 发布摘要明确说明只影响当前 PIN 的当前模型。
20. 版本记录能够区分环境、PIN 和模型，并支持查看历史。

## 16. Luna 开发完成后的核心回归路径

```text
进入路由策略首页
→ 搜索并打开一个 PIN
→ 确认授权但未配置模型可见
→ 从模型行新建策略
→ 确认 PIN 和模型锁定
→ 配置 RPM/TPM 和自定义弹性倍数
→ 修改四项评分权重
→ 使用指定 EP，再切换到排除 EP，确认冲突数据被清理
→ 为候选 EP 配置 0–100 偏好
→ 仿真并查看过滤原因与预估调度分布
→ 提交审批
→ 返回 PIN 模型页，确认只有当前模型状态变化
→ 打开同 PIN 另一个模型，确认策略未受影响
```

以上路径全部通过，才算本期 `PIN → 模型策略` 功能完成。
