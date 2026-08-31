import { ArrowLeftIcon, HourglassSimpleIcon } from "@phosphor-icons/react";
import type { PageName } from "../components/Sidebar";

const modules: Record<
  Exclude<PageName, "总览" | "模型中心" | "监控概览">,
  { description: string }
> = {
  虚拟模型: {
    description: "管理稳定的客户端模型名称，以及它们到物理模型的映射。",
  },
  租户与密钥: {
    description: "建立租户、API Key、模型权限与配额之间的治理关系。",
  },
  路由策略: {
    description: "配置权重、条件、优先级和故障切换策略。",
  },
  调用日志: {
    description: "按请求 ID 追踪网关路径、延迟、Token 和错误。",
  },
  用量账单: {
    description: "将模型 Token 使用量转换为租户成本与预算视图。",
  },
  评测中心: {
    description: "用可重复的评测集验证模型与路由策略的质量。",
  },
  "京 ME 触达": {
    description: "编辑可跳转的京 ME 消息卡片，向指定用户发送并追踪结果。",
  },
  系统设置: {
    description: "管理网关运行参数、供应商连接和配置快照。",
  },
};

export function ModulePage({
  page,
  onBack,
}: {
  page: Exclude<PageName, "总览" | "模型中心" | "监控概览">;
  onBack: () => void;
}) {
  const module = modules[page];
  return (
    <main className="module-main placeholder-page">
      <section className="module-empty-state">
        <div className="empty-state-icon">
          <HourglassSimpleIcon size={25} weight="light" />
        </div>
        <div>
          <h2>{page}暂未开放</h2>
          <p>{module.description}</p>
          <button className="back-button" type="button" onClick={onBack}>
            <ArrowLeftIcon size={16} />
            返回平台总览
          </button>
        </div>
      </section>
    </main>
  );
}
