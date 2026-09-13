# V5.3 全量离线回归与优化

本次按用户明确授权执行全量界面回归、发布门禁、完整离线基准以及隔离 Docker 部署/升级/回滚测试。真实模型验证继续暂停。本报告承接 `platform-experience-report.md` 的前端更新，记录本轮增量，不把工作区已有改动归为本轮实现。

## 验证结果

最终全量界面复验 364/364 通过，全部已执行的回归项通过。执行跨 2026-09-13 至 2026-09-14（Asia/Shanghai），日志使用 UTC 时间；验证目录沿用开始日期。

| 验证面 | 结果与口径 |
| --- | --- |
| 全量单元 | 970/970 通过，无跳过、取消。首轮 969/970，修正过时的恢复提示断言后全量重跑通过。 |
| 发布门禁 | 179/179 通过；测试及样式修复后再次通过。与全量单元有重叠，不重复计为独立覆盖。 |
| MongoDB / API / 跨进程恢复 | 15 组共 22/22 通过，包含任务生命周期、Knowledge API、模型/视觉固定状态、费用、Judge/旗舰状态及配置。使用独立 MongoDB 实例。 |
| 全量界面 | 首轮生产构建 351/364；相关修复定向复验通过，最终重新运行全部 364/364 通过，退出码 0。 |
| SSR 路由 | 首页、工作台、带筛选历史页、详情页、未知地址 5/5；进程正常退出。 |
| 生产构建 | 初始与修复后构建均通过。主 JS 485.00 kB / gzip 160.46 kB；详情 JS 286.80 kB / gzip 90.22 kB。 |
| 文本基准 | 全部 8 个案例 × 2 个配置 × 2 次重复，共 32/32 模拟尝试通过，criticalErrors=0。 |
| Vision 基准 | 全部 48 个案例 × 2 个配置 × 2 次重复，共 192/192 模拟尝试通过，criticalErrors=0。 |
| 费用基准 | 6/6，passed=true，modelRequests=0。 |
| Judge 基准 | 12 个候选案例全部通过，criticalErrors=0、modelRequests=0；夹具基线为 10/12，不代表真实模型比较。 |
| Knowledge 基准 / lint | K1.0.0：六种研究路径 6/6、Ontology 9/9、银行漏触发与周期股误触发护栏通过，指纹稳定，严重问题 0；lint 通过。 |
| 上下文基准 | 六种路径，序列化工具字符数 132,195 → 111,518，减少 20,677（15.64%）；这是已有实现的离线体积基线，不是 token 或实际费用节省。 |
| Docker | Linux 容器中执行现有完整部署集成脚本，退出码 0。部署、健康检查、持久化、升级、备份、数据回滚、停机备份、构建失败、迁移失败语义均通过。 |

文本/Vision 基准输出明确为 `evidenceKind: simulation`、`qualityAccepted: false`。模型相关集成测试使用夹具或本地传输，不发起真实推理。这些通过结果不构成真实模型质量验收或生产晋升授权。

## 发现与修复

| 问题 | 修复与验证 |
| --- | --- |
| 桌面报告正文起点超出既有首屏布局标准 | 1440px 场景记录 y=610.078125，阈值保持 610 不变。详情顶部上下留白由 16px 收紧到 12px，保留共享标题字号、操作按钮和报告内容；320/390/1440 布局场景通过。 |
| 旧恢复提示仍要求英文 Knowledge | 改为检查当前“研究规则”“工作台，确认后”和旧计算/模型对话隔离说明。原快照损坏、恢复原因和历史记录不变断言保留。 |
| 指南新增快捷入口导致旧按钮定位歧义 | 将阅读和进度章节操作限制到现有 `.usage-topics`；不使用 first/force，也不删除检查。六个能力场景保持原验证内容。 |
| 历史搜索框用语已改为“路径” | 两处旧“模式”选择器同步到当前无障碍名称；延迟加载与失败重试断言保留。 |
| 弹层关闭动画期间仍被当作可操作 | 共享测试辅助函数按 aria-expanded 判断，等待旧弹层隐藏，再打开并等待 data-state=open，避免操作即将卸载的内容。配置错误、超时、恢复及输入保留检查继续通过。 |
| 指南快捷跳转焦点在下一动画帧设置 | 测试等待实际焦点到达目标，再执行原精确断言；无固定延时或焦点要求降级。三种宽度通过。 |
| 单次 SSR 测试注册大量无用文件监听 | 仅在路由测试中设置 Vite watch=null，保留五条 SSR 断言和正常 close。初始与修复后均退出码 0；不将耗时差异宣称为产品性能提升。 |

