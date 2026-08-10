import {
  CheckIcon,
  CopyIcon,
  KeyIcon,
  PlusIcon,
  ProhibitIcon,
  SlidersHorizontalIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { type FormEvent, useState } from "react";
import { useTenants } from "../hooks/useTenants";

const compactNumber = new Intl.NumberFormat("zh-CN", { notation: "compact" });

export function TenantAccess() {
  const {
    data,
    status,
    createTenant,
    createApiKey,
    revokeApiKey,
    updateQuota,
  } = useTenants();
  const [selectedId, setSelectedId] = useState("");
  const [keyName, setKeyName] = useState("开发环境");
  const [revealedSecret, setRevealedSecret] = useState("");
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [showQuotaEditor, setShowQuotaEditor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selected = data.find((tenant) => tenant.id === selectedId) ?? data[0];

  const handleCreateKey = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !keyName.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await createApiKey(selected.id, keyName);
      setRevealedSecret(result.secret);
      sessionStorage.setItem("minimaas.gatewayApiKey", result.secret);
      setKeyName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建失败");
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (keyId: string, prefix: string) => {
    await revokeApiKey(keyId);
    const sessionKey = sessionStorage.getItem("minimaas.gatewayApiKey");
    if (sessionKey?.startsWith(prefix)) {
      sessionStorage.removeItem("minimaas.gatewayApiKey");
      setRevealedSecret("");
    }
  };

  const handleUpdateQuota = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await updateQuota(selected.id, {
        rpmLimit: Number(form.get("rpmLimit")),
        tpmLimit: Number(form.get("tpmLimit")),
        dailyTokenQuota: Number(form.get("dailyTokenQuota")),
        monthlyBudgetCny: Number(form.get("monthlyBudgetCny")),
      });
      setShowQuotaEditor(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新失败");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const tenant = await createTenant({
        name: String(form.get("name")),
        allowedModels: ["smart-chat"],
        dailyTokenQuota: Number(form.get("quota")),
        monthlyBudgetCny: Number(form.get("budget")),
      });
      setSelectedId(tenant.id);
      setShowTenantForm(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="module-main tenant-page">
      <div className="tenant-workspace">
        <aside className="tenant-list" aria-label="租户列表">
          <header className="tenant-list-header">
            <div>
              <h3>租户</h3>
              <span className={`live-label ${status}`}>{status === "live" ? `${data.length} 个租户 · 已同步` : status === "loading" ? "正在同步" : "连接失败"}</span>
            </div>
            <button aria-label="新增租户" title="新增租户" type="button" onClick={() => setShowTenantForm((value) => !value)}>
              <PlusIcon size={15} />
            </button>
          </header>

          {showTenantForm && (
            <form className="tenant-create-panel" onSubmit={handleCreateTenant}>
              <label>租户名称<input name="name" defaultValue="Interview Lab" required /></label>
              <label>日 Token 配额<input name="quota" type="number" defaultValue="500000" min="1" required /></label>
              <label>月预算 / CNY<input name="budget" type="number" defaultValue="1000" min="1" required /></label>
              <button className="primary-action" disabled={busy} type="submit">创建租户</button>
            </form>
          )}

          <div className="tenant-list-items">
            {data.map((tenant, index) => (
              <button className={tenant.id === selected?.id ? "active" : ""} key={tenant.id} type="button" onClick={() => { setSelectedId(tenant.id); setRevealedSecret(""); setShowQuotaEditor(false); }}>
                <span className="tenant-sequence">{String(index + 1).padStart(2, "0")}</span>
                <span><strong>{tenant.name}</strong><small>{tenant.id}</small></span>
                <span className="tenant-key-count">{tenant.apiKeys.filter((key) => key.status === "active").length} keys</span>
              </button>
            ))}
          </div>
        </aside>

        {selected && (
          <div className="tenant-detail">
            <header>
              <div className="tenant-avatar"><UsersThreeIcon size={22} weight="light" /></div>
              <div><span>ACTIVE TENANT</span><h2>{selected.name}</h2></div>
              <div className="tenant-header-actions">
                <span className="status-mark"><i />服务中</span>
                <button type="button" onClick={() => setShowQuotaEditor((value) => !value)}>
                  <SlidersHorizontalIcon size={14} />配置配额
                </button>
              </div>
            </header>

            {showQuotaEditor && (
              <form className="quota-editor" onSubmit={handleUpdateQuota}>
                <label>RPM<input name="rpmLimit" type="number" min="1" defaultValue={selected.rpmLimit} required /></label>
                <label>TPM<input name="tpmLimit" type="number" min="1" defaultValue={selected.tpmLimit} required /></label>
                <label>日 Token 配额<input name="dailyTokenQuota" type="number" min="1" defaultValue={selected.dailyTokenQuota} required /></label>
                <label>月预算 / CNY<input name="monthlyBudgetCny" type="number" min="1" defaultValue={selected.monthlyBudgetCny} required /></label>
                <button className="primary-action" disabled={busy} type="submit">保存配置</button>
              </form>
            )}

            <div className="governance-stats">
              <div><span>授权模型</span><strong>{selected.allowedModels.length}</strong><small>{selected.allowedModels.join(" / ")}</small></div>
              <div><span>RPM</span><strong>{selected.rpmLimit}</strong><small>每分钟请求上限</small></div>
              <div><span>TPM</span><strong>{compactNumber.format(selected.tpmLimit)}</strong><small>含预估输出 Token</small></div>
              <div><span>月预算</span><strong>¥{selected.monthlyBudgetCny.toLocaleString()}</strong><small>达到 100% 后拒绝请求</small></div>
            </div>

            <div className="key-section-heading">
              <div><span className="section-index">02</span><h3>API Keys</h3></div>
              <form onSubmit={handleCreateKey}>
                <input aria-label="密钥名称" value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="密钥名称" />
                <button className="primary-action" disabled={busy || !keyName.trim()} type="submit"><KeyIcon size={14} />生成密钥</button>
              </form>
            </div>

            {revealedSecret && (
              <div className="secret-reveal" role="status">
                <CheckIcon size={17} />
                <div><strong>密钥仅展示这一次</strong><code>{revealedSecret}</code></div>
                <button type="button" aria-label="复制密钥" onClick={() => void navigator.clipboard.writeText(revealedSecret)}><CopyIcon size={16} /></button>
              </div>
            )}

            <div className="key-table">
              <div className="key-row key-header"><span>名称</span><span>前缀</span><span>最近使用</span><span>状态</span><span /></div>
              {selected.apiKeys.map((apiKey) => (
                <div className="key-row" key={apiKey.id}>
                  <strong>{apiKey.name}</strong><code>{apiKey.prefix}••••••••</code>
                  <span>{apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "尚未使用"}</span>
                  <span className={apiKey.status === "active" ? "key-active" : "key-revoked"}><i />{apiKey.status === "active" ? "有效" : "已撤销"}</span>
                  <button disabled={apiKey.status === "revoked"} type="button" onClick={() => void handleRevoke(apiKey.id, apiKey.prefix)}><ProhibitIcon size={15} />撤销</button>
                </div>
              ))}
              {selected.apiKeys.length === 0 && <div className="key-empty">这个租户还没有 API Key。</div>}
            </div>
          </div>
        )}
      </div>
      {message && <p className="form-error">{message}</p>}
    </main>
  );
}
