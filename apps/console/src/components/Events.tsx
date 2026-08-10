import type { DashboardOverview } from "@minimaas/contracts";
import {
  ArrowRightIcon,
  GitBranchIcon,
  PackageIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

const icons = {
  deployment: PackageIcon,
  fallback: GitBranchIcon,
  quota: WarningIcon,
};

export function Events({ events }: Pick<DashboardOverview, "events">) {
  const [selected, setSelected] = useState(events[0]?.id ?? "");
  const [expanded, setExpanded] = useState(false);
  const displayEvents = expanded ? [...events, ...events] : events;

  return (
    <aside className="event-panel">
      <div className="section-heading event-heading">
        <div>
          <span className="eyebrow">Live signals</span>
          <h2>近期动态</h2>
        </div>
        <button
          className="text-button"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "收起" : "查看全部"}
          <ArrowRightIcon size={14} weight="light" />
        </button>
      </div>
      <div className="event-list">
        {displayEvents.map((event, index) => {
          const Icon = icons[event.type];
          const active = selected === event.id && index < events.length;
          return (
            <button
              className={`event ${event.type} ${active ? "selected" : ""}`}
              key={`${event.id}-${index}`}
              type="button"
              onClick={() => setSelected(event.id)}
            >
              <span className="event-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="event-content">
                <span className="event-title">
                  <strong>{event.title}</strong>
                  <Icon size={17} weight="light" />
                </span>
                <span className="event-detail">{event.detail}</span>
                <time>
                  {index === 0 ? "2 分钟前" : `${index * 7 + 1} 分钟前`}
                </time>
              </span>
            </button>
          );
        })}
      </div>
      <div className="event-footer">
        <span className="live-pulse" />
        事件流实时更新
      </div>
    </aside>
  );
}
