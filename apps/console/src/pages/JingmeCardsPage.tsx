import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  CaretDownIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  EyeIcon,
  FunnelSimpleIcon,
  InfoIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  NotePencilIcon,
  PaperPlaneRightIcon,
  RepeatIcon,
  SlidersHorizontalIcon,
  UserCircleIcon,
  UsersThreeIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

type JingmeTab = "send" | "records";
type RecipientMode = "exact" | "filter";
type UserStatus = "正常" | "即将到期" | "已停用";
type UsageStatus = "用量正常" | "接近额度" | "已超额度" | "无调用记录";
type RecordStatus = "sending" | "completed" | "partial" | "failed";

type JingmeUser = {
  id: string;
  name: string;
  employeeId: string;
  account: string;
  tenant: string;
  lastActive: string;
  status: UserStatus;
  usage: UsageStatus;
  tags: string[];
};

type CardForm = {
  taskName: string;
  title: string;
  body: string;
  buttonLabel: string;
  url: string;
  openMode: "inside" | "browser";
};

type RecipientFilters = {
  tenant: string;
  status: "all" | UserStatus;
  active: "all" | "7d" | "30d" | "older";
  usage: "all" | UsageStatus;
  tag: string;
};

type JingmeRecord = {
  id: string;
  taskName: string;
  title: string;
  audience: string;
  audienceType: "精确选择" | "条件筛选";
  total: number;
  success: number;
  failure: number;
  status: RecordStatus;
  operator: string;
  time: string;
  filters: RecipientFilters;
  form: CardForm;
};

const seedUsers: JingmeUser[] = [
  { id: "u-01", name: "张悦", employeeId: "M2024018", account: "zhangyue", tenant: "南京智客", lastActive: "今天 14:08", status: "正常", usage: "接近额度", tags: ["高用量", "企业用户"] },
  { id: "u-02", name: "王晨", employeeId: "M2024076", account: "wangchen", tenant: "云智慧", lastActive: "今天 11:42", status: "正常", usage: "用量正常", tags: ["企业用户"] },
  { id: "u-03", name: "李泽", employeeId: "M2023102", account: "lize", tenant: "Context-in", lastActive: "昨天 18:16", status: "即将到期", usage: "接近额度", tags: ["重点保障", "高用量"] },
  { id: "u-04", name: "陈思远", employeeId: "M2022159", account: "chensiyuan", tenant: "南京智客", lastActive: "昨天 16:20", status: "正常", usage: "已超额度", tags: ["高用量"] },
  { id: "u-05", name: "赵宁", employeeId: "M2024098", account: "zhaoning", tenant: "内部体验租户", lastActive: "3 天前", status: "正常", usage: "用量正常", tags: ["新用户", "个人用户"] },
  { id: "u-06", name: "周婧", employeeId: "M2021188", account: "zhoujing", tenant: "云智慧", lastActive: "8 天前", status: "正常", usage: "接近额度", tags: ["企业用户"] },
  { id: "u-07", name: "刘洋", employeeId: "M2020063", account: "liuyang", tenant: "南京智客", lastActive: "36 天前", status: "即将到期", usage: "无调用记录", tags: ["个人用户"] },
  { id: "u-08", name: "孙可", employeeId: "M2025124", account: "sunke", tenant: "Context-in", lastActive: "今天 09:31", status: "正常", usage: "已超额度", tags: ["重点保障", "企业用户"] },
  { id: "u-09", name: "高远", employeeId: "M2023057", account: "gaoyuan", tenant: "云智慧", lastActive: "12 天前", status: "已停用", usage: "无调用记录", tags: ["个人用户"] },
  { id: "u-10", name: "林晓", employeeId: "M2024210", account: "linxiao", tenant: "内部体验租户", lastActive: "5 天前", status: "正常", usage: "用量正常", tags: ["新用户"] },
];

const defaultFilters: RecipientFilters = { tenant: "all", status: "all", active: "all", usage: "all", tag: "all" };

