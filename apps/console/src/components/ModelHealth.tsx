import type { DashboardOverview } from "@minimaas/contracts";

const count = new Intl.NumberFormat("zh-CN");

export function ModelHealth({ models }: Pick<DashboardOverview, "models">) {
  return (
    <section className="model-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Provider pulse</span>
          <h2>模型健康状态</h2>
        </div>
        <span className="model-count">{models.length} PROVIDERS</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>模型提供商</th>
              <th>状态</th>
              <th>成功率</th>
              <th>P95</th>
              <th>今日调用</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id}>
                <td className="model-name">
                  {model.name}
                  <small>{model.id}</small>
                </td>
                <td>
                  <span className={`status-cell ${model.status}`}>
                    <i />
                    {model.status === "healthy"
                      ? "运行正常"
                      : model.status === "offline"
                        ? "当前离线"
                        : "性能降级"}
                  </span>
                </td>
                <td
                  className={model.status === "healthy" ? "positive" : "muted"}
                >
                  {model.status === "healthy"
                    ? `${model.successRate.toFixed(2)}%`
                    : "—"}
                </td>
                <td>{model.p95LatencyMs ? `${model.p95LatencyMs}ms` : "—"}</td>
                <td>{count.format(model.requestsToday)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
