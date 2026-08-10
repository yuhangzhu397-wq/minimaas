import {
  CalendarBlankIcon,
  ListIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

export function Header({
  status,
  title,
  onToggleSidebar,
}: {
  status: "loading" | "live" | "offline";
  title: string;
  onToggleSidebar: () => void;
}) {
  const [environment, setEnvironment] = useState("development");
  const label =
    status === "live"
      ? "所有系统正常"
      : status === "loading"
        ? "正在连接"
        : "控制面离线";

  return (
    <header className="topbar">
      <div className="title-group">
        <button
          className="icon-button menu-button"
          type="button"
          aria-label="折叠菜单"
          onClick={onToggleSidebar}
        >
          <ListIcon size={21} weight="light" />
        </button>
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <div className="date-stamp">
          <CalendarBlankIcon size={16} weight="light" />
          2026.07.24
        </div>
        <select
          className="environment-button"
          aria-label="运行环境"
          value={environment}
          onChange={(event) => setEnvironment(event.target.value)}
        >
          <option value="development">开发环境</option>
          <option value="demo">演示环境</option>
        </select>
        <div className={`system-status ${status}`}>
          <span className="status-dot" />
          {label}
        </div>
        <button className="account-button" type="button" aria-label="账户">
          <UserCircleIcon size={25} weight="light" />
          <span>ZY</span>
        </button>
      </div>
    </header>
  );
}