const initialForm: CardForm = {
  taskName: "高用量用户额度提醒",
  title: "本月模型用量已接近额度",
  body: "你的本月模型调用量已达到套餐额度的 90%，为避免服务受限，请及时查看用量并申请调整额度。",
  buttonLabel: "查看用量详情",
  url: "https://minimaas.example.com/usage",
  openMode: "inside",
};

const initialRecords: JingmeRecord[] = [
  { id: "record-01", taskName: "模型服务升级通知", title: "模型中心将于今晚完成升级", audience: "南京智客、云智慧 · 328 人", audienceType: "条件筛选", total: 328, success: 321, failure: 7, status: "partial", operator: "ZY", time: "2026-08-27 11:26", filters: { ...defaultFilters, usage: "接近额度" }, form: { ...initialForm, taskName: "模型服务升级通知", title: "模型中心将于今晚完成升级", body: "今晚 23:00–24:00 将进行模型中心升级，期间部分模型可能短暂不可用。" } },
  { id: "record-02", taskName: "新用户使用指南", title: "欢迎使用 MiniMaaS", audience: "精确选择 · 42 人", audienceType: "精确选择", total: 42, success: 42, failure: 0, status: "completed", operator: "LM", time: "2026-08-26 16:08", filters: { ...defaultFilters }, form: { ...initialForm, taskName: "新用户使用指南", title: "欢迎使用 MiniMaaS", body: "从模型中心开始，快速完成你的第一次模型调用。" } },
  { id: "record-03", taskName: "季度额度调整提醒", title: "你的季度额度即将更新", audience: "重点保障 · 1,280 人", audienceType: "条件筛选", total: 1280, success: 0, failure: 0, status: "sending", operator: "ZY", time: "2026-08-27 14:02", filters: { ...defaultFilters, tag: "重点保障" }, form: { ...initialForm, taskName: "季度额度调整提醒", title: "你的季度额度即将更新" } },
  { id: "record-04", taskName: "服务到期提醒", title: "请及时续期你的 MiniMaaS 服务", audience: "已停用用户 · 16 人", audienceType: "条件筛选", total: 16, success: 0, failure: 16, status: "failed", operator: "LM", time: "2026-08-25 09:40", filters: { ...defaultFilters, status: "已停用" }, form: { ...initialForm, taskName: "服务到期提醒", title: "请及时续期你的 MiniMaaS 服务" } },
];

const statusLabels: Record<RecordStatus, string> = { sending: "发送中", completed: "已完成", partial: "部分失败", failed: "失败" };
const statusTones: Record<RecordStatus, string> = { sending: "blue", completed: "success", partial: "warning", failed: "danger" };

function matchesActive(user: JingmeUser, range: RecipientFilters["active"]) {
  if (range === "all") return true;
  if (range === "7d") return ["今天 14:08", "今天 11:42", "昨天 18:16", "昨天 16:20", "3 天前", "5 天前"].includes(user.lastActive);
  if (range === "30d") return !user.lastActive.includes("36 天");
  return user.lastActive.includes("天前") && !["3 天前", "5 天前", "8 天前", "12 天前"].includes(user.lastActive);
}

function countLabel(value: number) {
  return value.toLocaleString("zh-CN");
}

const filterNames: Record<keyof RecipientFilters, string> = {
  tenant: "租户",
  status: "状态",
  active: "活跃",
  usage: "用量",
  tag: "标签",
};

function formatFilterValue(key: keyof RecipientFilters, value: string) {
  if (key === "active") return ({ "7d": "7 天内", "30d": "30 天内", older: "30 天以上未活跃" } as Record<string, string>)[value] ?? value;
  return value;
}

function FieldLabel({ label, count }: { label: string; count?: string }) {
  return <div className="jingme-field-label"><label>{label}</label>{count ? <span>{count}</span> : null}</div>;
}

function StatusBadge({ status }: { status: RecordStatus }) {
  return <span className={`jingme-status ${statusTones[status]}`}><i />{statusLabels[status]}</span>;
}

