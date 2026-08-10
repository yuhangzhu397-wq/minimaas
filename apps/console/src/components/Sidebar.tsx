import {
  CaretDownIcon,
  CaretRightIcon,
  ChartBarIcon,
  CubeIcon,
  FileTextIcon,
  FlowArrowIcon,
  GaugeIcon,
  GearIcon,
  KeyIcon,
  PlugsConnectedIcon,
  StackSimpleIcon,
  TreeStructureIcon,
  WalletIcon,
} from "@phosphor-icons/react";
export const navigationGroups = [
  {
    label: "工作台",
    items: [
      ["总览", GaugeIcon],
      ["模型中心", CubeIcon],
      ["监控概览", PlugsConnectedIcon],
      ["虚拟模型", TreeStructureIcon],
    ],
  },
  {
    label: "流量治理",
    items: [
      ["租户与密钥", KeyIcon],
      ["路由策略", FlowArrowIcon],
      ["调用日志", FileTextIcon],
    ],
  },
  {
    label: "运营",
    items: [
      ["用量账单", WalletIcon],
      ["评测中心", ChartBarIcon],
      ["系统设置", GearIcon],
    ],
  },
] as const;

export type PageName = (typeof navigationGroups)[number]["items"][number][0];
export type WaterLevelModule = "供应商监控" | "用户监控" | "模型监控";

const waterLevelModules: WaterLevelModule[] = [
  "供应商监控",
  "用户监控",
  "模型监控",
];

export function Sidebar({
  collapsed,
  activeItem,
  activeWaterLevelModule,
  onNavigate,
  onNavigateWaterLevel,
}: {
  collapsed: boolean;
  activeItem: PageName;
  activeWaterLevelModule: WaterLevelModule;
  onNavigate: (page: PageName) => void;
  onNavigateWaterLevel: (module: WaterLevelModule) => void;
}) {
  const waterLevelActive = activeItem === "监控概览";
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <StackSimpleIcon size={22} weight="light" />
        </span>
        <span className="brand-name">MiniMaaS</span>
      </div>
      <nav aria-label="主导航">
        {navigationGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map(([label, Icon]) =>
              label === "监控概览" ? (
                <div className="nav-parent" key={label}>
                  <button
                    className={`nav-item ${waterLevelActive ? "active" : ""}`}
                    type="button"
                    title={collapsed ? label : undefined}
                    aria-expanded={waterLevelActive}
                    onClick={() => onNavigateWaterLevel(activeWaterLevelModule)}
                  >
                    <Icon
                      size={19}
                      weight={waterLevelActive ? "regular" : "light"}
                    />
                    <span className="nav-label">{label}</span>
                    <span className="nav-parent-caret">
                      {waterLevelActive ? (
                        <CaretDownIcon size={12} />
                      ) : (
                        <CaretRightIcon size={12} />
                      )}
                    </span>
                  </button>
                  {waterLevelActive ? (
                    <div className="nav-submenu">
                      {waterLevelModules.map((module) => (
                        <button
                          className={
                            activeWaterLevelModule === module ? "active" : ""
                          }
                          type="button"
                          key={module}
                          aria-current={
                            activeWaterLevelModule === module
                              ? "page"
                              : undefined
                          }
                          onClick={() => onNavigateWaterLevel(module)}
                        >
                          <span />
                          {module}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <button
                  className={`nav-item ${activeItem === label ? "active" : ""}`}
                  key={label}
                  type="button"
                  title={collapsed ? label : undefined}
                  aria-current={activeItem === label ? "page" : undefined}
                  onClick={() => onNavigate(label)}
                >
                  <Icon
                    size={19}
                    weight={activeItem === label ? "regular" : "light"}
                  />
                  <span className="nav-label">{label}</span>
                </button>
              ),
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