首轮界面共 13 个失败：报告布局 1、配置弹层时序 1、指南按钮歧义 6、指南焦点时序 3、历史搜索框文案 2。定向验证发现进度章节还有同类按钮歧义，一并修正后通过；首轮失败日志保留。

## 工程交付清单

1. **版本 / 子版本**：V5.3 回归维护。平台版本、Knowledge K1.0.0、执行兼容编号 1、输出契约编号 7 不变。
2. **修改文件**：`src/components/research-detail.css`；`tests/valuation-policy.test.mjs`、`tests/routes.integration.mjs`、`tests/agent-capabilities-ui-scenarios.mjs`、`tests/platform-v49-ui-scenarios.mjs`、`tests/platform-experience-ui-scenarios.mjs`、`tests/fixtures/platform-status-ui.mjs`；本发布 README、当前实现图及 `MANIFEST.json`。
3. **新增文件**：本报告。诊断、驱动脚本、日志、截图、基准 JSON 和最终独立 dist 位于忽略目录 `artifacts/v53-full-regression-20260913/`。
4. **删除文件**：无仓库文件删除。
5. **架构变化**：无新模块或第二套实现；现有详情样式和测试辅助函数内修复。
6. **Schema 变化**：无生产持久化结构变化。
7. **迁移**：未迁移真实数据库。Docker 测试只在临时副本注入成功/失败迁移，验证隔离数据库的备份与回滚。
8. **环境变化**：使用本地 Node 24.19.0、现有 Vite/Playwright 与 Edge，生产构建预览使用回环地址。Docker 测试使用示例配置和独立 Compose 项目；不读取真实密钥。测试期间构建镜像和下载构建依赖，未改项目依赖锁文件。临时 Mongo 容器、部署 Compose 服务/卷/网络已清理，原有 `zhiheng-agent-mongodb-1` 保留且健康。
9. **兼容影响**：不改变 API、URL、Knowledge 指纹、模型固定信息或历史报告。测试定位跟随已完成的前端文案/导航更新。
10. **恢复影响**：研究截止时间、恢复兼容校验、保存重试和模型状态不变；数据库集成与 Docker 故障注入覆盖实际恢复边界。
11. **功能开关**：无新增或启用；未启用模型晋升。
12. **执行测试**：见上表与下方复现命令。首轮失败和后续结果分别保存，不覆盖初始证据。
13. **测试结果**：最终界面 364/364、全量单元 970/970、发布门禁 179/179、数据库集成 22/22、SSR 5/5 全部通过；清单/文档 harness 11/11 通过。发布门禁和 harness 与全量单元存在重叠，不能直接相加。MANIFEST 包含 635 个文件，git diff --check 通过。
14. **基准结果**：见上表。完整现有离线案例集，无真实模型质量、真实费用或跨供应商能力结论。
15. **安全 / 隐私**：浏览器 API 使用内存夹具并检查意外请求、页面错误和资源错误。模型调用不访问真实服务。Docker 有意的数据丢失确认仅作用于新建隔离测试数据库；未触碰真实研究记录。
16. **回滚路径**：只撤回本轮详情 padding 与配套测试/文档增量，重新构建；无应用数据迁移。共享工作区含前次交付，不能整体 reset。Docker 回滚脚本验证恢复备份、移除升级后新增集合并恢复原迁移版本；迁移失败保持应用停止，防止继续写入不兼容数据。
17. **已知限制**：UI 为 Windows Edge/Chromium 自动化，覆盖仓库全部场景，非 Safari/Firefox 或所有实体设备验收。Docker 为本机 Linux 容器隔离测试，未部署到生产环境。构建保留依赖既有 use-client/sourcemap 提示。真实模型验收按用户要求不运行；在线外部财报抓取验收不纳入离线基准结论。
18. **延期事项**：没有新增未来版本功能。真实模型验证待用户另行授权；跨浏览器与真实外部数据源在线验收可单独安排。