function JingmePreview({ form }: { form: CardForm }) {
  return (
    <aside className="jingme-preview-panel">
      <div className="jingme-preview-heading">
        <div><span className="jingme-section-index">03</span><h3>京 ME 预览</h3></div>
        <span className="jingme-live-label"><i />实时预览</span>
      </div>
      <div className="jingme-phone-frame">
        <div className="jingme-phone-top"><span>京 ME</span><span>刚刚</span></div>
        <div className="jingme-message-row">
          <span className="jingme-avatar">M</span>
          <div><strong>MiniMaaS</strong><small>运营消息</small></div>
        </div>
        <div className="jingme-message-card">
          <span className="jingme-card-mark">京 ME 消息</span>
          <h4>{form.title || "卡片标题"}</h4>
          <p>{form.body || "通知内容将在这里展示。"}</p>
          <button type="button" disabled={!form.buttonLabel}>
            {form.buttonLabel || "查看详情"}<ArrowSquareOutIcon size={14} />
          </button>
        </div>
        <p className="jingme-preview-note"><InfoIcon size={13} />实际样式以京 ME 客户端为准</p>
      </div>
    </aside>
  );
}

function RecipientTable({ users, selectedIds, onToggle, onToggleAll }: { users: JingmeUser[]; selectedIds: string[]; onToggle: (id: string) => void; onToggleAll: () => void }) {
  const allSelected = users.length > 0 && users.every((user) => selectedIds.includes(user.id));
  return (
    <div className="jingme-user-table-wrap">
      <table className="jingme-user-table">
        <thead><tr><th><input type="checkbox" aria-label="全选当前结果" checked={allSelected} onChange={onToggleAll} /></th><th>用户</th><th>京 ME 账号</th><th>所属租户</th><th>最近活跃</th><th>状态</th><th>标签</th></tr></thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className={selectedIds.includes(user.id) ? "selected" : ""}>
              <td><input type="checkbox" aria-label={`选择${user.name}`} checked={selectedIds.includes(user.id)} onChange={() => onToggle(user.id)} /></td>
              <td><strong>{user.name}</strong><small>{user.employeeId}</small></td>
              <td><code>{user.account}</code></td>
              <td>{user.tenant}</td>
              <td>{user.lastActive}</td>
              <td><span className={`jingme-user-status ${user.status === "正常" ? "ok" : user.status === "即将到期" ? "warning" : "muted"}`}>{user.status}</span></td>
              <td><div className="jingme-tag-list">{user.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 ? <div className="jingme-table-empty"><UsersThreeIcon size={22} />没有匹配的用户，请调整筛选条件。</div> : null}
    </div>
  );
}

function ConfirmModal({ form, users, onClose, onConfirm, sending }: { form: CardForm; users: JingmeUser[]; onClose: () => void; onConfirm: () => void; sending: boolean }) {
  const [checked, setChecked] = useState(false);
  const previewUsers = users.slice(0, 3).map((user) => user.name).join("、");
  return (
    <div className="jingme-modal-layer" role="presentation">
      <button className="jingme-modal-backdrop" type="button" aria-label="关闭确认弹窗" onClick={onClose} />
      <section className="jingme-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="jingme-confirm-title">
        <header><div><span className="jingme-modal-icon"><PaperPlaneRightIcon size={18} /></span><div><h2 id="jingme-confirm-title">确认发送京 ME 卡片？</h2><p>发送后不可撤回，请再次确认触达对象与跳转地址。</p></div></div><button type="button" onClick={onClose} aria-label="关闭"><XIcon size={18} /></button></header>
        <div className="jingme-confirm-summary">
          <div><span>发送任务</span><strong>{form.taskName || "未命名任务"}</strong></div>
          <div><span>触达对象</span><strong>{countLabel(users.length)} 人</strong><small>{previewUsers}{users.length > 3 ? ` 等 ${countLabel(users.length)} 人` : ""}</small></div>
          <div><span>卡片标题</span><strong>{form.title || "未填写"}</strong></div>
          <div><span>跳转地址</span><strong className="jingme-url-value">{form.url || "未填写"}</strong></div>
        </div>
        <div className="jingme-confirm-card"><span>{form.buttonLabel || "查看详情"}</span><p>{form.body || "通知内容未填写"}</p></div>
        <label className="jingme-confirm-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span>我已确认触达对象和卡片内容无误</span></label>
        <footer><button className="jingme-btn secondary" type="button" onClick={onClose}>返回修改</button><button className="jingme-btn primary" type="button" disabled={!checked || sending} onClick={onConfirm}>{sending ? "发送中…" : "确认发送"}<ArrowRightIcon size={14} /></button></footer>
      </section>
    </div>
  );
}

