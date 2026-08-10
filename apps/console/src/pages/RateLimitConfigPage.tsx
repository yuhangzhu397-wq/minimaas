import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  GaugeIcon,
  ShieldCheckIcon,
  SparkleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

export interface RateLimitConfigModel {
  id: string;
  name: string;
  rpm: string;
  rpmRate: number;
  tpm: string;
  tpmRate: number;
  failureRate: number;
}

interface RateLimitConfigPageProps {
  pin: {
    id: string;
    code: string;
    name: string;
  };
  model: RateLimitConfigModel;
  onBack: () => void;
}

type SimulationResult = {
  rpmBefore: number;
  rpmAfter: number;
  tpmBefore: number;
  tpmAfter: number;
} | null;

const integerFormat = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 0,
});

function readCapacity(value: string) {
  const [currentRaw = "0", limitRaw = "0"] = value.split("/").map((item) => item.trim());
  const parse = (input: string) => Number(input.replaceAll(",", ""));
  return {
    current: Number.isFinite(parse(currentRaw)) ? parse(currentRaw) : 0,
    limit: limitRaw === "未设置" || !Number.isFinite(parse(limitRaw)) ? 0 : parse(limitRaw),
  };
}

function percentChange(before: number, after: number) {
  if (before <= 0) return 0;
  return ((after - before) / before) * 100;
}

