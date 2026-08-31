import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarBlank,
  CaretDown,
  DownloadSimple,
  Hash,
  MagnifyingGlass,
  Buildings,
  UsersThree,
  Wallet,
  X,
  QuestionIcon,
} from "@phosphor-icons/react";
import {
  CartesianGrid,
  Area,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardOverview } from "@minimaas/contracts";

type BillingTab = "suppliers" | "users" | "abnormal";
type Granularity = "day" | "hour";

type AbnormalReason =
  | "客户端流式中断"
  | "客户端非流式中断"
  | "MaaS 超时"
  | "可计费非 2xx"
  | "重试/故障转移";

type AbnormalStatus = "已确认" | "待确认";

type AbnormalConfirmation = {
  tokenNumber: number;
  amountNumber: number;
  usageSource: string;
};

type BillingRow = {
  date: string;
  supplier: string;
  model: string;
  output: string;
  outputCost: string;
  cacheCreation1h: string;
  cacheCreation1hCost: string;
  cacheCreation5m: string;
  cacheCreation5mCost: string;
  cache: string;
  cacheCost: string;
  input: string;
  inputCost: string;
  token: string;
  amount: string;
};

type AbnormalBillingRow = {
  id: string;
  date: string;
  requestId: string;
  supplier: string;
  model: string;
  reason: AbnormalReason;
  httpStatus: string;
  mode: "流式" | "非流式";
  token: string;
  tokenNumber: number;
  amount: string;
  amountNumber: number;
  usageStatus: AbnormalStatus;
  usageSource: string;
  outcome: string;
  providerOutcome: string;
}

const billingRows: BillingRow[] = [
  {
    date: "2026-08-04",
    supplier: "cloudwise",
    model: "Gemini-2.5-pro",
    output: "0.615 K",
    outputCost: "￥ 0.042700",
    cacheCreation1h: "—",
    cacheCreation1hCost: "",
    cacheCreation5m: "—",
    cacheCreation5mCost: "",
    cache: "—",
    cacheCost: "",
    input: "0.002 K",
    inputCost: "￥ 0.000000",
    token: "0.617",
    amount: "￥ 0.042700",
  },
  {
    date: "2026-08-04",
    supplier: "cloudwise",
    model: "claude-haiku-4.5",
    output: "1.414 K",
    outputCost: "￥ 0.049490",
    cacheCreation1h: "—",
    cacheCreation1hCost: "",
    cacheCreation5m: "—",
    cacheCreation5mCost: "",
    cache: "28.223 K",
    cacheCost: "￥ 0.019756",
    input: "13.225 K",
    inputCost: "￥ 0.092575",
    token: "42.862",
    amount: "￥ 0.161821",
  },
  {
    date: "2026-08-04",
    supplier: "cloudwise",
    model: "claude-opus-4-6",
    output: "42.706 K",
    outputCost: "￥ 7.473550",
    cacheCreation1h: "—",
    cacheCreation1hCost: "",
    cacheCreation5m: "1,923.578 K",
    cacheCreation5mCost: "￥ 84.156545",
    cache: "3,412.445 K",
    cacheCost: "￥ 11.943569",
    input: "2,046.915 K",
    inputCost: "￥ 71.642025",
    token: "7,425.644",
    amount: "￥ 175.215689",
  },
  {
    date: "2026-08-04",
    supplier: "cloudwise",
    model: "claude-opus-4-7",
    output: "2.453 K",
    outputCost: "￥ 0.429275",
    cacheCreation1h: "—",
    cacheCreation1hCost: "",
    cacheCreation5m: "—",
    cacheCreation5mCost: "",
    cache: "—",
    cacheCost: "",
    input: "5.589 K",
    inputCost: "￥ 0.196615",
    token: "8.042",
    amount: "￥ 0.624890",
  },
  {
    date: "2026-08-04",
    supplier: "cloudwise",
    model: "claude-sonnet-4-6",
    output: "74.631 K",
    outputCost: "￥ 7.836255",
    cacheCreation1h: "65.870 K",
    cacheCreation1hCost: "￥ 2.766540",
    cacheCreation5m: "1,283.299 K",
    cacheCreation5mCost: "￥ 33.686602",
    cache: "711.896 K",
    cacheCost: "￥ 0.249164",
    input: "270.095 K",
    inputCost: "￥ 2.037835",
    token: "2,405.791",
    amount: "￥ 46.576396",
  },
  {
    date: "2026-08-04",
    supplier: "cloudwise",
    model: "gemini-2.5-flash-lite",
    output: "0.096 K",
    outputCost: "￥ 0.000268",
    cacheCreation1h: "—",
    cacheCreation1hCost: "",
    cacheCreation5m: "—",
    cacheCreation5mCost: "",
    cache: "—",
    cacheCost: "",
    input: "0.937 K",
    inputCost: "￥ 0.000656",
    token: "1.033",
    amount: "￥ 0.000924",
  },
  {
    date: "2026-08-04",
    supplier: "cloudwise",
    model: "gemini-3-flash-preview",
    output: "262.094 K",
    outputCost: "￥ 5.503974",
    cacheCreation1h: "—",
    cacheCreation1hCost: "",
    cacheCreation5m: "—",
    cacheCreation5mCost: "",
    cache: "—",
    cacheCost: "",
    input: "1,096.251 K",
    inputCost: "￥ 3.836939",
    token: "1,358.345",
    amount: "￥ 9.340913",
  },
  {
    date: "2026-08-04",
    supplier: "cloudwise",
    model: "gemini-3.1-flash-lite-preview",
    output: "0.01 K",
    outputCost: "￥ 0.000110",
    cacheCreation1h: "—",
    cacheCreation1hCost: "",
    cacheCreation5m: "—",
    cacheCreation5mCost: "",
    cache: "—",
    cacheCost: "",
    input: "0.09 K",
    inputCost: "￥ 0.000160",
    token: "0.1",
    amount: "￥ 0.000270",
  },
  {
    date: "2026-08-04",
    supplier: "cloudwise",
    model: "gemini-3.1-pro-preview",
    output: "17.849 K",
    outputCost: "￥ 1.501920",
    cacheCreation1h: "—",
    cacheCreation1hCost: "",
    cacheCreation5m: "—",
    cacheCreation5mCost: "",
    cache: "—",
    cacheCost: "",
    input: "147.174 K",
    inputCost: "￥ 2.063460",
    token: "165.023",
    amount: "￥ 3.565380",
  },
  {
    date: "2026-08-04",
    supplier: "cloudwise",
    model: "gpt-5.4",
    output: "236.613 K",
    outputCost: "￥ 24.940650",
    cacheCreation1h: "—",
    cacheCreation1hCost: "",
    cacheCreation5m: "—",
    cacheCreation5mCost: "",
    cache: "16,167.936 K",
    cacheCost: "￥ 28.292029",
    input: "14,250.037 K",
    inputCost: "￥ 249.353725",
    token: "30,654.579",
    amount: "￥ 302.590004",
  },
  {
    date: "2026-08-04",
    supplier: "上海知书-aws云厂商",
    model: "claude-opus-4-8",
    output: "0.014 K",
    outputCost: "￥ 0.002450",
    cacheCreation1h: "—",
    cacheCreation1hCost: "",
    cacheCreation5m: "—",
    cacheCreation5mCost: "",
    cache: "—",
    cacheCost: "",
    input: "0.008 K",
    inputCost: "￥ 0.000280",
    token: "0.022",
    amount: "￥ 0.002730",
  },
];

