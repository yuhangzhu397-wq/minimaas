export type ResourceState =
  | "healthy"
  | "warning"
  | "degraded"
  | "standby"
  | "pending";

export type ProviderStatus = "active" | "standby" | "pending";

export type Endpoint = {
  id: string;
  name: string;
  role: "主用" | "备用" | "灰度";
  region: string;
  tokenBalance: number;
  rpm: number;
  tpm: number;
  successRate: number;
  latency: number;
  health: ResourceState;
  weight: number;
};

export type ProviderModel = {
  id: string;
  name: string;
  alias: string;
  endpoints: Endpoint[];
  tokenBalance: number;
  rpm: number;
  tpm: number;
  health: ResourceState;
};

export type Supplier = {
  id: string;
  name: string;
  shortName: string;
  mark: string;
  accent: string;
  status: ProviderStatus;
  tier: "核心" | "普通" | "备用";
  models: number;
  endpoints: number;
  healthyEndpoints: number;
  tokenBalance: number;
  rpm: number;
  rpmLimit: number;
  tpm: number;
  tpmLimit: number;
  failureRate: number;
  error4xxRate: number;
  error5xxRate: number;
  totalCalls: number;
  health: ResourceState;
  alerts: number;
  contractEnd: string;
  contractRemaining: string;
  account: string;
  credential: string;
  contact: string;
  tags: string[];
  modelResources: ProviderModel[];
};

const aliyunModels: ProviderModel[] = [
  {
    id: "qwen-max",
    name: "qwen-max",
    alias: "千问-最大",
    tokenBalance: 62_000_000,
    rpm: 88,
    tpm: 95,
    health: "warning",
    endpoints: [
      {
        id: "ep-ali-max-01",
        name: "eas-qp-max-01",
        role: "主用",
        region: "华东1（杭州）",
        tokenBalance: 40_000_000,
        rpm: 92,
        tpm: 95,
        successRate: 99.5,
        latency: 810,
        health: "healthy",
        weight: 70,
      },
      {
        id: "ep-ali-max-02",
        name: "eas-qp-max-02",
        role: "备用",
        region: "华北2（北京）",
        tokenBalance: 22_000_000,
        rpm: 76,
        tpm: 72,
        successRate: 91.8,
        latency: 1128,
        health: "degraded",
        weight: 30,
      },
    ],
  },
  {
    id: "qwen-plus",
    name: "qwen-plus",
    alias: "千问-增强",
    tokenBalance: 48_000_000,
    rpm: 76,
    tpm: 92,
    health: "warning",
    endpoints: [
      {
        id: "ep-ali-plus-01",
        name: "eas-qp-plus-02",
        role: "主用",
        region: "华北2（北京）",
        tokenBalance: 48_000_000,
        rpm: 76,
        tpm: 92,
        successRate: 99,
        latency: 912,
        health: "healthy",
        weight: 100,
      },
    ],
  },
  {
    id: "qwen-turbo",
    name: "qwen-turbo",
    alias: "千问-快速",
    tokenBalance: 36_000_000,
    rpm: 54,
    tpm: 61,
    health: "healthy",
    endpoints: [
      {
        id: "ep-ali-turbo-01",
        name: "eas-qt-03",
        role: "主用",
        region: "华东1（杭州）",
        tokenBalance: 36_000_000,
        rpm: 54,
        tpm: 61,
        successRate: 98.6,
        latency: 536,
        health: "healthy",
        weight: 100,
      },
    ],
  },
  {
    id: "qwen-long",
    name: "qwen-long",
    alias: "千问-长上下文",
    tokenBalance: 22_000_000,
    rpm: 22,
    tpm: 28,
    health: "healthy",
    endpoints: [
      {
        id: "ep-ali-long-01",
        name: "eas-ql-04",
        role: "主用",
        region: "华南1（深圳）",
        tokenBalance: 22_000_000,
        rpm: 22,
        tpm: 28,
        successRate: 99.1,
        latency: 1320,
        health: "healthy",
        weight: 100,
      },
    ],
  },
  {
    id: "qwen-vl-max",
    name: "qwen-vl-max",
    alias: "千问-VL 最大",
    tokenBalance: 10_000_000,
    rpm: 18,
    tpm: 24,
    health: "healthy",
    endpoints: [
      {
        id: "ep-ali-vl-01",
        name: "eas-qvl-05",
        role: "主用",
        region: "华东2（上海）",
        tokenBalance: 10_000_000,
        rpm: 18,
        tpm: 24,
        successRate: 98.7,
        latency: 1045,
        health: "healthy",
        weight: 100,
      },
    ],
  },
  {
    id: "qwen-coder",
    name: "qwen-coder",
    alias: "千问-代码",
    tokenBalance: 2_000_000,
    rpm: 8,
    tpm: 10,
    health: "healthy",
    endpoints: [
      {
        id: "ep-ali-code-01",
        name: "eas-qc-06",
        role: "主用",
        region: "华北2（北京）",
        tokenBalance: 2_000_000,
        rpm: 8,
        tpm: 10,
        successRate: 99.3,
        latency: 412,
        health: "healthy",
        weight: 100,
      },
    ],
  },
];

