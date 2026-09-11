# V4.8 第二轮整体回归与导出交互优化

日期：2026-09-11。用户再次要求对 V4.8 整体回归并优化，本报告记录重新执行的测试，上一轮结果仅用于比较。本轮开始时，上一轮 completion.json 中列出的核心代码、测试和映射文件哈希一致，只有 MANIFEST.json 已发生变化；保留所有已有改动。

## 工程与验收记录

1. **版本范围**：V4.8 后续回归，CURRENT 不推进。V4.8.0–.10 原验收范围保持，.11 真实质量准入仍延期，默认 legacy。
2. **修改文件**：src/App.jsx、src/components/ResearchDetail.jsx、src/components/ResearchExecutionChecks.jsx；tests/platform-v48-ui-scenarios.mjs、tests/workspace-ui.integration.mjs；docs/architecture/current-implementation-map.md、docs/releases/V4.8/DETAILED_INDEX.md、MANIFEST.json。
3. **新增文件**：本报告。忽略的 artifacts/v48-regression2/ 保存本轮前副本、日志、截图及逐项验收记录，不属于运行时模块。
4. **删除文件**：无；没有删除、跳过或降低原有测试要求。
5. **架构变化**：继续由 App 持有下载请求，由原详情页和查证卡片呈现状态，复用原异步导出模块。没有新建业务子系统或改变报告的状态归属。
6. **Schema**：无持久化字段变化；新增 exporting 状态及同步请求锁仅在浏览器内存中存在。
7. **迁移**：本轮无需数据迁移。现有迁移和回滚脚本只在临时部署项目中接受回归验证。
8. **环境**：沿用现有依赖和开发服务，另在 127.0.0.1:5180 启动临时正式构建预览；隔离数据库测试连接 127.0.0.1:27029。部署测试使用只读源码挂载和临时 Docker Compose 项目。预览与部署测试结束后清理自己的资源；原有两项 MongoDB 服务保留。没有生产发布或环境配置变更。
9. **兼容性**：报告与执行记录的导出内容、范围及命名方式不变，仍只使用任务已经保存的内容。等待首次导出资源加载时，两个导出入口同步显示“准备导出…”并禁用，同步锁拦截重复请求；手机操作面板在准备期间保持可见，交付下载后关闭。失败时恢复按钮并显示刷新重试说明，不显示模块异常细节；创建的临时下载 URL 在异常路径也会释放。
10. **恢复影响**：研究重试、只重试保存、断点及原研究时点未修改。验证了导出资源加载失败后没有下载，刷新恢复后可导出原任务的执行记录，不创建新研究。
11. **Feature flags**：无新增或切换；不启用 policy，不触发付费请求。
12. **执行测试**：两次完整单元；数据库、模型状态与恢复集成；两次路由；289 个已有界面场景分三组运行，新增 3 个导出场景及定向复测；正式构建与 15 个正式构建浏览器场景；A–F 离线对照；Linux 部署、升级与回滚。详见证据表。
13. **测试结果**：单元 753/753、集成 14/14、路由 5/5；界面逐项合并为 292/292，经复测无未解决失败。正式构建 15/15，部署脚本退出 0。初次界面分组为 96/97、95/96、96/96；两项页面切换检查失败，源码停止变更后相同断言在开发版及正式构建均通过，未修改相关测试。最终文档清单另经 Harness 校验。
14. **Benchmark**：离线 A–F 六个案例、12 个执行臂、36 次模拟请求通过，qualityAcceptance=false。构建主入口 550.55 kB / gzip 182.10 kB，上一轮为 550.34 / 182.02 kB；本轮是交互可靠性改进，不声称进一步减包或改善网络耗时。超过 500 kB 的提醒原样保留。
15. **安全与隐私**：浏览器 API 全部使用内存夹具，模型对照完全离线。没有外发真实材料、展示隐藏推理、改写财务定义或放宽证据/时点限制；数据库测试使用隔离临时库。导出失败提示不包含内部模块信息。
16. **回滚**：依据 artifacts/v48-regression2/before/ 及 completion.json 只撤回本报告列出的增量，不全仓 reset、不覆盖其他迭代。无需数据回滚；撤销文档时同步处理 MANIFEST 条目和哈希。
17. **已知限制**：首次异步资源请求若一直未完成，等待状态将持续，用户可以关闭操作面板或刷新；本轮没有新增网络超时机制。新导出加载测试先复现原实现缺少反馈；新增测试开发中修正了手机操作面板入口和执行记录夹具内容断言，相关失败日志保留。初次并发开发版的两个页面切换失败未在冻结源码复测及正式构建中重现，不能据此宣称覆盖所有时序组合。没有真实模型质量、外网全链路或实机网络性能验收。
18. **延期**：MAIN/PRO 真实质量准入、搁置的付费研究试跑、生产 policy 切换、进一步首屏体积优化与 V4.9+ 保持延期。

## 可复查证据

所有路径相对于 artifacts/v48-regression2/。

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| node --test tests/*.test.mjs | 753/753，0 fail/skip/cancel | unit.log、unit-final.log |
| 10 个 MongoDB / 恢复 integration 文件 | 14/14，包含真实进程退出后恢复 | integration.log |
| node tests/routes.integration.mjs | 5/5 | routes.log、routes-final.log |
| 289 个已有浏览器场景 | 首次 287 通过、2 失败，后续复测通过 | shard-0.log、shard-1.log、shard-2.log |
| 4 个页面切换场景 + 3 个新增导出场景 | 7/7 | navigation-retest.log |
| 全部唯一场景覆盖核对 | 292/292，无缺失；每项保留来源 | ui-verified-results.json |
| 正式构建关键界面、导出加载及恢复 | 11/11 | production.log |
| 正式构建页面切换独立复核 | 4/4 | production-navigation.log |
| node node_modules/vite/bin/vite.js build | 退出 0，未提高包体提醒阈值 | build-final.log |
| model-comparison 离线计划与 limits 夹具 | 6 cases / 36 attempts / qualityAcceptance=false | comparison.log、offline-comparison/ |
| 复用 deploy.integration.sh 隔离 Linux 回归 | 部署、升级、数据保留、备份、回滚、健康检查、停止备份、构建失败及迁移失败保护通过 | deploy.log |
| node --test tests/harness.test.mjs | 文档清单最终校验 | harness-final.log |

部署临时项目为 zhiheng-deploy-test-1789058872-28，结束后按精确项目标签检查，容器、卷和网络均为空；既有 zhiheng-v4879-test-mongo 与 zhiheng-agent-mongodb-1 仍运行。截图已人工检查 320 与 1440 宽度下的等待状态，文字及操作区没有溢出。