const abnormalRows: AbnormalBillingRow[] = [
  {
    id: "exc_001",
    date: "2026-08-04 10:24:13",
    requestId: "req_8f2a…c91d",
    supplier: "cloudwise",
    model: "gpt-5.4",
    reason: "客户端流式中断",
    httpStatus: "200",
    mode: "流式",
    token: "95,000",
    tokenNumber: 95000,
    amount: "￥1.26",
    amountNumber: 1.26,
    usageStatus: "已确认",
    usageSource: "供应商用量接口",
    outcome: "客户端在首 Token 后断开",
    providerOutcome: "供应商继续推理并完成计量",
  },
  {
    id: "exc_002",
    date: "2026-08-04 09:58:42",
    requestId: "req_7b4e…11a2",
    supplier: "volcengine",
    model: "doubao-seed-2-0",
    reason: "MaaS 超时",
    httpStatus: "504",
    mode: "流式",
    token: "128,400",
    tokenNumber: 128400,
    amount: "￥2.31",
    amountNumber: 2.31,
    usageStatus: "已确认",
    usageSource: "供应商账单明细",
    outcome: "MaaS 5 分钟超时并结束请求",
    providerOutcome: "供应商 10 分钟后结束推理",
  },
  {
    id: "exc_003",
    date: "2026-08-04 09:42:05",
    requestId: "req_09d7…6bfe",
    supplier: "cloudwise",
    model: "claude-opus-4-6",
    reason: "可计费非 2xx",
    httpStatus: "503",
    mode: "非流式",
    token: "28,000",
    tokenNumber: 28000,
    amount: "￥0.42",
    amountNumber: 0.42,
    usageStatus: "已确认",
    usageSource: "供应商响应",
    outcome: "网关返回 503",
    providerOutcome: "供应商返回 usage 并产生费用",
  },
  {
    id: "exc_004",
    date: "2026-08-04 09:17:36",
    requestId: "req_4a31…f028",
    supplier: "aliyun",
    model: "DeepSeek-V4-Flash",
    reason: "客户端非流式中断",
    httpStatus: "200",
    mode: "非流式",
    token: "42,600",
    tokenNumber: 42600,
    amount: "￥0.74",
    amountNumber: 0.74,
    usageStatus: "已确认",
    usageSource: "供应商用量接口",
    outcome: "客户端在响应返回前取消",
    providerOutcome: "供应商已完成推理并回传 usage",
  },
  {
    id: "exc_005",
    date: "2026-08-04 08:56:19",
    requestId: "req_3c90…a8d0",
    supplier: "cloudwise",
    model: "gpt-5.4",
    reason: "重试/故障转移",
    httpStatus: "502",
    mode: "流式",
    token: "54,200",
    tokenNumber: 54200,
    amount: "￥0.93",
    amountNumber: 0.93,
    usageStatus: "已确认",
    usageSource: "供应商响应",
    outcome: "第一次请求失败后触发重试",
    providerOutcome: "原请求已产生部分推理用量",
  },
  {
    id: "exc_006",
    date: "2026-08-04 08:41:02",
    requestId: "req_6e11…d1c4",
    supplier: "volcengine",
    model: "doubao-seed-2-0",
    reason: "MaaS 超时",
    httpStatus: "504",
    mode: "流式",
    token: "—",
    tokenNumber: 0,
    amount: "—",
    amountNumber: 0,
    usageStatus: "待确认",
    usageSource: "—",
    outcome: "MaaS 超时，未收到 usage",
    providerOutcome: "等待供应商异步账单回补",
  },
  {
    id: "exc_007",
    date: "2026-08-04 08:16:48",
    requestId: "req_2f18…b774",
    supplier: "aliyun",
    model: "Kimi-K2.5",
    reason: "客户端流式中断",
    httpStatus: "200",
    mode: "流式",
    token: "33,800",
    tokenNumber: 33800,
    amount: "￥0.56",
    amountNumber: 0.56,
    usageStatus: "已确认",
    usageSource: "供应商用量接口",
    outcome: "客户端主动关闭连接",
    providerOutcome: "供应商在断连后继续完成计量",
  },
  {
    id: "exc_008",
    date: "2026-08-04 07:52:20",
    requestId: "req_1d60…e215",
    supplier: "tencent",
    model: "GLM-5.2",
    reason: "可计费非 2xx",
    httpStatus: "503",
    mode: "非流式",
    token: "—",
    tokenNumber: 0,
    amount: "—",
    amountNumber: 0,
    usageStatus: "待确认",
    usageSource: "—",
    outcome: "供应商返回 503",
    providerOutcome: "当前未返回 usage",
  },
];

