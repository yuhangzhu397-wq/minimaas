import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  CopyIcon,
  FlowArrowIcon,
  GaugeIcon,
  InfoIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { servicePresetMeta, servicePresetWeights } from "./traffic-policy/AlgorithmMapping";
import { endpoints, models, policies as initialPolicies } from "./traffic-policy/mockData";
import { validatePolicy } from "./traffic-policy/policyValidation";
import type { BusinessPriority, PolicyStatus, ProviderOrigin, ServicePreset, TrafficPolicy, TrafficPolicyRoute } from "./traffic-policy/types";

const numberFormat = new Intl.NumberFormat("zh-CN");

type PolicyGroup = {
  id: string;
  versions: TrafficPolicy[];
  current: TrafficPolicy;
  active?: TrafficPolicy;
  pending?: TrafficPolicy;
  draft?: TrafficPolicy;
};

type ConfigHandoff = {
  mode: "new" | "new-version" | "edit-draft" | "copy";
  policyGroupId?: string;
  draftVersionId?: string;
  sourceVersionId?: string;
  pinId?: string;
  modelId?: string;
  environment: string;
  returnUrl: string;
};

const statusOrder: Record<PolicyStatus, number> = {
  active: 5,
  scheduled: 4,
  pending: 3,
  draft: 2,
  disabled: 1,
};

const GLOBAL_SCOPE_ID = "global";
const GLOBAL_SCOPE_NAME = "通用策略";

function groupKey(policy: TrafficPolicy) {
  return policy.policyGroupId ?? `${policy.scope.pinId}::${policy.scope.modelId}`;
}

function policyStatusLabel(status: PolicyStatus) {
  return {
    draft: "草稿",
    pending: "待审批",
    scheduled: "已排期",
    active: "生效中",
    disabled: "已停用",
  }[status];
}

function policyStatusTone(status: PolicyStatus) {
  return {
    draft: "neutral",
    pending: "warning",
    scheduled: "blue",
    active: "success",
    disabled: "muted",
  }[status];
}

function formatNumber(value: number) {
  return numberFormat.format(value);
}