function RecordDetail({ record, onClose, onResend }: { record: JingmeRecord; onClose: () => void; onResend: (record: JingmeRecord) => void }) {
  return (
    <div className="jingme-drawer-layer" role="presentation">
      <button className="jingme-drawer-backdrop" type="button" aria-label="关闭详情" onClick={onClose} />
      <aside className="jingme-drawer" role="dialog" aria-modal="true" aria-labelledby="jingme-drawer-title">
        <header><div><span className="jingme-drawer-kicker">发送任务详情</span><h2 id="jingme-drawer-title">{record.taskName}</h2><p>{record.time} · {record.operator}</p></div><button type="button" onClick={onClose} aria-label="关闭"><XIcon size={19} /></button></header>
        <div className="jingme-drawer-content">
          <section className="jingme-drawer-section"><h3>发送结果</h3><div className="jingme-result-grid"><div><strong>{countLabel(record.total)}</strong><span>触达总数</span></div><div className="success"><strong>{countLabel(record.success)}</strong><span>发送成功</span></div><div className="failure"><strong>{countLabel(record.failure)}</strong><span>发送失败</span></div></div><div className="jingme-result-progress"><span style={{ width: `${record.total ? (record.success / record.total) * 100 : 0}%` }} /></div><StatusBadge status={record.status} /></section>
          <section className="jingme-drawer-section"><h3>触达条件快照</h3><div className="jingme-condition-list"><div><span>触达方式</span><strong>{record.audienceType}</strong></div><div><span>目标范围</span><strong>{record.audience}</strong></div><div><span>用户状态</span><strong>{record.filters.status === "all" ? "全部正常用户" : record.filters.status}</strong></div><div><span>用量状态</span><strong>{record.filters.usage === "all" ? "不限" : record.filters.usage}</strong></div></div></section>
          <section className="jingme-drawer-section"><h3>卡片内容快照</h3><div className="jingme-snapshot-card"><span>京 ME 消息</span><strong>{record.form.title}</strong><p>{record.form.body}</p><button type="button" disabled>{record.form.buttonLabel}<ArrowSquareOutIcon size={13} /></button></div><div className="jingme-snapshot-url"><LinkIcon size={13} />{record.form.url}</div></section>
          {record.failure > 0 ? <div className="jingme-failure-note"><WarningCircleIcon size={16} /><div><strong>失败摘要</strong><p>部分用户未绑定京 ME 或发送超时，演示数据仅展示失败状态。</p></div></div> : null}
        </div>
        <footer><button className="jingme-btn secondary" type="button" onClick={onClose}>关闭</button><button className="jingme-btn primary" type="button" onClick={() => onResend(record)}><RepeatIcon size={14} />使用此内容再次发送</button></footer>
      </aside>
    </div>
  );
}

