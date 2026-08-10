# MiniMaaS Premium Console Design System

视觉真值：[console-dashboard-premium-concept.png](console-dashboard-premium-concept.png)

## 设计方向

编辑部式的精密企业工具：通过排版、基线网格、留白和细分隔线建立层级，不依赖通用卡片和装饰性阴影。

## 色彩

- `canvas`: `#fcfcfa`
- `surface-subtle`: `#f3f4f1`
- `ink`: `#151716`
- `muted`: `#6c716d`
- `line`: `#d9dcd7`
- `navy`: `#183b7a`
- `teal`: `#26766d`
- `warning`: `#b34b36`
- `amber`: `#b7791f`

## 字体

- 展示标题：`Songti SC`, `STSong`, `Noto Serif SC`, serif
- 数字展示：Georgia，使用 tabular numerals
- UI：`Inter`, `PingFang SC`, `Microsoft YaHei`, sans-serif

## 布局

- 桌面侧栏：198px
- 顶栏：88px
- 主画布页边距：40px
- 关键指标为连续排版带，不使用独立卡片
- 主区域：趋势图与 300px 事件索引并排
- 底部：模型健康表与网关数据流并排
- 圆角：0–8px，仅用于控件和图标容器
- 阴影：默认无

## 图标

使用 Phosphor Icons `regular`/`light` 权重，导航 20px，流程节点 22px，保持 1.5–1.75px 的视觉线宽。

## 核心交互

- 折叠侧栏
- 导航选中态
- 环境切换
- 趋势时间范围切换
- 刷新反馈
- 事件选择态