function formatPercent(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

function securityRequirementLabel(value: 1 | 2 | 3) {
  return ({ 1: "低", 2: "中", 3: "高" } as const)[value];
}

function providerOriginLabel(value: ProviderOrigin, compact = false) {
  return {
    all: compact ? "自部署与外采" : "自部署与外采均可",
    "internal-preferred": "优先自部署",
    "internal-only": "仅自部署",
    "external-only": "仅外采",
  }[value];
}

function formatDate(value?: string) {
  if (!value) return "—";
  return value.replace(" ", "  ");
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeDraftPolicy(policyList: TrafficPolicy[]): TrafficPolicy {
  const model = models.find((candidate) => !policyList.some((policy) => policy.scope.pinId === GLOBAL_SCOPE_ID && policy.scope.modelId === candidate.id && policy.status !== "disabled")) ?? models[0];
  const template = deepClone(initialPolicies[0]);
  return {
    ...template,
    id: `policy-new-${Date.now()}`,
    version: 1,
    policyGroupId: `${GLOBAL_SCOPE_ID}::${model.id}`,
    name: "",
    status: "draft",
    scope: { pinId: GLOBAL_SCOPE_ID, pinName: GLOBAL_SCOPE_NAME, modelId: model.id, modelName: model.name, apiKeyIds: [], apiKeyNames: [] },
    priority: 0,
    servicePreset: "balanced",
    scoringWeights: { ...servicePresetWeights.balanced },
    effective: { mode: "now", from: "2026-08-20 09:00" },
    baseQuota: { rpm: 50000, tpm: 2000000, observedAt: "" },
    optimisticLimit: { enabled: true, maxMultiplier: 3, poolMode: "candidate-set" },
    constraints: {
      origin: "all",
      allowProviderIds: [],
      denyProviderIds: [],
      endpointMode: "all",
      allowEndpointIds: [],
      denyEndpointIds: [],
      securityRequirement: 2,
      maxTtftMs: 1000,
      maxTpotMs: 50,
    },
    preferences: endpoints.filter((endpoint) => endpoint.modelIds.includes(model.id)).map((endpoint) => ({ epId: endpoint.id, mode: "allowed", weight: 50 })),
    changeReason: "",
    createdBy: "当前用户",
    updatedAt: "刚刚",
  };
}

function buildPolicyGroups(policyList: TrafficPolicy[]) {
  const groups = new Map<string, TrafficPolicy[]>();
  policyList.forEach((policy) => {
    const key = groupKey(policy);
    groups.set(key, [...(groups.get(key) ?? []), policy]);
  });

  return [...groups.entries()].map(([id, versions]) => {
    const ordered = [...versions].sort((a, b) => statusOrder[b.status] - statusOrder[a.status] || b.version - a.version);
    const active = versions.filter((version) => version.status === "active").sort((a, b) => b.version - a.version)[0];
    const pending = versions.filter((version) => version.status === "pending" || version.status === "scheduled").sort((a, b) => b.version - a.version)[0];
    const draft = versions.filter((version) => version.status === "draft").sort((a, b) => b.version - a.version)[0];
    return { id, versions: [...versions].sort((a, b) => b.version - a.version), current: active ?? ordered[0], active, pending, draft } satisfies PolicyGroup;
  }).sort((a, b) => b.current.updatedAt.localeCompare(a.current.updatedAt));
}

function parseRoute(): TrafficPolicyRoute {
  const parts = window.location.hash.replace(/^#\/?/u, "").split("/").filter(Boolean);
  if (parts[0] !== "routes" || !parts[1] || parts[1] === "pins") return { view: "overview" };
  if (parts[1] === "new") return { view: "new" };
  if (parts[1] === "history" || parts[2] === "history") return { view: "overview" };
  return { view: "detail", id: parts[1] };
}

function navigateHash(hash: string) {
  window.location.hash = hash;
}

function StatusBadge({ status }: { status: PolicyStatus }) {
  return <span className={`traffic-policy-status ${policyStatusTone(status)}`}>{policyStatusLabel(status)}</span>;
}

function PageHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <header className="traffic-policy-page-head">
      <div>
        <div className="traffic-policy-eyebrow"><FlowArrowIcon size={16} /> 流量治理 / 策略管理</div>
        <h1>策略管理</h1>
        <p>按模型管理已配置策略、审批和生效状态；用户分配在其他模块完成。</p>
      </div>
      <button className="traffic-policy-button primary" onClick={onCreate}><PlusIcon size={17} /> 新建策略</button>
    </header>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return <div className="traffic-policy-field-label"><label>{children}</label>{hint ? <span>{hint}</span> : null}</div>;
}

function SectionTitle({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="traffic-policy-section-title"><span className="traffic-policy-section-icon">{icon}</span><div><h3>{title}</h3><p>{description}</p></div></div>;
}

function NewPolicyEditor({ policy, policyList, onChange, onCancel, onSave }: {
  policy: TrafficPolicy;
  policyList: TrafficPolicy[];
  onChange: (policy: TrafficPolicy) => void;
  onCancel: () => void;
  onSave: (submit: boolean, modelIds: string[]) => void;
}) {
  const [step, setStep] = useState(0);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(() => [policy.scope.modelId]);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [endpointSearch, setEndpointSearch] = useState("");
  const [endpointListFilter, setEndpointListFilter] = useState<"all" | "unconfigured" | "specified" | "excluded">("all");
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const modelEndpoints = useMemo(() => endpoints.filter((endpoint) => endpoint.modelIds.includes(policy.scope.modelId)), [policy.scope.modelId]);
  const issues = useMemo(() => validatePolicy(policy, endpoints), [policy]);
  const hasErrors = issues.some((issue) => issue.severity === "error");
  const conflictingModelIds = selectedModelIds.filter((modelId) => policyList.some((item) => item.status !== "disabled" && item.scope.pinId === GLOBAL_SCOPE_ID && item.scope.modelId === modelId));
  const basicReady = Boolean(policy.name.trim() && selectedModelIds.length > 0 && !conflictingModelIds.length);
  const allowEndpointIds = policy.constraints.allowEndpointIds ?? [];
  const denyEndpointIds = policy.constraints.denyEndpointIds ?? [];
  const endpointMode = allowEndpointIds.length > 0 ? "allow" : denyEndpointIds.length > 0 ? "deny" : "all";
  const endpointModeLabel = endpointMode === "allow" ? "指定 EP" : endpointMode === "deny" ? "排除 EP" : "不限制 EP";
  const endpointModeCount = endpointMode === "allow" ? allowEndpointIds.length : endpointMode === "deny" ? denyEndpointIds.length : modelEndpoints.length;
  const filteredModelEndpoints = useMemo(() => {
    const keyword = endpointSearch.trim().toLowerCase();
    return modelEndpoints.filter((endpoint) => {
      const matchesKeyword = !keyword || [endpoint.supplierName, endpoint.name, endpoint.id].some((value) => value.toLowerCase().includes(keyword));
      const isSpecified = allowEndpointIds.includes(endpoint.id);
      const isExcluded = denyEndpointIds.includes(endpoint.id);
      const matchesStatus = endpointListFilter === "all"
        || (endpointListFilter === "specified" && isSpecified)
        || (endpointListFilter === "excluded" && isExcluded)
        || (endpointListFilter === "unconfigured" && !isSpecified && !isExcluded);
      return matchesKeyword && matchesStatus;
    });
  }, [modelEndpoints, endpointSearch, endpointListFilter, allowEndpointIds, denyEndpointIds]);

  useEffect(() => {
    if (!modelMenuOpen) return;
    const closeOnOutsideOrEscape = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setModelMenuOpen(false);
        return;
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) setModelMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideOrEscape);
    document.addEventListener("keydown", closeOnOutsideOrEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideOrEscape);
      document.removeEventListener("keydown", closeOnOutsideOrEscape);
    };
  }, [modelMenuOpen]);

  const changeModel = (modelId: string) => {
    const model = models.find((item) => item.id === modelId) ?? models[0];
    const nextEndpoints = endpoints.filter((endpoint) => endpoint.modelIds.includes(model.id));
    onChange({
      ...policy,
      policyGroupId: `${GLOBAL_SCOPE_ID}::${model.id}`,
      scope: { ...policy.scope, modelId: model.id, modelName: model.name },
      constraints: { ...policy.constraints, endpointMode: "all", allowEndpointIds: [], denyEndpointIds: [] },
      preferences: nextEndpoints.map((endpoint) => ({ epId: endpoint.id, mode: "allowed", weight: 50 })),
    });
  };
  const toggleModel = (modelId: string) => {
    const nextIds = selectedModelIds.includes(modelId) ? selectedModelIds.filter((id) => id !== modelId) : [...selectedModelIds, modelId];
    if (!nextIds.length) return;
    setSelectedModelIds(nextIds);
    if (!nextIds.includes(policy.scope.modelId)) changeModel(nextIds[0]);
  };
  const selectedModels = models.filter((model) => selectedModelIds.includes(model.id));
  const changePreset = (preset: ServicePreset) => onChange({ ...policy, servicePreset: preset, scoringWeights: { ...servicePresetWeights[preset] } });
  const toggleEndpointSelection = (endpointId: string, mode: "allow" | "deny") => {
    const currentAllow = allowEndpointIds;
    const currentDeny = denyEndpointIds;
    const current = mode === "allow" ? currentAllow : currentDeny;
    const selected = current.includes(endpointId);
    const nextAllow = mode === "allow" ? (selected ? currentAllow.filter((id) => id !== endpointId) : [...currentAllow, endpointId]) : [];
    const nextDeny = mode === "deny" ? (selected ? currentDeny.filter((id) => id !== endpointId) : [...currentDeny, endpointId]) : [];
    const nextMode = nextAllow.length > 0 ? "allow" : nextDeny.length > 0 ? "deny" : "all";
    onChange({ ...policy, constraints: { ...policy.constraints, endpointMode: nextMode, allowEndpointIds: nextAllow, denyEndpointIds: nextDeny } });
  };
  const updatePreference = (epId: string, value: number) => onChange({ ...policy, preferences: policy.preferences.map((item) => item.epId === epId ? { ...item, weight: Math.max(0, Math.min(100, value)) } : item) });
  const clearEndpointFilters = () => {
    setEndpointSearch("");
    setEndpointListFilter("all");
  };

  return (
    <main className="traffic-policy-main traffic-policy-new-editor">
      <button className="traffic-policy-back-button" onClick={onCancel}><ArrowLeftIcon size={17} /> 返回策略列表</button>
      <header className="traffic-policy-page-head traffic-policy-editor-head"><div><div className="traffic-policy-eyebrow">流量治理 / 策略管理 / 新建</div><h1>新建策略</h1><p>选择一个或多个模型，完成评分权重、路由约束与偏好配置，后续可在其他模块分配给用户。</p></div><button className="traffic-policy-button secondary" onClick={() => onSave(false, selectedModelIds)}>保存草稿</button></header>

      <nav className="traffic-policy-stepper traffic-policy-stepper-three" aria-label="新建策略步骤">
        {["基本信息", "策略配置", "确认发布"].map((label, index) => <button key={label} className={index === step ? "active" : index < step ? "done" : ""} aria-current={index === step ? "step" : undefined} onClick={() => setStep(index)}><span>{index < step ? <CheckIcon size={12} /> : index + 1}</span>{label}</button>)}
      </nav>

      <section className="traffic-policy-panel traffic-policy-editor-panel">
        {step === 0 ? <>
          <SectionTitle icon={<ListChecksIcon size={19} />} title="基本信息" description="确定策略名称和适用模型。" />
          <div className="traffic-policy-form-grid">
            <div className="traffic-policy-form-field full"><FieldLabel hint="用于策略列表和审批记录">策略名称</FieldLabel><input value={policy.name} onChange={(event) => onChange({ ...policy, name: event.target.value })} placeholder="例如：云智慧 DeepSeek 生产保障策略" /></div>
            <div className="traffic-policy-form-field"><FieldLabel hint="可多选；提交时会为每个模型生成相同配置">模型</FieldLabel><div ref={modelMenuRef} className="traffic-policy-model-multiselect"><button type="button" className="traffic-policy-model-multiselect-trigger" aria-haspopup="listbox" aria-expanded={modelMenuOpen} onClick={() => setModelMenuOpen((open) => !open)}><span className="traffic-policy-model-tags">{selectedModels.length ? selectedModels.map((model) => <span className="traffic-policy-model-tag" key={model.id}>{model.name}</span>) : <span className="traffic-policy-model-placeholder">请选择模型</span>}</span><span className="traffic-policy-model-chevron">⌄</span></button>{modelMenuOpen ? <div className="traffic-policy-model-multiselect-menu" role="listbox" aria-label="选择模型">{models.map((model) => { const selected = selectedModelIds.includes(model.id); return <button type="button" role="option" aria-selected={selected} className={`traffic-policy-model-option ${selected ? "selected" : ""}`} key={model.id} onClick={() => toggleModel(model.id)}><span className={`traffic-policy-model-checkbox ${selected ? "checked" : ""}`}>{selected ? <CheckIcon size={12} /> : null}</span><span>{model.name}</span></button>; })}<p>已选 {selectedModelIds.length} 个模型，提交后分别创建策略。</p></div> : null}</div></div>
            <div className="traffic-policy-form-field"><FieldLabel hint="映射 a9.priority">业务优先级</FieldLabel><select value={policy.priority} onChange={(event) => onChange({ ...policy, priority: Number(event.target.value) as BusinessPriority })}><option value={0}>普通</option><option value={1}>重要</option><option value={2}>重保</option></select></div>
            <div className="traffic-policy-form-field full"><FieldLabel hint="重保策略必填">变更原因</FieldLabel><textarea rows={3} value={policy.changeReason} onChange={(event) => onChange({ ...policy, changeReason: event.target.value })} placeholder="说明新建背景、预期目标和风险控制方式" /></div>
            {conflictingModelIds.length ? <div className="traffic-policy-editor-warning full"><WarningCircleIcon size={17} /><span>{models.filter((model) => conflictingModelIds.includes(model.id)).map((model) => model.name).join("、")}已有通用策略，请取消选择后再创建。</span></div> : null}
          </div>
        </> : null}

        {step === 1 ? <>
          <SectionTitle icon={<GaugeIcon size={19} />} title="策略配置" description="配置算法使用的评分权重、硬约束和 EP 偏好。" />
          <div className="traffic-policy-editor-subsection traffic-policy-editor-subsection-first"><div className="traffic-policy-subsection-title"><div><h4>评分权重模板</h4><p>选择业务偏好的评分模板，算法将使用对应权重计算候选 EP 得分。</p></div></div><div className="traffic-policy-choice-grid three traffic-policy-preset-grid">{(["performance", "balanced", "cost"] as ServicePreset[]).map((preset) => <button key={preset} className={policy.servicePreset === preset ? "selected" : ""} onClick={() => changePreset(preset)}><strong>{servicePresetMeta[preset].label}</strong><span>{servicePresetMeta[preset].description}</span></button>)}</div></div>
          <div className="traffic-policy-editor-subsection"><h4>硬约束</h4><p>硬约束先过滤 EP，评分权重只作用于过滤后的候选集。</p><div className="traffic-policy-form-grid traffic-policy-embedded-grid"><div className="traffic-policy-form-field"><FieldLabel hint="a4 ↔ b9.type">资源来源</FieldLabel><select value={policy.constraints.origin} onChange={(event) => onChange({ ...policy, constraints: { ...policy.constraints, origin: event.target.value as ProviderOrigin } })}><option value="all">自部署与外采均可</option><option value="internal-preferred">优先自部署</option><option value="internal-only">仅自部署</option><option value="external-only">仅外采</option></select></div><div className="traffic-policy-form-field"><FieldLabel hint="a8 ↔ b13">数据安全等级</FieldLabel><select value={policy.constraints.securityRequirement} onChange={(event) => onChange({ ...policy, constraints: { ...policy.constraints, securityRequirement: Number(event.target.value) as 1 | 2 | 3 } })}><option value={3}>高</option><option value={2}>中</option><option value={1}>低</option></select></div></div></div>
          <div className="traffic-policy-editor-subsection traffic-policy-preference-subsection">
            <div className="traffic-policy-subsection-title">
              <div><h4>EP 偏好值</h4><p>默认 50；算法会在候选集内归一化后进入 softmax。每行可直接设置 EP 的指定或排除约束。</p></div>
              <span className="traffic-policy-endpoint-mode-hint">{endpointMode === "all" ? "未设置约束" : endpointMode === "allow" ? `指定 ${allowEndpointIds.length} 个 EP` : `排除 ${denyEndpointIds.length} 个 EP`}</span>
            </div>
            <div className="traffic-policy-endpoint-filter-toolbar" role="search" aria-label="筛选 EP 端点">
              <label className="traffic-policy-endpoint-search">
                <MagnifyingGlassIcon size={15} />
                <input aria-label="搜索 EP 端点" value={endpointSearch} onChange={(event) => setEndpointSearch(event.target.value)} placeholder="搜索供应商、端点名称或端点 ID" />
              </label>
              <select aria-label="按 EP 配置状态筛选" value={endpointListFilter} onChange={(event) => setEndpointListFilter(event.target.value as typeof endpointListFilter)}>
                <option value="all">全部端点</option>
                <option value="unconfigured">未设置</option>
                <option value="specified">已指定</option>
                <option value="excluded">已排除</option>
              </select>
              <span className="traffic-policy-endpoint-filter-count">{filteredModelEndpoints.length} / {modelEndpoints.length} 个端点</span>
              {endpointSearch || endpointListFilter !== "all" ? <button type="button" className="traffic-policy-endpoint-filter-clear" onClick={clearEndpointFilters}><XIcon size={13} /> 清除筛选</button> : null}
            </div>
            <div className="traffic-policy-preference-editor">
              {filteredModelEndpoints.length ? filteredModelEndpoints.map((endpoint) => {
                const value = policy.preferences.find((item) => item.epId === endpoint.id)?.weight ?? 50;
                const allowChecked = allowEndpointIds.includes(endpoint.id);
                const denyChecked = denyEndpointIds.includes(endpoint.id);
                const allowDisabled = endpointMode === "deny" && !allowChecked;
                const denyDisabled = endpointMode === "allow" && !denyChecked;
                return <div className={`traffic-policy-preference-row ${allowChecked ? "specified" : denyChecked ? "excluded" : ""}`} key={endpoint.id}><span><strong>{endpoint.supplierName}</strong><small>{endpoint.name}</small></span><div className="traffic-policy-preference-controls"><div className="traffic-policy-endpoint-inline-actions" role="group" aria-label={`${endpoint.supplierName} EP 约束`}><button type="button" className={`traffic-policy-endpoint-inline-button allow ${allowChecked ? "selected" : ""}`} aria-pressed={allowChecked} disabled={allowDisabled} onClick={() => toggleEndpointSelection(endpoint.id, "allow")}>指定</button><button type="button" className={`traffic-policy-endpoint-inline-button deny ${denyChecked ? "selected" : ""}`} aria-pressed={denyChecked} disabled={denyDisabled} onClick={() => toggleEndpointSelection(endpoint.id, "deny")}>排除</button></div><div className="traffic-policy-preference-input"><input type="number" min={0} max={100} aria-label={`${endpoint.supplierName} 偏好值`} value={value} onChange={(event) => updatePreference(endpoint.id, Number(event.target.value))} /><em>/100</em></div></div></div>;
              }) : <div className="traffic-policy-endpoint-filter-empty"><InfoIcon size={18} /><span>没有匹配的 EP 端点</span><button type="button" onClick={clearEndpointFilters}>清除筛选</button></div>}
            </div>
          </div>
        </> : null}

        {step === 2 ? <>
          <SectionTitle icon={<CheckCircleIcon size={19} />} title="确认发布" description="核对策略对象、关键配置和校验结果，再保存草稿或提交审批。" />
          <div className="traffic-policy-release-summary"><div><span>策略对象</span><strong>{selectedModels.length === 1 ? `${policy.scope.modelName} · 通用策略` : `${selectedModels.length} 个模型 · 分别生成策略`}</strong></div><div><span>评分权重</span><strong>{servicePresetMeta[policy.servicePreset].label}</strong></div><div><span>硬约束</span><strong>{providerOriginLabel(policy.constraints.origin, true)} · 安全等级 ≥ {securityRequirementLabel(policy.constraints.securityRequirement)}</strong></div><div><span>EP 路由</span><strong>{endpointModeLabel} · {endpointModeCount} 个候选</strong></div><div><span>EP 偏好</span><strong>{modelEndpoints.length} 个 EP，默认值 50 可调</strong></div></div>
          <div className="traffic-policy-issue-list">{issues.length ? issues.map((issue, index) => <div key={`${issue.field}-${index}`} className={`traffic-policy-issue ${issue.severity}`}><WarningCircleIcon size={16} /><span>{issue.message}</span></div>) : <div className="traffic-policy-issue success"><CheckCircleIcon size={16} /><span>校验通过，可以提交审批。</span></div>}</div>
          <div className="traffic-policy-release-actions"><button className="traffic-policy-button secondary" onClick={() => onSave(false, selectedModelIds)}>保存草稿</button><button className="traffic-policy-button primary" disabled={hasErrors || !basicReady} onClick={() => onSave(true, selectedModelIds)}>提交审批</button></div>
        </> : null}

        <footer className="traffic-policy-editor-footer"><button className="traffic-policy-button ghost" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeftIcon size={16} /> 上一步</button><span>第 {step + 1} / 3 步</span>{step < 2 ? <button className="traffic-policy-button secondary" onClick={() => setStep((current) => Math.min(2, current + 1))}>下一步：{step === 0 ? "策略配置" : "确认发布"} <ArrowRightIcon size={16} /></button> : <span />}</footer>
      </section>
    </main>
  );
}