## 证据与复现

原始证据目录：`artifacts/v53-full-regression-20260913/`。日志旁的 `*-exit.json` 记录实际 UTC 起止时间、命令与退出码；Docker 为 `deploy.log`、`deploy-exit.txt`。

- 单元：`node --test tests/*.test.mjs`（`unit-initial.log`、`unit-final.log`）。
- 门禁：package.json 的 `test:release` 对应完整 Node 参数集（`release.log`、`release-final.log`）。
- Mongo：`backend-run.mjs` 依次运行 15 组现有集成脚本，指向 `127.0.0.1:27029` 的独立实例；结果在 `mongodb-results.json` 和 `mongo-*.log`。
- 路由：`node tests/routes.integration.mjs`（`routes-final.log`）。
- UI：初始与最终使用分别固定的生产构建；`ui-full/ui-results.json` 与 `ui-final/ui-results.json` 记录 assetMode、每场景请求/错误和结果。最终驱动 `ui-final-run.mjs` 使用 4174 端口。定向复验见 `ui-fixes/`、`ui-fixes2/`。
- 文本/Vision：`node scripts/benchmark.mjs --kind text|vision --repeats 2 --out <独立目录>`；输出 `benchmark-text/`、`benchmark-vision/`。
- 费用/Judge：`scripts/cost-benchmark.mjs`、`scripts/judge-benchmark.mjs` 输出本次独立 JSON。Knowledge、lint、上下文分别见 `knowledge.log`、`knowledge-lint.log`、`context.log`。
- Docker：`deploy-runner.sh` 在 docker:cli 中安装 Bash，以只读源码和示例配置构造副本，再执行原 `tests/deploy.integration.sh`；只调整临时目录到 Docker daemon 可见的专用路径，不修改验收断言。

Docker 验证先于最终 8px 详情留白修复完成，部署脚本、Dockerfile、数据库与服务端实现此后均未改变；最终界面使用重新构建的资源。

已复核桌面与移动端报告截图及指南搜索截图。本地 `dist/` 经过标准 Knowledge 备份校验和重新构建，与最终界面回归专用 dist 的 36 个文件逐字节一致。最终预览服务及测试进程已退出；机器可读汇总为 `artifacts/v53-full-regression-20260913/completion.json`。

提交前补充检查：完整 `git diff --cached --check` 提示首次纳入 Git 的 K1.0.0 规则快照保留了源文件末尾空行；为维持已发布快照的不可变指纹，不重新排版这些文件。该快照目录之外的暂存改动通过空白检查。私有环境配置、密钥和本地回归产物未纳入提交。

提交阶段另修复 `scripts/update-manifest.mjs`：原来只合并 HEAD 基线与未跟踪文件，文件一旦暂存就会从未跟踪列表消失，导致清单漏项。现在同时纳入已暂存新增文件。新增 `tests/manifest-update.test.mjs` 在独立临时 Git 仓库验证暂存前、暂存后及提交后清单一致，并保留清单原有范围。新增测试与 harness 共 12/12 通过；最终清单增加为 636 项，暂存字节数与 SHA-256 全部核对一致。此补充只改变开发期清单生成及测试，无运行时、Schema、环境配置、恢复或功能开关变化；回滚只需撤回脚本这一合并增量和新测试，再重建清单。没有重跑不受影响的 UI、Docker 或真实模型验证。