const trend = [
  { date: "08-01", cost: 380000, token: 24000000 },
  { date: "08-02", cost: 118000, token: 11000000 },
  { date: "08-03", cost: 270000, token: 23000000 },
  { date: "08-04", cost: 182000, token: 8500000 },
];

const abnormalTrend = [
  { date: "08-01", confirmed: 3460, cases: 58 },
  { date: "08-02", confirmed: 2710, cases: 43 },
  { date: "08-03", confirmed: 4180, cases: 67 },
  { date: "08-04", confirmed: 6220, cases: 82 },
];

function SelectField({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`billing-select ${className}`}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <CaretDown size={14} weight="bold" aria-hidden="true" />
    </label>
  );
}

function TokenDetail({ row }: { row: BillingRow }) {
  const cacheDetails = [
    {
      label: "明细创建 1h 缓存",
      tooltip: "明细创建 1h 缓存详情",
      value: row.cacheCreation1h,
      cost: row.cacheCreation1hCost,
    },
    {
      label: "明细创建 5m 缓存",
      tooltip: "明细创建 5m 缓存详情",
      value: row.cacheCreation5m,
      cost: row.cacheCreation5mCost,
    },
  ];

  return (
    <div className="token-detail">
      <div>
        <span>输出token</span>
        <strong>{row.output}</strong>
        <em>{row.outputCost}</em>
      </div>
      {cacheDetails.map((detail) =>
        detail.value !== "—" ? (
          <div key={detail.label}>
            <span
              className="token-detail-label"
              data-tooltip={detail.tooltip}
              tabIndex={0}
              aria-label={detail.tooltip}
            >
              {detail.label}
            </span>
            <strong>{detail.value}</strong>
            <em>{detail.cost}</em>
          </div>
        ) : null,
      )}
      {row.cache !== "—" ? (
        <div>
          <span>缓存命中</span>
          <strong>{row.cache}</strong>
          <em>{row.cacheCost}</em>
        </div>
      ) : null}
      <div>
        <span>输入token</span>
        <strong>{row.input}</strong>
        <em>{row.inputCost}</em>
      </div>
    </div>
  );
}