function PolicyOverview({ policyList, onNavigate, onHandoff }: {
  policyList: TrafficPolicy[];
  onNavigate: (hash: string) => void;
  onHandoff: (handoff: ConfigHandoff) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PolicyStatus>("all");
  const groups = useMemo(() => buildPolicyGroups(policyList), [policyList]);
  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return groups.filter((group) => {
      const current = group.current;
      const matchesKeyword = !keyword || [current.name, current.scope.modelName].some((value) => value.toLowerCase().includes(keyword));
      const matchesStatus = statusFilter === "all" || current.status === statusFilter || group.pending?.status === statusFilter || group.draft?.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [groups, search, statusFilter]);

  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <main className="traffic-policy-main">
      <PageHeader onCreate={() => onNavigate("#/routes/new")} />

      <section className="traffic-policy-panel traffic-policy-management-panel">
        <div className="traffic-policy-panel-head">
          <div><h2>已配置策略</h2><p>列表展示已创建的模型策略；用户与策略的分配在其他模块完成。</p></div>
        </div>
        <div className="traffic-policy-management-toolbar">
          <label className="traffic-policy-search"><MagnifyingGlassIcon size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索策略名称或模型" /></label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | PolicyStatus)} aria-label="按状态筛选">
            <option value="all">全部状态</option><option value="active">生效中</option><option value="draft">草稿</option><option value="pending">待审批</option><option value="scheduled">已排期</option><option value="disabled">已停用</option>
          </select>
          {(search || statusFilter !== "all") ? <button className="traffic-policy-clear-filter" onClick={() => { setSearch(""); setStatusFilter("all"); }}><XIcon size={13} /> 清除筛选</button> : null}
          <span className="traffic-policy-filter-note">{filteredGroups.length} 个策略组</span>
        </div>
        <div className="traffic-policy-table-wrap">
          <table className="traffic-policy-table traffic-policy-management-table">
            <thead><tr><th>策略</th><th>模型</th><th>生效时间</th><th>最近更新</th><th>操作</th></tr></thead>
            <tbody>
              {filteredGroups.map((group) => {
                const current = group.current;
                return (
                  <tr key={group.id} className="traffic-policy-clickable-row" tabIndex={0} onClick={() => onNavigate(`#/routes/${current.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onNavigate(`#/routes/${current.id}`); } }}>
                    <td>
                      <div className="traffic-policy-table-strategy">
                        <button className="traffic-policy-row-link" onClick={() => onNavigate(`#/routes/${current.id}`)}>{current.name}</button>
                      </div>
                    </td>
                    <td>{current.scope.modelName}</td>
                    <td>{current.effective.mode === "scheduled" ? formatDate(current.effective.from) : "立即生效"}</td>
                    <td>{formatDate(current.updatedAt)}</td>
                    <td>
                      <div className="traffic-policy-row-actions">
                        <button
                          className="traffic-policy-row-primary-action"
                          disabled={current.status !== "active" && current.status !== "draft"}
                          title={current.status !== "active" && current.status !== "draft" ? "当前状态暂不可修改" : undefined}
                          onClick={(event) => {
                            stop(event);
                            if (current.status === "active") {
                              onHandoff({ mode: "new-version", policyGroupId: group.id, sourceVersionId: current.id, pinId: current.scope.pinId, modelId: current.scope.modelId, environment: "开发环境", returnUrl: `#/routes/${current.id}` });
                            } else if (current.status === "draft") {
                              onHandoff({ mode: "edit-draft", policyGroupId: group.id, draftVersionId: current.id, pinId: current.scope.pinId, modelId: current.scope.modelId, environment: "开发环境", returnUrl: `#/routes/${current.id}` });
                            }
                          }}
                        >修改</button>
                        <button className="traffic-policy-text-button" onClick={(event) => { stop(event); onNavigate(`#/routes/${current.id}`); }}>详情</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredGroups.length === 0 ? <div className="traffic-policy-empty-state"><InfoIcon size={22} /><strong>没有符合条件的策略</strong><p>调整搜索词或状态筛选，或者新建策略。</p></div> : null}
        </div>
      </section>
    </main>
  );
}

function Definition({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return <div className="traffic-policy-definition"><dt>{label}{hint ? <small>{hint}</small> : null}</dt><dd>{value}</dd></div>;
}

function ReadOnlyConfig({ policy }: { policy: TrafficPolicy }) {
  const weights = policy.scoringWeights ?? servicePresetWeights[policy.servicePreset];
  const preferences = policy.preferences ?? [];
  const hardConstraints = [
    providerOriginLabel(policy.constraints.origin),
    `安全等级 ≥ ${securityRequirementLabel(policy.constraints.securityRequirement)}`,
  ];
  return (
    <div className="traffic-policy-readonly-config">
      <div className="traffic-policy-definition-grid">
        <Definition label="业务优先级" value={["普通", "重要", "重保"][policy.priority]} hint="a9.priority" />
        <Definition label="基础 RPM" value={formatNumber(policy.baseQuota.rpm)} hint="base_quota.rpm" />
        <Definition label="基础 TPM" value={formatNumber(policy.baseQuota.tpm)} hint="base_quota.tpm" />
        <Definition label="弹性额度" value={policy.optimisticLimit.enabled ? `开启 · ${policy.optimisticLimit.maxMultiplier}×` : "关闭"} hint="optimistic_rate_limit" />
        <Definition label="服务策略" value={servicePresetMeta[policy.servicePreset].label} hint="a5 / b10" />
        <Definition label="候选 EP" value={`${preferences.length} 个已配置偏好`} hint="b15 → normalize → softmax" />
      </div>
      <div className="traffic-policy-config-block"><h4>评分权重</h4><div className="traffic-policy-weight-grid"><span>成本 <strong>{formatPercent(weights.cost)}</strong></span><span>性能 <strong>{formatPercent(weights.performance)}</strong></span><span>健康 <strong>{formatPercent(weights.health)}</strong></span><span>饥渴 <strong>{formatPercent(weights.hunger)}</strong></span></div></div>
      <div className="traffic-policy-config-block"><h4>硬约束</h4><div className="traffic-policy-chip-list">{hardConstraints.map((constraint) => <span key={constraint} className="traffic-policy-chip"><ShieldCheckIcon size={14} />{constraint}</span>)}</div></div>
      <div className="traffic-policy-config-block"><h4>EP 指定 / 排除与偏好</h4><div className="traffic-policy-ep-summary"><span>指定 {policy.constraints.allowEndpointIds?.length ?? 0}</span><span>排除 {policy.constraints.denyEndpointIds?.length ?? 0}</span><span>偏好 {preferences.filter((item) => item.mode === "preferred").length}</span><span>可用 {preferences.filter((item) => item.mode !== "disabled").length}</span></div></div>
    </div>
  );
}

function PolicyDetail({ group, onNavigate, onHandoff, onSubmitApproval, onDisable, onCopy }: {
  group: PolicyGroup;
  onNavigate: (hash: string) => void;
  onHandoff: (handoff: ConfigHandoff) => void;
  onSubmitApproval: (policy: TrafficPolicy) => void;
  onDisable: (policy: TrafficPolicy) => void;
  onCopy: (policy: TrafficPolicy) => void;
}) {
  const current = group.current;
  return (
    <main className="traffic-policy-main">
      <button className="traffic-policy-back-button" onClick={() => onNavigate("#/routes")}><ArrowLeftIcon size={17} /> 返回策略列表</button>
      <header className="traffic-policy-page-head traffic-policy-detail-head">
        <div><div className="traffic-policy-eyebrow">{current.scope.pinName} / {current.scope.modelName} / 开发环境</div><h1>{current.name}</h1><p>策略组 {group.id}</p></div>
        <div className="traffic-policy-detail-actions">
          <StatusBadge status={current.status} />
          {current.status === "active" ? <button className="traffic-policy-button" onClick={() => onHandoff({ mode: "new-version", policyGroupId: group.id, sourceVersionId: current.id, pinId: current.scope.pinId, modelId: current.scope.modelId, environment: "开发环境", returnUrl: `#/routes/${current.id}` })}><PlusIcon size={16} /> 调整策略</button> : null}
          {current.status === "draft" ? <button className="traffic-policy-button" onClick={() => onHandoff({ mode: "edit-draft", policyGroupId: group.id, draftVersionId: current.id, pinId: current.scope.pinId, modelId: current.scope.modelId, environment: "开发环境", returnUrl: `#/routes/${current.id}` })}>继续配置 <ArrowRightIcon size={16} /></button> : null}
          {current.status === "draft" ? <button className="traffic-policy-button primary" onClick={() => onSubmitApproval(current)}>提交审批</button> : null}
          {current.status === "active" ? <button className="traffic-policy-button danger" onClick={() => onDisable(current)}>停用</button> : null}
          <button className="traffic-policy-button" onClick={() => onCopy(current)}><CopyIcon size={16} /> 复制</button>
        </div>
      </header>

      <section className="traffic-policy-detail-summary">
        <article className="traffic-policy-panel traffic-policy-detail-card"><div className="traffic-policy-panel-head"><div><h2>策略摘要</h2><p>只读展示当前策略，具体字段由外部策略配置系统维护。</p></div><InfoIcon size={20} /></div><dl className="traffic-policy-definition-grid"><Definition label="状态" value={<StatusBadge status={current.status} />} /><Definition label="创建人" value={current.createdBy} /><Definition label="更新时间" value={formatDate(current.updatedAt)} /><Definition label="生效方式" value={current.effective.mode === "now" ? "立即生效" : `定时 · ${formatDate(current.effective.from)}`} /><Definition label="变更原因" value={current.changeReason || "未填写"} /></dl></article>
      </section>

      <section className="traffic-policy-panel traffic-policy-config-panel"><div className="traffic-policy-panel-head"><div><h2>策略配置快照</h2><p>字段映射 AlgorithmMapping.ts；本页面不提供配置编辑。</p></div><SlidersHorizontalIcon size={20} /></div><ReadOnlyConfig policy={current} /></section>

      <section className="traffic-policy-panel traffic-policy-handoff-card"><div className="traffic-policy-handoff-icon"><ArrowRightIcon size={20} /></div><div><h3>需要调整策略？</h3><p>前往外部策略配置系统完成 RPM、TPM、弹性、评分权重、硬约束和 EP 偏好配置，保存后返回本策略组继续审批。</p></div><button className="traffic-policy-button" onClick={() => onHandoff({ mode: current.status === "draft" ? "edit-draft" : "new-version", policyGroupId: group.id, draftVersionId: group.draft?.id, sourceVersionId: current.id, pinId: current.scope.pinId, modelId: current.scope.modelId, environment: "开发环境", returnUrl: `#/routes/${current.id}` })}>前往配置 <ArrowRightIcon size={16} /></button></section>
    </main>
  );
}

function HandoffDialog({ handoff, onClose }: { handoff: ConfigHandoff; onClose: () => void }) {
  const modeLabel = { new: "新建策略", "new-version": "调整策略", "edit-draft": "继续配置草稿", copy: "复制策略" }[handoff.mode];
  return <div className="traffic-policy-modal-backdrop" role="presentation" onMouseDown={onClose}><section className="traffic-policy-modal" role="dialog" aria-modal="true" aria-labelledby="traffic-policy-handoff-title" onMouseDown={(event) => event.stopPropagation()}><div className="traffic-policy-modal-head"><div><span className="traffic-policy-eyebrow">外部配置交接</span><h2 id="traffic-policy-handoff-title">{modeLabel}</h2></div><button className="traffic-policy-icon-button" onClick={onClose} aria-label="关闭"><XIcon size={20} /></button></div><p>本模块只负责策略管理。接入外部配置系统后，将携带以下上下文打开对应的配置页面：</p><dl className="traffic-policy-handoff-params"><Definition label="策略组" value={handoff.policyGroupId || "新建策略组"} /><Definition label="PIN" value={handoff.pinId || "由配置系统选择"} /><Definition label="模型" value={handoff.modelId || "由配置系统选择"} /><Definition label="环境" value={handoff.environment} /><Definition label="返回地址" value={handoff.returnUrl} /></dl><div className="traffic-policy-modal-note"><InfoIcon size={17} /> 配置保存为草稿后返回本页面，再执行提交审批或发布策略。</div><div className="traffic-policy-modal-actions"><button className="traffic-policy-button" onClick={onClose}>知道了</button></div></section></div>;
}

export function TrafficPolicyPage() {
  const [route, setRoute] = useState<TrafficPolicyRoute>(parseRoute);
  const [policyList, setPolicyList] = useState<TrafficPolicy[]>(() => initialPolicies.map(deepClone));
  const [draft, setDraft] = useState<TrafficPolicy>(() => makeDraftPolicy(initialPolicies));
  const [toast, setToast] = useState("");
  const [handoff, setHandoff] = useState<ConfigHandoff | null>(null);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (route.view === "new") setDraft(makeDraftPolicy(policyList));
  }, [route.view]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigate = (hash: string) => navigateHash(hash);
  const showToast = (message: string) => setToast(message);
  const groups = useMemo(() => buildPolicyGroups(policyList), [policyList]);
  const detailGroup = route.view === "detail" ? groups.find((group) => group.versions.some((policy) => policy.id === route.id) || group.id === route.id) : undefined;
  const submitApproval = (policy: TrafficPolicy) => {
    if (policy.status !== "draft") return;
    setPolicyList((current) => current.map((item) => item.id === policy.id ? { ...item, status: "pending", updatedAt: "刚刚" } : item));
    showToast("策略已提交审批。");
  };

  const disablePolicy = (policy: TrafficPolicy) => {
    if (policy.status !== "active") return;
    setPolicyList((current) => current.map((item) => item.id === policy.id ? { ...item, status: "disabled", updatedAt: "刚刚" } : item));
    showToast("策略已停用。");
  };

  const copyPolicy = (source: TrafficPolicy) => {
    const siblings = policyList.filter((item) => groupKey(item) === groupKey(source));
    const copied = deepClone(source);
    copied.id = `policy-copy-${Date.now()}`;
    copied.version = Math.max(...siblings.map((item) => item.version), 0) + 1;
    copied.status = "draft";
    copied.name = `${source.name} · 复制`;
    copied.changeReason = "基于已有策略复制，待补充变更原因。";
    copied.updatedAt = "刚刚";
    setPolicyList((current) => [copied, ...current]);
    showToast("策略已复制，已生成草稿。");
    navigate(`#/routes/${copied.id}`);
  };

  const saveNewPolicy = (submit: boolean, modelIds: string[] = [draft.scope.modelId]) => {
    const targetModels = [...new Set(modelIds)].map((modelId) => models.find((model) => model.id === modelId)).filter((model): model is typeof models[number] => Boolean(model));
    if (!draft.name.trim() || !targetModels.length) {
      showToast("请先完成策略名称和模型选择。");
      return;
    }
    const conflicts = policyList.filter((item) => item.status !== "disabled" && item.scope.pinId === GLOBAL_SCOPE_ID && targetModels.some((model) => model.id === item.scope.modelId));
    if (conflicts.length) {
      showToast(`${conflicts.map((item) => item.scope.modelName).join("、")}已有通用策略，请取消选择后再创建。`);
      return;
    }
    const sourcePreferences = new Map(draft.preferences.map((preference) => [preference.epId, preference.weight ?? 50]));
    const candidates = targetModels.map((model, index) => {
      const modelEndpointList = endpoints.filter((endpoint) => endpoint.modelIds.includes(model.id));
      const endpointIds = new Set(modelEndpointList.map((endpoint) => endpoint.id));
      const candidate = deepClone(draft);
      candidate.id = `policy-new-${Date.now()}-${index}`;
      candidate.policyGroupId = `${GLOBAL_SCOPE_ID}::${model.id}`;
      candidate.scope = { ...candidate.scope, pinId: GLOBAL_SCOPE_ID, pinName: GLOBAL_SCOPE_NAME, modelId: model.id, modelName: model.name };
      candidate.preferences = modelEndpointList.map((endpoint) => ({ epId: endpoint.id, mode: "allowed", weight: sourcePreferences.get(endpoint.id) ?? 50 }));
      candidate.constraints = {
        ...candidate.constraints,
        allowEndpointIds: (candidate.constraints.allowEndpointIds ?? []).filter((id) => endpointIds.has(id)),
        denyEndpointIds: (candidate.constraints.denyEndpointIds ?? []).filter((id) => endpointIds.has(id)),
      };
      return candidate;
    });
    const issues = candidates.flatMap((candidate) => validatePolicy(candidate, endpoints));
    if (submit && issues.some((issue) => issue.severity === "error")) {
      showToast("仍有阻断项未处理，请在确认发布步骤查看校验结果。");
      return;
    }
    const next = candidates.map((candidate) => {
      const siblings = policyList.filter((item) => groupKey(item) === groupKey(candidate));
      return { ...candidate, version: Math.max(...siblings.map((item) => item.version), 0) + 1, status: submit ? "pending" : "draft", updatedAt: "刚刚" } satisfies TrafficPolicy;
    });
    setPolicyList((current) => [...next, ...current]);
    setDraft(next[0]);
    showToast(submit ? `已为${next.length}个模型提交审批。` : `已为${next.length}个模型保存草稿。`);
    navigate(`#/routes/${next[0].id}`);
  };

  let content: React.ReactNode;
  if (route.view === "overview") content = <PolicyOverview policyList={policyList} onNavigate={navigate} onHandoff={setHandoff} />;
  else if (route.view === "new") content = <NewPolicyEditor policy={draft} policyList={policyList} onChange={setDraft} onCancel={() => navigate("#/routes")} onSave={saveNewPolicy} />;
  else if (detailGroup) content = <PolicyDetail group={detailGroup} onNavigate={navigate} onHandoff={setHandoff} onSubmitApproval={submitApproval} onDisable={disablePolicy} onCopy={copyPolicy} />;
  else content = <PolicyOverview policyList={policyList} onNavigate={navigate} onHandoff={setHandoff} />;

  return <div className="traffic-policy-page">{content}{handoff ? <HandoffDialog handoff={handoff} onClose={() => setHandoff(null)} /> : null}{toast ? <div className="traffic-policy-toast" role="status"><CheckCircleIcon size={17} />{toast}</div> : null}</div>;
}
