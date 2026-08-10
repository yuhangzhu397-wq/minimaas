import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import {
  type PageName,
  navigationGroups,
  Sidebar,
  type WaterLevelModule,
} from "./components/Sidebar";
import { ModelCenter } from "./pages/ModelCenter";
import { ModulePage } from "./pages/ModulePage";
import { OverviewPage } from "./pages/OverviewPage";
import { TenantAccess } from "./pages/TenantAccess";
import { UpstreamResources } from "./pages/UpstreamResources";
import { useOverview } from "./hooks/useOverview";

const pages = navigationGroups.flatMap((group) =>
  group.items.map(([label]) => label),
);

const slugs: Record<PageName, string> = {
  总览: "overview",
  模型中心: "models",
  监控概览: "water-level",
  虚拟模型: "virtual-models",
  租户与密钥: "tenants",
  路由策略: "routes",
  调用日志: "logs",
  用量账单: "billing",
  评测中心: "evaluations",
  系统设置: "settings",
};

function pageFromHash(): PageName {
  const slug = window.location.hash.replace(/^#\/?/u, "").split("/")[0];
  if (slug === "upstream") return "监控概览";
  return pages.find((page) => slugs[page] === slug) ?? "总览";
}

function waterLevelModuleFromHash(): WaterLevelModule {
  const segment = window.location.hash
    .replace(/^#\/?/u, "")
    .split("/")[1];
  if (segment === "pins") return "用户监控";
  if (segment === "models") return "模型监控";
  return "供应商监控";
}

export function App() {
  const { data, status } = useOverview();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePage, setActivePage] = useState<PageName>(pageFromHash);
  const [activeWaterLevelModule, setActiveWaterLevelModule] =
    useState<WaterLevelModule>(waterLevelModuleFromHash);

  useEffect(() => {
    const syncHash = () => {
      setActivePage(pageFromHash());
      setActiveWaterLevelModule(waterLevelModuleFromHash());
    };
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    document.title =
      activePage === "总览"
        ? "MiniMaaS · 平台总览"
        : activePage === "监控概览"
          ? `MiniMaaS · 监控概览 · ${activeWaterLevelModule}`
          : `MiniMaaS · ${activePage}`;
  }, [activePage, activeWaterLevelModule]);

  const navigate = (page: PageName) => {
    setActivePage(page);
    window.location.hash =
      page === "监控概览" ? "/water-level/suppliers" : `/${slugs[page]}`;
  };
  const navigateWaterLevel = (module: WaterLevelModule) => {
    const moduleSlugs: Record<WaterLevelModule, string> = {
      供应商监控: "suppliers",
      用户监控: "pins",
      模型监控: "models",
    };
    setActivePage("监控概览");
    setActiveWaterLevelModule(module);
    window.location.hash = `/water-level/${moduleSlugs[module]}`;
  };

  return (
    <div
      className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${
        activePage === "总览" ? "overview-active" : ""
      }`}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        activeItem={activePage}
        activeWaterLevelModule={activeWaterLevelModule}
        onNavigate={navigate}
        onNavigateWaterLevel={navigateWaterLevel}
      />
      <div className="workspace">
        <Header
          status={activePage === "监控概览" ? "live" : status}
          title={activePage}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
        />
        {activePage === "总览" ? (
          <OverviewPage data={data} status={status} />
        ) : activePage === "模型中心" ? (
          <ModelCenter />
        ) : activePage === "监控概览" ? (
          <UpstreamResources module={activeWaterLevelModule} />
        ) : activePage === "租户与密钥" ? (
          <TenantAccess />
        ) : (
          <ModulePage page={activePage} onBack={() => navigate("总览")} />
        )}
      </div>
    </div>
  );
}
