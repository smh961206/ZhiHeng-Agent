# V5.1、V5.2 与 M1.0 平台前端同步交付报告

日期：2026-09-13。本轮依据当前可执行代码、V5.1/V5.2 发布记录与 M1.0 独立模型轨道说明，同步平台文案、样式和交互。核心发布指针保持 V5.2；M1.0 作为独立模型配置轨道展示，不占用 V5.3。没有运行真实模型、付费评估或生产部署。

## 用户可见变化

- 首页同时标明核心版本 V5.2 与模型配置 M1.0，避免把两个独立版本轨道混为一个版本号。
- 平台说明逐项展示 Input、Vision、研究、写作、证据核验、审计、关键复核和 Judge 八个环节。必需环节缺失显示“未配置”，可选环节为空显示“未启用”。
- 历史任务在“研究过程”中逐项展示任务创建时保存的八环节模型；旧任务仍沿用原来的研究/原页读取两项记录，不按新配置补写。
- V5.1 费用面板识别 M1.0 各环节，不再把新环节笼统显示为“其他调用”；费用未知仍保持未知，缓存历史不被表述为未来保证。
- 使用指南补充费用估算、缓存、V5.2 关键复核与证据裁决的触发边界，并把遗留“执行预算”改为固定安全轮次。配置可用不表示实际调用，缺失资料或服务失败不会触发升级。
- 当前模型的八环节列表在桌面与手机端均采用紧凑双列，任务保存记录与费用明细在窄屏改为单列；长模型名自动换行。沿用系统滚动条，不增加彩色滚动条或额外折叠层。
- 二次复查将笼统的“模型复核”改为“独立审计、条件式关键复核与程序校验”，避免把配置存在误解为每个复核环节都会执行。

## 工程交付记录

