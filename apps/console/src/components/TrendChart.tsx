import type { DashboardOverview } from "@minimaas/contracts";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TrendChart({ trend }: Pick<DashboardOverview, "trend">) {
  const [range, setRange] = useState<"24h" | "7d">("24h");
  const [refreshing, setRefreshing] = useState(false);
  const chartData = useMemo(() => {
    if (range === "24h") return trend;
    const days = ["周一", "周二", "周三", "周四", "周五", "周六", "今天"];
    return trend.map((point, index) => ({
      ...point,
      time: days[index] ?? point.time,
      requests: Math.round(point.requests * (5.8 + index * 0.12)),
      tokens: Math.round(point.tokens * (5.5 + index * 0.13)),
    }));
  }, [range, trend]);

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 650);
  };

  return (
    <section className="trend-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Traffic intelligence</span>
          <h2>请求与 Token 趋势</h2>
        </div>
        <div className="panel-actions" aria-label="趋势时间范围">
          <button
            className={range === "24h" ? "active" : ""}
            type="button"
            onClick={() => setRange("24h")}
          >
            24H
          </button>
          <button
            className={range === "7d" ? "active" : ""}
            type="button"
            onClick={() => setRange("7d")}
          >
            7D
          </button>
          <button
            className="refresh-button"
            type="button"
            aria-label="刷新趋势"
            onClick={refresh}
          >
            <ArrowClockwiseIcon
              className={refreshing ? "spinning" : ""}
              size={17}
              weight="light"
            />
          </button>
        </div>
      </div>
      <div className="chart-legend" aria-hidden="true">
        <span>
          <i className="legend-line navy-line" />
          请求数
        </span>
        <span>
          <i className="legend-line teal-line" />
          Token 数
        </span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 12, right: 8, left: -18, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="#d9dcd7"
              strokeDasharray="2 6"
            />
            <XAxis
              dataKey="time"
              stroke="#717773"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              yAxisId="requests"
              stroke="#717773"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="tokens"
              orientation="right"
              stroke="#717773"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${Math.round(value / 1000)}K`}
            />
            <Tooltip
              contentStyle={{
                border: "1px solid #d9dcd7",
                borderRadius: 0,
                boxShadow: "0 12px 35px rgb(21 23 22 / 8%)",
                fontSize: 12,
              }}
            />
            <Line
              yAxisId="requests"
              type="monotone"
              dataKey="requests"
              name="请求数"
              stroke="#183b7a"
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 4, fill: "#183b7a" }}
            />
            <Line
              yAxisId="tokens"
              type="monotone"
              dataKey="tokens"
              name="Token 数"
              stroke="#26766d"
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 4, fill: "#26766d" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