function simpleModels(prefix: string, count: number): ProviderModel[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    name: `${prefix}-${index + 1}`,
    alias: index === 0 ? "主力模型" : `模型 ${index + 1}`,
    tokenBalance: Math.max(4_000_000, 36_000_000 - index * 5_000_000),
    rpm: Math.max(12, 61 - index * 8),
    tpm: Math.max(15, 78 - index * 9),
    health: index === count - 1 && count > 4 ? "degraded" : "healthy",
    endpoints: [
      {
        id: `${prefix}-endpoint-${index + 1}`,
        name: `${prefix}-prod-${String(index + 1).padStart(2, "0")}`,
        role: index === count - 1 ? "备用" : "主用",
        region: index % 2 === 0 ? "华北2（北京）" : "华东1（杭州）",
        tokenBalance: Math.max(4_000_000, 36_000_000 - index * 5_000_000),
        rpm: Math.max(12, 61 - index * 8),
        tpm: Math.max(15, 78 - index * 9),
        successRate: index === count - 1 && count > 4 ? 94.2 : 99.2,
        latency: 420 + index * 115,
        health: index === count - 1 && count > 4 ? "degraded" : "healthy",
        weight: index === count - 1 ? 0 : 100,
      },
    ],
  }));
}

export const initialSuppliers: Supplier[] = [
  {
    id: "volcengine",
    name: "火山方舟",
    shortName: "方舟",
    mark: "V",
    accent: "#315ad8",
    status: "active",
    tier: "核心",
    models: 8,
    endpoints: 9,
    healthyEndpoints: 9,
    tokenBalance: 231_000_000,
    rpm: 74_400,
    rpmLimit: 120_000,
    tpm: 3_900_000,
    tpmLimit: 5_000_000,
    failureRate: 0.18,
    error4xxRate: 0.12,
    error5xxRate: 0.06,
    totalCalls: 4_423_314,
    health: "healthy",
    alerts: 0,
    contractEnd: "2026-12-31",
    contractRemaining: "还有 160 天",
    account: "joymaas-prod-cn",
    credential: "ak-****************7e2a",
    contact: "供应商技术支持",
    tags: ["核心供应商"],
    modelResources: simpleModels("doubao", 8),
  },
  {
    id: "aliyun",
    name: "阿里云百炼",
    shortName: "百炼",
    mark: "A",
    accent: "#6251d9",
    status: "active",
    tier: "核心",
    models: 6,
    endpoints: 7,
    healthyEndpoints: 6,
    tokenBalance: 168_000_000,
    rpm: 97_200,
    rpmLimit: 120_000,
    tpm: 4_750_000,
    tpmLimit: 5_000_000,
    failureRate: 1.13,
    error4xxRate: 1.07,
    error5xxRate: 0.06,
    totalCalls: 153_759,
    health: "degraded",
    alerts: 1,
    contractEnd: "2026-09-15",
    contractRemaining: "还有 53 天",
    account: "joymaas-bailian-prod",
    credential: "ak-****************8f3d",
    contact: "王宇 · 技术支持",
    tags: ["核心供应商"],
    modelResources: aliyunModels,
  },
  {
    id: "azure",
    name: "Azure OpenAI",
    shortName: "Azure",
    mark: "AZ",
    accent: "#1476b8",
    status: "active",
    tier: "核心",
    models: 5,
    endpoints: 6,
    healthyEndpoints: 6,
    tokenBalance: 207_000_000,
    rpm: 48_000,
    rpmLimit: 100_000,
    tpm: 3_100_000,
    tpmLimit: 5_000_000,
    failureRate: 0.09,
    error4xxRate: 0.07,
    error5xxRate: 0.02,
    totalCalls: 2_784_610,
    health: "healthy",
    alerts: 0,
    contractEnd: "2027-03-20",
    contractRemaining: "还有 239 天",
    account: "joymaas-azure-prod",
    credential: "az-****************91cc",
    contact: "Azure Support",
    tags: ["海外", "核心"],
    modelResources: simpleModels("gpt", 5),
  },
  {
    id: "zhipu",
    name: "智谱 AI",
    shortName: "智谱",
    mark: "Z",
    accent: "#3b6fd4",
    status: "active",
    tier: "普通",
    models: 4,
    endpoints: 5,
    healthyEndpoints: 4,
    tokenBalance: 112_000_000,
    rpm: 27_200,
    rpmLimit: 80_000,
    tpm: 1_640_000,
    tpmLimit: 4_000_000,
    failureRate: 2.38,
    error4xxRate: 1.52,
    error5xxRate: 0.86,
    totalCalls: 67_167,
    health: "degraded",
    alerts: 1,
    contractEnd: "2026-08-05",
    contractRemaining: "还有 12 天",
    account: "joymaas-zhipu",
    credential: "zp-****************0bd4",
    contact: "GLM 企业支持",
    tags: ["普通供应商"],
    modelResources: simpleModels("glm", 4),
  },
  {
    id: "moonshot",
    name: "Moonshot",
    shortName: "Kimi",
    mark: "M",
    accent: "#222629",
    status: "standby",
    tier: "备用",
    models: 1,
    endpoints: 1,
    healthyEndpoints: 1,
    tokenBalance: 24_000_000,
    rpm: 0,
    rpmLimit: 20_000,
    tpm: 0,
    tpmLimit: 1_000_000,
    failureRate: 0,
    error4xxRate: 0,
    error5xxRate: 0,
    totalCalls: 0,
    health: "standby",
    alerts: 0,
    contractEnd: "2026-11-30",
    contractRemaining: "还有 129 天",
    account: "joymaas-kimi-backup",
    credential: "ms-****************28e0",
    contact: "Moonshot Support",
    tags: ["备用"],
    modelResources: simpleModels("kimi", 1),
  },
  {
    id: "tencent",
    name: "腾讯混元",
    shortName: "混元",
    mark: "T",
    accent: "#1878f1",
    status: "pending",
    tier: "普通",
    models: 0,
    endpoints: 0,
    healthyEndpoints: 0,
    tokenBalance: 0,
    rpm: 0,
    rpmLimit: 0,
    tpm: 0,
    tpmLimit: 0,
    failureRate: 0,
    error4xxRate: 0,
    error5xxRate: 0,
    totalCalls: 0,
    health: "pending",
    alerts: 0,
    contractEnd: "未签约",
    contractRemaining: "接入评估中",
    account: "尚未创建",
    credential: "尚未配置",
    contact: "待补充",
    tags: ["待接入"],
    modelResources: [],
  },
];