export function JingmeCardsPage() {
  const [tab, setTab] = useState<JingmeTab>("send");
  const [mode, setMode] = useState<RecipientMode>("exact");
  const [exactQuery, setExactQuery] = useState("");
  const [filterDraft, setFilterDraft] = useState<RecipientFilters>(defaultFilters);
  const [filters, setFilters] = useState<RecipientFilters>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(["u-01", "u-04"]);
  const [form, setForm] = useState<CardForm>(initialForm);
  const [records, setRecords] = useState<JingmeRecord[]>(initialRecords);
  const [recordQuery, setRecordQuery] = useState("");
  const [recordStatus, setRecordStatus] = useState<"all" | RecordStatus>("all");
  const [recordType, setRecordType] = useState<"all" | JingmeRecord["audienceType"]>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [detailRecord, setDetailRecord] = useState<JingmeRecord | null>(null);
  const [toast, setToast] = useState("");

  const visibleUsers = useMemo(() => {
    if (mode === "exact") {
      const query = exactQuery.trim().toLowerCase();
      return seedUsers.filter((user) => !query || [user.name, user.employeeId, user.account].some((value) => value.toLowerCase().includes(query)));
    }
    return seedUsers.filter((user) => (
      (filters.tenant === "all" || user.tenant === filters.tenant) &&
      (filters.status === "all" || user.status === filters.status) &&
      (filters.usage === "all" || user.usage === filters.usage) &&
      (filters.tag === "all" || user.tags.includes(filters.tag)) &&
      matchesActive(user, filters.active)
    ));
  }, [exactQuery, filters, mode]);

  const selectedUsers = useMemo(() => seedUsers.filter((user) => selectedIds.includes(user.id)), [selectedIds]);
  const activeFilterEntries = useMemo(() => (Object.entries(filters) as [keyof RecipientFilters, string][]).filter(([, value]) => value !== "all"), [filters]);
  const formReady = Boolean(form.taskName.trim() && form.title.trim() && form.body.trim() && form.buttonLabel.trim() && /^https?:\/\//u.test(form.url));
  const filteredRecords = useMemo(() => records.filter((record) => {
    const query = recordQuery.trim().toLowerCase();
    const matchesQuery = !query || [record.taskName, record.title, record.operator].some((value) => value.toLowerCase().includes(query));
    return matchesQuery && (recordStatus === "all" || record.status === recordStatus) && (recordType === "all" || record.audienceType === recordType);
  }), [recordQuery, recordStatus, recordType, records]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const updateForm = (key: keyof CardForm, value: string) => setForm((current) => ({ ...current, [key]: value } as CardForm));
  const updateFilter = (key: keyof RecipientFilters, value: string) => setFilterDraft((current) => ({ ...current, [key]: value } as RecipientFilters));
  const clearAppliedFilter = (key: keyof RecipientFilters) => {
    const next = { ...filters, [key]: "all" } as RecipientFilters;
    setFilters(next);
    setFilterDraft(next);
  };
  const toggleUser = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAll = () => {
    const visibleIds = visibleUsers.map((user) => user.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])]);
  };
  const resetAudience = () => { setExactQuery(""); setFilterDraft(defaultFilters); setFilters(defaultFilters); setSelectedIds([]); setFilterOpen(false); };
  const confirmSend = () => {
    setSending(true);
    window.setTimeout(() => {
      const total = selectedUsers.length;
      const success = Math.max(0, total - (total > 4 ? 1 : 0));
      const nextRecord: JingmeRecord = { id: `record-${Date.now()}`, taskName: form.taskName, title: form.title, audience: `${mode === "exact" ? "精确选择" : "条件筛选"} · ${countLabel(total)} 人`, audienceType: mode === "exact" ? "精确选择" : "条件筛选", total, success, failure: total - success, status: total - success > 0 ? "partial" : "completed", operator: "ZY", time: "2026-08-27 14:36", filters: { ...filters }, form: { ...form } };
      setRecords((current) => [nextRecord, ...current]);
      setConfirmOpen(false);
      setSending(false);
      setTab("records");
      showToast(`已发送给 ${countLabel(total)} 位用户，记录已生成`);
    }, 720);
  };
  const resend = (record: JingmeRecord) => {
    setForm({ ...record.form });
    setMode("exact");
    setSelectedIds([]);
    setDetailRecord(null);
    setTab("send");
    showToast("卡片内容已回填，请重新选择收件人");
  };

  return (
    <main className="jingme-page">
      <header className="jingme-page-head">
        <div><div className="jingme-eyebrow"><MegaphoneIcon size={15} />运营 / 京 ME 触达</div><h2>京 ME 触达</h2><p>向指定用户发送可跳转的消息卡片，并追踪发送结果。</p></div>
        <div className="jingme-head-actions"><span className="jingme-head-status"><i />演示数据</span><button className="jingme-btn secondary" type="button" onClick={() => setTab("records")}><ClockCounterClockwiseIcon size={15} />发送记录</button></div>
      </header>
      <nav className="jingme-tabs" aria-label="京 ME 触达页签"><button type="button" className={tab === "send" ? "active" : ""} onClick={() => setTab("send")}><PaperPlaneRightIcon size={15} />发送卡片</button><button type="button" className={tab === "records" ? "active" : ""} onClick={() => setTab("records")}><ClockCounterClockwiseIcon size={15} />发送记录<span>{records.length}</span></button></nav>

      {tab === "send" ? <>
        <section className="jingme-panel jingme-audience-panel">
          <div className="jingme-panel-head"><div><div className="jingme-title-line"><span className="jingme-section-index">01</span><h3>选择触达用户</h3></div><p>支持精确选人或按运营条件批量筛选，已选择用户会保留。</p></div><div className="jingme-audience-count"><strong>{countLabel(selectedUsers.length)}</strong><span>预计触达人数</span></div></div>
          <div className="jingme-mode-tabs"><button type="button" className={mode === "exact" ? "active" : ""} onClick={() => setMode("exact")}><UserCircleIcon size={15} />精确选择</button><button type="button" className={mode === "filter" ? "active" : ""} onClick={() => setMode("filter")}><FunnelSimpleIcon size={15} />条件筛选</button></div>
          {mode === "exact" ? <div className="jingme-audience-toolbar"><div className="jingme-search-field"><MagnifyingGlassIcon size={15} /><input aria-label="搜索用户" placeholder="搜索姓名、工号或京 ME 账号" value={exactQuery} onChange={(event) => setExactQuery(event.target.value)} /></div><span className="jingme-toolbar-hint">仅展示已绑定京 ME 且账号状态正常的用户</span><button className="jingme-text-button" type="button" onClick={() => setSelectedIds([])}>清空选择</button></div> : <div className="jingme-filter-box"><div className="jingme-filter-summary"><button className={`jingme-filter-toggle ${filterOpen ? "open" : ""}`} type="button" onClick={() => setFilterOpen((value) => !value)}><FunnelSimpleIcon size={14} />筛选条件{activeFilterEntries.length > 0 ? <span>{activeFilterEntries.length}</span> : null}<CaretDownIcon size={13} /></button><div className="jingme-filter-chips">{activeFilterEntries.length > 0 ? activeFilterEntries.map(([key, value]) => <span className="jingme-filter-chip" key={key}>{filterNames[key]}：{formatFilterValue(key, value)}<button type="button" aria-label={`移除${filterNames[key]}筛选`} onClick={() => clearAppliedFilter(key)}><XIcon size={10} /></button></span>) : <span className="jingme-filter-empty-label">未添加筛选条件</span>}</div><span className="jingme-filter-result">结果 <strong>{countLabel(visibleUsers.length)}</strong> 人</span><button className="jingme-text-button" type="button" onClick={() => { setFilterDraft(defaultFilters); setFilters(defaultFilters); setFilterOpen(false); }}>重置</button></div>{filterOpen ? <div className="jingme-filter-popover"><div className="jingme-filter-grid"><label><span>所属租户</span><select value={filterDraft.tenant} onChange={(event) => updateFilter("tenant", event.target.value)}><option value="all">全部租户</option><option>南京智客</option><option>云智慧</option><option>Context-in</option><option>内部体验租户</option></select></label><label><span>用户状态</span><select value={filterDraft.status} onChange={(event) => updateFilter("status", event.target.value)}><option value="all">全部状态</option><option>正常</option><option>即将到期</option><option>已停用</option></select></label><label><span>最近活跃</span><select value={filterDraft.active} onChange={(event) => updateFilter("active", event.target.value)}><option value="all">全部时间</option><option value="7d">7 天内</option><option value="30d">30 天内</option><option value="older">30 天以上未活跃</option></select></label><label><span>用量状态</span><select value={filterDraft.usage} onChange={(event) => updateFilter("usage", event.target.value)}><option value="all">全部用量</option><option>用量正常</option><option>接近额度</option><option>已超额度</option><option>无调用记录</option></select></label><label><span>用户标签</span><select value={filterDraft.tag} onChange={(event) => updateFilter("tag", event.target.value)}><option value="all">全部标签</option><option>企业用户</option><option>个人用户</option><option>高用量</option><option>新用户</option><option>重点保障</option></select></label><div className="jingme-filter-actions"><button className="jingme-btn secondary compact" type="button" onClick={() => { setFilters(filterDraft); setFilterOpen(false); }}><SlidersHorizontalIcon size={14} />应用筛选</button><button className="jingme-btn ghost compact" type="button" onClick={() => { setFilterDraft(defaultFilters); setFilters(defaultFilters); }}>清空</button></div></div><p className="jingme-filter-note"><InfoIcon size={13} />条件之间按 AND 关系组合；正式发送前仍可逐个取消用户。</p></div> : null}</div>}
          <div className="jingme-result-bar">{mode === "exact" ? <span>结果 <strong>{countLabel(visibleUsers.length)}</strong> 人</span> : null}<span>已选择 <strong>{countLabel(selectedUsers.length)}</strong> 人</span><button className="jingme-text-button" type="button" onClick={resetAudience}>重置受众</button></div>
          <RecipientTable users={visibleUsers} selectedIds={selectedIds} onToggle={toggleUser} onToggleAll={toggleAll} />
        </section>
        <div className="jingme-editor-layout">
          <section className="jingme-panel jingme-editor-panel">
            <div className="jingme-panel-head"><div><div className="jingme-title-line"><span className="jingme-section-index">02</span><h3>编辑卡片内容</h3></div><p>内容修改会实时同步到右侧京 ME 预览。</p></div><span className={`jingme-form-state ${formReady ? "ready" : ""}`}><i />{formReady ? "内容已完成" : "待完善"}</span></div>
            <div className="jingme-form-grid">
              <div className="jingme-form-field full"><FieldLabel label="发送任务名称" count={`${form.taskName.length}/30`} /><input value={form.taskName} maxLength={30} placeholder="例如：高用量用户额度提醒" onChange={(event) => updateForm("taskName", event.target.value)} /><small>仅在后台记录中展示，不会出现在用户卡片里。</small></div>
              <div className="jingme-form-field full"><FieldLabel label="卡片标题" count={`${form.title.length}/30`} /><input value={form.title} maxLength={30} placeholder="请输入卡片标题" onChange={(event) => updateForm("title", event.target.value)} /></div>
              <div className="jingme-form-field full"><FieldLabel label="通知内容" count={`${form.body.length}/300`} /><textarea value={form.body} maxLength={300} rows={4} placeholder="请输入要通知用户的具体内容" onChange={(event) => updateForm("body", event.target.value)} /></div>
              <div className="jingme-form-field"><FieldLabel label="按钮文案" count={`${form.buttonLabel.length}/10`} /><input value={form.buttonLabel} maxLength={10} placeholder="例如：查看详情" onChange={(event) => updateForm("buttonLabel", event.target.value)} /></div>
              <div className="jingme-form-field"><FieldLabel label="打开方式" /><select value={form.openMode} onChange={(event) => updateForm("openMode", event.target.value)}><option value="inside">京 ME 内打开</option><option value="browser">系统浏览器打开</option></select></div>
              <div className="jingme-form-field full"><FieldLabel label="跳转地址" /><div className="jingme-input-with-action"><LinkIcon size={14} /><input value={form.url} placeholder="https://" onChange={(event) => updateForm("url", event.target.value)} /><button type="button" onClick={() => showToast(/^https?:\/\//u.test(form.url) ? "链接格式校验通过" : "请输入 http 或 https 开头的链接")}>校验链接</button></div>{form.url && !/^https?:\/\//u.test(form.url) ? <small className="jingme-error-text"><WarningCircleIcon size={12} />链接需以 http:// 或 https:// 开头</small> : <small>演示版只校验格式，不会真正访问外部页面。</small>}</div>
            </div>
          </section>
          <JingmePreview form={form} />
        </div>
        <div className="jingme-send-bar"><span><UsersThreeIcon size={15} />已选择 <strong>{countLabel(selectedUsers.length)} 人</strong>{formReady ? " · 卡片内容已完成" : " · 还有必填项待完善"}</span><div><button className="jingme-btn ghost" type="button" onClick={() => { setForm(initialForm); showToast("卡片内容已恢复默认示例"); }}><NotePencilIcon size={14} />恢复示例</button><button className="jingme-btn secondary" type="button" disabled={!formReady} onClick={() => showToast("已向当前操作人发送测试卡片")}>发送测试</button><button className="jingme-btn primary" type="button" disabled={!formReady || selectedUsers.length === 0} onClick={() => setConfirmOpen(true)}><PaperPlaneRightIcon size={14} />预览并发送</button></div></div>
      </> : <section className="jingme-records-view">
        <div className="jingme-metrics"><div><span>近 7 日发送任务</span><strong>18</strong><small>较上周 +4</small></div><div><span>近 7 日触达用户</span><strong>3,842</strong><small>覆盖 6 个租户</small></div><div><span>近 7 日发送成功率</span><strong>98.6%</strong><small className="positive">较上周 +1.2%</small></div></div>
        <section className="jingme-panel jingme-record-panel"><div className="jingme-panel-head"><div><div className="jingme-title-line"><span className="jingme-section-index">04</span><h3>发送记录</h3></div><p>保留每次发送时的受众条件和卡片快照，便于追溯。</p></div><span className="jingme-record-count">共 {filteredRecords.length} 条</span></div><div className="jingme-record-toolbar"><div className="jingme-search-field"><MagnifyingGlassIcon size={15} /><input aria-label="搜索发送记录" placeholder="搜索任务名称、卡片标题或操作人" value={recordQuery} onChange={(event) => setRecordQuery(event.target.value)} /></div><select aria-label="按发送状态筛选" value={recordStatus} onChange={(event) => setRecordStatus(event.target.value as "all" | RecordStatus)}><option value="all">全部状态</option><option value="sending">发送中</option><option value="completed">已完成</option><option value="partial">部分失败</option><option value="failed">失败</option></select><select aria-label="按触达方式筛选" value={recordType} onChange={(event) => setRecordType(event.target.value as "all" | JingmeRecord["audienceType"])}><option value="all">全部触达方式</option><option>精确选择</option><option>条件筛选</option></select><button className="jingme-btn ghost compact" type="button" onClick={() => { setRecordQuery(""); setRecordStatus("all"); setRecordType("all"); }}>重置</button></div><div className="jingme-record-table-wrap"><table className="jingme-record-table"><thead><tr><th>任务名称</th><th>触达对象</th><th>发送结果</th><th>状态</th><th>操作人</th><th>发送时间</th><th>操作</th></tr></thead><tbody>{filteredRecords.map((record) => <tr key={record.id}><td><strong>{record.taskName}</strong><small>{record.title}</small></td><td>{record.audience}<small>{record.audienceType}</small></td><td><strong>{countLabel(record.success)} / {countLabel(record.total)}</strong>{record.failure > 0 ? <small className="failure-text">失败 {countLabel(record.failure)} 人</small> : <small className="success-text">全部发送成功</small>}</td><td><StatusBadge status={record.status} /></td><td>{record.operator}</td><td>{record.time}</td><td><div className="jingme-row-actions"><button type="button" onClick={() => setDetailRecord(record)}><EyeIcon size={14} />详情</button><button type="button" onClick={() => resend(record)}><RepeatIcon size={14} />再次发送</button></div></td></tr>)}</tbody></table>{filteredRecords.length === 0 ? <div className="jingme-table-empty"><MagnifyingGlassIcon size={22} />没有匹配的发送记录，请调整筛选条件。</div> : null}</div></section>
      </section>}
      {confirmOpen ? <ConfirmModal form={form} users={selectedUsers} onClose={() => setConfirmOpen(false)} onConfirm={confirmSend} sending={sending} /> : null}
      {detailRecord ? <RecordDetail record={detailRecord} onClose={() => setDetailRecord(null)} onResend={resend} /> : null}
      {toast ? <div className="jingme-toast" role="status"><CheckCircleIcon size={17} />{toast}</div> : null}
    </main>
  );
}