| 项目 | 本轮记录 |
| --- | --- |
| 1. Release / subrelease | 核心 V5.1、V5.2 前端能力同步；独立模型轨道 M1.0。CURRENT 保持 V5.2 |
| 2. Modified files | `src/config/platform-release.mjs`；`src/components/PlatformStatus.jsx`、`PlatformStatusPanel.jsx`、`ResearchFramework.jsx`、`ResearchMethod.jsx`、`ResearchDecision.jsx`、`DocumentReadingSummary.jsx`、`ResearchCostSummary.jsx`、`ResearchUsageGuide.jsx`、`ResearchAnalysisReceipts.jsx`、`ResearchWorkbench.jsx`、`ResearchContext.jsx`、`PortfolioConstraints.jsx`、`MaterialEditor.jsx`、`ResearchProgress.jsx`、`Brand.jsx`、`ReportWarnings.jsx`、`ResearchDetail.jsx`、`ResearchMaterials.jsx`、`ResearchHistory.jsx`、`ResearchKnowledge.jsx`、`ExecutionReview.jsx`；`src/styles.css`、`src/platform.css`、`src/components/research-detail.css`、`src/components/research-analysis-receipts.css`、`src/components/research-workbench.css`、`src/components/report-warnings.css`、`src/components/research-report-first.css`、`src/components/research-materials.css`、`src/components/research-history.css`、`src/components/execution-ui.css`；`tests/platform-v50-ui-scenarios.mjs`、`tests/agent-capabilities-ui-scenarios.mjs`、`tests/workflow-ui-scenarios.mjs`、`tests/knowledge-platform-ui-scenarios.mjs`、`tests/workspace-ui.integration.mjs`；本说明及 M1.0 README |
| 3. New files | `src/components/ui/radio-group.jsx`、`src/components/ui/progress.jsx`、`src/components/ui/toggle.jsx`、`src/components/ui/toggle-group.jsx`、`src/components/ui/label.jsx`、`tests/platform-m10-ui-scenarios.mjs`、本报告；验证工件位于忽略目录 `artifacts/m10-frontend-sync/`、`artifacts/shadcn-components-production/`、`artifacts/shadcn-rescan-production/`、`artifacts/shadcn-third-scan-production/` |
| 4. Removed files | 无 |
| 5. Architecture changes | 无新子系统或接口。复用现有公开配置快照、任务保存的 `modelRouting`、费用 API、研究过程面板和完整 UI 运行器 |
| 6. Schema changes | 无。没有修改 schema v2、modelState v4、ModelCall、历史预算账本或研究对象 |
| 7. Migrations | 无；不回填、不重绑历史任务，不补造模型、调用、费用或预算记录 |
| 8. Environment changes | 无；没有修改实际模型文件、环境变量、凭据、依赖或服务配置。本地验证使用 5201–5204 隔离端口，结束后关闭 |
| 9. Compatibility impact | schema v1 与 modelState v1–v3 的界面继续显示历史两项配置；v4 展示八环节。已有 API 字段兼容，未知值不转为零或“已执行” |
| 10. Resume / recovery impact | 无执行逻辑变化；恢复任务仍使用原模型身份、截止日、证据和已完成调用。界面只读取保存状态 |
| 11. Feature flags | 无变化；Critical Reviewer/Judge 是否可用取决于配置，页面不把可用表述为已调用，也不启用任何真实模型路径 |
| 12. Tests executed | 重点 UI 回归、完整正式构建 UI、模型管线/费用/用量/定价/缓存/Judge/关键复核测试、前端生产构建、全量单元与路由、Harness 和差异格式检查 |
| 13. Test results | 首轮重点 UI 30/30；二次复查重点 UI 6/6；最终完整正式构建 UI 338/338；计算记录选择器专项 UI 2/2；底部操作区专项正式构建 UI 2/2；shadcn 组件统一专项正式构建 UI 7/7；二次全量组件扫描专项正式构建 UI 8/8；第三次结构组件扫描专项正式构建 UI 10/10；相关域测试 30/30；全量单元 937/937；路由 5/5；Harness 8/8；构建与差异格式检查通过 |
| 14. Benchmark results | 未运行模型质量、成本或性能基准；真实模型调用 0。构建包体仅作为构建记录，不声称线上性能改善 |
| 15. Security / privacy | 前端只显示白名单模型名称和费用汇总；不显示端点、密钥、私有策略、提示正文或隐藏推理。UI API 全部使用内存合成夹具 |
| 16. Rollback path | 仅撤销本报告列出的前端、样式和测试增量；不回滚 V5.1/V5.2/M1.0 后端、配置、历史任务或数据 |
| 17. Known limitations | 当前无管理员可视化配置编辑器；模型池只展示当前首选模型。费用是记录内估算而非供应商账单。平台弹窗在手机端使用自身滚动以容纳八环节 |
| 18. Deferred future work | 管理员模型配置界面、安全的模型池故障切换、真实质量/成本验收和生产运营仍按各发布记录另行处理；不进入 V5.3 |

## 验证矩阵

| 验证 | 结果 | 证据 |
| --- | --- | --- |
| 重点交互 | 30/30 | `artifacts/m10-frontend-sync/focused-final.log` |
| 完整正式构建 UI | 337/337 | `artifacts/m10-frontend-sync/production.log`、`production/ui-results.json` |
| 模型与费用相关域测试 | 30/30 | `artifacts/m10-frontend-sync/domain-tests.log` |
| 全量单元 | 937/937，0 失败/取消/跳过 | `artifacts/m10-frontend-sync/unit.log` |
| 路由渲染 | 5/5 | `artifacts/m10-frontend-sync/routes.log` |
| Harness | 8/8 | `artifacts/m10-frontend-sync/harness.log` |
| 正式构建 | 通过；入口 480.58 kB / gzip 159.75 kB | `artifacts/m10-frontend-sync/build.log` |
| 差异格式 | 通过，仅有 Git 的 CRLF 转换提示 | 本轮最终检查 |
| 第三次结构组件扫描 | 10/10 | `artifacts/shadcn-third-scan-production/ui-results.json` |

## 二次整体复查

二次复查新增了审计与条件式复核文案场景，并在 320px 实图中核对当前模型面板的双列布局、长名称换行和默认滚动条。重点场景 6/6 通过，最终正式构建全量 UI 338/338 通过；结果分别保存在 `artifacts/m10-frontend-sync/second-review-focused/ui-results.json` 与 `artifacts/m10-frontend-sync/second-review-production/ui-results.json`。最终构建入口为 480.77 kB / gzip 159.83 kB。