export function RateLimitConfigPage({ pin, model, onBack }: RateLimitConfigPageProps) {
  const rpmCapacity = useMemo(() => readCapacity(model.rpm), [model.rpm]);
  const tpmCapacity = useMemo(() => readCapacity(model.tpm), [model.tpm]);
  const [rpmLimit, setRpmLimit] = useState(rpmCapacity.limit || 1_000);
  const [tpmLimit, setTpmLimit] = useState(tpmCapacity.limit || 100_000);
  const [maxIncrease, setMaxIncrease] = useState(20);
  const [cooldown, setCooldown] = useState(30);
  const [effectiveTime, setEffectiveTime] = useState("审批通过后立即生效");
  const [reason, setReason] = useState("根据近期模型调用水位调整用户模型限额");
  const [simulation, setSimulation] = useState<SimulationResult>(null);
  const [submitted, setSubmitted] = useState(false);

  const rpmChange = percentChange(rpmCapacity.limit, rpmLimit);
  const tpmChange = percentChange(tpmCapacity.limit, tpmLimit);
  const hasChange = rpmLimit !== rpmCapacity.limit || tpmLimit !== tpmCapacity.limit;
  const withinIncreasePolicy = rpmChange <= maxIncrease && tpmChange <= maxIncrease;
  const positiveLimits = rpmLimit > 0 && tpmLimit > 0;
  const supplierHealthy = true;
  const validationPassed = positiveLimits && withinIncreasePolicy && supplierHealthy;

  const agentAction = model.tpmRate >= 80 || model.rpmRate >= 80
    ? "建议扩容"
    : model.tpmRate < 10 && model.rpmRate < 10
      ? "建议保持"
      : "建议观察";

  const actionTone = agentAction === "建议扩容" ? "warning" : "safe";

  const resetToCurrent = () => {
    setRpmLimit(rpmCapacity.limit || 1_000);
    setTpmLimit(tpmCapacity.limit || 100_000);
    setSimulation(null);
    setSubmitted(false);
  };

  const runSimulation = () => {
    if (!validationPassed) return;
    setSubmitted(false);
    setSimulation({
      rpmBefore: rpmCapacity.limit,
      rpmAfter: rpmLimit,
      tpmBefore: tpmCapacity.limit,
      tpmAfter: tpmLimit,
    });
  };

  return (
    <main className="water-level-page rate-limit-config-page">
      <header className="supplier-monitor-breadcrumb rate-limit-breadcrumb">
        <button type="button" aria-label="返回用户模型监控" onClick={onBack}>
          <ArrowLeftIcon size={17} />
        </button>
        <strong>用户监控</strong>
        <b>/</b>
        <strong>{pin.name}</strong>
        <b>/</b>
        <em>{model.name} · 限流配置</em>
      </header>

      <section className="rate-limit-titlebar">
        <div>
          <span className="rate-limit-index">01</span>
          <div>
            <h2>限流配置</h2>
            <p>配置用户在当前模型下的 TPM 与 RPM 上限，提交后进入人工审批。</p>
          </div>
        </div>
        <span className="rate-limit-draft">草稿 · 尚未生效</span>
      </section>

      {submitted ? (
        <div className="rate-limit-notice success" role="status">
          <CheckCircleIcon size={18} weight="fill" />
          <div>
            <strong>审批单 DQ-20260727-0042 已提交</strong>
            <span>当前线上限额保持不变，审批通过后才会进入配置执行流程。</span>
          </div>
        </div>
      ) : null}

      <section className="rate-limit-context" aria-label="当前限流对象">
        <article>
          <span>用户</span>
          <strong>{pin.name}</strong>
          <small>{pin.code}</small>
        </article>
        <article>
          <span>模型</span>
          <strong>{model.name}</strong>
          <small>用户模型级配置</small>
        </article>
        <article>
          <span>当前 TPM 上限</span>
          <strong>{integerFormat.format(tpmCapacity.limit)}</strong>
          <small>当前 {integerFormat.format(tpmCapacity.current)} · 利用率 {model.tpmRate.toFixed(2)}%</small>
        </article>
        <article>
          <span>当前 RPM 上限</span>
          <strong>{integerFormat.format(rpmCapacity.limit)}</strong>
          <small>当前 {integerFormat.format(rpmCapacity.current)} · 利用率 {model.rpmRate.toFixed(2)}%</small>
        </article>
      </section>

      <div className="rate-limit-workspace">
        <section className="rate-limit-form-panel">
          <header className="rate-limit-section-head">
            <div><span>02</span><div><h3>目标限额</h3><p>本次提交仅生成审批草稿，不直接修改网关配置。</p></div></div>
            <button type="button" onClick={resetToCurrent}>恢复当前值</button>
          </header>

          <div className="rate-limit-field-grid">
            <label>
              <span>TPM 上限 <b>Token/min</b></span>
              <input
                aria-label="TPM 上限"
                min="1"
                step="1000"
                type="number"
                value={tpmLimit}
                onChange={(event) => {
                  setTpmLimit(Number(event.target.value));
                  setSimulation(null);
                  setSubmitted(false);
                }}
              />
              <small className={tpmChange > maxIncrease ? "danger" : ""}>
                较当前 {tpmChange >= 0 ? "+" : ""}{tpmChange.toFixed(1)}%
              </small>
            </label>
            <label>
              <span>RPM 上限 <b>次/min</b></span>
              <input
                aria-label="RPM 上限"
                min="1"
                step="100"
                type="number"
                value={rpmLimit}
                onChange={(event) => {
                  setRpmLimit(Number(event.target.value));
                  setSimulation(null);
                  setSubmitted(false);
                }}
              />
              <small className={rpmChange > maxIncrease ? "danger" : ""}>
                较当前 {rpmChange >= 0 ? "+" : ""}{rpmChange.toFixed(1)}%
              </small>
            </label>
          </div>

          <div className="rate-limit-rule-grid">
            <label><span>单次最大增幅</span><select value={maxIncrease} onChange={(event) => setMaxIncrease(Number(event.target.value))}><option value="10">10%</option><option value="20">20%</option><option value="30">30%</option></select></label>
            <label><span>冷却时间</span><select value={cooldown} onChange={(event) => setCooldown(Number(event.target.value))}><option value="15">15 分钟</option><option value="30">30 分钟</option><option value="60">60 分钟</option></select></label>
            <label><span>生效方式</span><select value={effectiveTime} onChange={(event) => setEffectiveTime(event.target.value)}><option>审批通过后立即生效</option><option>指定时间生效</option></select></label>
          </div>

          <label className="rate-limit-reason">
            <span>调整原因</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
        </section>

        <aside className="rate-limit-decision-panel">
          <section className="rate-limit-agent-card">
            <header><div><SparkleIcon size={17} weight="fill" /><span>Agent 建议</span></div><strong className={actionTone}>{agentAction}</strong></header>
            <p>当前 TPM、RPM 利用率均低于 10%，调用失败率为 {model.failureRate.toFixed(2)}%，未发现持续限流风险。</p>
            <dl>
              <div><dt>TPM 建议值</dt><dd>{integerFormat.format(tpmCapacity.limit)}</dd></div>
              <div><dt>RPM 建议值</dt><dd>{integerFormat.format(rpmCapacity.limit)}</dd></div>
              <div><dt>判断置信度</dt><dd>92%</dd></div>
            </dl>
            <small>Agent 只提供建议，最终变更必须经过 Policy 校验和人工审批。</small>
          </section>

          <section className="rate-limit-validator-card">
            <header><div><ShieldCheckIcon size={17} /><span>Policy Validator</span></div><strong className={validationPassed ? "safe" : "danger"}>{validationPassed ? "校验通过" : "存在风险"}</strong></header>
            <ul>
              <li className={positiveLimits ? "passed" : "failed"}><CheckCircleIcon size={15} weight="fill" /><span>TPM、RPM 必须大于 0</span></li>
              <li className={withinIncreasePolicy ? "passed" : "failed"}>{withinIncreasePolicy ? <CheckCircleIcon size={15} weight="fill" /> : <WarningCircleIcon size={15} weight="fill" />}<span>单次增幅不超过 {maxIncrease}%</span></li>
              <li className="passed"><CheckCircleIcon size={15} weight="fill" /><span>供应商状态正常</span></li>
              <li className="passed"><ClockIcon size={15} weight="fill" /><span>生效后进入 {cooldown} 分钟冷却期</span></li>
            </ul>
          </section>

          {simulation ? (
            <section className="rate-limit-simulation" aria-label="模拟执行结果">
              <header><GaugeIcon size={17} /><strong>模拟执行结果</strong><span>DRY RUN</span></header>
              <div><span>TPM</span><b>{integerFormat.format(simulation.tpmBefore)}</b><i>→</i><strong>{integerFormat.format(simulation.tpmAfter)}</strong></div>
              <div><span>RPM</span><b>{integerFormat.format(simulation.rpmBefore)}</b><i>→</i><strong>{integerFormat.format(simulation.rpmAfter)}</strong></div>
              <small>校验已通过，没有写入网关或生产配置。</small>
            </section>
          ) : null}
        </aside>
      </div>

      <footer className="rate-limit-actions">
        <div><ShieldCheckIcon size={16} /><span>{validationPassed ? "当前配置满足 Policy，可以模拟或提交审批" : "请先处理未通过的 Policy 校验项"}</span></div>
        <div>
          <button type="button" className="secondary" onClick={onBack}>取消</button>
          <button type="button" className="secondary simulate" disabled={!validationPassed} onClick={runSimulation}>模拟执行</button>
          <button type="button" className="primary" disabled={!validationPassed || !hasChange || reason.trim().length === 0} onClick={() => setSubmitted(true)}>提交审批</button>
        </div>
      </footer>
    </main>
  );
}
