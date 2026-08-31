import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  FunnelIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  PulseIcon,
  QuestionIcon,
  SquaresFourIcon,
  TestTubeIcon,
  WarningCircleIcon,
  XIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  changeLogs,
  initialSuppliers,
  monitorTrend,
  type Endpoint,
  type ResourceState,
  type Supplier,
} from "../data/upstream";
import type { WaterLevelModule } from "../components/Sidebar";
import { RateLimitConfigPage } from "./RateLimitConfigPage";

const numberFormat = new Intl.NumberFormat("zh-CN");
const capacityNumberFormat = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
});
const historicalTimeRangeOptions = [
  "3 小时",
  "6 小时",
  "9 小时",
  "12 小时",
  "24 小时",
  "今天",
  "昨天",
  "近 7 天",
  "当月",
  "近 30 天",
];
const historicalTimeWindows: Record<string, [string, string]> = {
  "3 小时": ["2026-07-27 06:57:19", "2026-07-27 09:57:19"],
  "6 小时": ["2026-07-27 03:57:19", "2026-07-27 09:57:19"],
  "9 小时": ["2026-07-27 00:57:19", "2026-07-27 09:57:19"],
  "12 小时": ["2026-07-26 21:57:19", "2026-07-27 09:57:19"],
  "24 小时": ["2026-07-26 09:57:19", "2026-07-27 09:57:19"],
  今天: ["2026-07-27 00:00:00", "2026-07-27 09:57:19"],
  昨天: ["2026-07-26 00:00:00", "2026-07-26 23:59:59"],
  "近 7 天": ["2026-07-21 00:00:00", "2026-07-27 09:57:19"],
  当月: ["2026-07-01 00:00:00", "2026-07-27 09:57:19"],
  "近 30 天": ["2026-06-28 00:00:00", "2026-07-27 09:57:19"],
};
const realtimeTimeRangeOptions = [
  "最近 5 分钟",
  "最近 10 分钟",
  "最近 15 分钟",
  "最近 30 分钟",
];
const realtimeRefreshOptions = ["10 秒", "30 秒", "2 分钟", "5 分钟"];
const isCreateSupplierRoute = () =>
  ["upstream/suppliers/new", "water-level/suppliers/new"].includes(
    window.location.hash.replace(/^#\/?/u, "").replace(/\/+$/u, ""),
  );

const pinResources = [
  {
    id: "cloudwise",
    code: "Cloudwise",
    name: "云智慧",
    totalCalls: 713_310,
    failedCalls: 17,
    totalTokens: 3_669_845_955,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    averageDuration: 18.3,
    firstTokenLatency: 0.5,
  },
  {
    id: "njzk",
    code: "NJZK",
    name: "南京掌控",
    totalCalls: 106_589,
    failedCalls: 195,
    totalTokens: 361_119_114,
    failureRate: 0.18,
    error4xx: 0.17,
    error5xx: 0.02,
    averageDuration: 17,
    firstTokenLatency: 17,
  },
  {
    id: "rscenterch",
    code: "RsCenterCH",
    name: "资源中心正式 PIN",
    totalCalls: 19_507,
    failedCalls: 49,
    totalTokens: 286_452_189,
    failureRate: 0.25,
    error4xx: 0.19,
    error5xx: 0.06,
    averageDuration: 22.1,
    firstTokenLatency: 20.5,
  },
  {
    id: "joyclaw",
    code: "JoyClaw",
    name: "JoyClaw",
    totalCalls: 8_160,
    failedCalls: 1,
    totalTokens: 618_439_859,
    failureRate: 0.01,
    error4xx: 0,
    error5xx: 0.01,
    averageDuration: 7,
    firstTokenLatency: 4.1,
  },
  {
    id: "context-in",
    code: "Context-in",
    name: "JoyContext 内部 PIN",
    totalCalls: 7_954,
    failedCalls: 1,
    totalTokens: 31_520_654,
    failureRate: 0.01,
    error4xx: 0,
    error5xx: 0.01,
    averageDuration: 0.9,
    firstTokenLatency: 0.9,
  },
  {
    id: "sjhl02",
    code: "SJHL02",
    name: "北京世纪互联科技有限公司",
    totalCalls: 6_138,
    failedCalls: 1,
    totalTokens: 255_100_245,
    failureRate: 0.02,
    error4xx: 0.02,
    error5xx: 0,
    averageDuration: 4.1,
    firstTokenLatency: 1.3,
  },
];

const pinMonitoringRows = pinResources.map((pin, index) => {
  const capacities = [
    { rpm: "1,194.84 / 300,000", rpmRate: 0.4, tpm: "6,147.21 / 100,000", tpmRate: 6.15 },
    { rpm: "189.62 / 未设置", rpmRate: null, tpm: "544.23 / 未设置", tpmRate: null },
    { rpm: "80.35 / 424,700", rpmRate: 0.02, tpm: "1,983.35 / 5,475,200", tpmRate: 0.04 },
    { rpm: "17.11 / 未设置", rpmRate: null, tpm: "98.32 / 未设置", tpmRate: null },
    { rpm: "11.2 / 未设置", rpmRate: null, tpm: "729.8 / 未设置", tpmRate: null },
    { rpm: "10.34 / 3,000", rpmRate: 0.34, tpm: "411.11 / 60,000", tpmRate: 0.69 },
  ] as const;
  return { ...pin, ...capacities[index] };
});

const pinModelMonitoringRows = [
  { id: "deepseek-v4-flash", name: "DeepSeek-V4-Flash", rpm: "318.6 / 120,000", rpmRate: 0.27, tpm: "2,116.42 / 5,000,000", tpmRate: 4.23, calls: 13_682, failed: 2, tokens: 194_542_531, failureRate: 0.01, error4xx: 0.01, error5xx: 0, duration: 27.5, firstTokenLatency: 1.6 },
  { id: "qwen3-5-122b-a10b", name: "qwen3.5-122b-a10b", rpm: "82.4 / 60,000", rpmRate: 0.14, tpm: "486.33 / 2,000,000", tpmRate: 2.43, calls: 3_589, failed: 0, tokens: 4_391_236, failureRate: 0, error4xx: 0, error5xx: 0, duration: 2.2, firstTokenLatency: 0.4 },
  { id: "glm-5-2", name: "GLM-5.2", rpm: "25.8 / 20,000", rpmRate: 0.13, tpm: "217.59 / 1,000,000", tpmRate: 2.17, calls: 2_434, failed: 6, tokens: 117_207_798, failureRate: 0.25, error4xx: 0.16, error5xx: 0.08, duration: 17.3, firstTokenLatency: 3.8 },
  { id: "deepseek-v4-pro", name: "DeepSeek-V4-pro", rpm: "47.2 / 40,000", rpmRate: 0.12, tpm: "384.6 / 2,000,000", tpmRate: 1.92, calls: 1_746, failed: 21, tokens: 73_419_365, failureRate: 1.2, error4xx: 0.57, error5xx: 0.63, duration: 15.3, firstTokenLatency: 4.2 },
  { id: "qwen-plus", name: "qwen-plus", rpm: "31.6 / 50,000", rpmRate: 0.06, tpm: "286.4 / 2,000,000", tpmRate: 1.43, calls: 1_227, failed: 4, tokens: 38_728_412, failureRate: 0.33, error4xx: 0.21, error5xx: 0.12, duration: 9.8, firstTokenLatency: 1.1 },
];

const pinAuthorizedModelCounts: Record<string, number> = {
  cloudwise: 17,
  njzk: 12,
  rscenterch: 9,
  joyclaw: 6,
  "context-in": 5,
  sjhl02: 4,
};

const getPinModelMonitoringId = () => {
  const parts = window.location.hash.replace(/^#\/?/u, "").split("/");
  return parts[0] === "water-level" && parts[1] === "pins" && parts[3] === "models"
    ? parts[2]
    : null;
};

const getPinModelRateLimitRoute = () => {
  const parts = window.location.hash.replace(/^#\/?/u, "").split("/");
  return parts[0] === "water-level" && parts[1] === "pins" && parts[3] === "models" && parts[4] && parts[5] === "rate-limit"
    ? { pinId: parts[2], modelId: parts[4] }
    : null;
};

const getPinKeyMonitoringId = () => {
  const parts = window.location.hash.replace(/^#\/?/u, "").split("/");
  return parts[0] === "water-level" && parts[1] === "pins" && parts[3] === "keys"
    ? parts[2]
    : null;
};

const getBoundKeyModelId = () => {
  const parts = window.location.hash.replace(/^#\/?/u, "").split("/");
  return parts[0] === "water-level" && parts[1] === "pins" && parts[3] === "keys" && parts[5] === "models"
    ? parts[4]
    : null;
};

const getWaterModelDetailId = () => {
  const parts = window.location.hash.replace(/^#\/?/u, "").split("/");
  return parts[0] === "water-level" && parts[1] === "models" && parts[2]
    ? parts[2]
    : null;
};

const getWaterModelPinUsageId = () => {
  const parts = window.location.hash.replace(/^#\/?/u, "").split("/");
  return parts[0] === "water-level" && parts[1] === "models" && parts[2] && parts[3] === "usage"
    ? parts[2]
    : null;
};

const getWaterModelUsageMonitorId = () => {
  const parts = window.location.hash.replace(/^#\/?/u, "").split("/");
  return parts[0] === "water-level" && parts[1] === "models" && parts[2] && parts[3] === "monitor"
    ? parts[2]
    : null;
};

const getWaterEndpointUsageMonitor = () => {
  const parts = window.location.hash.replace(/^#\/?/u, "").split("/");
  return parts[0] === "water-level" && parts[1] === "models" && parts[2] && parts[3] === "endpoints" && parts[4] && parts[5] === "monitor"
    ? { modelId: parts[2], endpoint: parts[4] }
    : null;
};

const pinKeyMonitoringRows = [
  { id: "cw-prod-01", name: "生产主 Key", rpm: "426.8 / 120,000", rpmRate: 0.36, tpm: "2,820.34 / 5,000,000", tpmRate: 5.64, calls: 286_518, failed: 4, tokens: 1_624_831_540, failureRate: 0, error4xx: 0, error5xx: 0, duration: 18.6, firstTokenLatency: 0.6 },
  { id: "cw-prod-02", name: "生产备用 Key", rpm: "289.6 / 100,000", rpmRate: 0.29, tpm: "1,961.42 / 4,000,000", tpmRate: 4.9, calls: 214_376, failed: 3, tokens: 1_103_884_602, failureRate: 0, error4xx: 0, error5xx: 0, duration: 17.9, firstTokenLatency: 0.5 },
  { id: "cw-enterprise", name: "企业专线 Key", rpm: "178.2 / 80,000", rpmRate: 0.22, tpm: "1,204.65 / 2,000,000", tpmRate: 6.02, calls: 106_894, failed: 2, tokens: 491_746_831, failureRate: 0, error4xx: 0, error5xx: 0, duration: 20.1, firstTokenLatency: 0.8 },
  { id: "cw-gray", name: "灰度验证 Key", rpm: "72.4 / 20,000", rpmRate: 0.36, tpm: "642.1 / 1,000,000", tpmRate: 6.42, calls: 58_703, failed: 5, tokens: 242_310_556, failureRate: 0.01, error4xx: 0.01, error5xx: 0, duration: 16.3, firstTokenLatency: 1.1 },
  { id: "cw-sandbox", name: "沙箱 Key", rpm: "19.8 / 未设置", rpmRate: null, tpm: "121.48 / 未设置", tpmRate: null, calls: 31_212, failed: 1, tokens: 91_282_406, failureRate: 0, error4xx: 0, error5xx: 0, duration: 9.4, firstTokenLatency: 0.9 },
  { id: "cw-legacy", name: "兼容 Key", rpm: "8.2 / 未设置", rpmRate: null, tpm: "38.15 / 未设置", tpmRate: null, calls: 15_607, failed: 2, tokens: 46_106_020, failureRate: 0.01, error4xx: 0, error5xx: 0.01, duration: 13.7, firstTokenLatency: 1.6 },
];

const keyBoundModels = [
  { name: "DeepSeek-V4-Flash", rpm: "318.6 / 120,000", rpmRate: 0.27, tpm: "2,116.42 / 5,000,000", tpmRate: 4.23, tokens: 1_124_830_541, latency: 0.6, failureRate: 0 },
  { name: "qwen3.5-122b-a10b", rpm: "82.4 / 60,000", rpmRate: 0.14, tpm: "486.33 / 2,000,000", tpmRate: 2.43, tokens: 306_004_891, latency: 1.1, failureRate: 0.01 },
  { name: "GLM-5.2", rpm: "25.8 / 20,000", rpmRate: 0.13, tpm: "217.59 / 1,000,000", tpmRate: 2.17, tokens: 193_996_108, latency: 1.7, failureRate: 0.02 },
];

const keyBoundRealtimeModels = [
  { name: "doubao-seed-2-0-lite-2025-10-01", rpm: "394.2 / 未设置", tpm: "611.09 / 未设置", tokens: 3_055_431, latency: 5.9 },
  { name: "doubao-seed-2-0-pro-2025-10-01", rpm: "151 / 未设置", tpm: "292.79 / 未设置", tokens: 1_463_960, latency: 8.3 },
  { name: "doubao-seed-2-0-code-preview", rpm: "0.2 / 未设置", tpm: "0.02 / 未设置", tokens: 94, latency: 3 },
];

type ModelWaterRow = {
  id: string;
  name: string;
  aliases: string;
  providers: number;
  endpoints: number;
  healthyEndpoints: number;
  rpm: number;
  rpmLimit: number;
  tpm: number;
  tpmLimit: number;
  totalTokens: number;
  failureRate: number;
  error4xxRate: number;
  error5xxRate: number;
  totalCalls: number;
  failedCalls: number;
  averageDuration: number;
  firstTokenLatency: number;
  state: ResourceState;
};

const modelWaterRows: ModelWaterRow[] = [
  { id: "doubao-seed", name: "doubao-seed-2-0", aliases: "Doubao Seed 2.0", providers: 2, endpoints: 9, healthyEndpoints: 9, rpm: 103_400, rpmLimit: 160_000, tpm: 6_420_000, tpmLimit: 7_200_000, totalTokens: 3_669_884_391, failureRate: 0.12, error4xxRate: 0.08, error5xxRate: 0.04, totalCalls: 482_723, failedCalls: 579, averageDuration: 15.8, firstTokenLatency: 0.8, state: "warning" },
  { id: "qwen-max", name: "qwen-max", aliases: "千问 · 最大", providers: 2, endpoints: 7, healthyEndpoints: 6, rpm: 84_100, rpmLimit: 110_000, tpm: 4_750_000, tpmLimit: 5_000_000, totalTokens: 1_184_057_742, failureRate: 1.13, error4xxRate: 0.75, error5xxRate: 0.38, totalCalls: 237_277, failedCalls: 2_681, averageDuration: 20.4, firstTokenLatency: 1.7, state: "degraded" },
  { id: "deepseek-v4-flash", name: "DeepSeek-V4-Flash", aliases: "DeepSeek V4 Flash", providers: 3, endpoints: 12, healthyEndpoints: 12, rpm: 74_400, rpmLimit: 120_000, tpm: 3_900_000, tpmLimit: 5_000_000, totalTokens: 924_902_748, failureRate: 0.18, error4xxRate: 0.11, error5xxRate: 0.07, totalCalls: 250_000, failedCalls: 450, averageDuration: 13.6, firstTokenLatency: 0.5, state: "healthy" },
  { id: "glm-5-2", name: "GLM-5.2", aliases: "智谱 GLM 5.2", providers: 2, endpoints: 5, healthyEndpoints: 5, rpm: 31_200, rpmLimit: 80_000, tpm: 1_640_000, tpmLimit: 4_000_000, totalTokens: 435_690_584, failureRate: 0.25, error4xxRate: 0.16, error5xxRate: 0.09, totalCalls: 130_000, failedCalls: 325, averageDuration: 12.4, firstTokenLatency: 1.2, state: "healthy" },
  { id: "qwen-plus", name: "qwen-plus", aliases: "千问 · 增强", providers: 2, endpoints: 4, healthyEndpoints: 4, rpm: 27_600, rpmLimit: 80_000, tpm: 1_640_000, tpmLimit: 4_000_000, totalTokens: 324_902_748, failureRate: 0.09, error4xxRate: 0.06, error5xxRate: 0.03, totalCalls: 100_000, failedCalls: 90, averageDuration: 10.8, firstTokenLatency: 0.9, state: "healthy" },
  { id: "claude-sonnet", name: "Claude-3.7-Sonnet", aliases: "Anthropic Sonnet", providers: 1, endpoints: 2, healthyEndpoints: 1, rpm: 12_800, rpmLimit: 30_000, tpm: 420_000, tpmLimit: 1_000_000, totalTokens: 152_388_239, failureRate: 0.72, error4xxRate: 0.33, error5xxRate: 0.39, totalCalls: 53_817, failedCalls: 388, averageDuration: 25.7, firstTokenLatency: 2.4, state: "warning" },
];

type ModelPinUsageRow = {
  pinId: string;
  code: string;
  name: string;
  tpm: number;
  tpmLimit: number;
  tpmPeak: number;
  rpm: number;
  rpmLimit: number;
  rpmPeak: number;
  totalTokens: number;
  totalCalls: number;
  failedCalls: number;
  failureRate: number;
  usageShare: number;
  lastActive: string;
};

const modelPinUsageShares = [
  { pinId: "cloudwise", share: 0.38, lastActive: "14:31:22" },
  { pinId: "njzk", share: 0.22, lastActive: "14:30:58" },
  { pinId: "rscenterch", share: 0.16, lastActive: "14:29:47" },
  { pinId: "joyclaw", share: 0.11, lastActive: "14:28:16" },
  { pinId: "context-in", share: 0.07, lastActive: "14:26:03" },
  { pinId: "sjhl02", share: 0.06, lastActive: "14:24:51" },
] as const;

const allocateByShares = (total: number, shares: readonly number[]) => {
  const allocations: number[] = [];
  let allocated = 0;
  shares.forEach((share, index) => {
    const value = index === shares.length - 1
      ? Math.max(0, total - allocated)
      : Math.round(total * share);
    allocations.push(value);
    allocated += value;
  });
  return allocations;
};

const getModelPinUsageRows = (model: ModelWaterRow, activityScale = 1): ModelPinUsageRow[] => {
  const totalTokens = Math.round(model.totalTokens * activityScale);
  const totalCalls = Math.round(model.totalCalls * activityScale);
  const totalFailedCalls = Math.round(model.failedCalls * activityScale);
  const tokenAllocations = allocateByShares(totalTokens, modelPinUsageShares.map((item) => item.share));
  const callAllocations = allocateByShares(totalCalls, modelPinUsageShares.map((item) => item.share));
  const failureAllocations = allocateByShares(totalFailedCalls, modelPinUsageShares.map((item) => item.share));

  return modelPinUsageShares.map((item, index) => {
    const pin = pinResources.find((resource) => resource.id === item.pinId) ?? pinResources[0];
    const calls = callAllocations[index];
    const failedCalls = failureAllocations[index];
    const tpm = Math.round(model.tpm * item.share * activityScale);
    const tpmLimit = Math.max(1, Math.round(model.tpmLimit * item.share));
    const rpm = Math.round(model.rpm * item.share * activityScale);
    const rpmLimit = Math.max(1, Math.round(model.rpmLimit * item.share));
    return {
      pinId: pin.id,
      code: pin.code,
      name: pin.name,
      tpm,
      tpmLimit,
      tpmPeak: numericCapacityPeak(tpm, tpmLimit, Number.isFinite(activityScale) && activityScale < 1 ? 1.18 : 1.09),
      rpm,
      rpmLimit,
      rpmPeak: numericCapacityPeak(rpm, rpmLimit, Number.isFinite(activityScale) && activityScale < 1 ? 1.2 : 1.34),
      totalTokens: tokenAllocations[index],
      totalCalls: calls,
      failedCalls,
      failureRate: calls ? (failedCalls / calls) * 100 : 0,
      usageShare: totalTokens ? (tokenAllocations[index] / totalTokens) * 100 : 0,
      lastActive: item.lastActive,
    };
  });
};

const modelRealtimeActivityScale = 4_267 / 1_253_817;

const modelWaterSources = [
  { supplier: "火山方舟", endpoint: "doubao-prod-01", level: "L1", levelLabel: "生产", rpm: "42,100 / 60,000", rpmRate: 70, tpm: "2,580,000 / 3,000,000", tpmRate: 86, failure: 0.08, averageDuration: 14.6, firstTokenLatency: 0.7, state: "warning" as ResourceState },
  { supplier: "火山方舟", endpoint: "doubao-prod-02", level: "L1", levelLabel: "生产", rpm: "31,800 / 50,000", rpmRate: 64, tpm: "1,920,000 / 2,400,000", tpmRate: 80, failure: 0.13, averageDuration: 15.1, firstTokenLatency: 0.8, state: "healthy" as ResourceState },
  { supplier: "火山方舟", endpoint: "doubao-backup-01", level: "L2", levelLabel: "备用", rpm: "18,700 / 30,000", rpmRate: 62, tpm: "1,040,000 / 1,800,000", tpmRate: 58, failure: 0.15, averageDuration: 17.3, firstTokenLatency: 1.1, state: "healthy" as ResourceState },
  { supplier: "Azure OpenAI", endpoint: "doubao-gray-01", level: "L3", levelLabel: "灰度", rpm: "10,800 / 20,000", rpmRate: 54, tpm: "880,000 / 1,000,000", tpmRate: 88, failure: 0.21, averageDuration: 19.2, firstTokenLatency: 1.5, state: "warning" as ResourceState },
];

const supplierMonitoringRows = [
  {
    id: "qingcheng",
    name: "北京清程极智-B",
    rpm: "1,194.84 / 300,000",
    rpmRate: 0.4,
    tpm: "6,147.21 / 100,000",
    tpmRate: 6.15,
    totalTokens: 3_669_884_391,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    calls: 713_319,
    failedCalls: 17,
    models: "1 / 1",
    averageDuration: 18.3,
  },
  {
    id: "doubao",
    name: "豆包原厂",
    rpm: "189.62 / 未设置",
    rpmRate: null,
    tpm: "544.23 / 未设置",
    tpmRate: null,
    totalTokens: 324_902_748,
    failureRate: 0.17,
    error4xx: 0.16,
    error5xx: 0.02,
    calls: 113_206,
    failedCalls: 195,
    models: "6 / 25",
    averageDuration: 16.8,
  },
  {
    id: "aliyun",
    name: "阿里云",
    rpm: "80.35 / 424,700",
    rpmRate: 0.02,
    tpm: "1,983.35 / 5,475,200",
    tpmRate: 0.04,
    totalTokens: 1_184_057_742,
    failureRate: 0.27,
    error4xx: 0.25,
    error5xx: 0.03,
    calls: 47_967,
    failedCalls: 130,
    models: "22 / 40",
    averageDuration: 13.4,
  },
  {
    id: "jd-build",
    name: "京东-build",
    rpm: "17.11 / 未设置",
    rpmRate: null,
    tpm: "98.32 / 未设置",
    tpmRate: null,
    totalTokens: 58_695_490,
    failureRate: 0.57,
    error4xx: 0.57,
    error5xx: 0,
    calls: 10_217,
    failedCalls: 58,
    models: "10 / 41",
    averageDuration: 0.7,
  },
  {
    id: "jd-yanxi",
    name: "京东-言犀",
    rpm: "11.2 / 未设置",
    rpmRate: null,
    tpm: "729.8 / 未设置",
    tpmRate: null,
    totalTokens: 435_690_584,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    calls: 6_685,
    failedCalls: 0,
    models: "2 / 7",
    averageDuration: 5.9,
  },
  {
    id: "cloudwise",
    name: "cloudwise",
    rpm: "4.92 / 未设置",
    rpmRate: null,
    tpm: "33.96 / 未设置",
    tpmRate: null,
    totalTokens: 20_276_793,
    failureRate: 11.05,
    error4xx: 3.88,
    error5xx: 7.18,
    calls: 2_940,
    failedCalls: 325,
    models: "13 / 49",
    averageDuration: 16.6,
  },
  {
    id: "tencent",
    name: "腾讯云",
    rpm: "4.08 / 2,000",
    rpmRate: 0.2,
    tpm: "255.26 / 20,000",
    tpmRate: 1.28,
    totalTokens: 152_388_239,
    failureRate: 0.99,
    error4xx: 0.33,
    error5xx: 0.66,
    calls: 2_436,
    failedCalls: 24,
    models: "1 / 1",
    averageDuration: 15.4,
  },
];

const supplierRealtimeRows = [
  {
    id: "doubao",
    status: "normal",
    name: "豆包原厂",
    rpm: "520.8 / 未设置",
    rpmRate: null,
    tpm: "844.13 / 未设置",
    tpmRate: null,
    totalTokens: 4_220_639,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    calls: 1848,
    failedCalls: 0,
    models: "6 / 25",
    averageDuration: 15.9,
  },
  {
    id: "aliyun",
    status: "normal",
    name: "阿里云",
    rpm: "91 / 424,700",
    rpmRate: 0.02,
    tpm: "3,813.67 / 5,475,200",
    tpmRate: 0.07,
    totalTokens: 19_068_352,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    calls: 396,
    failedCalls: 0,
    models: "22 / 40",
    averageDuration: 13.1,
  },
  {
    id: "qingcheng",
    status: "normal",
    name: "北京行云智远",
    rpm: "70.4 / 3,000",
    rpmRate: 2.35,
    tpm: "4,886.84 / 60,000",
    tpmRate: 8.14,
    totalTokens: 24_434_215,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    calls: 713,
    failedCalls: 0,
    models: "1 / 13",
    averageDuration: 15.2,
  },
  {
    id: "jd-build",
    status: "normal",
    name: "京东-build",
    rpm: "47 / 未设置",
    rpmRate: null,
    tpm: "97.47 / 未设置",
    tpmRate: null,
    totalTokens: 487_339,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    calls: 68,
    failedCalls: 0,
    models: "10 / 41",
    averageDuration: 0.7,
  },
  {
    id: "shenzhen-mobile",
    status: "normal",
    name: "深圳移动",
    rpm: "19.2 / 220,000",
    rpmRate: 0.01,
    tpm: "36.4 / 90,000",
    tpmRate: 0.04,
    totalTokens: 182_012,
    failureRate: 1.04,
    error4xx: 1.04,
    error5xx: 0,
    calls: 96,
    failedCalls: 1,
    models: "1 / 3",
    averageDuration: 10.6,
  },
  {
    id: "tencent",
    status: "normal",
    name: "腾讯云",
    rpm: "10.8 / 2,000",
    rpmRate: 0.54,
    tpm: "328.46 / 20,000",
    tpmRate: 1.64,
    totalTokens: 1_642_285,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    calls: 89,
    failedCalls: 0,
    models: "1 / 1",
    averageDuration: 15.4,
  },
  {
    id: "jd-yanxi",
    status: "normal",
    name: "京东-言犀",
    rpm: "10.4 / 未设置",
    rpmRate: null,
    tpm: "514.65 / 未设置",
    tpmRate: null,
    totalTokens: 2_573_229,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    calls: 114,
    failedCalls: 0,
    models: "2 / 7",
    averageDuration: 5.9,
  },
  {
    id: "cloudwise",
    status: "alert",
    name: "cloudwise",
    rpm: "8.8 / 未设置",
    rpmRate: null,
    tpm: "137.39 / 未设置",
    tpmRate: null,
    totalTokens: 686_952,
    failureRate: 54.55,
    error4xx: 40.91,
    error5xx: 13.64,
    calls: 22,
    failedCalls: 12,
    models: "13 / 49",
    averageDuration: 16.6,
  },
  {
    id: "fengfeng",
    status: "normal",
    name: "锌锋网络-B",
    rpm: "4.8 / 未设置",
    rpmRate: null,
    tpm: "247.81 / 未设置",
    tpmRate: null,
    totalTokens: 1_239_054,
    failureRate: 4.17,
    error4xx: 4.17,
    error5xx: 0,
    calls: 24,
    failedCalls: 1,
    models: "10 / 21",
    averageDuration: 17.4,
  },
  {
    id: "senhua",
    status: "normal",
    name: "森华科技",
    rpm: "4.4 / 27,657",
    rpmRate: 0.02,
    tpm: "183.71 / 124,072",
    tpmRate: 0.15,
    totalTokens: 918_537,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    calls: 52,
    failedCalls: 0,
    models: "9 / 17",
    averageDuration: 16,
  },
  {
    id: "yunqingyang",
    status: "normal",
    name: "云轻扬-b",
    rpm: "2.8 / 未设置",
    rpmRate: null,
    tpm: "267.23 / 未设置",
    tpmRate: null,
    totalTokens: 1_336_162,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    calls: 38,
    failedCalls: 0,
    models: "3 / 9",
    averageDuration: 20.4,
  },
];

const supplier429Counts: Record<string, number> = {
  qingcheng: 0,
  doubao: 88,
  aliyun: 23,
  "jd-build": 16,
  "jd-yanxi": 0,
  cloudwise: 314,
  tencent: 9,
};

const supplierRealtime429Counts: Record<string, number> = {
  doubao: 0,
  aliyun: 3,
  qingcheng: 0,
  "jd-build": 0,
  "shenzhen-mobile": 1,
  tencent: 0,
  "jd-yanxi": 0,
  cloudwise: 9,
  fengfeng: 1,
  senhua: 0,
  yunqingyang: 0,
};

function compactNumber(value: number) {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)}亿`;
  if (value >= 10_000) return `${Math.round(value / 10_000)}万`;
  return numberFormat.format(value);
}

function percent(value: number, limit: number) {
  if (!limit) return 0;
  return Math.round((value / limit) * 100);
}

function capacityPeak(value: string, factor = 1.35) {
  const [currentText, limitText] = value.split("/");
  const current = Number(currentText.replace(/,/g, "").trim());
  const limit = Number(limitText?.replace(/,/g, "").trim());
  const calculatedPeak = current * factor;
  if (!Number.isFinite(limit) || limit <= 0) return calculatedPeak;
  return Math.max(current, Math.min(calculatedPeak, limit * 0.96));
}

function numericCapacityPeak(current: number, limit: number, factor = 1.35) {
  return Math.max(current, Math.min(current * factor, limit * 0.96));
}

function CapacityPeakNote({ value }: { value: number }) {
  return (
    <em className="capacity-peak-note">
      <b>峰值</b>
      <span className="tabular">{capacityNumberFormat.format(value)}</span>
    </em>
  );
}

function CapacityMeter({
  used,
  limit,
  peak,
  utilization,
}: {
  used: number;
  limit: number | null;
  peak: number;
  utilization?: number | null;
}) {
  const configured = limit !== null && Number.isFinite(limit) && limit > 0;
  const rate = utilization === undefined
    ? configured
      ? percent(used, limit)
      : null
    : utilization;
  const progress = rate === null ? 0 : Math.min(Math.max(rate, 0), 100);

  return (
    <div className={`capacity-meter ${configured ? "" : "unconfigured"}`}>
      <span className="tabular">
        {capacityNumberFormat.format(used)} /{" "}
        {configured ? capacityNumberFormat.format(limit) : "未设置"}
      </span>
      <small>
        <span>
          利用率 {rate === null ? "—" : `${capacityNumberFormat.format(rate)}%`}
          {" · "}
          剩余 {configured ? capacityNumberFormat.format(Math.max(limit - used, 0)) : "—"}
        </span>
        <CapacityPeakNote value={peak} />
      </small>
      <i><b style={{ width: `${progress}%` }} /></i>
    </div>
  );
}

function CapacityValue({
  value,
  peakFactor = 1.35,
  utilization,
}: {
  value: string;
  peakFactor?: number;
  utilization?: number | null;
}) {
  const [usedText, limitText] = value.split("/");
  const used = Number(usedText.replace(/,/g, "").trim());
  const parsedLimit = Number(limitText?.replace(/,/g, "").trim());
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : null;
  return (
    <CapacityMeter
      used={used}
      limit={limit}
      peak={capacityPeak(value, peakFactor)}
      utilization={utilization}
    />
  );
}

const stateLabels: Record<ResourceState, string> = {
  healthy: "健康",
  warning: "临近上限",
  degraded: "降级",
  standby: "待启用",
  pending: "未配置",
};

function StateMark({
  state,
  label,
}: {
  state: ResourceState;
  label?: string;
}) {
  return (
    <span className={`upstream-state ${state}`}>
      <i />
      {label ?? stateLabels[state]}
    </span>
  );
}

type MonitoringStatus = "normal" | "warning" | "alert" | "unconfigured" | "data-error";

type MonitoringStatusDecision = {
  status: MonitoringStatus;
  reason: string;
  actual: string;
  threshold: string;
  note?: string;
};

type MonitoringStatusInput = {
  rpmUtilization?: number | null;
  tpmUtilization?: number | null;
  failureRate?: number | null;
  rateLimit?: "none" | "intermittent" | "persistent";
  availability?: "all" | "partial" | "none";
  configured?: boolean;
  partialUnconfigured?: boolean;
  dataError?: boolean;
};

const monitoringStatusMeta: Record<MonitoringStatus, { label: string; priority: number }> = {
  normal: { label: "正常", priority: 0 },
  warning: { label: "预警", priority: 1 },
  alert: { label: "报警", priority: 2 },
  unconfigured: { label: "未配置", priority: 3 },
  "data-error": { label: "数据异常", priority: 4 },
};

function resolveMonitoringStatus(input: MonitoringStatusInput): MonitoringStatusDecision {
  if (input.dataError) {
    return { status: "data-error", reason: "监控数据缺失或超过两个刷新周期未更新", actual: "数据更新时间异常", threshold: "超过 2 个刷新周期", };
  }

  const configuredMetrics = [input.rpmUtilization, input.tpmUtilization].filter(
    (value): value is number => typeof value === "number",
  );
  const decisions: MonitoringStatusDecision[] = [];
  const addUtilization = (value: number | null | undefined, label: "RPM" | "TPM") => {
    if (typeof value !== "number") return;
    if (value >= 90) decisions.push({ status: "alert", reason: `${label} 利用率达到报警线`, actual: `${value.toFixed(2)}%`, threshold: "≥ 90%" });
    else if (value >= 80) decisions.push({ status: "warning", reason: `${label} 利用率接近上限`, actual: `${value.toFixed(2)}%`, threshold: "80% ～ ＜90%" });
    else decisions.push({ status: "normal", reason: `${label} 利用率处于安全范围`, actual: `${value.toFixed(2)}%`, threshold: "＜ 80%" });
  };
  addUtilization(input.rpmUtilization, "RPM");
  addUtilization(input.tpmUtilization, "TPM");

  if (typeof input.failureRate === "number") {
    if (input.failureRate >= 10) decisions.push({ status: "alert", reason: "失败率达到报警线", actual: `${input.failureRate.toFixed(2)}%`, threshold: "≥ 10%" });
    else if (input.failureRate >= 5) decisions.push({ status: "warning", reason: "失败率开始恶化", actual: `${input.failureRate.toFixed(2)}%`, threshold: "5% ～ ＜10%" });
    else decisions.push({ status: "normal", reason: "失败率处于安全范围", actual: `${input.failureRate.toFixed(2)}%`, threshold: "＜ 5%" });
  }
  if (input.rateLimit === "persistent") decisions.push({ status: "alert", reason: "持续发生 429 限流", actual: "持续性 429", threshold: "无持续性 429" });
  if (input.rateLimit === "intermittent") decisions.push({ status: "warning", reason: "出现间歇性 429 限流", actual: "间歇性 429", threshold: "无明显限流" });
  if (input.availability === "none") decisions.push({ status: "alert", reason: "无可用资源或剩余容量不足", actual: "无可用资源", threshold: "至少存在可承接负载的资源" });
  if (input.availability === "partial") decisions.push({ status: "warning", reason: "部分资源不可用，剩余资源仍可承接当前调用", actual: "部分资源不可用", threshold: "全部资源可用" });

  const decision = decisions.reduce<MonitoringStatusDecision>((mostSevere, candidate) => (
    monitoringStatusMeta[candidate.status].priority > monitoringStatusMeta[mostSevere.status].priority ? candidate : mostSevere
  ), decisions[0] ?? { status: "normal", reason: "所有适用指标处于安全范围", actual: "—", threshold: "安全范围" });

  if (input.configured === false || configuredMetrics.length === 0) {
    const qualityDecision = decisions.reduce<MonitoringStatusDecision>((mostSevere, candidate) => (
      monitoringStatusMeta[candidate.status].priority > monitoringStatusMeta[mostSevere.status].priority ? candidate : mostSevere
    ), { status: "normal", reason: "未发现影响可用性的质量异常", actual: "—", threshold: "安全范围" });
    if (qualityDecision.status === "warning" || qualityDecision.status === "alert") return qualityDecision;
    return { status: "unconfigured", reason: "RPM、TPM 或 Token 额度未配置，无法判断水位", actual: "额度未设置", threshold: "需至少配置一项容量指标" };
  }

  return input.partialUnconfigured
    ? { ...decision, note: "部分未配置" }
    : decision;
}

function StatusBadge({ decision }: { decision: MonitoringStatusDecision }) {
  const meta = monitoringStatusMeta[decision.status];
  return <span className={`monitoring-status ${decision.status}`} tabIndex={0}>
    <i />
    <span>{meta.label}</span>
    {decision.note ? <em>{decision.note}</em> : null}
    <span className="monitoring-status-tooltip" role="tooltip">
      <strong>{meta.label} · 状态判定</strong>
      <span>{decision.reason}</span>
      <span>实际值：{decision.actual}</span>
      <span>阈值：{decision.threshold}</span>
      <span>计算时间：2026-07-29 14:32:18（最近 5 分钟）</span>
    </span>
  </span>;
}

function Utilization({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  const state = value >= 90 ? "warning" : value >= 80 ? "high" : "normal";
  return (
    <div
      className={`utilization ${state} ${compact ? "compact" : ""}`}
      aria-label={`利用率 ${value}%`}
    >
      <span>{value}%</span>
      <i>
        <b style={{ width: `${Math.min(value, 100)}%` }} />
      </i>
    </div>
  );
}

function ProviderMark({ supplier }: { supplier: Supplier }) {
  return (
    <span
      className="provider-mark"
      style={{ "--provider-accent": supplier.accent } as React.CSSProperties}
      aria-hidden="true"
    >
      {supplier.mark}
    </span>
  );
}

function UpstreamMetrics({ suppliers }: { suppliers: Supplier[] }) {
  const endpoints = suppliers.reduce((sum, item) => sum + item.endpoints, 0);
  const healthyEndpoints = suppliers.reduce(
    (sum, item) => sum + item.healthyEndpoints,
    0,
  );
  const tokens = suppliers.reduce((sum, item) => sum + item.tokenBalance, 0);
  const alerts = suppliers.reduce((sum, item) => sum + item.alerts, 0);
  const metrics = [
    {
      index: "01",
      label: "供应商",
      value: String(suppliers.length),
      note: "全部供应商总数",
      tone: "navy",
    },
    {
      index: "02",
      label: "可用端点",
      value: `${healthyEndpoints}/${endpoints}`,
      note: "可用端点 / 总端点",
      tone: "teal",
    },
    {
      index: "03",
      label: "Token 余额",
      value: compactNumber(tokens),
      note: "全部供应商 Token 余额",
      tone: "navy",
    },
    {
      index: "04",
      label: "当前告警",
      value: String(alerts + 1),
      note: "需处理告警",
      tone: "amber",
    },
  ];

  return (
    <section className="upstream-metrics" aria-label="供应商水位摘要">
      {metrics.map((metric) => (
        <div className="upstream-metric" key={metric.label}>
          <div>
            <span>{metric.index}</span>
            <label>{metric.label}</label>
          </div>
          <strong className={metric.tone}>{metric.value}</strong>
          <small>{metric.note}</small>
        </div>
      ))}
    </section>
  );
}

function Toolbar({
  query,
  status,
  health,
  onQueryChange,
  onStatusChange,
  onHealthChange,
  onRefresh,
  onAdd,
}: {
  query: string;
  status: string;
  health: string;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: string) => void;
  onHealthChange: (health: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="upstream-toolbar">
      <div className="upstream-view-tabs">
        <strong>供应商列表</strong>
        <span>容量直接归属模型与端点</span>
      </div>
      <div className="upstream-filters">
        <label className="upstream-search">
          <MagnifyingGlassIcon size={16} />
          <input
            value={query}
            placeholder="搜索供应商名称"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <label className="upstream-select">
          <FunnelIcon size={14} />
          <select
            value={status}
            aria-label="合作状态"
            onChange={(event) => onStatusChange(event.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="active">合作中</option>
            <option value="standby">待启用</option>
            <option value="pending">接入中</option>
          </select>
        </label>
        <label className="upstream-select">
          <PulseIcon size={14} />
          <select
            value={health}
            aria-label="健康状态"
            onChange={(event) => onHealthChange(event.target.value)}
          >
            <option value="all">全部健康状态</option>
            <option value="healthy">健康</option>
            <option value="warning">临近上限</option>
            <option value="degraded">降级</option>
            <option value="standby">待启用</option>
          </select>
        </label>
        <button
          className="upstream-icon-action"
          type="button"
          title="刷新数据"
          aria-label="刷新数据"
          onClick={onRefresh}
        >
          <ArrowClockwiseIcon size={17} />
        </button>
        <button className="upstream-primary" type="button" onClick={onAdd}>
          <PlusIcon size={15} />
          新增供应商
        </button>
      </div>
    </div>
  );
}

function SupplierTable({
  suppliers,
  onOpen,
}: {
  suppliers: Supplier[];
  onOpen: (supplier: Supplier, tab?: DetailTab) => void;
}) {
  return (
    <div className="supplier-table-wrap">
      <div className="supplier-grid supplier-grid-head">
        <span>供应商</span>
        <span>合作状态</span>
        <span>模型 / 端点</span>
        <span>Token 余额</span>
        <span>RPM 容量 / 峰值（次/min）</span>
        <span>TPM 容量 / 峰值（Token/min）</span>
        <span>失败率</span>
        <span>4xx 错误率</span>
        <span>5xx 错误率</span>
        <span>调用总量</span>
        <span>端点健康</span>
        <span>操作</span>
      </div>
      {suppliers.map((supplier) => {
        return (
          <div className="supplier-record" key={supplier.id}>
            <div className="supplier-grid supplier-grid-row">
              <div className="supplier-identity">
                <ProviderMark supplier={supplier} />
                <button
                  className="supplier-name-button"
                  type="button"
                  onClick={() => onOpen(supplier)}
                >
                  <strong>{supplier.name}</strong>
                  <small>{supplier.tags.join(" · ")}</small>
                </button>
              </div>
              <StateMark
                state={
                  supplier.status === "active" ? "healthy" : supplier.health
                }
                label={
                  supplier.status === "active"
                    ? "合作中"
                    : supplier.status === "standby"
                      ? "待启用"
                      : "接入中"
                }
              />
              <span className="tabular">
                {supplier.models} / {supplier.endpoints}
              </span>
              <span className="tabular">{compactNumber(supplier.tokenBalance)}</span>
              {supplier.rpmLimit ? (
                <CapacityMeter
                  used={supplier.rpm}
                  limit={supplier.rpmLimit}
                  peak={numericCapacityPeak(supplier.rpm, supplier.rpmLimit, 1.32)}
                />
              ) : (
                <span className="muted">—</span>
              )}
              {supplier.tpmLimit ? (
                <CapacityMeter
                  used={supplier.tpm}
                  limit={supplier.tpmLimit}
                  peak={numericCapacityPeak(supplier.tpm, supplier.tpmLimit, 1.12)}
                />
              ) : (
                <span className="muted">—</span>
              )}
              <span
                className={`supplier-rate ${supplier.failureRate >= 2 ? "critical" : supplier.failureRate >= 1 ? "warning" : "healthy"}`}
              >
                {supplier.failureRate.toFixed(2)}%
              </span>
              <span className="supplier-error-rate tabular">
                {supplier.error4xxRate.toFixed(2)}%
              </span>
              <span className="supplier-error-rate tabular">
                {supplier.error5xxRate.toFixed(2)}%
              </span>
              <span className="tabular">
                {numberFormat.format(supplier.totalCalls)}
              </span>
              <StateMark state={supplier.health} />
              <button
                className="row-menu"
                type="button"
                title="查看供应商详情"
                aria-label={`查看${supplier.name}详情`}
                onClick={() => onOpen(supplier)}
              >
                <DotsThreeIcon size={20} weight="bold" />
              </button>
            </div>
          </div>
        );
      })}
      {suppliers.length === 0 ? (
        <div className="upstream-empty">
          没有符合当前筛选条件的供应商。
        </div>
      ) : null}
    </div>
  );
}

function WaterLevelModuleHeader({
  index,
  title,
  description,
  action,
}: {
  index: string;
  title: string;
  description: string;
  action?: string;
}) {
  return (
    <section className="water-module-header">
      <div>
        <span>{index}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {action ? (
        <button className="upstream-primary" type="button">
          <PlusIcon size={15} /> {action}
        </button>
      ) : null}
    </section>
  );
}

function WaterLevelSummary({
  items,
}: {
  items: Array<[string, string, string]>;
}) {
  return (
    <section className="water-level-summary">
      {items.map(([label, value, note], index) => (
        <div key={label}>
          <span>{String(index + 1).padStart(2, "0")} · {label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </div>
      ))}
    </section>
  );
}

type SupplierMonitoringRow =
  | (typeof supplierMonitoringRows)[number]
  | (typeof supplierRealtimeRows)[number];

type ModelMonitorSeries = {
  time: string;
  calls: number;
  success: number;
  failed: number;
  failureRate: number;
  error4xx: number;
  error5xx: number;
  rateLimit: number;
  rateLimitErrors: number;
  avgInput: number;
  avgOutput: number;
  totalToken: number;
  inputToken: number;
  outputToken: number;
  rpm: number;
  tpm: number;
  inputTpm: number;
  outputTpm: number;
  otps: number;
  avgDuration: number;
  p50Duration: number;
  p99Duration: number;
  avgTokenLatency: number;
  streamAvgReturn: number;
  streamP50Return: number;
  streamP99Return: number;
  nonStreamAvgReturn: number;
  nonStreamP50Return: number;
  nonStreamP99Return: number;
};

const modelMonitorSeries: ModelMonitorSeries[] = Array.from({ length: 121 }, (_, index) => {
  const hour = Math.floor(index / 12);
  const minute = (index % 12) * 5;
  const time = `07-27 ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const base = 1280 + Math.round(Math.sin(index / 7) * 190 + Math.cos(index / 13) * 120);
  const activityWindow = index > 64 && index < 96 ? 470 : 0;
  const morningPeak = [9, 10, 11, 63, 77].includes(index) ? 900 : 0;
  const calls = Math.max(0, base + activityWindow + morningPeak + ((index * 43) % 260));
  const failed = [25, 42, 49, 62, 66, 67, 68, 69, 70, 88].includes(index)
    ? index % 3 === 0
      ? 2
      : 1
    : 0;
  const rateLimit = 0;
  const avgInput = index > 92 && index < 104
    ? 5800 + ((index * 311) % 3200)
    : 2500 + Math.round(Math.sin(index / 9) * 240) + ((index * 19) % 380);
  const avgOutput = index > 92 && index < 104
    ? 1500 + ((index * 47) % 460)
    : 1700 + Math.round(Math.cos(index / 11) * 310) + ((index * 17) % 420);
  const totalToken = calls * 5200 + (index === 63 ? 8_500_000 : 0);
  const active = index < 96;
  const tpmPeak = [64, 65, 77, 91, 92, 93].includes(index) ? 7_400_000 : 0;
  const inputTpm = active
    ? 3_800_000 + Math.round(Math.sin(index / 8) * 850_000) + ((index * 77_000) % 1_300_000) + (index > 92 && index < 101 ? 4_700_000 : 0)
    : 0;
  const outputTpm = active
    ? 2_200_000 + Math.round(Math.cos(index / 9) * 650_000) + ((index * 49_000) % 900_000) + tpmPeak
    : 0;
  const otps = active ? 100_000 + Math.round(Math.sin(index / 11) * 3500) + ((index * 137) % 4200) : 0;
  const p50Duration = active ? 18 + Math.round(Math.sin(index / 15) * 5) + (index > 55 && index < 80 ? 7 : 0) : 0;
  const p99Duration = active
    ? 160 + Math.round(Math.sin(index / 5) * 25) + (index > 16 && index < 90 ? 70 : 0) + ((index * 19) % 38)
    : 0;
  const avgDuration = active ? Math.round((p50Duration + p99Duration) / 2.8) : 0;
  const avgTokenLatency = active ? 9.4 + Math.sin(index / 10) * 0.35 + (index > 58 && index < 88 ? 0.28 : 0) : 0;
  const streamSpike = index === 45 ? 10 : index > 95 && index < 103 ? 2.4 : 0;
  const streamAvgReturn = active ? 0.82 + Math.sin(index / 12) * 0.16 + streamSpike : 0;
  const nonStreamSpike = [66, 84, 91].includes(index) ? (index === 91 ? 126 : 55) : 0;
  const nonStreamAvgReturn = active ? 2 + ((index * 11) % 7) + nonStreamSpike : 0;
  return {
    time,
    calls,
    success: Math.max(calls - failed, 0),
    failed,
    failureRate: failed ? Number(((failed / calls) * 100).toFixed(2)) : 0,
    error4xx: failed ? (index % 2 === 0 ? failed : 0) : 0,
    error5xx: failed ? (index % 2 === 0 ? 0 : failed) : 0,
    rateLimit,
    rateLimitErrors: 0,
    avgInput,
    avgOutput,
    totalToken,
    inputToken: Math.round(totalToken * 0.62),
    outputToken: Math.round(totalToken * 0.38),
    rpm: active ? Math.max(0, 900 + Math.round(Math.sin(index / 11) * 280) + ((index * 13) % 360)) : 0,
    tpm: active ? Math.max(0, inputTpm + outputTpm) : 0,
    inputTpm,
    outputTpm,
    otps,
    avgDuration,
    p50Duration,
    p99Duration,
    avgTokenLatency: Number(avgTokenLatency.toFixed(2)),
    streamAvgReturn: Number(streamAvgReturn.toFixed(2)),
    streamP50Return: active ? Number(Math.max(0, streamAvgReturn * 0.8).toFixed(2)) : 0,
    streamP99Return: active ? Number(Math.max(0, streamAvgReturn * 1.35).toFixed(2)) : 0,
    nonStreamAvgReturn,
    nonStreamP50Return: active ? Number(Math.max(0, nonStreamAvgReturn * 0.72).toFixed(2)) : 0,
    nonStreamP99Return: active ? Number(Math.max(0, nonStreamAvgReturn * 1.25).toFixed(2)) : 0,
  };
});

const realtimeModelMonitorSeries: ModelMonitorSeries[] = Array.from(
  { length: 6 },
  (_, index) => ({
    time: `07-27 10:${String(36 + index).padStart(2, "0")}`,
    calls: 0,
    success: 0,
    failed: 0,
    failureRate: 0,
    error4xx: 0,
    error5xx: 0,
    rateLimit: 0,
    rateLimitErrors: 0,
    avgInput: 0,
    avgOutput: 0,
    totalToken: 0,
    inputToken: 0,
    outputToken: 0,
    rpm: 0,
    tpm: 0,
    inputTpm: 0,
    outputTpm: 0,
    otps: 0,
    avgDuration: 0,
    p50Duration: 0,
    p99Duration: 0,
    avgTokenLatency: 0,
    streamAvgReturn: 0,
    streamP50Return: 0,
    streamP99Return: 0,
    nonStreamAvgReturn: 0,
    nonStreamP50Return: 0,
    nonStreamP99Return: 0,
  }),
);

function MetricPill({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <span className="model-chart-pill">
      <i style={{ background: color }} />
      {label}
      <b>{value}</b>
    </span>
  );
}

function ModelChartPanel({
  title,
  subtitle,
  lines,
  children,
  yFormatter,
  className,
  referenceLine,
  domain,
  data = modelMonitorSeries,
}: {
  title: string;
  subtitle: string;
  lines: Array<{
    dataKey: keyof ModelMonitorSeries;
    name: string;
    color: string;
    strokeWidth?: number;
    area?: boolean;
  }>;
  children: React.ReactNode;
  yFormatter?: (value: number) => string;
  className?: string;
  referenceLine?: {
    value: number;
    label: string;
    color: string;
  };
  domain?: [number, number];
  data?: ModelMonitorSeries[];
}) {
  return (
    <section className={`model-chart-panel ${className ?? ""}`}>
      <header>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <div className="model-chart-tools">
          <button type="button" aria-label={`${title} 表格视图`}>
            <SquaresFourIcon size={13} />
          </button>
          <button type="button" aria-label={`${title} 全屏查看`}>
            <CaretRightIcon size={13} />
          </button>
          <button type="button" aria-label={`${title} 下载`}>
            <DownloadSimpleIcon size={13} />
          </button>
          {children}
        </div>
      </header>
      <div className="model-chart-canvas">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 12, left: -18, bottom: 10 }}
          >
            <CartesianGrid vertical={false} stroke="#ecf0f4" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              minTickGap={34}
              fontSize={9}
              stroke="#a4acb9"
              tickFormatter={(value: string) => value.slice(6)}
            />
            <YAxis
              domain={domain}
              tickLine={false}
              axisLine={false}
              fontSize={9}
              stroke="#a4acb9"
              tickFormatter={yFormatter}
            />
            <Tooltip
              contentStyle={{
                background: "#182235",
                border: 0,
                borderRadius: 4,
                color: "#fff",
                fontSize: 10,
                boxShadow: "0 8px 22px rgb(20 30 46 / 22%)",
              }}
              labelStyle={{ color: "#dbe6ff" }}
            />
            {referenceLine ? (
              <ReferenceLine
                y={referenceLine.value}
                stroke={referenceLine.color}
                strokeDasharray="5 4"
                label={{
                  value: referenceLine.label,
                  fill: referenceLine.color,
                  fontSize: 9,
                  position: "insideTopLeft",
                }}
              />
            ) : null}
            {lines.map((line) => (
              line.area ? (
                <Area
                  key={String(line.dataKey)}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth ?? 1.25}
                  fill={line.color}
                  fillOpacity={0.18}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : (
                <Line
                  key={String(line.dataKey)}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth ?? 1.4}
                  dot={false}
                  isAnimationActive={false}
                />
              )
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="model-chart-brush">
        <span />
      </div>
    </section>
  );
}

function SupplierModelMonitorDetail({
  supplier,
  modelName,
  onBack,
  initialTab,
}: {
  supplier: SupplierMonitoringRow;
  modelName: string;
  onBack: () => void;
  initialTab?: "调用统计" | "性能统计";
}) {
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const [tab, setTab] = useState<"调用统计" | "性能统计">(
    initialTab ?? "调用统计",
  );
  const [groupBy, setGroupBy] = useState("按分钟");
  const [refreshing, setRefreshing] = useState(false);
  const [isPinDetailOpen, setIsPinDetailOpen] = useState(false);
  const isRealtime = mode === "realtime";
  const chartSeries = isRealtime ? realtimeModelMonitorSeries : modelMonitorSeries;
  const suppliedPins =
    supplier.id === "qingcheng"
      ? [
          {
            code: "Cloudwise",
            name: "云智慧",
            calls: "711,514",
            tokens: "3,000,993,959",
            tpm: "3,106,619.01",
            rpm: "736.56",
            lastCalledAt: "2026-07-28 07:40:00",
          },
        ]
      : [
          {
            code: `${supplier.id}-prod`,
            name: `${supplier.name} 生产 PIN`,
            calls: "126,805",
            tokens: "486,330,114",
            tpm: "842,107.35",
            rpm: "218.64",
            lastCalledAt: "2026-07-28 07:40:00",
          },
        ];

  useEffect(() => {
    setTab(initialTab ?? "调用统计");
  }, [initialTab]);

  return (
    <main className="water-level-page model-monitor-detail-page">
      <header className="supplier-monitor-breadcrumb model-monitor-breadcrumb">
        <button type="button" aria-label="返回供应商概览" onClick={onBack}>
          <ArrowLeftIcon size={17} />
        </button>
        <strong>供应商监控</strong>
        <b>/</b>
        <strong>供应商模型监控 - {supplier.name}</strong>
        <b>/</b>
        <em>{modelName}</em>
      </header>

      <section
        className={`model-monitor-filter ${isRealtime ? "realtime" : ""}`}
        aria-label="供应商模型监控筛选"
      >
        <div className="supplier-monitor-mode" aria-label="监控模式">
          <button
            className={mode === "history" ? "active" : ""}
            type="button"
            onClick={() => setMode("history")}
          >
            历史筛选
          </button>
          <button
            className={mode === "realtime" ? "active" : ""}
            type="button"
            onClick={() => {
              setMode("realtime");
              setTab("调用统计");
              window.location.hash = `/water-level/suppliers/${supplier.id}/deepseek-v4-flash`;
            }}
          >
            实时监控
          </button>
        </div>
        {isRealtime ? (
          <>
            <label className="model-monitor-live-range">
              <span>时间范围</span>
              <button type="button">最近 5 分钟 <PencilSimpleIcon size={12} /></button>
            </label>
            <label className="model-monitor-live-refresh">
              <span>刷新间隔</span>
              <button type="button">30 秒 <PencilSimpleIcon size={12} /></button>
            </label>
          </>
        ) : (
          <>
            <label>
              <span>时间范围</span>
              <select defaultValue="自定义">
                <option>自定义</option>
                <option>今天</option>
                <option>近 7 天</option>
              </select>
            </label>
            <div className="pin-date-range model-monitor-date">
              <span>2026-07-27 00:00:00</span>
              <ArrowRightIcon size={15} />
              <span>2026-07-27 10:15:02</span>
            </div>
          </>
        )}
        <label className="model-monitor-pin-select">
          <span>PIN</span>
          <select defaultValue="all">
            <option value="all">全部 PIN</option>
            <option value="cloudwise">Cloudwise</option>
            <option value="njzk">NJZK</option>
          </select>
        </label>
        <label>
          <span>统计维度</span>
          <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
            <option>按分钟</option>
            <option>按小时</option>
          </select>
        </label>
        <button className="pin-search-button" type="button" aria-label="查询模型监控">
          <MagnifyingGlassIcon size={17} weight="bold" />
        </button>
        <button
          className={`model-monitor-link ${isPinDetailOpen ? "open" : ""}`}
          type="button"
          aria-expanded={isPinDetailOpen}
          aria-controls="supplier-pin-detail"
          onClick={() => setIsPinDetailOpen((open) => !open)}
        >
          PIN 详情 <CaretDownIcon size={12} />
        </button>
        <button
          className={`pin-refresh-button ${refreshing ? "refreshing" : ""}`}
          type="button"
          aria-label="刷新模型监控"
          onClick={() => {
            setRefreshing(true);
            window.setTimeout(() => setRefreshing(false), 500);
          }}
        >
          <ArrowClockwiseIcon size={17} />
        </button>
      </section>

      {isPinDetailOpen && (
        <section
          className="supplier-model-pin-detail"
          id="supplier-pin-detail"
          aria-label="供应商 PIN 详情"
        >
          <header className="supplier-model-pin-detail-head">
            <strong>供应商 PIN 详情</strong>
            <div>
              <span>挂载 PIN 数 {supplier.id === "qingcheng" ? "12" : "6"}</span>
              <span>PIN 数量 {suppliedPins.length}</span>
            </div>
          </header>
          <div className="supplier-model-pin-table">
            <div className="supplier-model-pin-row supplier-model-pin-head">
              <span>PIN 编码</span>
              <span>PIN 名称</span>
              <span>总调用量</span>
              <span>总 Token 数</span>
              <span>TPM（千tokens/min）</span>
              <span>RPM</span>
              <span>最近调用时间</span>
            </div>
            {suppliedPins.map((pin) => (
              <div className="supplier-model-pin-row" key={pin.code}>
                <strong>{pin.code}</strong>
                <span>{pin.name}</span>
                <span>{pin.calls}</span>
                <span>{pin.tokens}</span>
                <span>{pin.tpm}</span>
                <span>{pin.rpm}</span>
                <span>{pin.lastCalledAt}</span>
              </div>
            ))}
          </div>
          <footer className="pin-monitor-pagination supplier-model-pin-pagination" aria-label="供应商 PIN 明细分页">
            <span>共 {suppliedPins.length} 条</span>
            <div>
              <button type="button" aria-label="上一页" disabled>
                <ArrowLeftIcon size={14} />
              </button>
              <button type="button" className="active">1</button>
              <button type="button" aria-label="下一页" disabled>
                <ArrowRightIcon size={14} />
              </button>
              <select aria-label="每页条数" defaultValue="10">
                <option value="10">10 / 页</option>
                <option value="20">20 / 页</option>
              </select>
            </div>
          </footer>
        </section>
      )}

      <section className="model-monitor-stat-shell">
        <nav className="model-monitor-tabs" aria-label="模型监控统计">
          {(["调用统计", "性能统计"] as const).map((item) => (
            <button
              className={tab === item ? "active" : ""}
              type="button"
              key={item}
              onClick={() => {
                setTab(item);
                if (item === "性能统计") {
                  window.location.hash = `/water-level/suppliers/${supplier.id}/deepseek-v4-flash/performance`;
                } else {
                  window.location.hash = `/water-level/suppliers/${supplier.id}/deepseek-v4-flash`;
                }
              }}
            >
              {item}
            </button>
          ))}
        </nav>
        {tab === "调用统计" ? (
          <div className="model-monitor-chart-stack">
            <ModelChartPanel
              title="调用次数趋势"
              subtitle="总调用 / 成功 / 失败"
              data={chartSeries}
              domain={isRealtime ? [0, 1] : undefined}
              lines={[
                { dataKey: "calls", name: "总调用次数", color: "#62d6aa", strokeWidth: 1.6 },
                { dataKey: "success", name: "成功调用", color: "#74d9b4", strokeWidth: 1.2 },
                { dataKey: "failed", name: "失败调用", color: "#ff6b72", strokeWidth: 1.2 },
              ]}
            >
              <MetricPill color="#4595ff" label="总调用次数" value={isRealtime ? "0" : "713,319"} />
              <MetricPill color="#21c892" label="成功调用" value={isRealtime ? "0" : "713,302"} />
              <MetricPill color="#ff5d63" label="失败调用" value={isRealtime ? "0" : "17"} />
            </ModelChartPanel>

            <ModelChartPanel
              title="失败率趋势"
              subtitle="失败调用占总调用的百分比"
              data={chartSeries}
              domain={isRealtime ? [0, 1] : undefined}
              yFormatter={(value) => `${value}%`}
              lines={[
                { dataKey: "failureRate", name: "失败率", color: "#ff6b72", strokeWidth: 1.4 },
              ]}
            >
              <MetricPill color="#ff5d63" label="失败率" value="0.00%" />
            </ModelChartPanel>

            <ModelChartPanel
              title="失败次数统计"
              subtitle="堆叠柱状图为 HTTP 4XX / 5XX / 其他失败分布；折线为失败总次数"
              data={chartSeries}
              lines={[
                { dataKey: "error4xx", name: "4XX", color: "#ffb24a", strokeWidth: 1.2 },
                { dataKey: "error5xx", name: "5XX", color: "#ff676d", strokeWidth: 1.2 },
                { dataKey: "failed", name: "失败次数", color: "#5d8cff", strokeWidth: 1.5 },
              ]}
            >
              <MetricPill color="#f5a623" label="4XX" value="17" />
              <MetricPill color="#ff5964" label="5XX" value="0" />
              <MetricPill color="#8b61ff" label="其他失败" value="0" />
              <MetricPill color="#4d89ff" label="失败次数" value="17" />
            </ModelChartPanel>

            <ModelChartPanel
              title="限流趋势"
              subtitle="触发限流的调用次数"
              data={chartSeries}
              lines={[
                { dataKey: "rateLimit", name: "限流次数", color: "#f5a623", strokeWidth: 1.4 },
              ]}
            >
              <MetricPill color="#f5a623" label="限流次数" value="0" />
            </ModelChartPanel>

            <ModelChartPanel
              title="限流错误次数"
              subtitle="触发限流失败的错误次数"
              data={chartSeries}
              lines={[
                { dataKey: "rateLimitErrors", name: "限流错误次数", color: "#f5a623", strokeWidth: 1.4 },
              ]}
            >
              <MetricPill color="#f5a623" label="限流错误次数" value="0" />
            </ModelChartPanel>

            <ModelChartPanel
              title="平均 Token 趋势"
              subtitle="单次调用平均输入 / 输出 Token"
              data={chartSeries}
              lines={[
                { dataKey: "avgInput", name: "平均输入 Token", color: "#cf6adf", strokeWidth: 1.35 },
                { dataKey: "avgOutput", name: "平均输出 Token", color: "#7ea1ff", strokeWidth: 1.35 },
              ]}
              yFormatter={(value) => `${Number(value / 1000).toFixed(0)}K`}
            >
              <MetricPill color="#cf6adf" label="平均输入 Token" value="3.19K" />
              <MetricPill color="#6f90f1" label="平均输出 Token" value="1.95K" />
            </ModelChartPanel>

            <ModelChartPanel
              title="Token 消耗趋势"
              subtitle="总 Token / 输入 Token / 输出 Token"
              data={chartSeries}
              lines={[
                { dataKey: "totalToken", name: "总 Token", color: "#8dd0eb", strokeWidth: 1.35 },
                { dataKey: "inputToken", name: "输入 Token", color: "#ffad89", strokeWidth: 1.25 },
                { dataKey: "outputToken", name: "输出 Token", color: "#b798ff", strokeWidth: 1.25 },
              ]}
              yFormatter={(value) => `${Number(value / 1_000_000).toFixed(0)}M`}
            >
              <MetricPill color="#8dd0eb" label="总 Token" value="3669.88M" />
              <MetricPill color="#ff986f" label="输入 Token" value="2278.95M" />
              <MetricPill color="#9d7cff" label="输出 Token" value="1390.93M" />
            </ModelChartPanel>
          </div>
        ) : (
          <div className="model-monitor-chart-stack performance">
            <ModelChartPanel
              className="half"
              title="RPM 趋势"
              data={chartSeries}
              subtitle="展示选定维度周期内，平均每分钟发起的请求频率。"
              domain={[0, 320000]}
              referenceLine={{ value: 300000, label: "流控线 300,000", color: "#ffad42" }}
              lines={[
                { dataKey: "rpm", name: "RPM", color: "#6f90f1", strokeWidth: 1.2 },
              ]}
              yFormatter={(value) => numberFormat.format(value)}
            >
              <MetricPill color="#ffad42" label="流控线" value="300,000" />
              <MetricPill color="#6f90f1" label="RPM" value="1.17K" />
              <MetricPill color="#e39a31" label="窗口峰值" value={isRealtime ? "1.42K" : "18.42K"} />
            </ModelChartPanel>

            <ModelChartPanel
              className="half"
              title="TPM 趋势"
              data={chartSeries}
              subtitle="展示选定维度周期内，平均每分钟处理的 Token 规模。"
              domain={[0, 110000000]}
              referenceLine={{ value: 100000000, label: "流控线 100,000,000", color: "#ffad42" }}
              lines={[
                { dataKey: "tpm", name: "TPM", color: "#57c5b7", strokeWidth: 1.25 },
              ]}
              yFormatter={(value) => numberFormat.format(value)}
            >
              <MetricPill color="#ffad42" label="流控线" value="100,000,000" />
              <MetricPill color="#31aa9f" label="TPM" value="6.03M" />
              <MetricPill color="#e39a31" label="窗口峰值" value={isRealtime ? "7.38M" : "18.64M"} />
            </ModelChartPanel>

            <ModelChartPanel
              className="wide"
              title="I/O TPM趋势"
              data={chartSeries}
              subtitle="周期平均输入 / 输出 TPM（每分钟 token 吞吐量）"
              domain={[0, 16000000]}
              lines={[
                { dataKey: "inputTpm", name: "输入 TPM", color: "#ffb45f", strokeWidth: 1.2 },
                { dataKey: "outputTpm", name: "输出 TPM", color: "#62d6aa", strokeWidth: 1.2 },
              ]}
              yFormatter={(value) => numberFormat.format(value)}
            >
              <MetricPill color="#ffb45f" label="输入 TPM" value="3.9M" />
              <MetricPill color="#62d6aa" label="输出 TPM" value="2.1M" />
            </ModelChartPanel>

            <ModelChartPanel
              className="wide"
              title="OTPS 趋势"
              data={chartSeries}
              subtitle="平均每个请求每秒 token 输出量"
              domain={[0, 130000]}
              lines={[
                { dataKey: "otps", name: "OTPS", color: "#ff7d8a", strokeWidth: 1.15, area: true },
              ]}
              yFormatter={(value) => `${Number(value / 1000).toFixed(0)} tok/s`}
            >
              <MetricPill color="#ff6f82" label="OTPS" value="104K" />
            </ModelChartPanel>

            <ModelChartPanel
              className="wide"
              title="调用时长趋势"
              data={chartSeries}
              subtitle="平均 / P50 / P99"
              domain={[0, 360]}
              lines={[
                { dataKey: "avgDuration", name: "平均调用时长", color: "#5d8cff", strokeWidth: 1.15 },
                { dataKey: "p50Duration", name: "P50 调用时长", color: "#66d7b3", strokeWidth: 1.15 },
                { dataKey: "p99Duration", name: "P99 调用时长", color: "#ff7d8a", strokeWidth: 1.15 },
              ]}
              yFormatter={(value) => `${value}ms`}
            >
              <MetricPill color="#5d8cff" label="平均调用时长" value="68ms" />
              <MetricPill color="#66d7b3" label="P50 调用时长" value="22ms" />
              <MetricPill color="#ff7d8a" label="P99 调用时长" value="246ms" />
            </ModelChartPanel>

            <ModelChartPanel
              className="wide"
              title="平均 Token 延迟"
              data={chartSeries}
              subtitle="平均每 Token 输出所需要秒数"
              domain={[0, 13]}
              lines={[
                { dataKey: "avgTokenLatency", name: "平均每Token耗时", color: "#57c5b7", strokeWidth: 1.15, area: true },
              ]}
              yFormatter={(value) => `${value}ms`}
            >
              <MetricPill color="#57c5b7" label="平均每Token耗时" value="9.6ms" />
            </ModelChartPanel>

            <ModelChartPanel
              className="half"
              title="流式首Token返回时长"
              data={chartSeries}
              subtitle="衡量用户感知的“出字”速度，直接决定了用户对系统响应快慢的第一印象。"
              domain={[0, 12]}
              lines={[
                { dataKey: "streamAvgReturn", name: "平均值", color: "#7768ef", strokeWidth: 1.1 },
                { dataKey: "streamP50Return", name: "P50", color: "#4fc69d", strokeWidth: 1.1 },
                { dataKey: "streamP99Return", name: "P99", color: "#ff9a55", strokeWidth: 1.1 },
              ]}
              yFormatter={(value) => `${value}s`}
            >
              <MetricPill color="#7768ef" label="平均值" value="0.9s" />
              <MetricPill color="#4fc69d" label="P50" value="0.7s" />
              <MetricPill color="#ff9a55" label="P99" value="1.3s" />
            </ModelChartPanel>

            <ModelChartPanel
              className="half"
              title="非流式首Token返回时长"
              data={chartSeries}
              subtitle="该指标排除网络传输全量包的带宽影响，专注于前置模型推理引擎的初始化与首词生成效率。"
              domain={[0, 150]}
              lines={[
                { dataKey: "nonStreamAvgReturn", name: "平均值", color: "#7768ef", strokeWidth: 1.1 },
                { dataKey: "nonStreamP50Return", name: "P50", color: "#4fc69d", strokeWidth: 1.1 },
                { dataKey: "nonStreamP99Return", name: "P99", color: "#ff9a55", strokeWidth: 1.1 },
              ]}
              yFormatter={(value) => `${value}s`}
            >
              <MetricPill color="#7768ef" label="平均值" value="3.8s" />
              <MetricPill color="#4fc69d" label="P50" value="2.7s" />
              <MetricPill color="#ff9a55" label="P99" value="126s" />
            </ModelChartPanel>
          </div>
        )}
      </section>
    </main>
  );
}

function SupplierMonitoringDetail({
  supplier,
  onBack,
  onOpenModel,
}: {
  supplier: SupplierMonitoringRow;
  onBack: () => void;
  onOpenModel: (modelName: string) => void;
}) {
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const [timeRange, setTimeRange] = useState("今天");
  const [refreshInterval, setRefreshInterval] = useState("30 秒");
  const [activeRealtimePicker, setActiveRealtimePicker] = useState<
    "range" | "refresh" | null
  >(null);
  const [model, setModel] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const modelName =
    supplier.id === "qingcheng"
      ? "DeepSeek-V4-Flash"
      : `${supplier.name}-主力模型`;
  const tpmRate = supplier.tpmRate ?? 0;
  const rpmRate = supplier.id === "qingcheng" ? 0.39 : (supplier.rpmRate ?? 0);
  const tpmCapacityText = supplier.id === "qingcheng"
    ? "6,026,082.74 / 100,000,000"
    : supplier.tpm;
  const rpmCapacityText = supplier.id === "qingcheng"
    ? "1,171.3 / 300,000"
    : supplier.rpm;
  const endpointName = supplier.id === "qingcheng"
    ? "qingcheng-prod-01"
    : `${supplier.id}-prod-01`;
  const detailPeakFactor = mode === "realtime" ? 1.26 : 3.1;

  return (
    <main className="water-level-page supplier-detail-monitor-page">
      <header className="supplier-monitor-breadcrumb">
        <button type="button" aria-label="返回供应商监控" onClick={onBack}>
          <ArrowLeftIcon size={17} />
        </button>
        <span />
        <strong>供应商监控</strong>
        <b>/</b>
        <em>供应商概览 - {supplier.name}</em>
      </header>

      <section className="supplier-monitor-filter supplier-detail-filter">
        <div className="supplier-monitor-mode" aria-label="监控模式">
          <button
            className={mode === "history" ? "active" : ""}
            type="button"
            onClick={() => setMode("history")}
          >
            历史筛选
          </button>
          <button
            className={mode === "realtime" ? "active" : ""}
            type="button"
            onClick={() => {
              setMode("realtime");
              setTimeRange("最近 5 分钟");
              setRefreshInterval("30 秒");
            }}
          >
            实时监控
          </button>
        </div>
        {mode === "realtime" ? (
          <>
            <label className="supplier-realtime-field">
              <span>时间范围</span>
              <div className="supplier-realtime-picker">
                <input
                  className="supplier-realtime-combobox"
                  aria-label="供应商模型实时时间范围"
                  value={timeRange}
                  placeholder="输入时间范围"
                  onFocus={() => setActiveRealtimePicker("range")}
                  onChange={(event) => setTimeRange(event.target.value)}
                />
                <button type="button" aria-label="展开供应商模型时间范围预设" aria-expanded={activeRealtimePicker === "range"} onClick={() => setActiveRealtimePicker((value) => value === "range" ? null : "range")}><CaretDownIcon size={14} /></button>
                {activeRealtimePicker === "range" ? <div className="supplier-realtime-menu" role="listbox" aria-label="供应商模型时间范围预设">{realtimeTimeRangeOptions.map((option) => <button key={option} type="button" role="option" aria-selected={timeRange === option} className={timeRange === option ? "selected" : ""} onClick={() => { setTimeRange(option); setActiveRealtimePicker(null); }}>{option}</button>)}</div> : null}
              </div>
            </label>
            <label className="supplier-realtime-field">
              <span>刷新间隔</span>
              <div className="supplier-realtime-picker">
                <input
                  className="supplier-realtime-combobox"
                  aria-label="供应商模型刷新间隔"
                  value={refreshInterval}
                  placeholder="输入刷新间隔"
                  onFocus={() => setActiveRealtimePicker("refresh")}
                  onChange={(event) => setRefreshInterval(event.target.value)}
                />
                <button type="button" aria-label="展开供应商模型刷新间隔预设" aria-expanded={activeRealtimePicker === "refresh"} onClick={() => setActiveRealtimePicker((value) => value === "refresh" ? null : "refresh")}><CaretDownIcon size={14} /></button>
                {activeRealtimePicker === "refresh" ? <div className="supplier-realtime-menu" role="listbox" aria-label="供应商模型刷新间隔预设">{realtimeRefreshOptions.map((option) => <button key={option} type="button" role="option" aria-selected={refreshInterval === option} className={refreshInterval === option ? "selected" : ""} onClick={() => { setRefreshInterval(option); setActiveRealtimePicker(null); }}>{option}</button>)}</div> : null}
              </div>
            </label>
          </>
        ) : (
          <>
            <label>
              <span>时间范围</span>
              <select value={timeRange} onChange={(event) => setTimeRange(event.target.value)}>
                <option>3 小时</option><option>6 小时</option><option>9 小时</option><option>12 小时</option><option>24 小时</option><option>今天</option><option>昨天</option><option>近 7 天</option><option>当月</option><option>近 30 天</option>
              </select>
            </label>
            <div className="pin-date-range supplier-detail-date-range">
              <span>2026-07-27 00:00:00</span><ArrowRightIcon size={15} /><span>2026-07-27 10:09:44</span>
            </div>
          </>
        )}
        <label className="supplier-detail-model-select">
          <span>模型</span>
          <select value={model} onChange={(event) => setModel(event.target.value)}>
            <option value="all">全部模型</option>
            <option value={modelName}>{modelName}</option>
          </select>
        </label>
        <button className="pin-search-button" type="button" aria-label="查询模型监控">
          <MagnifyingGlassIcon size={17} weight="bold" />
        </button>
        <button
          className={`pin-refresh-button ${refreshing ? "refreshing" : ""}`}
          type="button"
          aria-label="刷新模型监控"
          onClick={() => {
            setRefreshing(true);
            window.setTimeout(() => setRefreshing(false), 500);
          }}
        >
          <ArrowClockwiseIcon size={17} />
        </button>
      </section>

      <section className="supplier-detail-metrics" aria-label="供应商模型监控总览">
        <article>
          <span>模型总量</span>
          <strong>1</strong>
        </article>
        <article>
          <span>模型总调用次数（次）</span>
          <strong>{numberFormat.format(supplier.calls)}</strong>
        </article>
        <article>
          <span>模型失败率（%）</span>
          <strong className="danger">{supplier.failureRate.toFixed(2)}</strong>
        </article>
        <article>
          <span>PIN 挂载总数</span>
          <strong>12</strong>
        </article>
        <article className="supplier-detail-util">
          <div>
            <span>TPM 运行状况（%）</span>
            <strong>{tpmRate.toFixed(2)}</strong>
          </div>
          <small>{tpmCapacityText}</small>
          <CapacityPeakNote value={capacityPeak(tpmCapacityText, detailPeakFactor)} />
          <i><b style={{ width: `${Math.min(tpmRate, 100)}%` }} /></i>
        </article>
        <article className="supplier-detail-util">
          <div>
            <span>RPM 运行状况（%）</span>
            <strong>{rpmRate.toFixed(2)}</strong>
          </div>
          <small>{rpmCapacityText}</small>
          <CapacityPeakNote value={capacityPeak(rpmCapacityText, detailPeakFactor)} />
          <i><b style={{ width: `${Math.max(Math.min(rpmRate, 100), 1)}%` }} /></i>
        </article>
        <article>
          <span>模型平均调用时长（s）</span>
          <strong>{supplier.averageDuration.toFixed(1)}</strong>
        </article>
        <article>
          <span>模型平均首 Token 延时（s）</span>
          <strong>0.5</strong>
        </article>
      </section>

      <section className={`supplier-detail-model-table ${mode === "realtime" ? "realtime" : ""}`}>
        <div className={`supplier-detail-model-row supplier-detail-model-head ${mode === "realtime" ? "realtime" : ""}`}>
          {mode === "realtime" ? <span>状态 ↓</span> : null}
          <span>模型名称</span>
          <span>端点</span>
          <span>RPM 容量 / 峰值（次/min）</span>
          <span>TPM 容量 / 峰值（千tokens/min）</span>
          <span>总 Token 数 ↓</span>
          <span className="pin-help-heading">
            平均首 Token 延时（s） <QuestionIcon size={13} /> ↓
          </span>
          <span>失败率 ↓</span>
          <span>4xx 错误率 ↓</span>
          <span>操作</span>
        </div>
        <div className={`supplier-detail-model-row ${mode === "realtime" ? "realtime" : ""}`}>
          {mode === "realtime" ? <span><StatusBadge decision={resolveMonitoringStatus({ rpmUtilization: rpmRate, tpmUtilization: tpmRate, failureRate: supplier.failureRate })} /></span> : null}
          <strong>{modelName}</strong>
          <span className="supplier-detail-endpoint">
            <strong>{endpointName}</strong>
            <small>主用 · 健康</small>
          </span>
          <CapacityValue value={rpmCapacityText} peakFactor={detailPeakFactor} utilization={rpmRate} />
          <CapacityValue
            value={supplier.id === "qingcheng" ? "6,026.08 / 100,000" : supplier.tpm}
            peakFactor={detailPeakFactor}
            utilization={tpmRate}
          />
          <span className="tabular">{numberFormat.format(supplier.totalTokens)}</span>
          <span className="tabular pin-latency">0.5</span>
          <span
            className={`tabular pin-rate ${
              supplier.failureRate === 0 ? "safe" : "warning"
            }`}
          >
            {supplier.failureRate.toFixed(2)}%
          </span>
          <span className="tabular">{supplier.error4xx.toFixed(2)}%</span>
          <button
            type="button"
            className="supplier-model-monitor-action"
            onClick={() => onOpenModel(modelName)}
          >
            <PulseIcon size={15} />
            供应商模型监控
          </button>
        </div>
      </section>

      <footer className="pin-monitor-pagination supplier-detail-pagination">
        <span>共 1 条</span>
        <div>
          <button type="button" aria-label="上一页" disabled>
            <ArrowLeftIcon size={14} />
          </button>
          <button className="active" type="button">1</button>
          <button type="button" aria-label="下一页" disabled>
            <ArrowRightIcon size={14} />
          </button>
          <select aria-label="每页条数" defaultValue="20">
            <option value="20">20 / 页</option>
          </select>
        </div>
      </footer>
    </main>
  );
}

function SupplierMonitoringOverview() {
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const [timeRange, setTimeRange] = useState("今天");
  const [refreshInterval, setRefreshInterval] = useState("30 秒");
  const [activeRealtimePicker, setActiveRealtimePicker] = useState<
    "range" | "refresh" | null
  >(null);
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [appliedSupplier, setAppliedSupplier] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [detailSupplier, setDetailSupplier] = useState<SupplierMonitoringRow | null>(
    () => {
      const supplierId = window.location.hash
        .replace(/^#\/?/u, "")
        .split("/")[2];
      return (
        supplierMonitoringRows.find((supplier) => supplier.id === supplierId) ??
        null
      );
    },
  );
  const [modelMonitor, setModelMonitor] = useState<string | null>(() => {
    const modelId = window.location.hash.replace(/^#\/?/u, "").split("/")[3];
    return modelId ? "DeepSeek-V4-Flash" : null;
  });

  useEffect(() => {
    const syncRoute = () => {
      const parts = window.location.hash.replace(/^#\/?/u, "").split("/");
      if (parts[0] !== "water-level" || parts[1] !== "suppliers") return;
      const supplierId = parts[2];
      const supplier =
        supplierMonitoringRows.find((item) => item.id === supplierId) ??
        supplierRealtimeRows.find((item) => item.id === supplierId) ??
        null;
      setDetailSupplier(supplier);
      setModelMonitor(supplier && parts[3] ? "DeepSeek-V4-Flash" : null);
    };
    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);
  const isRealtime = mode === "realtime";
  const [rangeStart, rangeEnd] = historicalTimeWindows[timeRange] ?? historicalTimeWindows["今天"];
  const sourceRows = isRealtime ? supplierRealtimeRows : supplierMonitoringRows;
  const rows =
    appliedSupplier === "all"
      ? sourceRows
      : sourceRows.filter((item) => item.id === appliedSupplier);

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 500);
  };

  const openSupplier = (supplier: SupplierMonitoringRow) => {
    setDetailSupplier(supplier);
    setModelMonitor(null);
    window.location.hash = `/water-level/suppliers/${supplier.id}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (detailSupplier) {
    if (modelMonitor) {
      return (
        <SupplierModelMonitorDetail
          supplier={detailSupplier}
          modelName={modelMonitor}
          initialTab={
            window.location.hash.replace(/^#\/?/u, "").split("/")[4] ===
            "performance"
              ? "性能统计"
              : "调用统计"
          }
          onBack={() => {
            setModelMonitor(null);
            window.location.hash = `/water-level/suppliers/${detailSupplier.id}`;
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      );
    }
    return (
      <SupplierMonitoringDetail
        supplier={detailSupplier}
        onBack={() => {
          setDetailSupplier(null);
          setModelMonitor(null);
          window.location.hash = "/water-level/suppliers";
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenModel={(modelName) => {
          setModelMonitor(modelName);
          window.location.hash = `/water-level/suppliers/${detailSupplier.id}/deepseek-v4-flash`;
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    );
  }

  return (
    <main className="water-level-page supplier-monitor-page">
      <h2 className="pin-monitor-title">供应商监控</h2>

      <section className="supplier-monitor-filter" aria-label="供应商监控筛选">
        <div className="supplier-monitor-mode" aria-label="监控模式">
          <button
            className={mode === "history" ? "active" : ""}
            type="button"
            onClick={() => {
              setMode("history");
              setTimeRange("今天");
              setAppliedSupplier("all");
              setSelectedSupplier("all");
              setPage(1);
            }}
          >
            历史筛选
          </button>
          <button
            className={mode === "realtime" ? "active" : ""}
            type="button"
            onClick={() => {
              setMode("realtime");
              setTimeRange("最近 5 分钟");
              setRefreshInterval("30 秒");
              setAppliedSupplier("all");
              setSelectedSupplier("all");
              setPage(1);
            }}
          >
            实时监控
          </button>
        </div>
        {isRealtime ? (
          <>
            <label className="supplier-realtime-field">
              <span>时间范围</span>
              <div className="supplier-realtime-picker">
                <input
                  className="supplier-realtime-combobox"
                  aria-label="时间范围"
                  value={timeRange}
                  placeholder="输入时间范围"
                  onFocus={() => setActiveRealtimePicker("range")}
                  onChange={(event) => setTimeRange(event.target.value)}
                />
                <button
                  type="button"
                  aria-label="展开时间范围预设"
                  aria-expanded={activeRealtimePicker === "range"}
                  onClick={() =>
                    setActiveRealtimePicker((active) =>
                      active === "range" ? null : "range",
                    )
                  }
                >
                  <CaretDownIcon size={14} />
                </button>
                {activeRealtimePicker === "range" && (
                  <div
                    className="supplier-realtime-menu"
                    role="listbox"
                    aria-label="时间范围预设"
                  >
                    {realtimeTimeRangeOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={timeRange === option}
                        className={timeRange === option ? "selected" : ""}
                        onClick={() => {
                          setTimeRange(option);
                          setActiveRealtimePicker(null);
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
            <label className="supplier-realtime-field">
              <span>刷新间隔</span>
              <div className="supplier-realtime-picker">
                <input
                  className="supplier-realtime-combobox"
                  aria-label="刷新间隔"
                  value={refreshInterval}
                  placeholder="输入刷新间隔"
                  onFocus={() => setActiveRealtimePicker("refresh")}
                  onChange={(event) => setRefreshInterval(event.target.value)}
                />
                <button
                  type="button"
                  aria-label="展开刷新间隔预设"
                  aria-expanded={activeRealtimePicker === "refresh"}
                  onClick={() =>
                    setActiveRealtimePicker((active) =>
                      active === "refresh" ? null : "refresh",
                    )
                  }
                >
                  <CaretDownIcon size={14} />
                </button>
                {activeRealtimePicker === "refresh" && (
                  <div
                    className="supplier-realtime-menu"
                    role="listbox"
                    aria-label="刷新间隔预设"
                  >
                    {realtimeRefreshOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={refreshInterval === option}
                        className={refreshInterval === option ? "selected" : ""}
                        onClick={() => {
                          setRefreshInterval(option);
                          setActiveRealtimePicker(null);
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </label>
          </>
        ) : (
          <>
            <label>
              <span>时间范围</span>
              <select
                value={timeRange}
                onChange={(event) => setTimeRange(event.target.value)}
              >
                {historicalTimeRangeOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <div className="pin-date-range supplier-date-range" aria-label="统计时间">
              <span>{rangeStart}</span>
              <ArrowRightIcon size={15} />
              <span>{rangeEnd}</span>
            </div>
          </>
        )}
        <label className="supplier-monitor-select">
          <span>供应商</span>
          <select
            value={selectedSupplier}
            onChange={(event) => setSelectedSupplier(event.target.value)}
          >
            <option value="all">请选择供应商</option>
            {sourceRows.map((supplier) => (
              <option value={supplier.id} key={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="pin-search-button"
          type="button"
          aria-label="查询供应商监控"
          onClick={() => {
            setAppliedSupplier(selectedSupplier);
            setPage(1);
          }}
        >
          <MagnifyingGlassIcon size={17} weight="bold" />
        </button>
        <button
          className={`pin-refresh-button ${refreshing ? "refreshing" : ""}`}
          type="button"
          aria-label="刷新供应商监控"
          onClick={refresh}
        >
          <ArrowClockwiseIcon size={17} />
        </button>
      </section>

      <section className="supplier-monitor-summary" aria-label="供应商监控总览">
        <article>
          <span>供应商总数</span>
          <strong>66</strong>
        </article>
        <article className="supplier-util-card">
          <div>
            <span>TPM 运行状况（%）</span>
            <strong>{isRealtime ? "0.19" : "0.03"}</strong>
          </div>
          <small>
            {isRealtime
              ? "11,511,608.6 / 6,139,272,000"
              : "11,431,264.32 / 42,489,272,000"}
          </small>
          <CapacityPeakNote value={isRealtime ? 14_820_300 : 86_424_911} />
          <i><b style={{ width: isRealtime ? "8%" : "3%" }} /></i>
        </article>
        <article className="supplier-util-card">
          <div>
            <span>RPM 运行状况（%）</span>
            <strong>{isRealtime ? "0.11" : "0.15"}</strong>
          </div>
          <small>{isRealtime ? "793.4 / 716,957" : "1,533.58 / 1,042,957"}</small>
          <CapacityPeakNote value={isRealtime ? 1_184.6 : 18_420.75} />
          <i><b style={{ width: isRealtime ? "6%" : "4%" }} /></i>
        </article>
        <article className="supplier-failure-card">
          <div>
            <span>失败率（%）</span>
            <strong>{isRealtime ? "0.71" : "0.15"}</strong>
          </div>
          <dl>
            <div><dt>总调用次数（次）</dt><dd>{isRealtime ? "3,967" : "915,547"}</dd></div>
            <div><dt>总失败次数（次）</dt><dd>{isRealtime ? "28" : "1,366"}</dd></div>
          </dl>
        </article>
        <article>
          <span>供应商总 Token 数</span>
          <strong className="supplier-token-total">
            {isRealtime ? "57,558,043" : "6,824,464,802"}
          </strong>
        </article>
      </section>

      <section className="supplier-monitor-table-shell">
        <div className="supplier-monitor-table">
          <div
            className={`supplier-monitor-row supplier-monitor-head ${
              isRealtime ? "realtime" : ""
            }`}
          >
            {isRealtime ? <span>状态 ↓</span> : null}
            <span>供应商名称</span>
            <span>TPM 容量 / 峰值（千tokens/min）</span>
            <span>RPM 容量 / 峰值（次/min）</span>
            <span>429 次数 ↓</span>
            <span>失败率 ↓</span>
            <span>4xx 错误率 ↓</span>
            <span>5xx 错误率 ↓</span>
            <span>调用总量 ↓</span>
            <span>调用失败量 ↓</span>
            <span>总 Token 数 ↓</span>
            <span>已用模型/全部模型</span>
            <span className="pin-help-heading">
              平均调用时长（s） <QuestionIcon size={13} /> ↓
            </span>
            <span>操作</span>
          </div>
          {rows.map((supplier) => {
            const rateLimit429 = (isRealtime ? supplierRealtime429Counts : supplier429Counts)[supplier.id] ?? 0;
            return (
              <div
                className={`supplier-monitor-row ${isRealtime ? "realtime" : ""}`}
                key={supplier.id}
              >
              {isRealtime ? (
                <span><StatusBadge decision={resolveMonitoringStatus({
                  rpmUtilization: supplier.rpmRate,
                  tpmUtilization: supplier.tpmRate,
                  failureRate: supplier.failureRate,
                  rateLimit: supplier.id === "cloudwise" ? "persistent" : "none",
                  configured: supplier.rpmRate !== null || supplier.tpmRate !== null,
                  partialUnconfigured: supplier.rpmRate === null || supplier.tpmRate === null,
                })} /></span>
              ) : null}
              <button
                className="supplier-monitor-name"
                type="button"
                onClick={() => openSupplier(supplier)}
              >
                {supplier.name}
              </button>
              <CapacityValue value={supplier.tpm} peakFactor={isRealtime ? 1.24 : 2.8} utilization={supplier.tpmRate} />
              <CapacityValue value={supplier.rpm} peakFactor={isRealtime ? 1.28 : 3.2} utilization={supplier.rpmRate} />
              <span className={`tabular pin-rate ${rateLimit429 === 0 ? "safe" : rateLimit429 >= 100 ? "danger" : "warning"}`}>
                {numberFormat.format(rateLimit429)}
              </span>
              <span
                className={`tabular pin-rate ${
                  supplier.failureRate === 0
                    ? "safe"
                    : supplier.failureRate >= 5
                      ? "danger"
                      : "warning"
                }`}
              >
                {supplier.failureRate.toFixed(2)}%
              </span>
              <span className="tabular">{supplier.error4xx.toFixed(2)}%</span>
              <span className="tabular">{supplier.error5xx.toFixed(2)}%</span>
              <span className="tabular">{numberFormat.format(supplier.calls)}</span>
              <span className="tabular pin-failed">
                {numberFormat.format(supplier.failedCalls)}
              </span>
              <span className="tabular">
                {numberFormat.format(supplier.totalTokens)}
              </span>
              <span className="tabular pin-latency">{supplier.models}</span>
              <span className="tabular pin-latency">
                {supplier.averageDuration.toFixed(1)}
              </span>
              <button
                type="button"
                className="pin-monitor-action supplier-action"
                onClick={() => openSupplier(supplier)}
              >
                <PulseIcon size={15} />
                供应商监控
              </button>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="pin-monitor-pagination">
        <span>共 {isRealtime ? 16 : 36} 条</span>
        <div>
          <button
            type="button"
            aria-label="上一页"
            disabled={page === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ArrowLeftIcon size={14} />
          </button>
          {[1, 2].map((item) => (
            <button
              className={page === item ? "active" : ""}
              type="button"
              key={item}
              onClick={() => setPage(item)}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            aria-label="下一页"
            onClick={() => setPage((value) => Math.min(2, value + 1))}
          >
            <ArrowRightIcon size={14} />
          </button>
          <select aria-label="每页条数" defaultValue="20">
            <option value="20">20 / 页</option>
            <option value="50">50 / 页</option>
          </select>
        </div>
      </footer>
    </main>
  );
}

function PinModelMonitoringDetail({
  pin,
  onBack,
}: {
  pin: (typeof pinMonitoringRows)[number];
  onBack: () => void;
}) {
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const [timeRange, setTimeRange] = useState("自定义");
  const [refreshInterval, setRefreshInterval] = useState("30 秒");
  const [activeRealtimePicker, setActiveRealtimePicker] = useState<
    "range" | "refresh" | null
  >(null);
  const [model, setModel] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const isRealtime = mode === "realtime";
  const authorizedModelCount = pinAuthorizedModelCounts[pin.id] ?? pinModelMonitoringRows.length;
  const visibleRows = model === "all"
    ? pinModelMonitoringRows
    : pinModelMonitoringRows.filter((item) => item.id === model);

  return (
    <main className="water-level-page pin-model-monitor-page">
      <header className="supplier-monitor-breadcrumb pin-model-breadcrumb">
        <button type="button" aria-label="返回用户监控" onClick={onBack}>
          <ArrowLeftIcon size={17} />
        </button>
        <strong>模型监控</strong>
        <b>/</b>
        <em>用户监控 - {pin.name}</em>
      </header>

      <section className="pin-model-filter" aria-label="用户模型监控筛选">
        <div className="supplier-monitor-mode" aria-label="监控模式">
          <button type="button" className={!isRealtime ? "active" : ""} onClick={() => setMode("history")}>历史筛选</button>
          <button type="button" className={isRealtime ? "active" : ""} onClick={() => { setMode("realtime"); setTimeRange("最近 5 分钟"); setRefreshInterval("30 秒"); }}>实时监控</button>
        </div>
        {isRealtime ? (
          <>
            <label className="supplier-realtime-field"><span>时间范围</span><div className="supplier-realtime-picker"><input className="supplier-realtime-combobox" aria-label="用户模型实时时间范围" value={timeRange} placeholder="输入时间范围" onFocus={() => setActiveRealtimePicker("range")} onChange={(event) => setTimeRange(event.target.value)} /><button type="button" aria-label="展开用户模型时间范围预设" aria-expanded={activeRealtimePicker === "range"} onClick={() => setActiveRealtimePicker((active) => active === "range" ? null : "range")}><CaretDownIcon size={14} /></button>{activeRealtimePicker === "range" ? <div className="supplier-realtime-menu" role="listbox" aria-label="用户模型时间范围预设">{realtimeTimeRangeOptions.map((option) => <button key={option} type="button" role="option" aria-selected={timeRange === option} className={timeRange === option ? "selected" : ""} onClick={() => { setTimeRange(option); setActiveRealtimePicker(null); }}>{option}</button>)}</div> : null}</div></label>
            <label className="supplier-realtime-field"><span>刷新间隔</span><div className="supplier-realtime-picker"><input className="supplier-realtime-combobox" aria-label="用户模型刷新间隔" value={refreshInterval} placeholder="输入刷新间隔" onFocus={() => setActiveRealtimePicker("refresh")} onChange={(event) => setRefreshInterval(event.target.value)} /><button type="button" aria-label="展开用户模型刷新间隔预设" aria-expanded={activeRealtimePicker === "refresh"} onClick={() => setActiveRealtimePicker((active) => active === "refresh" ? null : "refresh")}><CaretDownIcon size={14} /></button>{activeRealtimePicker === "refresh" ? <div className="supplier-realtime-menu" role="listbox" aria-label="用户模型刷新间隔预设">{realtimeRefreshOptions.map((option) => <button key={option} type="button" role="option" aria-selected={refreshInterval === option} className={refreshInterval === option ? "selected" : ""} onClick={() => { setRefreshInterval(option); setActiveRealtimePicker(null); }}>{option}</button>)}</div> : null}</div></label>
          </>
        ) : (
          <>
            <label><span>时间范围</span><select value={timeRange} onChange={(event) => setTimeRange(event.target.value)}><option>3 小时</option><option>6 小时</option><option>9 小时</option><option>12 小时</option><option>24 小时</option><option>今天</option><option>昨天</option><option>近 7 天</option><option>当月</option><option>近 30 天</option><option>自定义</option></select></label>
            <div className="pin-date-range pin-model-date" aria-label="统计时间"><span>2026-07-27 00:00:00</span><ArrowRightIcon size={15} /><span>2026-07-27 11:10:56</span></div>
          </>
        )}
        <label className="pin-model-select">
          <span>模型</span>
          <select value={model} onChange={(event) => setModel(event.target.value)}>
            <option value="all">全部模型</option>
            {pinModelMonitoringRows.map((item) => (
              <option value={item.id} key={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <button className="pin-search-button" type="button" aria-label="查询用户模型监控">
          <MagnifyingGlassIcon size={17} weight="bold" />
        </button>
        <button
          className={`pin-refresh-button ${refreshing ? "refreshing" : ""}`}
          type="button"
          aria-label="刷新用户模型监控"
          onClick={() => {
            setRefreshing(true);
            window.setTimeout(() => setRefreshing(false), 500);
          }}
        >
          <ArrowClockwiseIcon size={17} />
        </button>
      </section>

      <section className="pin-model-summary" aria-label="模型监控总览">
        <article><span>模型总量</span><strong>{authorizedModelCount}</strong></article>
        <article><span>模型总调用次数（次）</span><strong>23,248</strong></article>
        <article><span>模型总失败次数（次）</span><strong>61</strong></article>
        <article className="danger"><span>模型失败率（%）</span><strong>0.26</strong></article>
        <article><span>模型平均调用时长（s）</span><strong>20.7</strong></article>
        <article><span>模型平均首Token延时（s）</span><strong>18.4</strong></article>
      </section>

      <section className="pin-model-table-shell">
        <div className="pin-model-table">
          <div className="pin-model-row pin-model-head">
            <span>模型名称</span>
            <span>RPM 容量 / 峰值（次/min）</span>
            <span>TPM 容量 / 峰值（千tokens/min）</span>
            <span>总调用总量 ↓</span>
            <span>失败调用 ↓</span>
            <span>总 Token 数 ↓</span>
            <span>失败率 ↓</span>
            <span>4xx错误率 ↓</span>
            <span>5xx错误率 ↓</span>
            <span className="pin-help-heading">平均调用时长（s） <QuestionIcon size={13} /> ↓</span>
            <span className="pin-help-heading">平均首Token延迟（s） <QuestionIcon size={13} /> ↓</span>
            <span>操作</span>
          </div>
          {visibleRows.map((item) => (
            <div className="pin-model-row" key={item.id}>
              <strong>{item.name}</strong>
              <CapacityValue value={item.rpm} peakFactor={isRealtime ? 1.24 : 3.15} utilization={item.rpmRate} />
              <CapacityValue value={item.tpm} peakFactor={isRealtime ? 1.2 : 2.75} utilization={item.tpmRate} />
              <span className="tabular">{numberFormat.format(item.calls)}</span>
              <span className="tabular pin-failed">{item.failed}</span>
              <span className="tabular">{numberFormat.format(item.tokens)}</span>
              <span className={`tabular pin-rate ${item.failureRate === 0 ? "safe" : "warning"}`}>{item.failureRate.toFixed(2)}%</span>
              <span className="tabular">{item.error4xx.toFixed(2)}%</span>
              <span className="tabular">{item.error5xx.toFixed(2)}%</span>
              <span className="tabular pin-latency">{item.duration.toFixed(1)}</span>
              <span className="tabular pin-latency">{item.firstTokenLatency.toFixed(1)}</span>
              <div className="pin-model-actions">
                <button
                  type="button"
                  className="pin-model-action pin-rate-limit-action"
                  aria-label={`${item.name} 限流配置`}
                  onClick={() => { window.location.hash = `/water-level/pins/${pin.id}/models/${item.id}/rate-limit`; }}
                >
                  <FunnelIcon size={15} /> 限流配置
                </button>
                <button type="button" className="pin-model-action">
                  <PulseIcon size={15} /> 模型监控
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="pin-monitor-pagination pin-model-pagination">
        <span>共 {authorizedModelCount} 条</span>
        <div>
          <button type="button" aria-label="上一页" disabled><ArrowLeftIcon size={14} /></button>
          <button type="button" className="active">1</button>
          <button type="button">2</button>
          <button type="button" aria-label="下一页"><ArrowRightIcon size={14} /></button>
          <select aria-label="每页条数" defaultValue="20"><option value="20">20 / 页</option></select>
        </div>
      </footer>
    </main>
  );
}

function KeyBoundModelsDetail({ keyName, onBack }: { keyName: string; onBack: () => void }) {
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const [refreshing, setRefreshing] = useState(false);
  const isRealtime = mode === "realtime";
  const displayedModels = isRealtime ? keyBoundRealtimeModels : keyBoundModels;

  return (
    <main className="water-level-page key-bound-model-page">
      <header className="supplier-monitor-breadcrumb pin-model-breadcrumb"><button type="button" aria-label="返回 Key 监控" onClick={onBack}><ArrowLeftIcon size={17} /></button><strong>Key 监控</strong><b>/</b><em>Key 绑定模型 - {keyName}</em></header>
      <section className={`key-bound-filter ${isRealtime ? "realtime" : ""}`}>
        <div className="supplier-monitor-mode"><button className={!isRealtime ? "active" : ""} type="button" onClick={() => setMode("history")}>历史筛选</button><button className={isRealtime ? "active" : ""} type="button" onClick={() => setMode("realtime")}>实时监控</button></div>
        {isRealtime ? <><label className="key-bound-live-control"><span>时间范围</span><button type="button">最近 5 分钟 <PencilSimpleIcon size={12} /></button></label><label className="key-bound-live-control"><span>刷新间隔</span><button type="button">30 秒 <PencilSimpleIcon size={12} /></button></label></> : <><label><span>时间范围</span><select defaultValue="今天"><option>今天</option><option>自定义</option></select></label><div className="pin-date-range"><span>2026-07-27 00:00:00</span><ArrowRightIcon size={15} /><span>2026-07-27 10:09:44</span></div></>}
        <label className="key-bound-model-filter"><span>模型</span><select defaultValue="all"><option value="all">全部模型</option>{displayedModels.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><button className="pin-search-button" type="button"><MagnifyingGlassIcon size={17} weight="bold" /></button><button className={`pin-refresh-button ${refreshing ? "refreshing" : ""}`} type="button" onClick={() => { setRefreshing(true); window.setTimeout(() => setRefreshing(false), 500); }}><ArrowClockwiseIcon size={17} /></button>
      </section>
      <section className="key-bound-summary">
        <article><span>模型总量</span><strong>3</strong></article><article><span>模型总调用次数（次）</span><strong>{isRealtime ? "2,727" : "286,518"}</strong></article><article className="danger"><span>模型失败率（%）</span><strong>{isRealtime ? "0.00" : "0.01"}</strong></article>
        <article className="capacity"><span>TPM 运行状况（%）</span><strong>{isRealtime ? "0" : "4.23"}</strong><small>{isRealtime ? "903,897 / 0" : "2,116,420 / 5,000,000"}</small><CapacityPeakNote value={isRealtime ? 1_082_400 : 3_984_600} /><i><b style={{ width: isRealtime ? "0" : "5%" }} /></i></article><article className="capacity rpm"><span>RPM 运行状况（%）</span><strong>{isRealtime ? "0" : "0.27"}</strong><small>{isRealtime ? "545.4 / 0" : "318.6 / 120,000"}</small><CapacityPeakNote value={isRealtime ? 692.8 : 1_284.4} /><i><b style={{ width: isRealtime ? "0" : "4%" }} /></i></article><article><span>模型平均调用时长（s）</span><strong>{isRealtime ? "6.6" : "18.6"}</strong></article><article><span>模型平均首 Token 延时（s）</span><strong>{isRealtime ? "6.6" : "0.6"}</strong></article>
      </section>
      <section className={`key-bound-table-shell ${isRealtime ? "realtime" : ""}`}>
        <div className="key-bound-table">
          {isRealtime ? (
            <>
              <div className="key-bound-row key-bound-realtime-row key-bound-head">
                <span>状态 ↓</span><span>模型名称</span><span>RPM 容量 / 峰值（次/min）</span><span>TPM 容量 / 峰值（千tokens/min）</span><span>总Token数 ↓</span><span className="pin-help-heading">平均首Token延迟（s） <QuestionIcon size={13} /> ↓</span><span>操作</span>
              </div>
              {keyBoundRealtimeModels.map((item) => (
                <div className="key-bound-row key-bound-realtime-row" key={item.name}>
                  <span><i className="supplier-realtime-status"><b />正常</i></span>
                  <strong title={item.name}>{item.name}</strong>
                  <CapacityValue value={item.rpm} peakFactor={1.24} />
                  <CapacityValue value={item.tpm} peakFactor={1.2} />
                  <span className="tabular">{numberFormat.format(item.tokens)}</span>
                  <span className="tabular pin-latency">{item.latency.toFixed(1)}</span>
                  <button type="button" className="pin-model-action"><PulseIcon size={15} /> 模型监控</button>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="key-bound-row key-bound-head">
                <span>模型名称</span><span>RPM 容量 / 峰值（次/min）</span><span>TPM 容量 / 峰值（千tokens/min）</span><span>总 Token 数 ↓</span><span className="pin-help-heading">平均首 Token 延时（s） <QuestionIcon size={13} /> ↓</span><span>失败率 ↓</span><span>操作</span>
              </div>
              {keyBoundModels.map((item) => (
                <div className="key-bound-row" key={item.name}>
                  <strong>{item.name}</strong>
                  <CapacityValue value={item.rpm} peakFactor={3.15} utilization={item.rpmRate} />
                  <CapacityValue value={item.tpm} peakFactor={2.75} utilization={item.tpmRate} />
                  <span className="tabular">{numberFormat.format(item.tokens)}</span>
                  <span className="tabular pin-latency">{item.latency}</span>
                  <span className={`tabular pin-rate ${item.failureRate === 0 ? "safe" : "warning"}`}>{item.failureRate.toFixed(2)}%</span>
                  <button type="button" className="pin-model-action"><PulseIcon size={15} /> 模型监控</button>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
      <footer className="pin-monitor-pagination"><span>共 3 条</span><div><button type="button" disabled><ArrowLeftIcon size={14} /></button><button type="button" className="active">1</button><button type="button"><ArrowRightIcon size={14} /></button><select defaultValue="20"><option value="20">20 / 页</option></select></div></footer>
    </main>
  );
}

function PinKeyMonitoringDetail({
  pin,
  onBack,
}: {
  pin: (typeof pinMonitoringRows)[number];
  onBack: () => void;
}) {
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const [timeRange, setTimeRange] = useState("今天");
  const [refreshInterval, setRefreshInterval] = useState("30 秒");
  const [activeRealtimePicker, setActiveRealtimePicker] = useState<
    "range" | "refresh" | null
  >(null);
  const [refreshing, setRefreshing] = useState(false);
  const [boundKeyId, setBoundKeyId] = useState(getBoundKeyModelId);
  const isRealtime = mode === "realtime";

  useEffect(() => {
    const sync = () => setBoundKeyId(getBoundKeyModelId());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  if (boundKeyId) {
    const key = pinKeyMonitoringRows.find((item) => item.id === boundKeyId) ?? pinKeyMonitoringRows[0];
    return <KeyBoundModelsDetail keyName={key.name} onBack={() => { window.location.hash = `/water-level/pins/${pin.id}/keys`; }} />;
  }

  return (
    <main className="water-level-page pin-key-monitor-page">
      <header className="supplier-monitor-breadcrumb pin-model-breadcrumb">
        <button type="button" aria-label="返回用户监控" onClick={onBack}><ArrowLeftIcon size={17} /></button>
        <strong>Key 监控</strong><b>/</b><em>用户的全部 Key - {pin.name}</em>
      </header>
      <section className="pin-model-filter" aria-label="用户 Key 监控筛选">
        <div className="supplier-monitor-mode" aria-label="监控模式">
          <button type="button" className={!isRealtime ? "active" : ""} onClick={() => setMode("history")}>历史筛选</button>
          <button type="button" className={isRealtime ? "active" : ""} onClick={() => { setMode("realtime"); setTimeRange("最近 5 分钟"); setRefreshInterval("30 秒"); }}>实时监控</button>
        </div>
        {isRealtime ? (
          <>
            <label className="supplier-realtime-field"><span>时间范围</span><div className="supplier-realtime-picker"><input className="supplier-realtime-combobox" aria-label="用户 Key 实时时间范围" value={timeRange} placeholder="输入时间范围" onFocus={() => setActiveRealtimePicker("range")} onChange={(event) => setTimeRange(event.target.value)} /><button type="button" aria-label="展开用户 Key 时间范围预设" aria-expanded={activeRealtimePicker === "range"} onClick={() => setActiveRealtimePicker((active) => active === "range" ? null : "range")}><CaretDownIcon size={14} /></button>{activeRealtimePicker === "range" ? <div className="supplier-realtime-menu" role="listbox" aria-label="用户 Key 时间范围预设">{realtimeTimeRangeOptions.map((option) => <button key={option} type="button" role="option" aria-selected={timeRange === option} className={timeRange === option ? "selected" : ""} onClick={() => { setTimeRange(option); setActiveRealtimePicker(null); }}>{option}</button>)}</div> : null}</div></label>
            <label className="supplier-realtime-field"><span>刷新间隔</span><div className="supplier-realtime-picker"><input className="supplier-realtime-combobox" aria-label="用户 Key 刷新间隔" value={refreshInterval} placeholder="输入刷新间隔" onFocus={() => setActiveRealtimePicker("refresh")} onChange={(event) => setRefreshInterval(event.target.value)} /><button type="button" aria-label="展开用户 Key 刷新间隔预设" aria-expanded={activeRealtimePicker === "refresh"} onClick={() => setActiveRealtimePicker((active) => active === "refresh" ? null : "refresh")}><CaretDownIcon size={14} /></button>{activeRealtimePicker === "refresh" ? <div className="supplier-realtime-menu" role="listbox" aria-label="用户 Key 刷新间隔预设">{realtimeRefreshOptions.map((option) => <button key={option} type="button" role="option" aria-selected={refreshInterval === option} className={refreshInterval === option ? "selected" : ""} onClick={() => { setRefreshInterval(option); setActiveRealtimePicker(null); }}>{option}</button>)}</div> : null}</div></label>
          </>
        ) : (
          <>
            <label><span>时间范围</span><select value={timeRange} onChange={(event) => setTimeRange(event.target.value)}><option>3 小时</option><option>6 小时</option><option>9 小时</option><option>12 小时</option><option>24 小时</option><option>今天</option><option>昨天</option><option>近 7 天</option><option>当月</option><option>近 30 天</option></select></label>
            <div className="pin-date-range pin-model-date"><span>2026-07-27 00:00:00</span><ArrowRightIcon size={15} /><span>2026-07-27 11:20:32</span></div>
          </>
        )}
        <label className="pin-model-select"><span>Key</span><select defaultValue="all"><option value="all">全部 Key</option>{pinKeyMonitoringRows.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
        <button className="pin-search-button" type="button" aria-label="查询用户 Key 监控"><MagnifyingGlassIcon size={17} weight="bold" /></button>
        <button className={`pin-refresh-button ${refreshing ? "refreshing" : ""}`} type="button" aria-label="刷新用户 Key 监控" onClick={() => { setRefreshing(true); window.setTimeout(() => setRefreshing(false), 500); }}><ArrowClockwiseIcon size={17} /></button>
      </section>

      <section className="pin-monitor-summary pin-key-summary" aria-label="用户 Key 监控总览">
        <article className="blue"><div><span>Key 总数</span><strong>12</strong></div><SquaresFourIcon size={56} weight="fill" /></article>
        <article className="slate"><div><span>Key 总调用次数（次）</span><strong>713,310</strong></div><LightningIcon size={60} weight="fill" /></article>
        <article className="red"><div><span>Key 总失败次数（次）</span><strong>17</strong></div><XCircleIcon size={62} weight="fill" /></article>
        <article className="amber"><div><span>Key 平均调用时长（s）</span><strong>18.3</strong></div><ClockIcon size={62} weight="fill" /></article>
      </section>

      <section className={`pin-key-table-shell ${isRealtime ? "realtime" : ""}`}>
        <div className="pin-key-table">
          <div className={`pin-key-row pin-key-head ${isRealtime ? "realtime" : ""}`}>
            {isRealtime ? <span>状态 ↓</span> : null}<span>Key 编码</span><span>Key 名称</span><span>RPM 容量 / 峰值（次/min）</span><span>TPM 容量 / 峰值（千tokens/min）</span><span>总调用总量 ↓</span><span>失败调用 ↓</span><span>总 Token 数 ↓</span><span>失败率 ↓</span><span>4xx 错误率 ↓</span><span>5xx 错误率 ↓</span><span className="pin-help-heading">平均调用时长（s） <QuestionIcon size={13} /> ↓</span><span className="pin-help-heading">首Token 延迟（s） <QuestionIcon size={13} /> ↓</span><span>操作</span>
          </div>
          {pinKeyMonitoringRows.map((item) => (
            <div className={`pin-key-row ${isRealtime ? "realtime" : ""}`} key={item.id}>
              {isRealtime ? <span><StatusBadge decision={resolveMonitoringStatus({ rpmUtilization: item.rpmRate, tpmUtilization: item.tpmRate, failureRate: item.failureRate, rateLimit: item.id === "cw-gray" ? "persistent" : "none", configured: item.rpmRate !== null || item.tpmRate !== null })} /></span> : null}<strong>{item.id}</strong><span>{item.name}</span><CapacityValue value={item.rpm} peakFactor={isRealtime ? 1.2 : 3.25} utilization={item.rpmRate} /><CapacityValue value={item.tpm} peakFactor={isRealtime ? 1.18 : 2.85} utilization={item.tpmRate} /><span className="tabular">{numberFormat.format(item.calls)}</span><span className="tabular pin-failed">{item.failed}</span><span className="tabular">{numberFormat.format(item.tokens)}</span><span className={`tabular pin-rate ${item.failureRate === 0 ? "safe" : "warning"}`}>{item.failureRate.toFixed(2)}%</span><span className="tabular">{item.error4xx.toFixed(2)}%</span><span className="tabular">{item.error5xx.toFixed(2)}%</span><span className="tabular pin-latency">{item.duration.toFixed(1)}</span><span className="tabular pin-latency">{item.firstTokenLatency.toFixed(1)}</span><button type="button" className="pin-model-action" onClick={() => { window.location.hash = `/water-level/pins/${pin.id}/keys/${item.id}/models`; }}><PulseIcon size={15} /> Key 监控</button>
            </div>
          ))}
        </div>
      </section>
      <footer className="pin-monitor-pagination"><span>共 12 条</span><div><button type="button" aria-label="上一页" disabled><ArrowLeftIcon size={14} /></button><button type="button" className="active">1</button><button type="button">2</button><button type="button" aria-label="下一页"><ArrowRightIcon size={14} /></button><select aria-label="每页条数" defaultValue="20"><option value="20">20 / 页</option></select></div></footer>
    </main>
  );
}

function PinManagement() {
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const [timeRange, setTimeRange] = useState("今天");
  const [refreshInterval, setRefreshInterval] = useState("30 秒");
  const [activeRealtimePicker, setActiveRealtimePicker] = useState<
    "range" | "refresh" | null
  >(null);
  const [selectedPin, setSelectedPin] = useState("all");
  const [appliedPin, setAppliedPin] = useState("all");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [modelMonitoringPin, setModelMonitoringPin] = useState(getPinModelMonitoringId);
  const [keyMonitoringPin, setKeyMonitoringPin] = useState(getPinKeyMonitoringId);
  const [rateLimitRoute, setRateLimitRoute] = useState(getPinModelRateLimitRoute);
  const filteredPins =
    appliedPin === "all"
      ? pinMonitoringRows
      : pinMonitoringRows.filter((pin) => pin.id === appliedPin);
  const isRealtime = mode === "realtime";

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    const syncRoute = () => {
      setModelMonitoringPin(getPinModelMonitoringId());
      setKeyMonitoringPin(getPinKeyMonitoringId());
      setRateLimitRoute(getPinModelRateLimitRoute());
    };
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  if (rateLimitRoute) {
    const pin = pinMonitoringRows.find((item) => item.id === rateLimitRoute.pinId) ?? pinMonitoringRows[0];
    const selectedModel = pinModelMonitoringRows.find((item) => item.id === rateLimitRoute.modelId) ?? pinModelMonitoringRows[0];
    return (
      <RateLimitConfigPage
        pin={pin}
        model={selectedModel}
        onBack={() => { window.location.hash = `/water-level/pins/${pin.id}/models`; }}
      />
    );
  }

  if (modelMonitoringPin) {
    const pin = pinMonitoringRows.find((item) => item.id === modelMonitoringPin) ?? pinMonitoringRows[0];
    return (
      <PinModelMonitoringDetail
        pin={pin}
        onBack={() => { window.location.hash = "/water-level/pins"; }}
      />
    );
  }

  if (keyMonitoringPin) {
    const pin = pinMonitoringRows.find((item) => item.id === keyMonitoringPin) ?? pinMonitoringRows[0];
    return <PinKeyMonitoringDetail pin={pin} onBack={() => { window.location.hash = "/water-level/pins"; }} />;
  }

  return (
    <main className="water-level-page pin-monitor-page">
      <h2 className="pin-monitor-title">全用户概览</h2>

      <section className="pin-monitor-filter" aria-label="用户监控筛选">
        <div className="supplier-monitor-mode" aria-label="监控模式">
          <button
            type="button"
            className={!isRealtime ? "active" : ""}
            onClick={() => setMode("history")}
          >
            历史筛选
          </button>
          <button
            type="button"
            className={isRealtime ? "active" : ""}
            onClick={() => {
              setMode("realtime");
              setTimeRange("最近 5 分钟");
              setRefreshInterval("30 秒");
            }}
          >
            实时监控
          </button>
        </div>
        {isRealtime ? (
          <>
            <label className="supplier-realtime-field">
              <span>时间范围</span>
              <div className="supplier-realtime-picker">
                <input
                  className="supplier-realtime-combobox"
                  aria-label="用户实时时间范围"
                  value={timeRange}
                  placeholder="输入时间范围"
                  onFocus={() => setActiveRealtimePicker("range")}
                  onChange={(event) => setTimeRange(event.target.value)}
                />
                <button
                  type="button"
                  aria-label="展开用户时间范围预设"
                  aria-expanded={activeRealtimePicker === "range"}
                  onClick={() => setActiveRealtimePicker((active) => active === "range" ? null : "range")}
                ><CaretDownIcon size={14} /></button>
                {activeRealtimePicker === "range" ? (
                  <div className="supplier-realtime-menu" role="listbox" aria-label="用户时间范围预设">
                    {realtimeTimeRangeOptions.map((option) => (
                      <button key={option} type="button" role="option" aria-selected={timeRange === option} className={timeRange === option ? "selected" : ""} onClick={() => { setTimeRange(option); setActiveRealtimePicker(null); }}>{option}</button>
                    ))}
                  </div>
                ) : null}
              </div>
            </label>
            <label className="supplier-realtime-field">
              <span>刷新间隔</span>
              <div className="supplier-realtime-picker">
                <input
                  className="supplier-realtime-combobox"
                  aria-label="用户刷新间隔"
                  value={refreshInterval}
                  placeholder="输入刷新间隔"
                  onFocus={() => setActiveRealtimePicker("refresh")}
                  onChange={(event) => setRefreshInterval(event.target.value)}
                />
                <button
                  type="button"
                  aria-label="展开用户刷新间隔预设"
                  aria-expanded={activeRealtimePicker === "refresh"}
                  onClick={() => setActiveRealtimePicker((active) => active === "refresh" ? null : "refresh")}
                ><CaretDownIcon size={14} /></button>
                {activeRealtimePicker === "refresh" ? (
                  <div className="supplier-realtime-menu" role="listbox" aria-label="用户刷新间隔预设">
                    {realtimeRefreshOptions.map((option) => (
                      <button key={option} type="button" role="option" aria-selected={refreshInterval === option} className={refreshInterval === option ? "selected" : ""} onClick={() => { setRefreshInterval(option); setActiveRealtimePicker(null); }}>{option}</button>
                    ))}
                  </div>
                ) : null}
              </div>
            </label>
          </>
        ) : (
          <>
            <label>
              <span>时间范围</span>
              <select
                value={timeRange}
                onChange={(event) => setTimeRange(event.target.value)}
              >
                <option>3 小时</option><option>6 小时</option><option>9 小时</option><option>12 小时</option><option>24 小时</option><option>今天</option><option>昨天</option><option>近 7 天</option><option>当月</option><option>近 30 天</option>
              </select>
            </label>
            <div className="pin-date-range" aria-label="统计时间">
              <span>2026-07-27 00:00:00</span>
              <ArrowRightIcon size={15} />
              <span>2026-07-27 09:47:34</span>
            </div>
          </>
        )}
        <label className="pin-select">
          <span>用户</span>
          <select
            value={selectedPin}
            onChange={(event) => setSelectedPin(event.target.value)}
          >
            <option value="all">全部用户</option>
            {pinResources.map((pin) => (
              <option value={pin.id} key={pin.id}>
                {pin.code} · {pin.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="pin-search-button"
          type="button"
          aria-label="查询用户监控"
          onClick={() => {
            setAppliedPin(selectedPin);
            setPage(1);
          }}
        >
          <MagnifyingGlassIcon size={17} weight="bold" />
        </button>
        <button
          className={`pin-refresh-button ${refreshing ? "refreshing" : ""}`}
          type="button"
          aria-label="刷新用户监控"
          onClick={refresh}
        >
          <ArrowClockwiseIcon size={17} />
        </button>
      </section>

      <section className="pin-monitor-summary user-monitor-summary" aria-label="用户监控总览">
        <article className="blue">
          <div>
            <span>用户总数</span>
            <strong>107</strong>
          </div>
          <SquaresFourIcon size={58} weight="fill" />
        </article>
        <article className="slate">
          <div>
            <span>用户总调用次数（次）</span>
            <strong>898,335</strong>
          </div>
          <LightningIcon size={62} weight="fill" />
        </article>
        <article className="red">
          <div>
            <span>用户总失败次数（次）</span>
            <strong>968</strong>
          </div>
          <XCircleIcon size={64} weight="fill" />
        </article>
        <article className="amber">
          <div>
            <span>用户平均调用时长（s）</span>
            <strong>17.7</strong>
          </div>
          <ClockIcon size={64} weight="fill" />
        </article>
      </section>

      <section className={`pin-monitor-table-shell ${isRealtime ? "realtime" : ""}`}>
        <div className="pin-monitor-table">
          <div className={`pin-monitor-row pin-monitor-head ${isRealtime ? "realtime" : ""}`}>
            {isRealtime ? <span>状态 ↓</span> : null}
            <span>PIN 编码</span>
            <span>用户名称</span>
            <span>已授权模型</span>
            <span>失败率 ↓</span>
            <span>4xx 错误率 ↓</span>
            <span>5xx 错误率 ↓</span>
            <span>总 Token 数 ↓</span>
            <span>总调用总量 ↓</span>
            <span>失败调用 ↓</span>
            <span className="pin-help-heading">
              平均调用时长（s）
              <QuestionIcon size={13} />
              ↓
            </span>
            <span className="pin-help-heading">
              首 Token 延迟（s）
              <QuestionIcon size={13} />
              ↓
            </span>
            <span>操作</span>
          </div>
          {filteredPins.map((pin) => {
            const modelCount = pinAuthorizedModelCounts[pin.id] ?? pinModelMonitoringRows.length;
            return (
            <div
              key={pin.id}
              className={`pin-monitor-row ${isRealtime ? "realtime" : ""}`}
            >
              {isRealtime ? <span><StatusBadge decision={resolveMonitoringStatus({ rpmUtilization: pin.rpmRate, tpmUtilization: pin.tpmRate, failureRate: pin.failureRate, rateLimit: pin.id === "cloudwise" ? "persistent" : "none", configured: pin.rpmRate !== null || pin.tpmRate !== null })} /></span> : null}
              <strong>{pin.code}</strong>
              <span title={pin.name}>{pin.name}</span>
              <span className="pin-authorized-models" aria-label={`${modelCount} 个已授权模型`}>
                <strong>{modelCount}</strong>
                <small>个</small>
              </span>
              <span
                className={`tabular pin-rate ${
                  pin.failureRate === 0 ? "safe" : "warning"
                }`}
              >
                {pin.failureRate.toFixed(2)}%
              </span>
              <span className="tabular">{pin.error4xx.toFixed(2)}%</span>
              <span className="tabular">{pin.error5xx.toFixed(2)}%</span>
              <span className="tabular">{numberFormat.format(pin.totalTokens)}</span>
              <span className="tabular">{numberFormat.format(pin.totalCalls)}</span>
              <span className="tabular pin-failed">
                {numberFormat.format(pin.failedCalls)}
              </span>
              <span className="tabular pin-latency">
                {pin.averageDuration.toFixed(1)}
              </span>
              <span className="tabular pin-latency">
                {pin.firstTokenLatency.toFixed(1)}
              </span>
              <div className="pin-monitor-action-set" aria-label={`${pin.code} 监控操作`}>
                <button
                  type="button"
                  className="pin-monitor-action"
                  aria-label={`${pin.code} 用户模型监控`}
                  onClick={() => { window.location.hash = `/water-level/pins/${pin.id}/models`; }}
                >
                  <PulseIcon size={14} />
                  用户模型监控
                </button>
                <button
                  type="button"
                  className="pin-monitor-action"
                  aria-label={`${pin.code} 用户 Key 监控`}
                  onClick={() => { window.location.hash = `/water-level/pins/${pin.id}/keys`; }}
                >
                  <PulseIcon size={14} />
                  用户 Key 监控
                </button>
              </div>
            </div>
            );
          })}
          {filteredPins.length === 0 ? (
            <div className="upstream-empty">暂无符合条件的 PIN。</div>
          ) : null}
        </div>
      </section>

      <footer className="pin-monitor-pagination">
        <span>共 107 条</span>
        <div>
          <button
            type="button"
            aria-label="上一页"
            disabled={page === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <ArrowLeftIcon size={14} />
          </button>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <button
              className={page === item ? "active" : ""}
              type="button"
              key={item}
              onClick={() => setPage(item)}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            aria-label="下一页"
            onClick={() => setPage((value) => Math.min(6, value + 1))}
          >
            <ArrowRightIcon size={14} />
          </button>
          <select aria-label="每页条数" defaultValue="20">
            <option value="20">20 / 页</option>
            <option value="50">50 / 页</option>
          </select>
        </div>
      </footer>
    </main>
  );
}

function ModelCapacity({
  used,
  limit,
  peak,
}: {
  used: number;
  limit: number;
  peak?: number;
}) {
  const observedPeak = peak ?? numericCapacityPeak(used, limit);
  return <CapacityMeter used={used} limit={limit} peak={observedPeak} />;
}

function ModelPinCapacityWaterline({
  configured,
  limit,
  peak,
}: {
  configured: number;
  limit: number;
  peak: number;
}) {
  const safeLimit = Math.max(limit, 1);
  const remainder = Math.max(limit - configured, 0);
  const p50 = Math.round(Math.min(configured * 0.76, peak * 0.58));
  const p99 = Math.round(Math.max(p50, Math.min(peak * 0.82, safeLimit * 0.92)));
  const markerPosition = (value: number) => `${Math.min(Math.max((value / safeLimit) * 100, 0), 100)}%`;
  const overLimit = peak > limit;

  return (
    <div className="model-pin-capacity-waterline">
      <div className="model-pin-capacity-primary">
        <span>用户配置量 <strong className="tabular">{capacityNumberFormat.format(configured)}</strong></span>
        <span>余量 <strong className="tabular">{capacityNumberFormat.format(remainder)}</strong></span>
        <span>上限 <strong className="tabular">{capacityNumberFormat.format(limit)}</strong></span>
      </div>
      <div className="model-pin-capacity-percentiles">
        <span>P50 <strong className="tabular">{capacityNumberFormat.format(p50)}</strong></span>
        <span>P99 <strong className="tabular">{capacityNumberFormat.format(p99)}</strong></span>
        <span>峰值 <strong className="tabular">{capacityNumberFormat.format(peak)}</strong></span>
      </div>
      <div className={`model-pin-capacity-track ${overLimit ? "over-limit" : ""}`}>
        <i style={{ width: markerPosition(configured) }} />
        <b className="p50" style={{ left: markerPosition(p50) }} aria-hidden="true" />
        <b className="p99" style={{ left: markerPosition(p99) }} aria-hidden="true" />
        <b className="peak" style={{ left: markerPosition(peak) }} aria-hidden="true" />
      </div>
      {overLimit ? <small>峰值超限 +{((peak / safeLimit - 1) * 100).toFixed(1)}%</small> : null}
    </div>
  );
}

function ModelWaterDetail({ model, onBack }: { model: ModelWaterRow; onBack: () => void }) {
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const isRealtime = mode === "realtime";
  const rpm = isRealtime ? Math.round(model.rpm * 0.08) : model.rpm;
  const tpm = isRealtime ? Math.round(model.tpm * 0.12) : model.tpm;

  return <main className="water-level-page model-water-detail-page">
    <header className="supplier-monitor-breadcrumb pin-model-breadcrumb"><button type="button" aria-label="返回模型监控" onClick={onBack}><ArrowLeftIcon size={17} /></button><strong>模型监控</strong><b>/</b><em>{model.name}</em></header>
    <section className={`model-water-filter ${isRealtime ? "realtime" : ""}`}>
      <div className="supplier-monitor-mode"><button type="button" className={!isRealtime ? "active" : ""} onClick={() => setMode("history")}>历史筛选</button><button type="button" className={isRealtime ? "active" : ""} onClick={() => setMode("realtime")}>实时监控</button></div>
      {isRealtime ? <><label className="model-water-live"><span>时间范围</span><button type="button">最近 5 分钟 <PencilSimpleIcon size={12} /></button></label><label className="model-water-live"><span>刷新间隔</span><button type="button">30 秒 <PencilSimpleIcon size={12} /></button></label></> : <><label><span>时间范围</span><select defaultValue="今天"><option>今天</option><option>自定义</option></select></label><div className="pin-date-range"><span>2026-07-27 00:00:00</span><ArrowRightIcon size={15} /><span>2026-07-27 11:20:32</span></div></>}
      <label><span>供应商</span><select defaultValue="all"><option value="all">全部供应商</option><option>火山方舟</option><option>Azure OpenAI</option></select></label><button type="button" className="pin-search-button" aria-label="查询模型供给"><MagnifyingGlassIcon size={17} weight="bold" /></button><button type="button" className="pin-refresh-button" aria-label="刷新模型供给"><ArrowClockwiseIcon size={17} /></button>
    </section>
    <section className="model-water-summary">
      <article><span>可用供应商</span><strong>{model.providers}</strong><small>{model.healthyEndpoints} / {model.endpoints} 端点健康</small></article>
      <article className="capacity"><span>RPM 运行状况（%）</span><strong>{percent(rpm, model.rpmLimit)}</strong><small>{numberFormat.format(rpm)} / {numberFormat.format(model.rpmLimit)}</small><CapacityPeakNote value={numericCapacityPeak(rpm, model.rpmLimit, isRealtime ? 1.18 : 1.42)} /><i><b style={{ width: `${percent(rpm, model.rpmLimit)}%` }} /></i></article>
      <article className="capacity"><span>TPM 运行状况（%）</span><strong>{percent(tpm, model.tpmLimit)}</strong><small>{numberFormat.format(tpm)} / {numberFormat.format(model.tpmLimit)}</small><CapacityPeakNote value={numericCapacityPeak(tpm, model.tpmLimit, isRealtime ? 1.16 : 1.08)} /><i><b style={{ width: `${percent(tpm, model.tpmLimit)}%` }} /></i></article>
      <article><span>总调用次数（次）</span><strong>{isRealtime ? "4,267" : "1,253,817"}</strong></article>
      <article className="danger"><span>失败率（%）</span><strong>{isRealtime ? "0.72" : model.failureRate.toFixed(2)}</strong></article>
      <article><span>平均调用时长（s）</span><strong>{isRealtime ? "6.6" : "15.8"}</strong></article>
      <article><span>平均首 Token 延迟（s）</span><strong>{isRealtime ? "1.0" : model.firstTokenLatency.toFixed(1)}</strong></article>
    </section>
    <section className="model-water-section">
      <div className="model-water-section-title"><div><strong>供给构成</strong><span>按供应商与端点拆解模型实际水位</span></div><span>最高水位优先</span></div>
      <div className="model-water-table detail">
        <div className={`model-water-row model-water-head ${isRealtime ? "realtime" : "history"}`}>
          {isRealtime ? <span>状态</span> : null}
          <span>供应商</span><span>端点</span><span>端点等级</span><span>RPM 容量 / 峰值（次/min）</span><span>TPM 容量 / 峰值（Token/min）</span><span>失败率</span><span>平均调用时长（s）</span><span className="pin-help-heading">平均首 Token 延迟（s） <QuestionIcon size={13} /></span><span>操作</span>
        </div>
        {modelWaterSources.map((source) => (
          <div className={`model-water-row ${isRealtime ? "realtime" : "history"}`} key={`${source.supplier}-${source.endpoint}`}>
            {isRealtime ? <span><StatusBadge decision={resolveMonitoringStatus({ rpmUtilization: source.rpmRate, tpmUtilization: source.tpmRate, failureRate: source.failure })} /></span> : null}
            <strong>{source.supplier}</strong>
            <span>{source.endpoint}</span>
            <span>
              <span className={`endpoint-level-badge ${source.level.toLowerCase()}`}>
                <strong>{source.level}</strong>
                <small>{source.levelLabel}</small>
              </span>
            </span>
            <ModelCapacity used={Number(source.rpm.replace(/,/g, "").split(" ")[0])} limit={Number(source.rpm.split("/")[1].replace(/,/g, "").trim())} peak={capacityPeak(source.rpm, isRealtime ? 1.18 : 1.38)} />
            <ModelCapacity used={Number(source.tpm.replace(/,/g, "").split(" ")[0])} limit={Number(source.tpm.split("/")[1].replace(/,/g, "").trim())} peak={capacityPeak(source.tpm, isRealtime ? 1.12 : 1.08)} />
            <span className={`tabular pin-rate ${source.failure >= 1 ? "warning" : "safe"}`}>{source.failure.toFixed(2)}%</span>
            <span className="tabular pin-latency">{(isRealtime ? source.averageDuration * 0.44 : source.averageDuration).toFixed(1)}</span>
            <span className="tabular pin-latency">{(isRealtime ? source.firstTokenLatency * 1.1 : source.firstTokenLatency).toFixed(1)}</span>
            <button type="button" className="pin-model-action endpoint-monitor-action" onClick={() => { window.location.hash = `/water-level/models/${model.id}/endpoints/${source.endpoint}/monitor`; }}><PulseIcon size={15} /> 端点监控</button>
          </div>
        ))}
      </div>
    </section>
    <footer className="pin-monitor-pagination model-water-pagination" aria-label="供给构成分页">
      <span>共 {modelWaterSources.length} 条</span>
      <div>
        <button type="button" aria-label="上一页" disabled><ArrowLeftIcon size={14} /></button>
        <button type="button" className="active">1</button>
        <button type="button" aria-label="下一页" disabled><ArrowRightIcon size={14} /></button>
        <select aria-label="每页条数" defaultValue="20"><option value="20">20 / 页</option><option value="50">50 / 页</option></select>
      </div>
    </footer>
  </main>;
}

function ModelUsageMonitorDetail({ model, onBack }: { model: ModelWaterRow; onBack: () => void }) {
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const [tab, setTab] = useState<"调用统计" | "性能统计">(window.location.hash.endsWith("/performance") ? "性能统计" : "调用统计");
  const [refreshing, setRefreshing] = useState(false);
  const isRealtime = mode === "realtime";
  const series = isRealtime ? realtimeModelMonitorSeries : modelMonitorSeries.map((item) => ({ ...item, calls: Math.round(item.calls * 1.76), success: Math.round(item.success * 1.76), failed: Math.max(0, Math.round(item.failed * 1.76)), totalToken: Math.round(item.totalToken * 1.76), inputToken: Math.round(item.inputToken * 1.76), outputToken: Math.round(item.outputToken * 1.76), rpm: Math.round(item.rpm * 1.76), tpm: Math.round(item.tpm * 1.76) }));
  const setMonitorTab = (next: "调用统计" | "性能统计") => { setTab(next); window.location.hash = `/water-level/models/${model.id}/monitor${next === "性能统计" ? "/performance" : ""}`; };
  return <main className="water-level-page model-monitor-detail-page">
    <header className="supplier-monitor-breadcrumb model-monitor-breadcrumb"><button type="button" aria-label="返回构成管理" onClick={onBack}><ArrowLeftIcon size={17} /></button><strong>构成管理</strong><b>/</b><strong>模型监控 - 全量使用</strong><b>/</b><em>{model.name}</em></header>
    <section className={`model-monitor-filter ${isRealtime ? "realtime" : ""}`} aria-label="模型总用量监控筛选"><div className="supplier-monitor-mode"><button className={!isRealtime ? "active" : ""} type="button" onClick={() => setMode("history")}>历史筛选</button><button className={isRealtime ? "active" : ""} type="button" onClick={() => { setMode("realtime"); setMonitorTab("调用统计"); }}>实时监控</button></div>{isRealtime ? <><label className="model-monitor-live-range"><span>时间范围</span><button type="button">最近 5 分钟 <PencilSimpleIcon size={12} /></button></label><label className="model-monitor-live-refresh"><span>刷新间隔</span><button type="button">30 秒 <PencilSimpleIcon size={12} /></button></label></> : <><label><span>时间范围</span><select defaultValue="今天"><option>今天</option><option>自定义</option></select></label><div className="pin-date-range model-monitor-date"><span>2026-07-27 00:00:00</span><ArrowRightIcon size={15} /><span>2026-07-27 11:20:32</span></div></>}<label className="model-monitor-pin-select"><span>供应商</span><select defaultValue="all"><option value="all">全部供应商</option><option>火山方舟</option><option>阿里云百炼</option><option>Azure OpenAI</option></select></label><label><span>统计维度</span><select defaultValue="按分钟"><option>按分钟</option><option>按小时</option></select></label><button className="pin-search-button" type="button" aria-label="查询模型总用量"><MagnifyingGlassIcon size={17} weight="bold" /></button><button className={`pin-refresh-button ${refreshing ? "refreshing" : ""}`} type="button" aria-label="刷新模型总用量" onClick={() => { setRefreshing(true); window.setTimeout(() => setRefreshing(false), 500); }}><ArrowClockwiseIcon size={17} /></button></section>
    <section className="model-monitor-stat-shell"><nav className="model-monitor-tabs" aria-label="模型总用量统计"><button className={tab === "调用统计" ? "active" : ""} type="button" onClick={() => setMonitorTab("调用统计")}>调用统计</button><button className={tab === "性能统计" ? "active" : ""} type="button" onClick={() => setMonitorTab("性能统计")}>性能统计</button></nav>{tab === "调用统计" ? <div className="model-monitor-chart-stack"><ModelChartPanel title="调用次数趋势" subtitle="该模型跨全部供应商与端点的总调用 / 成功 / 失败" data={series} domain={isRealtime ? [0, 1] : undefined} lines={[{ dataKey: "calls", name: "总调用次数", color: "#62d6aa", strokeWidth: 1.6 }, { dataKey: "success", name: "成功调用", color: "#74d9b4", strokeWidth: 1.2 }, { dataKey: "failed", name: "失败调用", color: "#ff6b72", strokeWidth: 1.2 }]}><MetricPill color="#4595ff" label="总调用次数" value={isRealtime ? "0" : "1,253,817"} /><MetricPill color="#21c892" label="成功调用" value={isRealtime ? "0" : "1,252,312"} /><MetricPill color="#ff5d63" label="失败调用" value={isRealtime ? "0" : "1,505"} /></ModelChartPanel><ModelChartPanel title="失败率趋势" subtitle="失败调用占该模型总调用的百分比" data={series} domain={isRealtime ? [0, 1] : undefined} yFormatter={(value) => `${value}%`} lines={[{ dataKey: "failureRate", name: "失败率", color: "#ff6b72", strokeWidth: 1.4 }]}><MetricPill color="#ff5d63" label="失败率" value={isRealtime ? "0.00%" : "0.12%"} /></ModelChartPanel><ModelChartPanel title="平均 Token 趋势" subtitle="该模型单次调用平均输入 / 输出 Token" data={series} lines={[{ dataKey: "avgInput", name: "平均输入 Token", color: "#cf6adf", strokeWidth: 1.35 }, { dataKey: "avgOutput", name: "平均输出 Token", color: "#7ea1ff", strokeWidth: 1.35 }]} yFormatter={(value) => `${Number(value / 1000).toFixed(0)}K`}><MetricPill color="#cf6adf" label="平均输入 Token" value="3.19K" /><MetricPill color="#6f90f1" label="平均输出 Token" value="1.95K" /></ModelChartPanel><ModelChartPanel title="Token 消耗趋势" subtitle="该模型跨全部来源的总 Token / 输入 Token / 输出 Token" data={series} lines={[{ dataKey: "totalToken", name: "总 Token", color: "#8dd0eb", strokeWidth: 1.35 }, { dataKey: "inputToken", name: "输入 Token", color: "#ffad89", strokeWidth: 1.25 }, { dataKey: "outputToken", name: "输出 Token", color: "#b798ff", strokeWidth: 1.25 }]} yFormatter={(value) => `${Number(value / 1_000_000).toFixed(0)}M`}><MetricPill color="#8dd0eb" label="总 Token" value="6,520.42M" /><MetricPill color="#ff986f" label="输入 Token" value="4,043.12M" /><MetricPill color="#9d7cff" label="输出 Token" value="2,477.30M" /></ModelChartPanel></div> : <div className="model-monitor-chart-stack performance"><ModelChartPanel className="half" title="RPM 趋势" subtitle="该模型跨全部来源的平均每分钟请求数。" data={series} domain={[0, 180000]} referenceLine={{ value: model.rpmLimit, label: `流控线 ${numberFormat.format(model.rpmLimit)}`, color: "#ffad42" }} lines={[{ dataKey: "rpm", name: "RPM", color: "#6f90f1", strokeWidth: 1.2 }]} yFormatter={(value) => numberFormat.format(value)}><MetricPill color="#ffad42" label="流控线" value={numberFormat.format(model.rpmLimit)} /><MetricPill color="#6f90f1" label="RPM" value={numberFormat.format(model.rpm)} /><MetricPill color="#e39a31" label="窗口峰值" value={numberFormat.format(numericCapacityPeak(model.rpm, model.rpmLimit, isRealtime ? 1.18 : 1.34))} /></ModelChartPanel><ModelChartPanel className="half" title="TPM 趋势" subtitle="该模型跨全部来源的每分钟 Token 吞吐量。" data={series} domain={[0, 9000000]} referenceLine={{ value: model.tpmLimit, label: `流控线 ${numberFormat.format(model.tpmLimit)}`, color: "#ffad42" }} lines={[{ dataKey: "tpm", name: "TPM", color: "#57c5b7", strokeWidth: 1.25 }]} yFormatter={(value) => numberFormat.format(value)}><MetricPill color="#ffad42" label="流控线" value={numberFormat.format(model.tpmLimit)} /><MetricPill color="#31aa9f" label="TPM" value={numberFormat.format(model.tpm)} /><MetricPill color="#e39a31" label="窗口峰值" value={numberFormat.format(numericCapacityPeak(model.tpm, model.tpmLimit, isRealtime ? 1.14 : 1.08))} /></ModelChartPanel><ModelChartPanel className="wide" title="调用时长趋势" subtitle="该模型全量调用的平均 / P50 / P99 时长" data={series} domain={[0, 360]} lines={[{ dataKey: "avgDuration", name: "平均调用时长", color: "#5d8cff", strokeWidth: 1.15 }, { dataKey: "p50Duration", name: "P50 调用时长", color: "#66d7b3", strokeWidth: 1.15 }, { dataKey: "p99Duration", name: "P99 调用时长", color: "#ff7d8a", strokeWidth: 1.15 }]} yFormatter={(value) => `${value}ms`}><MetricPill color="#5d8cff" label="平均调用时长" value="15.8s" /><MetricPill color="#66d7b3" label="P50 调用时长" value="10.6s" /><MetricPill color="#ff5d63" label="P99 调用时长" value="26.4s" /></ModelChartPanel><ModelChartPanel className="wide" title="平均首 Token 延迟" subtitle="该模型跨全部来源的首 Token 返回耗时" data={series} domain={[0, 13]} lines={[{ dataKey: "avgTokenLatency", name: "平均首Token耗时", color: "#57c5b7", strokeWidth: 1.15, area: true }]} yFormatter={(value) => `${value}ms`}><MetricPill color="#57c5b7" label="平均首Token耗时" value={`${model.firstTokenLatency.toFixed(1)}s`} /></ModelChartPanel></div>}</section>
  </main>;
}

function EndpointUsageMonitorDetail({ model, endpoint, onBack }: { model: ModelWaterRow; endpoint: (typeof modelWaterSources)[number]; onBack: () => void }) {
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const [tab, setTab] = useState<"调用统计" | "性能统计">(window.location.hash.endsWith("/performance") ? "性能统计" : "调用统计");
  const isRealtime = mode === "realtime";
  const sourceScale = endpoint.endpoint.includes("prod-01") ? 0.34 : endpoint.endpoint.includes("prod-02") ? 0.28 : 0.16;
  const series = isRealtime ? realtimeModelMonitorSeries : modelMonitorSeries.map((item) => ({ ...item, calls: Math.round(item.calls * sourceScale), success: Math.round(item.success * sourceScale), failed: Math.max(0, Math.round(item.failed * sourceScale)), totalToken: Math.round(item.totalToken * sourceScale), inputToken: Math.round(item.inputToken * sourceScale), outputToken: Math.round(item.outputToken * sourceScale), rpm: Math.round(item.rpm * sourceScale), tpm: Math.round(item.tpm * sourceScale) }));
  const routeBase = `/water-level/models/${model.id}/endpoints/${endpoint.endpoint}/monitor`;
  const setMonitorTab = (next: "调用统计" | "性能统计") => { setTab(next); window.location.hash = `${routeBase}${next === "性能统计" ? "/performance" : ""}`; };
  const endpointRpm = Number(endpoint.rpm.replace(/,/g, "").split(" ")[0]);
  const endpointRpmLimit = Number(endpoint.rpm.split("/")[1].replace(/,/g, "").trim());
  const endpointTpm = Number(endpoint.tpm.replace(/,/g, "").split(" ")[0]);
  const endpointTpmLimit = Number(endpoint.tpm.split("/")[1].replace(/,/g, "").trim());
  return <main className="water-level-page model-monitor-detail-page"><header className="supplier-monitor-breadcrumb model-monitor-breadcrumb"><button type="button" aria-label="返回构成管理" onClick={onBack}><ArrowLeftIcon size={17} /></button><strong>构成管理</strong><b>/</b><strong>端点监控</strong><b>/</b><em>{endpoint.endpoint}</em></header><section className={`model-monitor-filter ${isRealtime ? "realtime" : ""}`} aria-label="端点监控筛选"><div className="supplier-monitor-mode"><button className={!isRealtime ? "active" : ""} type="button" onClick={() => setMode("history")}>历史筛选</button><button className={isRealtime ? "active" : ""} type="button" onClick={() => { setMode("realtime"); setMonitorTab("调用统计"); }}>实时监控</button></div>{isRealtime ? <><label className="model-monitor-live-range"><span>时间范围</span><button type="button">最近 5 分钟 <PencilSimpleIcon size={12} /></button></label><label className="model-monitor-live-refresh"><span>刷新间隔</span><button type="button">30 秒 <PencilSimpleIcon size={12} /></button></label></> : <><label><span>时间范围</span><select defaultValue="今天"><option>今天</option><option>自定义</option></select></label><div className="pin-date-range model-monitor-date"><span>2026-07-27 00:00:00</span><ArrowRightIcon size={15} /><span>2026-07-27 11:20:32</span></div></>}<label className="model-monitor-pin-select"><span>模型</span><select defaultValue={model.name}><option>{model.name}</option></select></label><label><span>统计维度</span><select defaultValue="按分钟"><option>按分钟</option><option>按小时</option></select></label><button className="pin-search-button" type="button" aria-label="查询端点监控"><MagnifyingGlassIcon size={17} weight="bold" /></button><button className="pin-refresh-button" type="button" aria-label="刷新端点监控"><ArrowClockwiseIcon size={17} /></button></section><section className="model-monitor-stat-shell"><nav className="model-monitor-tabs" aria-label="端点使用量统计"><button className={tab === "调用统计" ? "active" : ""} type="button" onClick={() => setMonitorTab("调用统计")}>调用统计</button><button className={tab === "性能统计" ? "active" : ""} type="button" onClick={() => setMonitorTab("性能统计")}>性能统计</button></nav>{tab === "调用统计" ? <div className="model-monitor-chart-stack"><ModelChartPanel title="调用次数趋势" subtitle="该端点总调用 / 成功 / 失败" data={series} domain={isRealtime ? [0, 1] : undefined} lines={[{ dataKey: "calls", name: "总调用次数", color: "#62d6aa", strokeWidth: 1.6 }, { dataKey: "success", name: "成功调用", color: "#74d9b4", strokeWidth: 1.2 }, { dataKey: "failed", name: "失败调用", color: "#ff6b72", strokeWidth: 1.2 }]}><MetricPill color="#4595ff" label="总调用次数" value={isRealtime ? "0" : "428,910"} /><MetricPill color="#21c892" label="成功调用" value={isRealtime ? "0" : "428,566"} /><MetricPill color="#ff5d63" label="失败调用" value={isRealtime ? "0" : "344"} /></ModelChartPanel><ModelChartPanel title="失败率趋势" subtitle="该端点失败调用占总调用的百分比" data={series} domain={isRealtime ? [0, 1] : undefined} yFormatter={(value) => `${value}%`} lines={[{ dataKey: "failureRate", name: "失败率", color: "#ff6b72", strokeWidth: 1.4 }]}><MetricPill color="#ff5d63" label="失败率" value={`${endpoint.failure.toFixed(2)}%`} /></ModelChartPanel><ModelChartPanel title="平均 Token 趋势" subtitle="该端点单次调用平均输入 / 输出 Token" data={series} lines={[{ dataKey: "avgInput", name: "平均输入 Token", color: "#cf6adf", strokeWidth: 1.35 }, { dataKey: "avgOutput", name: "平均输出 Token", color: "#7ea1ff", strokeWidth: 1.35 }]} yFormatter={(value) => `${Number(value / 1000).toFixed(0)}K`}><MetricPill color="#cf6adf" label="平均输入 Token" value="3.24K" /><MetricPill color="#6f90f1" label="平均输出 Token" value="1.91K" /></ModelChartPanel><ModelChartPanel title="Token 消耗趋势" subtitle="该端点总 Token / 输入 Token / 输出 Token" data={series} lines={[{ dataKey: "totalToken", name: "总 Token", color: "#8dd0eb", strokeWidth: 1.35 }, { dataKey: "inputToken", name: "输入 Token", color: "#ffad89", strokeWidth: 1.25 }, { dataKey: "outputToken", name: "输出 Token", color: "#b798ff", strokeWidth: 1.25 }]} yFormatter={(value) => `${Number(value / 1_000_000).toFixed(0)}M`}><MetricPill color="#8dd0eb" label="总 Token" value="2,223.42M" /></ModelChartPanel></div> : <div className="model-monitor-chart-stack performance"><ModelChartPanel className="half" title="RPM 趋势" subtitle="该端点平均每分钟请求数。" data={series} domain={[0, endpointRpmLimit]} referenceLine={{ value: endpointRpmLimit, label: `流控线 ${numberFormat.format(endpointRpmLimit)}`, color: "#ffad42" }} lines={[{ dataKey: "rpm", name: "RPM", color: "#6f90f1", strokeWidth: 1.2 }]} yFormatter={(value) => numberFormat.format(value)}><MetricPill color="#6f90f1" label="RPM" value={numberFormat.format(endpointRpm)} /><MetricPill color="#e39a31" label="窗口峰值" value={numberFormat.format(numericCapacityPeak(endpointRpm, endpointRpmLimit, isRealtime ? 1.18 : 1.36))} /></ModelChartPanel><ModelChartPanel className="half" title="TPM 趋势" subtitle="该端点每分钟 Token 吞吐量。" data={series} domain={[0, endpointTpmLimit]} referenceLine={{ value: endpointTpmLimit, label: `流控线 ${numberFormat.format(endpointTpmLimit)}`, color: "#ffad42" }} lines={[{ dataKey: "tpm", name: "TPM", color: "#57c5b7", strokeWidth: 1.25 }]} yFormatter={(value) => numberFormat.format(value)}><MetricPill color="#31aa9f" label="TPM" value={numberFormat.format(endpointTpm)} /><MetricPill color="#e39a31" label="窗口峰值" value={numberFormat.format(numericCapacityPeak(endpointTpm, endpointTpmLimit, isRealtime ? 1.12 : 1.08))} /></ModelChartPanel><ModelChartPanel className="wide" title="调用时长趋势" subtitle="该端点的平均 / P50 / P99 调用时长" data={series} domain={[0, 360]} lines={[{ dataKey: "avgDuration", name: "平均调用时长", color: "#5d8cff", strokeWidth: 1.15 }, { dataKey: "p50Duration", name: "P50 调用时长", color: "#66d7b3", strokeWidth: 1.15 }, { dataKey: "p99Duration", name: "P99 调用时长", color: "#ff7d8a", strokeWidth: 1.15 }]} yFormatter={(value) => `${value}ms`}><MetricPill color="#5d8cff" label="平均调用时长" value="14.2s" /></ModelChartPanel><ModelChartPanel className="wide" title="平均首 Token 延迟" subtitle="该端点的首 Token 返回耗时" data={series} domain={[0, 13]} lines={[{ dataKey: "avgTokenLatency", name: "平均首Token耗时", color: "#57c5b7", strokeWidth: 1.15, area: true }]} yFormatter={(value) => `${value}ms`}><MetricPill color="#57c5b7" label="平均首Token耗时" value="0.7s" /></ModelChartPanel></div>}</section></main>;
}

function ModelPinUsageDetail({ model, onBack }: { model: ModelWaterRow; onBack: () => void }) {
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"tokens" | "calls" | "share">("tokens");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const isRealtime = mode === "realtime";
  const activityScale = isRealtime ? modelRealtimeActivityScale : 1;
  const rows = useMemo(() => getModelPinUsageRows(model, activityScale), [model, activityScale]);
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const nextRows = normalizedQuery
      ? rows.filter((row) => `${row.code} ${row.name}`.toLowerCase().includes(normalizedQuery))
      : rows;
    return [...nextRows].sort((left, right) => {
      if (sortBy === "calls") return right.totalCalls - left.totalCalls;
      if (sortBy === "share") return right.usageShare - left.usageShare;
      return right.totalTokens - left.totalTokens;
    });
  }, [query, rows, sortBy]);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const totalTokens = Math.round(model.totalTokens * activityScale);
  const totalCalls = Math.round(model.totalCalls * activityScale);
  const failedCalls = Math.round(model.failedCalls * activityScale);

  useEffect(() => setPage(1), [query, sortBy, isRealtime]);

  return <main className="water-level-page model-pin-usage-page">
    <header className="supplier-monitor-breadcrumb model-monitor-breadcrumb">
      <button type="button" aria-label="返回模型监控" onClick={onBack}><ArrowLeftIcon size={17} /></button>
      <strong>模型监控</strong><b>/</b><em>用量管理 - {model.name}</em>
    </header>
    <section className={`model-pin-usage-filter ${isRealtime ? "realtime" : ""}`} aria-label="模型用量筛选">
      <div className="supplier-monitor-mode"><button type="button" className={!isRealtime ? "active" : ""} onClick={() => setMode("history")}>历史筛选</button><button type="button" className={isRealtime ? "active" : ""} onClick={() => setMode("realtime")}>实时监控</button></div>
      {isRealtime ? <><label><span>时间范围</span><button type="button">最近 5 分钟 <PencilSimpleIcon size={12} /></button></label><label><span>刷新间隔</span><button type="button">30 秒 <PencilSimpleIcon size={12} /></button></label></> : <><label><span>时间范围</span><select defaultValue="今天"><option>今天</option><option>近 7 天</option><option>自定义</option></select></label><div className="pin-date-range"><span>2026-07-27 00:00:00</span><ArrowRightIcon size={15} /><span>2026-07-27 11:20:32</span></div></>}
      <label className="model-pin-usage-sort"><span>排序</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as "tokens" | "calls" | "share")}><option value="tokens">Token 用量</option><option value="calls">调用总量</option><option value="share">用量占比</option></select></label>
      <div className="model-pin-usage-search"><MagnifyingGlassIcon size={15} /><input aria-label="搜索 PIN 编码或用户名称" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索 PIN 编码 / 用户名称" /></div>
      <button type="button" className="pin-search-button" aria-label="查询模型用量"><MagnifyingGlassIcon size={17} weight="bold" /></button>
      <button type="button" className={`pin-refresh-button ${refreshing ? "refreshing" : ""}`} aria-label="刷新模型用量" onClick={() => { setRefreshing(true); window.setTimeout(() => setRefreshing(false), 500); }}><ArrowClockwiseIcon size={17} /></button>
    </section>
    <section className="model-pin-usage-summary" aria-label="模型用量概览">
      <article><span>使用 PIN 数</span><strong>{rows.length}</strong><small>当前模型有用量记录的 PIN</small></article><article><span>总 Token 数</span><strong>{numberFormat.format(totalTokens)}</strong><small>当前筛选时间范围</small></article><article><span>总调用量</span><strong>{numberFormat.format(totalCalls)}</strong><small>包含成功与失败调用</small></article><article className="danger"><span>调用失败量</span><strong>{numberFormat.format(failedCalls)}</strong><small>{totalCalls ? `${((failedCalls / totalCalls) * 100).toFixed(2)}% 失败率` : "暂无调用"}</small></article>
    </section>
    <section className="model-pin-usage-table-shell"><div className="model-pin-usage-table"><div className="model-pin-usage-row model-pin-usage-head"><span>PIN 编码</span><span>用户名称</span><span>TPM 运行状况（Token/min）</span><span>RPM 运行状况（次/min）</span><span>总 Token 数 ↓</span><span>用量占比</span><span>调用总量 ↓</span><span>调用失败量 ↓</span><span>失败率</span><span>最近调用时间</span></div>{visibleRows.map((row) => <div className="model-pin-usage-row" key={row.pinId}><strong>{row.code}</strong><span>{row.name}</span><ModelPinCapacityWaterline configured={row.tpm} limit={row.tpmLimit} peak={row.tpmPeak} /><ModelPinCapacityWaterline configured={row.rpm} limit={row.rpmLimit} peak={row.rpmPeak} /><span className="tabular">{numberFormat.format(row.totalTokens)}</span><span className="tabular">{row.usageShare.toFixed(1)}%</span><span className="tabular">{numberFormat.format(row.totalCalls)}</span><span className="tabular pin-failed">{numberFormat.format(row.failedCalls)}</span><span className={`tabular pin-rate ${row.failureRate === 0 ? "safe" : row.failureRate >= 1 ? "danger" : "warning"}`}>{row.failureRate.toFixed(2)}%</span><span className="tabular">{row.lastActive}</span></div>)}{visibleRows.length === 0 ? <div className="upstream-empty">暂无符合条件的 PIN 用量。</div> : null}</div></section>
    <footer className="pin-monitor-pagination model-pin-usage-pagination"><span>共 {filteredRows.length} 条</span><div><button type="button" aria-label="上一页" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ArrowLeftIcon size={14} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button type="button" className={page === item ? "active" : ""} key={item} onClick={() => setPage(item)}>{item}</button>)}<button type="button" aria-label="下一页" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ArrowRightIcon size={14} /></button><select aria-label="每页条数" defaultValue="5"><option value="5">5 / 页</option></select></div></footer>
  </main>;
}

function SupplierModelManagement() {
  const [selectedModel, setSelectedModel] = useState("all");
  const [mode, setMode] = useState<"history" | "realtime">("history");
  const [refreshing, setRefreshing] = useState(false);
  const [detailId, setDetailId] = useState(getWaterModelDetailId);
  const [usageMonitorId, setUsageMonitorId] = useState(getWaterModelUsageMonitorId);
  const [pinUsageId, setPinUsageId] = useState(getWaterModelPinUsageId);
  const [endpointMonitor, setEndpointMonitor] = useState(getWaterEndpointUsageMonitor);

  useEffect(() => { const sync = () => { setDetailId(getWaterModelDetailId()); setUsageMonitorId(getWaterModelUsageMonitorId()); setPinUsageId(getWaterModelPinUsageId()); setEndpointMonitor(getWaterEndpointUsageMonitor()); }; window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync); }, []);
  const usageMonitor = modelWaterRows.find((item) => item.id === usageMonitorId);
  const pinUsageModel = modelWaterRows.find((item) => item.id === pinUsageId);
  const endpointModel = modelWaterRows.find((item) => item.id === endpointMonitor?.modelId);
  const endpointSource = modelWaterSources.find((item) => item.endpoint === endpointMonitor?.endpoint);
  const detail = modelWaterRows.find((item) => item.id === detailId);
  if (endpointModel && endpointSource) return <EndpointUsageMonitorDetail model={endpointModel} endpoint={endpointSource} onBack={() => { window.location.hash = `/water-level/models/${endpointModel.id}`; }} />;
  if (usageMonitor) return <ModelUsageMonitorDetail model={usageMonitor} onBack={() => { window.location.hash = `/water-level/models/${usageMonitor.id}`; }} />;
  if (pinUsageModel) return <ModelPinUsageDetail model={pinUsageModel} onBack={() => { window.location.hash = "/water-level/models"; }} />;
  if (detail) return <ModelWaterDetail model={detail} onBack={() => { window.location.hash = "/water-level/models"; }} />;

  const isRealtime = mode === "realtime";
  const filteredModels = modelWaterRows.filter((item) => {
    const matchesModel = selectedModel === "all" || item.id === selectedModel;
    return matchesModel;
  });
  const cards = isRealtime
    ? [["模型总数", "24", "关注 3 · 告警 1", ""], ["RPM 运行状况（%）", "4", "18,660 / 476,000", "峰值 24,820"], ["TPM 运行状况（%）", "7", "1,103,000 / 14,800,000", "峰值 1,482,600"], ["总调用次数（次）", "4,267", "最近 5 分钟", ""], ["失败率（%）", "0.72", "失败调用 31 次", ""]]
    : [["模型总数", "24", "关注 3 · 告警 1", ""], ["RPM 运行状况（%）", "52", "248,000 / 476,000", "峰值 312,400"], ["TPM 运行状况（%）", "58", "8,650,000 / 14,800,000", "峰值 10,920,000"], ["总调用次数（次）", "1,253,817", "当前筛选时间范围", ""], ["失败率（%）", "0.36", "失败调用 4,513 次", ""]];

  return <main className="water-level-page model-water-page">
    <WaterLevelModuleHeader index="03" title="模型监控" description="聚合模型在各供应商与端点的供给水位，优先定位可能影响调用的容量风险。" />
    <section className={`model-water-filter ${isRealtime ? "realtime" : ""}`}><div className="supplier-monitor-mode"><button type="button" className={!isRealtime ? "active" : ""} onClick={() => setMode("history")}>历史筛选</button><button type="button" className={isRealtime ? "active" : ""} onClick={() => setMode("realtime")}>实时监控</button></div>{isRealtime ? <><label className="model-water-live"><span>时间范围</span><button type="button">最近 5 分钟 <PencilSimpleIcon size={12} /></button></label><label className="model-water-live"><span>刷新间隔</span><button type="button">30 秒 <PencilSimpleIcon size={12} /></button></label></> : <><label><span>时间范围</span><select defaultValue="今天"><option>今天</option><option>近 7 天</option><option>自定义</option></select></label><div className="pin-date-range"><span>2026-07-27 00:00:00</span><ArrowRightIcon size={15} /><span>2026-07-27 11:20:32</span></div></>}<label className="model-water-select"><span>模型</span><select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}><option value="all">全部模型</option>{modelWaterRows.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button type="button" className="pin-search-button" aria-label="查询模型监控"><MagnifyingGlassIcon size={17} weight="bold" /></button><button type="button" className={`pin-refresh-button ${refreshing ? "refreshing" : ""}`} onClick={() => { setRefreshing(true); window.setTimeout(() => setRefreshing(false), 500); }} aria-label="刷新模型监控"><ArrowClockwiseIcon size={17} /></button></section>
    <section className="model-water-summary model-water-overview-summary">{cards.map(([label, value, note, peak]) => {
      const showsCapacity = label.startsWith("RPM") || label.startsWith("TPM");
      return <article className={label === "失败率（%）" ? "danger" : ""} key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small>{peak ? <em className="capacity-peak-note"><b>峰值</b><span>{peak.replace("峰值 ", "")}</span></em> : null}{showsCapacity ? <i><b style={{ width: `${value}%` }} /></i> : null}</article>;
    })}</section>
    <section className="model-water-section">
      <div className="model-water-table">
        <div className={`model-water-row model-water-head ${isRealtime ? "realtime" : "history"}`}>
          {isRealtime ? <span>状态</span> : null}
          <span>模型名称</span><span>TPM 容量 / 峰值（Token/min）</span><span>RPM 容量 / 峰值（次/min）</span><span>总 Token 数 ↓</span><span>失败率 ↓</span><span>4xx 错误率 ↓</span><span>5xx 错误率 ↓</span><span>调用总量 ↓</span><span>调用失败量 ↓</span><span>平均调用时长（s）</span><span className="pin-help-heading">首 Token 延迟（s） <QuestionIcon size={13} /></span><span>供应商</span><span>端点</span><span>操作</span>
        </div>
        {filteredModels.map((item) => {
          const rateScale = isRealtime ? 2 : 1;
          const totalTokens = isRealtime ? Math.round(item.totalTokens * modelRealtimeActivityScale) : item.totalTokens;
          const totalCalls = isRealtime ? Math.round(item.totalCalls * modelRealtimeActivityScale) : item.totalCalls;
          const failureRate = item.failureRate * rateScale;
          const failedCalls = isRealtime ? Math.round(totalCalls * failureRate / 100) : item.failedCalls;
          const failureTone = failureRate === 0 ? "safe" : failureRate >= 1 ? "danger" : "warning";
          return (
            <div className={`model-water-row ${isRealtime ? "realtime" : "history"}`} key={item.id}>
              {isRealtime ? <span><span className={`supplier-realtime-status ${item.state === "degraded" ? "alert" : ""}`}><i />{item.state === "degraded" ? "报警" : "正常"}</span></span> : null}
              <button type="button" className="model-water-name" onClick={() => { window.location.hash = `/water-level/models/${item.id}`; }}><strong>{item.name}</strong><small>{item.aliases}</small></button>
              <ModelCapacity used={isRealtime ? Math.round(item.tpm * 0.12) : item.tpm} limit={item.tpmLimit} peak={numericCapacityPeak(isRealtime ? Math.round(item.tpm * 0.12) : item.tpm, item.tpmLimit, isRealtime ? 1.18 : 1.09)} />
              <ModelCapacity used={isRealtime ? Math.round(item.rpm * 0.08) : item.rpm} limit={item.rpmLimit} peak={numericCapacityPeak(isRealtime ? Math.round(item.rpm * 0.08) : item.rpm, item.rpmLimit, isRealtime ? 1.2 : 1.34)} />
              <span className="tabular">{numberFormat.format(totalTokens)}</span>
              <span className={`tabular pin-rate ${failureTone}`}>{failureRate.toFixed(2)}%</span>
              <span className="tabular">{(item.error4xxRate * rateScale).toFixed(2)}%</span>
              <span className="tabular">{(item.error5xxRate * rateScale).toFixed(2)}%</span>
              <span className="tabular">{numberFormat.format(totalCalls)}</span>
              <span className="tabular pin-failed">{numberFormat.format(failedCalls)}</span>
              <span className="tabular pin-latency">{(isRealtime ? item.averageDuration * 0.42 : item.averageDuration).toFixed(1)}</span>
              <span className="tabular pin-latency">{(isRealtime ? item.firstTokenLatency * 1.1 : item.firstTokenLatency).toFixed(1)}</span>
              <div className="model-water-supply"><strong>{item.providers} 家</strong><small>可用供应商</small></div>
              <div className="model-water-endpoints"><strong>{item.healthyEndpoints} / {item.endpoints}</strong><small>端点健康</small></div>
              <div className="model-water-actions"><button type="button" className="pin-model-action" onClick={() => { window.location.hash = `/water-level/models/${item.id}`; }}><PulseIcon size={15} /> 构成管理</button><button type="button" className="pin-model-action" onClick={() => { window.location.hash = `/water-level/models/${item.id}/usage`; }}><PulseIcon size={15} /> 用量管理</button><button type="button" className="pin-model-action" onClick={() => { window.location.hash = `/water-level/models/${item.id}/monitor`; }}><PulseIcon size={15} /> 模型监控</button></div>
            </div>
          );
        })}
        {filteredModels.length === 0 ? <div className="upstream-empty">暂无符合筛选条件的模型。</div> : null}
      </div>
    </section>
    <footer className="pin-monitor-pagination"><span>共 24 条</span><div><button type="button" disabled><ArrowLeftIcon size={14} /></button><button type="button" className="active">1</button><button type="button">2</button><button type="button" aria-label="下一页"><ArrowRightIcon size={14} /></button><select defaultValue="20"><option value="20">20 / 页</option></select></div></footer>
  </main>;
}

type DetailTab = "概览" | "模型与端点" | "监控" | "变更记录";
type DrawerKind =
  | "supplier"
  | "endpoint"
  | "add-model"
  | "add-endpoint";

function Drawer({
  kind,
  supplier,
  endpoint,
  onClose,
  onSave,
}: {
  kind: DrawerKind;
  supplier?: Supplier;
  endpoint?: Endpoint;
  onClose: () => void;
  onSave: (message: string, form: FormData) => void;
}) {
  const titles: Record<DrawerKind, string> = {
    supplier: "编辑供应商",
    endpoint: "调整端点配置",
    "add-model": "新增模型",
    "add-endpoint": "新增端点",
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const messages: Record<DrawerKind, string> = {
      supplier: "供应商信息已保存",
      endpoint: "端点配置已保存",
      "add-model": "模型已添加",
      "add-endpoint": "端点已添加",
    };
    onSave(messages[kind], form);
  };
  const isEndpoint = kind === "endpoint";
  const isSupplier = kind === "supplier";
  const isAddModel = kind === "add-model";
  const isAddEndpoint = kind === "add-endpoint";

  return (
    <div className="drawer-layer">
      <button
        className="drawer-backdrop"
        type="button"
        aria-label="关闭抽屉"
        onClick={onClose}
      />
      <aside className="upstream-drawer" aria-label={titles[kind]}>
        <header>
          <div>
            <h2>{titles[kind]}</h2>
            <span>
              {endpoint?.name ??
                supplier?.name ??
                "录入基础信息后可继续配置模型与端点"}
            </span>
          </div>
          <button type="button" aria-label="关闭" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="drawer-fields">
            {isSupplier ? (
              <>
                <label>
                  供应商名称 <b>*</b>
                  <input
                    name="supplierName"
                    defaultValue={supplier?.name ?? "新供应商"}
                    required
                  />
                </label>
                <label>
                  合作状态 <b>*</b>
                  <select name="status" defaultValue={supplier?.status ?? "pending"}>
                    <option value="active">合作中</option>
                    <option value="standby">待启用</option>
                    <option value="pending">接入中</option>
                  </select>
                </label>
                <label>
                  服务等级
                  <select name="tier" defaultValue={supplier?.tier ?? "普通"}>
                    <option>核心</option>
                    <option>普通</option>
                    <option>备用</option>
                  </select>
                </label>
                <label>
                  接入账号 <b>*</b>
                  <input
                    name="account"
                    defaultValue={supplier?.account ?? "joymaas-provider-prod"}
                    required
                  />
                </label>
                <label>
                  合同到期时间
                  <input
                    name="contractEnd"
                    type="date"
                    defaultValue={
                      supplier?.contractEnd.match(/^\d{4}-/u)
                        ? supplier.contractEnd
                        : "2026-12-31"
                    }
                  />
                </label>
                <label>
                  技术联系人
                  <input
                    name="contact"
                    defaultValue={supplier?.contact ?? "待补充"}
                  />
                </label>
                <label>
                  凭证标识
                  <input
                    name="credential"
                    defaultValue={supplier?.credential ?? "ak-****************"}
                  />
                  <small>仅保存掩码标识，原型不会记录真实密钥。</small>
                </label>
              </>
            ) : null}
            {isEndpoint || isAddEndpoint ? (
              <>
                <label>
                  端点名称 <b>*</b>
                  <input
                    name="endpointName"
                    defaultValue={endpoint?.name ?? "eas-new-endpoint-01"}
                    required
                  />
                </label>
                <label>
                  端点角色 <b>*</b>
                  <select name="role" defaultValue={endpoint?.role ?? "主用"}>
                    <option>主用</option>
                    <option>备用</option>
                    <option>灰度</option>
                  </select>
                </label>
                <label>
                  所属区域
                  <select name="region" defaultValue={endpoint?.region ?? "华东1（杭州）"}>
                    <option>华东1（杭州）</option>
                    <option>华北2（北京）</option>
                    <option>华南1（深圳）</option>
                    <option>华东2（上海）</option>
                  </select>
                </label>
                <label>
                  Token 余额 <b>*</b>
                  <input
                    name="tokenBalance"
                    type="number"
                    defaultValue={endpoint?.tokenBalance ?? 50_000_000}
                    required
                  />
                </label>
                <div className="drawer-inline-fields">
                  <label>
                    流量权重
                    <input
                      name="weight"
                      type="number"
                      min="0"
                      max="100"
                      defaultValue={endpoint?.weight ?? 70}
                    />
                  </label>
                  <label>
                    优先级
                    <input name="priority" type="number" min="1" defaultValue="1" />
                  </label>
                </div>
                <label>
                  RPM 上限（次/分钟） <b>*</b>
                  <input
                    name="rpmLimit"
                    type="number"
                    defaultValue="120000"
                    required
                  />
                </label>
                <label>
                  TPM 上限（Token/分钟） <b>*</b>
                  <input
                    name="tpmLimit"
                    type="number"
                    defaultValue="5000000"
                    required
                  />
                </label>
                <label>
                  安全水位 <b>*</b>
                  <div className="range-field">
                    <input
                      name="safetyLine"
                      type="range"
                      min="50"
                      max="100"
                      defaultValue="85"
                    />
                    <output>85%</output>
                  </div>
                </label>
                <label>
                  超限策略 <b>*</b>
                  <select name="overLimit" defaultValue="仅告警">
                    <option>仅告警</option>
                    <option>自动降速</option>
                    <option>暂停流量</option>
                  </select>
                </label>
              </>
            ) : null}
            {isAddModel ? (
              <>
                <label>
                  供应商模型名称 <b>*</b>
                  <input name="modelName" defaultValue="qwen-new" required />
                </label>
                <label>
                  平台映射模型 <b>*</b>
                  <input name="alias" defaultValue="smart-chat" required />
                </label>
                <label>
                  上下文长度
                  <select name="context" defaultValue="128K">
                    <option>32K</option>
                    <option>128K</option>
                    <option>1M</option>
                  </select>
                </label>
                <label>
                  支持能力
                  <select name="capability" defaultValue="文本 / 工具调用">
                    <option>文本 / 工具调用</option>
                    <option>多模态</option>
                    <option>代码</option>
                  </select>
                </label>
                <label>
                  Token 总量
                  <input name="tokenLimit" type="number" defaultValue="50000000" />
                </label>
              </>
            ) : null}
            {isEndpoint ? (
              <section className="impact-preview">
                <h3>影响预览</h3>
                <div>
                  <span>当前 TPM 利用率</span>
                  <strong>95%</strong>
                </div>
                <div>
                  <span>安全水位触发值</span>
                  <strong className="teal">4,250,000 / 分钟</strong>
                </div>
                <p>
                  当前用量已高于建议安全水位。保存后将继续告警，不会自动阻断流量。
                </p>
              </section>
            ) : null}
            <label>
              {isAddModel || isAddEndpoint ? "备注" : "变更原因"} <b>*</b>
              <textarea
                name="reason"
                placeholder="请填写本次操作的原因，便于审计追踪"
                required
              />
            </label>
          </div>
          <footer>
            <button className="upstream-secondary" type="button" onClick={onClose}>
              取消
            </button>
            <button className="upstream-primary" type="submit">
              {isAddModel || isAddEndpoint ? "确认新增" : "保存配置"}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function SupplierSummaryStrip({ supplier }: { supplier: Supplier }) {
  const stats = [
    ["模型总数", supplier.models, "个已接入模型"],
    ["端点总数", supplier.endpoints, "个生产端点"],
    ["健康端点", supplier.healthyEndpoints, `共 ${supplier.endpoints} 个端点`],
    ["Token 余额", compactNumber(supplier.tokenBalance), "供应商上报余额"],
  ];
  return (
    <section className="supplier-summary-strip">
      {stats.map(([label, value, note]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </div>
      ))}
      <div className="summary-util">
        <span>RPM 利用率</span>
        <strong>{numberFormat.format(supplier.rpm)}</strong>
        <small>/ {numberFormat.format(supplier.rpmLimit)}</small>
        <Utilization value={percent(supplier.rpm, supplier.rpmLimit)} />
      </div>
      <div className="summary-util">
        <span>TPM 利用率</span>
        <strong>{numberFormat.format(supplier.tpm)}</strong>
        <small>/ {numberFormat.format(supplier.tpmLimit)}</small>
        <Utilization value={percent(supplier.tpm, supplier.tpmLimit)} />
      </div>
    </section>
  );
}

function SupplierOverview({
  supplier,
  onEdit,
  onNavigate,
}: {
  supplier: Supplier;
  onEdit: () => void;
  onNavigate: (tab: DetailTab) => void;
}) {
  return (
    <div className="supplier-overview">
      <div className="overview-columns">
        <section className="overview-capacity">
          <div className="detail-section-heading">
            <div>
              <span>01</span>
              <h3>容量状态</h3>
            </div>
            <button type="button" onClick={() => onNavigate("监控")}>
              查看监控 <ArrowRightIcon size={13} />
            </button>
          </div>
          <div className="capacity-lines">
            <div>
              <span>
                <strong>RPM</strong>
                <small>
                  {numberFormat.format(supplier.rpm)} /{" "}
                  {numberFormat.format(supplier.rpmLimit)}
                </small>
              </span>
              <Utilization value={percent(supplier.rpm, supplier.rpmLimit)} />
            </div>
            <div>
              <span>
                <strong>TPM</strong>
                <small>
                  {numberFormat.format(supplier.tpm)} /{" "}
                  {numberFormat.format(supplier.tpmLimit)}
                </small>
              </span>
              <Utilization value={percent(supplier.tpm, supplier.tpmLimit)} />
            </div>
            <div>
              <span>
                <strong>Token 总量</strong>
                <small>{compactNumber(supplier.tokenBalance)} 可用</small>
              </span>
              <Utilization value={64} />
            </div>
          </div>
          <div className="capacity-note">
            <WarningCircleIcon size={18} />
            <div>
              <strong>TPM 已超过 85% 安全水位</strong>
              <p>建议扩容或将 20% 流量切换至备用供应商。</p>
            </div>
            <button type="button" onClick={() => onNavigate("监控")}>
              查看容量监控
            </button>
          </div>
        </section>
        <section className="overview-models">
          <div className="detail-section-heading">
            <div>
              <span>02</span>
              <h3>模型容量分布</h3>
            </div>
            <button type="button" onClick={() => onNavigate("模型与端点")}>
              查看全部 <ArrowRightIcon size={13} />
            </button>
          </div>
          {supplier.modelResources.slice(0, 5).map((model) => (
            <button
              type="button"
              key={model.id}
              onClick={() => onNavigate("模型与端点")}
            >
              <span>
                <strong>{model.name}</strong>
                <small>{model.alias}</small>
              </span>
              <span>{compactNumber(model.tokenBalance)}</span>
              <Utilization compact value={model.tpm} />
              <StateMark state={model.health} />
            </button>
          ))}
        </section>
        <section className="overview-info">
          <div className="detail-section-heading">
            <div>
              <span>03</span>
              <h3>供应商信息</h3>
            </div>
            <button type="button" onClick={onEdit}>
              编辑 <PencilSimpleIcon size={13} />
            </button>
          </div>
          <dl>
            <div>
              <dt>供应商 ID</dt>
              <dd>prov_{supplier.id}</dd>
            </div>
            <div>
              <dt>服务等级</dt>
              <dd>{supplier.tier}</dd>
            </div>
            <div>
              <dt>接入账号</dt>
              <dd>{supplier.account}</dd>
            </div>
            <div>
              <dt>凭证标识</dt>
              <dd>{supplier.credential}</dd>
            </div>
            <div>
              <dt>技术联系人</dt>
              <dd>{supplier.contact}</dd>
            </div>
            <div>
              <dt>合同到期</dt>
              <dd>{supplier.contractEnd}</dd>
            </div>
            <div>
              <dt>限额方式</dt>
              <dd>模型 / 端点独立配置</dd>
            </div>
            <div>
              <dt>最近同步</dt>
              <dd>今天 14:32:18</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

function ModelEndpointTable({
  supplier,
  onEditEndpoint,
  onAdd,
}: {
  supplier: Supplier;
  onEditEndpoint: (endpoint: Endpoint) => void;
  onAdd: (kind: "add-model" | "add-endpoint") => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(
    () => new Set([supplier.modelResources[0]?.id]),
  );
  const models = supplier.modelResources.filter((model) => {
    const matchesQuery =
      model.name.toLowerCase().includes(query.toLowerCase()) ||
      model.endpoints.some((endpoint) =>
        endpoint.name.toLowerCase().includes(query.toLowerCase()),
      );
    const matchesFilter =
      filter === "all" ||
      model.health === filter ||
      model.endpoints.some((endpoint) => endpoint.health === filter);
    return matchesQuery && matchesFilter;
  });
  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  return (
    <section className="model-endpoint-section">
      <div className="detail-toolbar">
        <label className="upstream-search">
          <MagnifyingGlassIcon size={16} />
          <input
            value={query}
            placeholder="搜索模型 / 端点名称"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="upstream-select">
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">全部状态</option>
            <option value="healthy">健康</option>
            <option value="warning">临近上限</option>
            <option value="degraded">降级</option>
          </select>
        </label>
        <label className="upstream-select">
          <select defaultValue="all">
            <option value="all">全部地域</option>
            <option>华东1（杭州）</option>
            <option>华北2（北京）</option>
          </select>
        </label>
        <span />
        <button
          className="upstream-secondary"
          type="button"
          onClick={() => onAdd("add-model")}
        >
          <PlusIcon size={14} /> 新增模型
        </button>
        <button
          className="upstream-primary"
          type="button"
          onClick={() => onAdd("add-endpoint")}
        >
          <PlusIcon size={14} /> 新增端点
        </button>
      </div>
      <div className="model-endpoint-table">
        <div className="model-endpoint-row model-endpoint-head">
          <span>模型 / 端点</span>
          <span>端点角色</span>
          <span>地域</span>
          <span>Token 余额</span>
          <span>RPM 利用率</span>
          <span>TPM 利用率</span>
          <span>成功率</span>
          <span>P95 延迟</span>
          <span>健康状态</span>
          <span>流量权重</span>
          <span>操作</span>
        </div>
        {models.map((model) => {
          const isExpanded = expanded.has(model.id);
          return (
            <div className="model-endpoint-record" key={model.id}>
              <button
                className="model-endpoint-row model-parent-row"
                type="button"
                onClick={() => toggle(model.id)}
              >
                <span className="model-title">
                  {isExpanded ? (
                    <CaretDownIcon size={14} />
                  ) : (
                    <CaretRightIcon size={14} />
                  )}
                  <span>
                    <strong>{model.name}</strong>
                    <small>{model.alias}</small>
                  </span>
                </span>
                <span>{model.endpoints.length}</span>
                <span>{model.endpoints[0]?.region ?? "—"}</span>
                <span>{compactNumber(model.tokenBalance)}</span>
                <Utilization compact value={model.rpm} />
                <Utilization compact value={model.tpm} />
                <span>
                  {model.endpoints[0]?.successRate.toFixed(1) ?? "—"}%
                </span>
                <span>{model.endpoints[0]?.latency ?? "—"} ms</span>
                <StateMark state={model.health} />
                <span>100%</span>
                <DotsThreeIcon size={18} />
              </button>
              {isExpanded ? (
                <div className="endpoint-children">
                  {model.endpoints.map((endpoint) => (
                    <div className="model-endpoint-row endpoint-row" key={endpoint.id}>
                      <span className="endpoint-name">
                        <i />
                        <strong>{endpoint.name}</strong>
                      </span>
                      <span className={`endpoint-role ${endpoint.role}`}>
                        {endpoint.role}
                      </span>
                      <span>{endpoint.region}</span>
                      <span>{compactNumber(endpoint.tokenBalance)}</span>
                      <Utilization compact value={endpoint.rpm} />
                      <Utilization compact value={endpoint.tpm} />
                      <span
                        className={endpoint.successRate < 95 ? "warning-text" : ""}
                      >
                        {endpoint.successRate.toFixed(1)}%
                      </span>
                      <span>{numberFormat.format(endpoint.latency)} ms</span>
                      <StateMark state={endpoint.health} />
                      <span>{endpoint.weight}%</span>
                      <button
                        type="button"
                        title="调整端点配置"
                        aria-label={`调整${endpoint.name}配置`}
                        onClick={() => onEditEndpoint(endpoint)}
                      >
                        <PencilSimpleIcon size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        {models.length === 0 ? (
          <div className="upstream-empty">没有匹配的模型或端点。</div>
        ) : null}
      </div>
    </section>
  );
}

function SupplierMonitoring({ supplier }: { supplier: Supplier }) {
  const [range, setRange] = useState("24H");
  const data = useMemo(() => {
    const multiplier = range === "24H" ? 1 : range === "7D" ? 0.92 : 0.86;
    return monitorTrend.map((point, index) => ({
      ...point,
      rpm: Math.round(point.rpm * multiplier + index * (1 - multiplier) * 5),
      tpm: Math.round(point.tpm * multiplier + index * (1 - multiplier) * 6),
    }));
  }, [range]);
  return (
    <div className="supplier-monitoring">
      <section className="monitor-chart-panel">
        <div className="detail-section-heading">
          <div>
            <span>01</span>
            <h3>RPM / TPM 利用率趋势</h3>
          </div>
          <div className="monitor-range">
            {["24H", "7D", "30D"].map((item) => (
              <button
                className={range === item ? "active" : ""}
                type="button"
                key={item}
                onClick={() => setRange(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="monitor-legend">
          <span><i className="navy" /> RPM 利用率</span>
          <span><i className="teal" /> TPM 利用率</span>
          <span><i className="safety" /> 安全水位 85%</span>
        </div>
        <div className="monitor-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 14, right: 14, left: -20 }}>
              <CartesianGrid
                vertical={false}
                stroke="#d9dcd7"
                strokeDasharray="2 6"
              />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                stroke="#7a807b"
              />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                fontSize={10}
                stroke="#7a807b"
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value) => `${value}%`}
                contentStyle={{
                  border: "1px solid #d9dcd7",
                  borderRadius: 0,
                  boxShadow: "none",
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="rpm"
                name="RPM"
                stroke="#183b7a"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="tpm"
                name="TPM"
                stroke="#26766d"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <span className="safety-line">85% 安全水位</span>
        </div>
      </section>
      <aside className="monitor-side">
        <div className="detail-section-heading">
          <div>
            <span>02</span>
            <h3>实时状态</h3>
          </div>
          <StateMark state={supplier.health} />
        </div>
        <dl>
          <div>
            <dt>当前 RPM</dt>
            <dd>{numberFormat.format(supplier.rpm)}</dd>
          </div>
          <div>
            <dt>当前 TPM</dt>
            <dd>{numberFormat.format(supplier.tpm)}</dd>
          </div>
          <div>
            <dt>请求成功率</dt>
            <dd>99.3%</dd>
          </div>
          <div>
            <dt>P95 延迟</dt>
            <dd>821 ms</dd>
          </div>
          <div>
            <dt>数据延迟</dt>
            <dd>18 秒</dd>
          </div>
        </dl>
        <div className="monitor-alert-card">
          <WarningCircleIcon size={20} />
          <div>
            <strong>TPM 容量紧张</strong>
            <p>峰值已达到 95%，预计晚高峰还将上涨 7%。</p>
          </div>
        </div>
      </aside>
      <section className="endpoint-health-list">
        <div className="detail-section-heading">
          <div>
            <span>03</span>
            <h3>端点监控</h3>
          </div>
          <small>最近更新 14:32:18</small>
        </div>
        <div className="endpoint-monitor-head">
          <span>端点</span>
          <span>模型</span>
          <span>请求量</span>
          <span>成功率</span>
          <span>P95 延迟</span>
          <span>TPM 利用率</span>
          <span>状态</span>
        </div>
        {supplier.modelResources.flatMap((model) =>
          model.endpoints.map((endpoint) => (
            <div className="endpoint-monitor-row" key={endpoint.id}>
              <strong>{endpoint.name}</strong>
              <span>{model.name}</span>
              <span>{numberFormat.format(12840 - endpoint.latency * 2)}</span>
              <span className={endpoint.successRate < 95 ? "warning-text" : ""}>
                {endpoint.successRate}%
              </span>
              <span>{numberFormat.format(endpoint.latency)} ms</span>
              <Utilization compact value={endpoint.tpm} />
              <StateMark state={endpoint.health} />
            </div>
          )),
        )}
      </section>
    </div>
  );
}

function ChangeLog({ onExport }: { onExport: () => void }) {
  return (
    <section className="change-log-section">
      <div className="detail-section-heading">
        <div>
          <span>01</span>
          <h3>配置变更记录</h3>
        </div>
        <button className="upstream-secondary" type="button" onClick={onExport}>
          <DownloadSimpleIcon size={14} /> 导出记录
        </button>
      </div>
      <div className="change-log-table">
        <div className="change-log-row change-log-head">
          <span>操作时间</span>
          <span>操作人</span>
          <span>操作对象</span>
          <span>操作类型</span>
          <span>修改前</span>
          <span>修改后</span>
          <span>变更原因</span>
          <span>结果</span>
        </div>
        {changeLogs.map((log) => (
          <div className="change-log-row" key={log.id}>
            <span>{log.time}</span>
            <strong>{log.operator}</strong>
            <code>{log.object}</code>
            <span>{log.action}</span>
            <span>{log.before}</span>
            <span>{log.after}</span>
            <span>{log.reason}</span>
            <span className="log-result">
              <CheckCircleIcon size={14} weight="fill" /> {log.result}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CreateSupplierPage({
  onBack,
  onSave,
}: {
  onBack: () => void;
  onSave: (form: FormData) => void;
}) {
  const [connectionRows, setConnectionRows] = useState([1]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(new FormData(event.currentTarget));
  };

  return (
    <main className="supplier-create-page">
      <div className="supplier-detail-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeftIcon size={14} /> 监控概览
        </button>
        <span>/</span>
        <span>新增供应商</span>
      </div>

      <header className="supplier-create-header">
        <div>
          <h2>新增供应商</h2>
          <p>录入供应商主体、联系人和上游接入信息，保存后可继续配置模型与端点。</p>
        </div>
        <span>草稿状态</span>
      </header>

      <form className="supplier-create-form" onSubmit={submit}>
        <section className="supplier-create-section">
          <header>
            <span>01</span>
            <div>
              <h3>公司信息</h3>
              <p>用于标识供应商主体和平台内唯一身份。</p>
            </div>
          </header>
          <div className="supplier-create-grid">
            <label>
              <span>供应商名称 <b>*</b></span>
              <input name="supplierName" placeholder="请输入供应商名称" required />
            </label>
            <label>
              <span>供应商编码 <b>*</b></span>
              <input
                name="supplierCode"
                placeholder="请输入唯一编码，如 openai"
                required
              />
            </label>
            <label>
              <span>公司名称</span>
              <input name="companyName" placeholder="请输入公司全称" />
            </label>
            <label>
              <span>统一社会信用代码</span>
              <input name="socialCreditCode" placeholder="请输入统一社会信用代码" />
            </label>
            <label>
              <span>入驻时间</span>
              <input name="joinedAt" type="date" defaultValue="2026-07-24" />
            </label>
            <label>
              <span>服务等级</span>
              <select name="tier" defaultValue="普通">
                <option>核心</option>
                <option>普通</option>
                <option>备用</option>
              </select>
            </label>
          </div>
        </section>

        <section className="supplier-create-section">
          <header>
            <span>02</span>
            <div>
              <h3>联系方式</h3>
              <p>用于容量协调、故障升级和日常运营沟通。</p>
            </div>
          </header>
          <div className="supplier-create-grid">
            <label>
              <span>联系人</span>
              <input name="contact" placeholder="请输入联系人" />
            </label>
            <label>
              <span>联系电话</span>
              <input name="phone" placeholder="请输入联系电话" />
            </label>
            <label>
              <span>联系邮箱</span>
              <input name="email" type="email" placeholder="请输入联系邮箱" />
            </label>
            <label>
              <span>支持渠道</span>
              <input name="supportChannel" placeholder="如企业微信群、工单系统" />
            </label>
          </div>
        </section>

        <section className="supplier-create-section">
          <header>
            <span>03</span>
            <div>
              <h3>上游接入配置</h3>
              <p>配置供应商级连接信息；模型和端点容量将在保存后独立维护。</p>
            </div>
          </header>
          <div className="supplier-create-grid">
            <label>
              <span>接入账号 <b>*</b></span>
              <input name="account" placeholder="请输入平台接入账号" required />
            </label>
            <label>
              <span>鉴权方式</span>
              <select name="authType" defaultValue="API Key">
                <option>API Key</option>
                <option>Access Key / Secret</option>
                <option>OAuth 2.0</option>
              </select>
            </label>
          </div>
          <div className="supplier-connections">
            {connectionRows.map((row, index) => (
              <div className="supplier-connection-row" key={row}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <label>
                  Base URL
                  <input
                    name={`baseUrl-${row}`}
                    placeholder="https://api.provider.com/v1"
                  />
                </label>
                <label>
                  凭证标识
                  <input
                    name={`credential-${row}`}
                    placeholder="仅填写掩码标识，不录入真实密钥"
                  />
                </label>
                <label>
                  区域
                  <select name={`region-${row}`} defaultValue="中国大陆">
                    <option>中国大陆</option>
                    <option>亚太</option>
                    <option>北美</option>
                    <option>欧洲</option>
                  </select>
                </label>
                <button
                  type="button"
                  aria-label={`删除第 ${index + 1} 条接入配置`}
                  disabled={connectionRows.length === 1}
                  onClick={() =>
                    setConnectionRows((current) =>
                      current.filter((item) => item !== row),
                    )
                  }
                >
                  <XIcon size={15} />
                </button>
              </div>
            ))}
            <button
              className="supplier-add-connection"
              type="button"
              onClick={() =>
                setConnectionRows((current) => [
                  ...current,
                  Math.max(...current) + 1,
                ])
              }
            >
              <PlusIcon size={14} /> 新增 Base URL
            </button>
          </div>
          <label className="supplier-create-notes">
            <span>备注</span>
            <textarea name="notes" placeholder="请输入供应商接入说明或其他备注" />
          </label>
        </section>

        <footer className="supplier-create-footer">
          <span>带 * 的字段为必填项</span>
          <div>
            <button className="upstream-secondary" type="button" onClick={onBack}>
              取消
            </button>
            <button className="upstream-primary" type="submit">
              保存供应商
            </button>
          </div>
        </footer>
      </form>
    </main>
  );
}

function SupplierDetail({
  supplier,
  initialTab,
  onBack,
  onToast,
}: {
  supplier: Supplier;
  initialTab: DetailTab;
  onBack: () => void;
  onToast: (message: string) => void;
}) {
  const [tab, setTab] = useState<DetailTab>(initialTab);
  const [drawer, setDrawer] = useState<{
    kind: DrawerKind;
    endpoint?: Endpoint;
  } | null>(null);
  const save = (message: string, _form: FormData) => {
    setDrawer(null);
    onToast(message);
  };
  return (
    <main className="upstream-detail-page">
      <div className="supplier-detail-breadcrumb">
        <button type="button" onClick={onBack}>
          <ArrowLeftIcon size={14} /> 监控概览
        </button>
        <span>/</span>
        <span>{supplier.name}</span>
      </div>
      <header className="supplier-detail-header">
        <ProviderMark supplier={supplier} />
        <div>
          <div className="supplier-title-line">
            <h2>{supplier.name}</h2>
            <StateMark
              state={supplier.status === "active" ? "healthy" : supplier.health}
              label={supplier.status === "active" ? "合作中" : stateLabels[supplier.health]}
            />
          </div>
          <dl>
            <div>
              <dt>API 凭证</dt>
              <dd>{supplier.credential}</dd>
            </div>
            <div>
              <dt>合同到期</dt>
              <dd>
                {supplier.contractEnd} · {supplier.contractRemaining}
              </dd>
            </div>
            <div>
              <dt>最近同步</dt>
              <dd>今天 14:32:18</dd>
            </div>
          </dl>
        </div>
        <div className="supplier-detail-actions">
          <button
            type="button"
            onClick={() => onToast("连接检测完成：7 个端点中 6 个正常")}
          >
            <TestTubeIcon size={15} /> 检测连接
          </button>
          <button type="button" onClick={() => setDrawer({ kind: "supplier" })}>
            <PencilSimpleIcon size={14} /> 编辑供应商
          </button>
          <button type="button" aria-label="更多操作">
            <DotsThreeIcon size={19} weight="bold" />
          </button>
        </div>
      </header>
      <nav className="supplier-detail-tabs" aria-label="供应商详情">
        {(["概览", "模型与端点", "监控", "变更记录"] as DetailTab[]).map(
          (item) => (
            <button
              className={tab === item ? "active" : ""}
              type="button"
              key={item}
              onClick={() => setTab(item)}
            >
              {item}
              {item === "监控" && supplier.alerts ? <i>{supplier.alerts}</i> : null}
            </button>
          ),
        )}
      </nav>
      {tab !== "变更记录" ? <SupplierSummaryStrip supplier={supplier} /> : null}
      {tab === "概览" ? (
        <SupplierOverview
          supplier={supplier}
          onEdit={() => setDrawer({ kind: "supplier" })}
          onNavigate={setTab}
        />
      ) : null}
      {tab === "模型与端点" ? (
        <ModelEndpointTable
          supplier={supplier}
          onEditEndpoint={(endpoint) => setDrawer({ kind: "endpoint", endpoint })}
          onAdd={(kind) => setDrawer({ kind })}
        />
      ) : null}
      {tab === "监控" ? <SupplierMonitoring supplier={supplier} /> : null}
      {tab === "变更记录" ? (
        <ChangeLog onExport={() => onToast("变更记录已生成演示文件")} />
      ) : null}
      {drawer ? (
        <Drawer
          kind={drawer.kind}
          supplier={supplier}
          endpoint={drawer.endpoint}
          onClose={() => setDrawer(null)}
          onSave={save}
        />
      ) : null}
    </main>
  );
}

export function UpstreamResources({
  module,
}: {
  module: WaterLevelModule;
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [creatingSupplier, setCreatingSupplier] = useState(
    isCreateSupplierRoute,
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [health, setHealth] = useState("all");
  const [detail, setDetail] = useState<{
    supplier: Supplier;
    tab: DetailTab;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const syncRoute = () => setCreatingSupplier(isCreateSupplierRoute());
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    document.title = creatingSupplier
      ? "MiniMaaS · 新增供应商"
      : `MiniMaaS · 监控概览 · ${module}`;
  }, [creatingSupplier, module]);

  useEffect(() => {
    if (module !== "供应商监控") {
      setDetail(null);
      setCreatingSupplier(false);
    }
  }, [module]);

  const filteredSuppliers = useMemo(
    () =>
      suppliers.filter((supplier) => {
        const matchQuery = supplier.name
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchStatus = status === "all" || supplier.status === status;
        const matchHealth = health === "all" || supplier.health === health;
        return matchQuery && matchStatus && matchHealth;
      }),
    [health, query, status, suppliers],
  );
  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      showToast("上游容量数据已刷新");
    }, 600);
  };
  const openSupplier = (supplier: Supplier, tab: DetailTab = "概览") => {
    setDetail({ supplier, tab });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openCreateSupplier = () => {
    setCreatingSupplier(true);
    window.location.hash = "/water-level/suppliers/new";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const closeCreateSupplier = () => {
    setCreatingSupplier(false);
    window.location.hash = "/water-level/suppliers";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const saveSupplier = (form: FormData) => {
    const name = String(form.get("supplierName") || "新供应商");
    setSuppliers((current) => [
      ...current,
      {
        ...initialSuppliers[5],
        id: String(form.get("supplierCode") || `draft-${Date.now()}`),
        name,
        shortName: name.slice(0, 2),
        mark: name.slice(0, 1).toUpperCase(),
        tier: String(form.get("tier") || "普通") as Supplier["tier"],
        account: String(form.get("account") || "待配置"),
        credential: String(form.get("credential-1") || "尚未配置"),
        contact: String(form.get("contact") || "待补充"),
        tags: ["草稿"],
      },
    ]);
    closeCreateSupplier();
    showToast("供应商草稿已创建");
  };

  if (creatingSupplier) {
    return (
      <CreateSupplierPage
        onBack={closeCreateSupplier}
        onSave={saveSupplier}
      />
    );
  }

  if (module === "供应商监控") {
    return <SupplierMonitoringOverview />;
  }

  if (module === "用户监控") {
    return <PinManagement />;
  }

  if (module === "模型监控") {
    return <SupplierModelManagement />;
  }

  if (detail) {
    return (
      <>
        <SupplierDetail
          supplier={detail.supplier}
          initialTab={detail.tab}
          onBack={() => setDetail(null)}
          onToast={showToast}
        />
        {toast ? (
          <div className="upstream-toast" role="status">
            <CheckCircleIcon size={17} weight="fill" /> {toast}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <main className="upstream-page">
      <UpstreamMetrics suppliers={suppliers} />
      <Toolbar
        query={query}
        status={status}
        health={health}
        onQueryChange={setQuery}
        onStatusChange={setStatus}
        onHealthChange={setHealth}
        onRefresh={refresh}
        onAdd={openCreateSupplier}
      />
      <div className="upstream-data-stamp">
        <span className={refreshing ? "refreshing" : ""}>
          <i /> 数据更新于 14:32:18
        </span>
      </div>
      <SupplierTable suppliers={filteredSuppliers} onOpen={openSupplier} />
      <footer className="upstream-page-footer">
        <span>共 {filteredSuppliers.length} 项</span>
        <span>容量口径：供应商上报 · 模型与端点直接限额</span>
      </footer>
      {toast ? (
        <div className="upstream-toast" role="status">
          <CheckCircleIcon size={17} weight="fill" /> {toast}
        </div>
      ) : null}
    </main>
  );
}
