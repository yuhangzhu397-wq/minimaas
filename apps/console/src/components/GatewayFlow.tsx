import {
  ChartLineIcon,
  CubeIcon,
  FlowArrowIcon,
  KeyIcon,
  SlidersIcon,
} from "@phosphor-icons/react";

const steps = [
  ["鉴权", "通过", KeyIcon],
  ["限流", "原子", SlidersIcon],
  ["路由", "通过", FlowArrowIcon],
  ["模型", "Mock", CubeIcon],
  ["计量", "结算", ChartLineIcon],
] as const;

export function GatewayFlow() {
  return (
    <section className="flow-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Request anatomy</span>
          <h2>网关数据流</h2>
        </div>
        <span className="trace-id">REQ_8F2A</span>
      </div>
      <div className="flow-steps">
        {steps.map(([label, status, Icon], index) => (
          <div className="flow-fragment" key={label}>
            <div className="flow-step">
              <span className="flow-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Icon size={21} weight="light" />
              <strong>{label}</strong>
              <small>{status}</small>
            </div>
            {index < steps.length - 1 ? (
              <span className="flow-line" aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="flow-request">
        <span>完整链路耗时</span>
        <strong>
          120<small>ms</small>
        </strong>
        <span>五个阶段全部通过</span>
      </div>
    </section>
  );
}
