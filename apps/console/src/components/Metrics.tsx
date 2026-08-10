import type { DashboardOverview } from "@minimaas/contracts";
import {
  CheckCircleIcon,
  ClockIcon,
  CoinsIcon,
  TrendUpIcon,
} from "@phosphor-icons/react";

const formatter = new Intl.NumberFormat("zh-CN");

export function Metrics({ metrics }: Pick<DashboardOverview, "metrics">) {
  const items = [
    {
      label: "今日请求",
      value: formatter.format(metrics.requests),
      change: "+18.27%",
      Icon: TrendUpIcon,
      tone: "navy",
    },
    {
      label: "成功率",
      value: `${metrics.successRate.toFixed(2)}%`,
      change: "+0.23 pp",
      Icon: CheckCircleIcon,
      tone: "teal",
    },
    {
      label: "P95 延迟",
      value: `${(metrics.p95LatencyMs / 1000).toFixed(2)}s`,
      change: "−0.21s",
      Icon: ClockIcon,
      tone: "navy",
    },
    {
      label: "今日成本",
      value: `¥${metrics.costTodayCny.toFixed(2)}`,
      change: "预算内",
      Icon: CoinsIcon,
      tone: "amber",
    },
  ];

  return (
    <section className="metrics" aria-label="平台关键指标">
      {items.map(({ label, value, change, Icon, tone }, index) => (
        <article className={`metric metric-${index + 1}`} key={label}>
          <div className="metric-label">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span>{label}</span>
            <Icon size={19} weight="light" />
          </div>
          <strong className={tone}>{value}</strong>
          <span className="metric-change">
            较昨日 <b>{change}</b>
          </span>
        </article>
      ))}
    </section>
  );
}