export const upstreamAlerts = [
  {
    id: "alert-tpm",
    supplierId: "aliyun",
    level: "warning" as const,
    title: "阿里云百炼 TPM 利用率 95%",
    detail: "已使用 4,750,000 / 5,000,000，超过安全水位 85%",
    time: "14 分钟前",
  },
  {
    id: "alert-contract",
    supplierId: "zhipu",
    level: "warning" as const,
    title: "智谱 AI 合同即将到期",
    detail: "合同将在 12 天后到期，请确认续约或迁移计划",
    time: "32 分钟前",
  },
  {
    id: "alert-endpoint",
    supplierId: "aliyun",
    level: "degraded" as const,
    title: "eas-qp-max-02 端点降级",
    detail: "近 15 分钟成功率 91.8%，低于健康阈值 95%",
    time: "57 分钟前",
  },
];

export const monitorTrend = [
  { time: "00:00", rpm: 42, tpm: 48, success: 99.7 },
  { time: "04:00", rpm: 36, tpm: 43, success: 99.8 },
  { time: "08:00", rpm: 54, tpm: 65, success: 99.6 },
  { time: "12:00", rpm: 70, tpm: 81, success: 99.5 },
  { time: "16:00", rpm: 81, tpm: 95, success: 98.8 },
  { time: "20:00", rpm: 74, tpm: 86, success: 99.1 },
  { time: "现在", rpm: 68, tpm: 79, success: 99.3 },
];

export const changeLogs = [
  {
    id: "log-1",
    time: "2026-07-24 14:06",
    operator: "周妍",
    object: "qwen-max 上游限额",
    action: "调整安全水位",
    before: "80%",
    after: "85%",
    reason: "大促前预留故障切换容量",
    result: "成功",
  },
  {
    id: "log-2",
    time: "2026-07-24 11:42",
    operator: "林澈",
    object: "eas-qp-max-02",
    action: "降低流量权重",
    before: "50%",
    after: "30%",
    reason: "端点成功率连续 15 分钟低于阈值",
    result: "成功",
  },
  {
    id: "log-3",
    time: "2026-07-23 18:30",
    operator: "系统",
    object: "qwen-plus",
    action: "触发容量告警",
    before: "TPM 84%",
    after: "TPM 92%",
    reason: "自动监控规则",
    result: "已通知",
  },
  {
    id: "log-4",
    time: "2026-07-22 09:18",
    operator: "周妍",
    object: "阿里云百炼",
    action: "更新合同信息",
    before: "2026-08-31",
    after: "2026-09-15",
    reason: "补充采购协议已生效",
    result: "成功",
  },
];