function downloadBillingCsv(rows: BillingRow[]) {
  const header = ["结算时间", "供应商", "模型名称", "总Token（千）", "总金额（元）"];
  const csv = [
    header,
    ...rows.map((row) => [row.date, row.supplier, row.model, row.token, row.amount]),
  ]
    .map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "监控概览-账单明细.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadAbnormalCsv(rows: AbnormalBillingRow[]) {
  const header = [
    "发生时间",
    "请求ID",
    "供应商",
    "模型",
    "异常类型",
    "HTTP状态",
    "请求模式",
    "Token",
    "金额（元）",
    "Usage状态",
    "Usage来源",
  ];
  const csv = [
    header,
    ...rows.map((row) => [
      row.date,
      row.requestId,
      row.supplier,
      row.model,
      row.reason,
      row.httpStatus,
      row.mode,
      row.token,
      row.amount,
      row.usageStatus,
      row.usageSource,
    ]),
  ]
    .map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "监控概览-异常耗费明细.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function AbnormalStatusBadge({ status }: { status: AbnormalStatus }) {
  return <span className={`abnormal-status abnormal-status-${status === "已确认" ? "confirmed" : "pending"}`}>{status}</span>;
}

function AbnormalSummary({ rows }: { rows: AbnormalBillingRow[] }) {
  const confirmedRows = rows.filter((row) => row.usageStatus === "已确认");
  const pendingCount = rows.filter((row) => row.usageStatus === "待确认").length;
  const confirmedAmount = confirmedRows.reduce((total, row) => total + row.amountNumber, 0);
  const confirmedToken = confirmedRows.reduce((total, row) => total + row.tokenNumber, 0);

  return (
    <section className="abnormal-summary-block" aria-label="异常耗费摘要">
      <div className="abnormal-summary-grid">
        <div className="abnormal-metric abnormal-metric-red">
          <span>已确认异常耗费</span>
          <strong>￥{confirmedAmount.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          <small>只计入有供应商 usage 或账单证据的请求</small>
        </div>
        <div className="abnormal-metric abnormal-metric-blue">
          <span>已确认异常 Token</span>
          <strong>{confirmedToken.toLocaleString("zh-CN")}</strong>
          <small>客户端中断、超时和失败请求产生的用量</small>
        </div>
        <div className="abnormal-metric abnormal-metric-amber">
          <span>待确认请求</span>
          <strong>{pendingCount}</strong>
          <small>缺少 usage，暂不计入金额</small>
        </div>
        <div className="abnormal-metric abnormal-metric-slate">
          <span>异常耗费率</span>
          <strong>1.63%</strong>
          <small>已确认异常耗费 / 总消耗金额</small>
        </div>
      </div>
    </section>
  );
}

function AbnormalTrendSection({
  visibleSeries,
  toggleSeries,
}: {
  visibleSeries: { cost: boolean; token: boolean };
  toggleSeries: (series: "cost" | "token") => void;
}) {
  return (
    <section className="billing-section billing-chart-section abnormal-trend-section">
      <div className="billing-section-title-row">
        <div>
          <h2>异常耗费趋势</h2>
          <p>按天聚合已确认异常金额与异常请求数</p>
        </div>
        <div className="billing-chart-legend" aria-label="异常趋势指标">
          <button className={visibleSeries.cost ? "active" : ""} onClick={() => toggleSeries("cost")}>
            <span className="legend-dot legend-red" />已确认金额（元）
          </button>
          <button className={visibleSeries.token ? "active" : ""} onClick={() => toggleSeries("token")}>
            <span className="legend-dot legend-amber" />异常请求数
          </button>
        </div>
      </div>
      <div className="billing-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={abnormalTrend} margin={{ top: 12, right: 30, left: 8, bottom: 4 }}>
            <CartesianGrid stroke="#e8edf4" vertical horizontal />
            <XAxis dataKey="date" tick={{ fill: "#7d8795", fontSize: 11 }} axisLine={{ stroke: "#d8dee8" }} tickLine={false} />
            <YAxis yAxisId="cost" tick={{ fill: "#7d8795", fontSize: 11 }} tickFormatter={(value) => `￥${value}`} axisLine={false} tickLine={false} />
            <YAxis yAxisId="token" orientation="right" tick={{ fill: "#7d8795", fontSize: 11 }} tickFormatter={(value) => `${value}`} axisLine={false} tickLine={false} />
            <Tooltip formatter={(value, name) => [name === "confirmed" ? `￥${Number(value).toLocaleString()}` : `${Number(value)} 条`, name === "confirmed" ? "已确认金额" : "异常请求数"]} />
            <Legend content={() => null} />
            {visibleSeries.cost ? <Area yAxisId="cost" type="monotone" dataKey="confirmed" stroke="none" fill="#ef5b5b" fillOpacity={0.08} isAnimationActive={false} /> : null}
            {visibleSeries.cost ? <Line yAxisId="cost" type="monotone" dataKey="confirmed" stroke="#e45b5b" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /> : null}
            {visibleSeries.token ? <Line yAxisId="token" type="monotone" dataKey="cases" stroke="#e6a12c" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /> : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function AbnormalDetailPanel({
  row,
  onClose,
  onConfirm,
}: {
  row: AbnormalBillingRow;
  onClose: () => void;
  onConfirm: (confirmation: AbnormalConfirmation) => void;
}) {
  const [usageSource, setUsageSource] = useState("供应商用量接口");
  const [tokenInput, setTokenInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const canConfirm = Number(tokenInput) > 0 && Number(amountInput) >= 0;

  return (
    <aside className="abnormal-detail-panel abnormal-detail-modal" aria-label="异常耗费证据详情">
      <div className="abnormal-detail-header">
        <div>
          <p>异常耗费证据</p>
          <h3>{row.requestId}</h3>
        </div>
        <button className="abnormal-detail-close" onClick={onClose} aria-label="关闭详情"><X size={16} /></button>
      </div>
      <div className="abnormal-detail-grid">
        <div><span>异常类型</span><strong>{row.reason}</strong></div>
        <div><span>请求模式</span><strong>{row.mode}</strong></div>
        <div><span>HTTP 状态</span><strong>{row.httpStatus}</strong></div>
        <div><span>Usage 状态</span><strong><AbnormalStatusBadge status={row.usageStatus} /></strong></div>
        <div><span>Usage 来源</span><strong>{row.usageSource}</strong></div>
        <div><span>供应商用量</span><strong>{row.token} Token / {row.amount}</strong></div>
      </div>
      <div className="abnormal-timeline">
        <div className="abnormal-timeline-step"><i className="done" /><div><strong>业务侧结果</strong><span>{row.outcome}</span></div></div>
        <div className="abnormal-timeline-step"><i className="done" /><div><strong>供应商侧结果</strong><span>{row.providerOutcome}</span></div></div>
        <div className="abnormal-timeline-step"><i className={row.usageStatus === "已确认" ? "done" : "pending"} /><div><strong>计量归档</strong><span>{row.usageStatus === "已确认" ? `已从${row.usageSource}归档` : "等待供应商异步账单回补，暂不计入金额"}</span></div></div>
      </div>
      {row.usageStatus === "待确认" ? (
        <div className="abnormal-confirm-box">
          <div className="abnormal-confirm-heading">
            <div>
              <h4>确认供应商 usage</h4>
              <p>只有补录完成后，这条记录才会进入已确认异常耗费。</p>
            </div>
            <span>人工核对</span>
          </div>
          <div className="abnormal-confirm-fields">
            <label>
              <span>Usage 来源</span>
              <select value={usageSource} onChange={(event) => setUsageSource(event.target.value)}>
                <option>供应商用量接口</option>
                <option>供应商账单明细</option>
                <option>供应商响应</option>
              </select>
            </label>
            <label>
              <span>供应商 Token</span>
              <input inputMode="decimal" type="number" min="1" step="1" placeholder="输入实际 Token 数" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} />
            </label>
            <label>
              <span>供应商金额（元）</span>
              <input inputMode="decimal" type="number" min="0" step="0.000001" placeholder="输入实际金额" value={amountInput} onChange={(event) => setAmountInput(event.target.value)} />
            </label>
            <button disabled={!canConfirm} onClick={() => onConfirm({ tokenNumber: Number(tokenInput), amountNumber: Number(amountInput), usageSource })}>确认并计入</button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function AbnormalTableSection({
  rows,
  selectedId,
  onSelect,
  onExport,
  onConfirm,
}: {
  rows: AbnormalBillingRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onExport: () => void;
  onConfirm: (id: string, confirmation: AbnormalConfirmation) => void;
}) {
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;
  return (
    <section className="billing-section billing-table-section abnormal-table-section">
      <div className="billing-section-title-row billing-table-heading">
        <div>
          <h2>异常耗费明细</h2>
          <p>记录业务失败但供应商仍可能产生用量的请求，支持下探原始证据</p>
        </div>
        <button className="billing-export-button" onClick={onExport}>
          <DownloadSimple size={16} aria-hidden="true" /> 导出异常明细
        </button>
      </div>
      <div className="billing-table-scroll">
        <table className="billing-table abnormal-table">
          <thead>
            <tr>
              <th>发生时间</th>
              <th>请求 / 供应商</th>
              <th>模型</th>
              <th>
                <span className="abnormal-type-header">
                  异常类型
                  <button className="abnormal-type-help" type="button" aria-label="查看异常类型说明" title="查看全部异常类型">
                    <QuestionIcon size={12} weight="bold" aria-hidden="true" />
                    <span className="abnormal-type-tooltip" role="tooltip">
                      <strong>异常类型说明</strong>
                      <span><b>客户端流式中断</b>：客户端断连，但供应商仍继续计量</span>
                      <span><b>客户端非流式中断</b>：客户端取消，但供应商已产生 usage</span>
                      <span><b>MaaS 超时</b>：MaaS 超时退出，供应商仍在推理</span>
                      <span><b>可计费非 2xx</b>：非 2xx 响应但供应商产生 usage</span>
                      <span><b>重试/故障转移</b>：原请求失败或切换后产生额外用量</span>
                    </span>
                  </button>
                </span>
              </th>
              <th>HTTP / 模式</th>
              <th>Token / 金额</th>
              <th>Usage 状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={selectedId === row.id ? "selected" : ""}>
                <td className="billing-date-cell">{row.date}</td>
                <td><strong className="abnormal-request-id">{row.requestId}</strong><span className="abnormal-subline">{row.supplier}</span></td>
                <td><span className="billing-model-tag">{row.model}</span></td>
                <td><span className="abnormal-reason">{row.reason}</span></td>
                <td><strong>{row.httpStatus}</strong><span className="abnormal-subline">{row.mode}</span></td>
                <td><strong className="abnormal-token">{row.token}</strong><span className="abnormal-subline">{row.amount}</span></td>
                <td><AbnormalStatusBadge status={row.usageStatus} /><span className="abnormal-subline">{row.usageSource}</span></td>
                <td><button className={`abnormal-detail-button ${row.usageStatus === "待确认" ? "pending" : ""}`} onClick={() => onSelect(row.id)}>{selectedId === row.id ? "已展开" : row.usageStatus === "待确认" ? "去确认" : "查看证据"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="billing-empty-state">暂无符合条件的异常耗费记录</div> : null}
      </div>
      {selectedRow ? (
        <div className="abnormal-modal-layer">
          <button className="abnormal-modal-backdrop" onClick={() => onSelect("")} aria-label="关闭异常证据详情" />
          <AbnormalDetailPanel row={selectedRow} onClose={() => onSelect("")} onConfirm={(confirmation) => onConfirm(selectedRow.id, confirmation)} />
        </div>
      ) : null}
      <div className="billing-table-footer">
        <span>共 {rows.length} 条</span>
        <div className="billing-pagination" aria-label="分页">
          <button disabled aria-label="上一页">‹</button>
          <button className="active">1</button>
          <button aria-label="下一页">›</button>
          <span className="billing-page-size">20 / 页 <CaretDown size={12} /></span>
        </div>
      </div>
    </section>
  );
}

export function OverviewPage({
  data,
  status,
}: {
  data: DashboardOverview;
  status: "loading" | "live" | "offline";
}) {
  const [activeTab, setActiveTab] = useState<BillingTab>("suppliers");
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [range, setRange] = useState("本月");
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-04");
  const [model, setModel] = useState("全部模型");
  const [supplier, setSupplier] = useState("全部供应商");
  const [abnormalReason, setAbnormalReason] = useState("全部异常类型");
  const [abnormalRecords, setAbnormalRecords] = useState<AbnormalBillingRow[]>(abnormalRows);
  const [visibleSeries, setVisibleSeries] = useState({ cost: true, token: true });
  const [queryVersion, setQueryVersion] = useState(0);
  const [selectedAbnormalId, setSelectedAbnormalId] = useState<string | null>(null);

  // Keep the dashboard self-contained while still allowing the app shell to feed live/offline state.
  void data;
  void status;

  const filteredRows = useMemo(() => {
    return billingRows.filter((row) => {
      const modelMatch = model === "全部模型" || row.model === model;
      const supplierMatch = supplier === "全部供应商" || row.supplier === supplier;
      return modelMatch && supplierMatch;
    });
  }, [model, supplier, queryVersion]);

  const filteredAbnormalRows = useMemo(() => {
    return abnormalRecords.filter((row) => {
      const modelMatch = model === "全部模型" || row.model === model;
      const supplierMatch = supplier === "全部供应商" || row.supplier === supplier;
      const reasonMatch = abnormalReason === "全部异常类型" || row.reason === abnormalReason;
      return modelMatch && supplierMatch && reasonMatch;
    });
  }, [abnormalRecords, model, supplier, abnormalReason, queryVersion]);

  const runQuery = () => setQueryVersion((value) => value + 1);
  const confirmAbnormal = (id: string, confirmation: AbnormalConfirmation) => {
    setAbnormalRecords((records) => records.map((row) => row.id === id ? {
      ...row,
      token: confirmation.tokenNumber.toLocaleString("zh-CN"),
      tokenNumber: confirmation.tokenNumber,
      amount: `￥${confirmation.amountNumber.toFixed(2)}`,
      amountNumber: confirmation.amountNumber,
      usageStatus: "已确认",
      usageSource: confirmation.usageSource,
      providerOutcome: "已完成人工核对并归档供应商 usage",
    } : row));
  };
  const resetFilters = () => {
    setRange("本月");
    setStartDate("2026-08-01");
    setEndDate("2026-08-04");
    setModel("全部模型");
    setSupplier("全部供应商");
    setAbnormalReason("全部异常类型");
    setSelectedAbnormalId(null);
  };

  const toggleSeries = (series: "cost" | "token") => {
    setVisibleSeries((current) => ({ ...current, [series]: !current[series] }));
  };

  return (
    <div className="billing-overview-viewport">
      <main className="billing-overview-page">
        <header className="billing-heading">
          <p className="billing-kicker">计费概览</p>
          <p className="billing-description">查看账号、模型与供应商在当前周期内的消费情况。</p>
        </header>

        <section className="billing-kpi-grid" aria-label="核心计费指标">
          <article className="billing-kpi-card billing-kpi-blue">
            <div>
              <p>本月总消耗金额（￥）</p>
              <strong>723,427.371361</strong>
            </div>
            <Wallet size={52} weight="duotone" aria-hidden="true" />
          </article>
          <article className="billing-kpi-card billing-kpi-orange">
            <div>
              <p>本月总Token数（千）</p>
              <strong>59,647,840.755</strong>
            </div>
            <Hash size={54} weight="duotone" aria-hidden="true" />
          </article>
          <article className="billing-kpi-card billing-kpi-purple">
            <div>
              <p>用户数量</p>
              <strong>1043</strong>
            </div>
            <UsersThree size={54} weight="duotone" aria-hidden="true" />
          </article>
          <article className="billing-kpi-card billing-kpi-pink">
            <div>
              <p>已接入供应商</p>
              <strong>66</strong>
            </div>
            <Buildings size={54} weight="duotone" aria-hidden="true" />
          </article>
        </section>

        <section className="billing-section billing-detail-section">
          <div className="billing-tabs-row">
            <div className="billing-tabs" role="tablist" aria-label="账单维度">
              <button
                className={activeTab === "suppliers" ? "active" : ""}
                onClick={() => setActiveTab("suppliers")}
                role="tab"
                aria-selected={activeTab === "suppliers"}
              >
                供应商详情
              </button>
              <button
                className={activeTab === "users" ? "active" : ""}
                onClick={() => setActiveTab("users")}
                role="tab"
                aria-selected={activeTab === "users"}
              >
                用户详情
              </button>
              <button
                className={activeTab === "abnormal" ? "active abnormal-tab" : "abnormal-tab"}
                onClick={() => setActiveTab("abnormal")}
                role="tab"
                aria-selected={activeTab === "abnormal"}
              >
                异常耗费
              </button>
            </div>
            <div className="billing-granularity" role="group" aria-label="查询粒度">
              <span>查询粒度</span>
              <button className={granularity === "day" ? "active" : ""} onClick={() => setGranularity("day")}>
                按天查询
              </button>
              <button className={granularity === "hour" ? "active" : ""} onClick={() => setGranularity("hour")}>
                按小时查询
              </button>
            </div>
          </div>

          <div className="billing-filter-row">
            <div className="billing-range-tabs" role="group" aria-label="快捷时间范围">
              {["今日", "本周", "本月"].map((item) => (
                <button
                  className={range === item ? "active" : ""}
                  key={item}
                  onClick={() => setRange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="billing-date-field">
              <CalendarBlank size={15} aria-hidden="true" />
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              <ArrowRight size={14} aria-hidden="true" />
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
            <SelectField
              label="模型"
              value={model}
              options={["全部模型", ...Array.from(new Set([...billingRows, ...abnormalRows].map((row) => row.model)))]}
              onChange={setModel}
              className="billing-model-select"
            />
            <SelectField
              label="供应商"
              value={supplier}
              options={["全部供应商", ...Array.from(new Set([...billingRows, ...abnormalRows].map((row) => row.supplier)))]}
              onChange={setSupplier}
              className="billing-supplier-select"
            />
            {activeTab === "abnormal" ? (
              <SelectField
                label="异常类型"
                value={abnormalReason}
                options={["全部异常类型", ...Array.from(new Set(abnormalRows.map((row) => row.reason)))]}
                onChange={setAbnormalReason}
                className="billing-abnormal-reason-select"
              />
            ) : null}
            <button className="billing-reset-button" onClick={resetFilters}>重置</button>
            <button className="billing-query-button" onClick={runQuery}>
              <MagnifyingGlass size={14} weight="bold" aria-hidden="true" /> 查询
            </button>
          </div>
          <span className="sr-only" aria-live="polite">查询已更新 {queryVersion}</span>
        </section>

        {activeTab === "abnormal" ? (
          <AbnormalSummary rows={filteredAbnormalRows} />
        ) : (
          <section className="billing-summary-grid" aria-label="筛选结果">
            <div>
              <span>筛选结果总金额</span>
              <strong>￥ 957,328.945753</strong>
            </div>
            <div>
              <span>筛选总 Token（千）</span>
              <strong>70,545,434.988</strong>
            </div>
          </section>
        )}

        {activeTab === "abnormal" ? <AbnormalTrendSection visibleSeries={visibleSeries} toggleSeries={toggleSeries} /> : <section className="billing-section billing-chart-section">
          <div className="billing-section-title-row">
            <div>
              <h2>消耗趋势</h2>
              <p>按选定时间范围聚合费用和 Token 消耗</p>
            </div>
            <div className="billing-chart-legend" aria-label="图表指标">
              <button className={visibleSeries.cost ? "active" : ""} onClick={() => toggleSeries("cost")}>
                <span className="legend-dot legend-blue" />费用金额（元）
              </button>
              <button className={visibleSeries.token ? "active" : ""} onClick={() => toggleSeries("token")}>
                <span className="legend-dot legend-purple" />Token数（千）
              </button>
            </div>
          </div>
          <div className="billing-chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 12, right: 30, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="#e8edf4" vertical horizontal />
                <XAxis dataKey="date" tick={{ fill: "#7d8795", fontSize: 11 }} axisLine={{ stroke: "#d8dee8" }} tickLine={false} />
                <YAxis yAxisId="cost" tick={{ fill: "#7d8795", fontSize: 11 }} tickFormatter={(value) => `￥${Math.round(value / 1000)}K`} axisLine={false} tickLine={false} />
                <YAxis yAxisId="token" orientation="right" tick={{ fill: "#7d8795", fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000000)}M`} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value, name) => [name === "cost" ? `￥${Number(value).toLocaleString()}` : `${Number(value).toLocaleString()} K`, name === "cost" ? "费用金额" : "Token数"]} />
                <Legend content={() => null} />
                {visibleSeries.cost ? <Area yAxisId="cost" type="monotone" dataKey="cost" stroke="none" fill="#397cf4" fillOpacity={0.08} isAnimationActive={false} /> : null}
                {visibleSeries.cost ? <Line yAxisId="cost" type="monotone" dataKey="cost" stroke="#397cf4" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /> : null}
                {visibleSeries.token ? <Line yAxisId="token" type="monotone" dataKey="token" stroke="#9559ff" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} /> : null}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>}

        {activeTab === "abnormal" ? (
          <AbnormalTableSection
            rows={filteredAbnormalRows}
            selectedId={selectedAbnormalId}
            onSelect={(id) => setSelectedAbnormalId(id || null)}
            onExport={() => downloadAbnormalCsv(filteredAbnormalRows)}
            onConfirm={confirmAbnormal}
          />
        ) : <section className="billing-section billing-table-section">
          <div className="billing-section-title-row billing-table-heading">
            <div>
              <h2>详细账单明细</h2>
              <p>{activeTab === "suppliers" ? "按供应商查看模型消耗与计费明细" : "按用户查看模型消耗与计费明细"}</p>
            </div>
            <button className="billing-export-button" onClick={() => downloadBillingCsv(filteredRows)}>
              <DownloadSimple size={16} aria-hidden="true" /> 导出明细
            </button>
          </div>
          <div className="billing-table-scroll">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>结算时间</th>
                  <th>{activeTab === "suppliers" ? "供应商" : "用户"}</th>
                  <th>模型名称</th>
                  <th>Token 明细</th>
                  <th>总 Token（千）</th>
                  <th>总金额（元）</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={`${row.model}-${index}`}>
                    <td className="billing-date-cell">{row.date}</td>
                    <td>{activeTab === "suppliers" ? row.supplier : index % 2 === 0 ? "JoyLab 产品团队" : "平台研发组"}</td>
                    <td><span className="billing-model-tag">{row.model}</span></td>
                    <td><TokenDetail row={row} /></td>
                    <td className="billing-token-total">{row.token}</td>
                    <td className="billing-amount">{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 ? <div className="billing-empty-state">暂无符合筛选条件的账单明细</div> : null}
          </div>
          <div className="billing-table-footer">
            <span>共 {filteredRows.length} 条</span>
            <div className="billing-pagination" aria-label="分页">
              <button disabled aria-label="上一页">‹</button>
              <button className="active">1</button>
              <button>2</button>
              <button>3</button>
              <span>…</span>
              <button>25</button>
              <button aria-label="下一页">›</button>
              <span className="billing-page-size">20 / 页 <CaretDown size={12} /></span>
            </div>
          </div>
        </section>}

      </main>
    </div>
  );
}