## 计算记录选择器统一

“分红与敏感性核对”中的原生选择框已替换为平台统一选择组件。它继续默认选中最近记录，菜单完整保留序号、计算类型、调用编号和异常状态，并增加选中标记、方向键操作、焦点管理与窄屏换行；关闭状态下的长名称安全省略。没有改变计算、证据、数据结构、恢复或导出逻辑。320px 与 1440px 专项场景 2/2 通过，正式构建通过；视觉工件位于 `artifacts/analysis-receipt-select-final/`。

## 底部快捷键位置统一

工作台底部的 `Ctrl / ⌘ + Enter` 提示已从左侧就绪说明移到右侧主操作区，紧邻开始按钮并保持垂直居中。手机端继续隐藏快捷键提示并让主按钮占满可用宽度。没有改变快捷键、就绪校验或提交行为。320px 与 1440px 正式构建场景 2/2 通过，视觉工件位于 `artifacts/shortcut-right-production/`。

## 可见交互组件统一

业务页面中剩余的可见原生按钮和单选框已统一到现有 shadcn/Radix 组件：品牌入口、阅读提示入口、提示中的原文跳转使用共享 `Button`，导出范围使用新增的共享 `RadioGroup`。导出弹层继续支持方向键选择、Escape 关闭与焦点恢复；阅读提示继续支持键盘打开、关闭后恢复焦点和原文定位。隐藏的文件选择 input 必须保留原生能力；报告正文与规则快照中的 `details/summary` 仍作为语义化文档披露结构，不额外引入组件状态。320px、390px 与 1440px 的 7 个正式构建场景全部通过，视觉工件位于 `artifacts/shadcn-components-production/`。没有改变业务逻辑、数据结构、迁移、恢复、证据或导出内容。

## shadcn 二次全量扫描

全量扫描 62 个 JSX 文件后，将仍有明确等价组件的交互继续统一：文件导入进度改为共享 `Progress`，研究状态、规则记录与执行复核三组互斥筛选改为共享 `ToggleGroup`，阅读模式改为共享 `Toggle`。ToggleGroup 使用标准 `radiogroup/radio` 语义和方向键模型，拒绝取消唯一选中项；手机端研究状态栏继续在自身范围内横向滚动，不造成页面级溢出。保留原生隐藏文件 input、拖放容器、语义化数据表格与文档披露型 `details/summary`，这些结构没有一对一的 shadcn 替代或替换后会增加不必要状态。正式构建通过，320px 与 1440px 等 8 个专项场景全部通过，视觉工件位于 `artifacts/shadcn-rescan-production/`。没有业务、架构、Schema、迁移、环境、恢复、证据、费用或隐私变化。

## shadcn 第三次结构组件扫描

再次扫描 62 个 JSX 文件后，将 13 个原生表单标签统一为共享 `Label`，覆盖工作台问题与路径、旧研究上下文、资料编辑、组合约束、研究详情筛选和导出选项；平台版本、资料格式及研究执行状态改为复用共享 `Badge`。新增断言验证组件身份、标签与控件关联、导出单选点击区域和执行状态展示。语义化财务表格继续使用原生 table，隐藏文件选择继续使用原生 input，报告正文与规则快照中的披露结构继续使用 `details/summary`；页面提示按实际状态语义保留现有结构，没有把普通说明全部强制改成 Alert。正式构建通过，320px 与 1440px 共 10 个专项场景全部通过，并检查工作台、资料编辑、导出弹层、计算记录菜单和研究过程截图；视觉工件位于 `artifacts/shadcn-third-scan-production/`。没有业务、架构、Schema、迁移、环境、恢复、证据、费用、安全或隐私变化。

重点交互覆盖 320px 与 1440px，完整回归继续覆盖 2560px、侧栏固定、报告阅读、详情右栏、执行轨迹、导出、恢复、键盘导航及滚动。首次开发预览基线有两项因同期热更新导致执行上下文被页面导航销毁；正式构建回归不受热更新影响并全部通过。新增场景的首次失败还识别并修正了“按需关闭/未启用”的旧断言及“执行预算”的遗留文案，没有为通过测试而放宽业务边界。
