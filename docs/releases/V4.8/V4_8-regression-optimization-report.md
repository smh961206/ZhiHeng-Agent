# V4.8 整体回归与加载优化

日期：2026-09-11。CURRENT=V4.8；范围为现有 V4.8.0–.11 与已授权前端迭代的回归、问题修复和加载优化。离线工程回归通过，不把本报告作为真实模型质量准入或生产 policy 激活依据。

## 1. 发布范围与结论

753 项单元、14 项隔离 MongoDB/进程恢复集成、5 个路由均通过；289 个不同浏览器场景经完整覆盖与修复复测通过。正式构建的 8 个主要路径检查通过，最后间距修正另做 3 个正式构建首屏场景验证。现有 Linux 部署脚本九组检查通过。六模式离线执行器完成 12 个研究臂、36 次模拟请求，qualityAcceptance=false。V4.9、已延期的付费试跑及生产切换未执行。

## 2. 修改文件

- src/App.jsx：工作台按需入口、显式焦点请求、导出模块按点击加载；沿用现有模式定义。
- src/components/ResearchPages.jsx：复用现有 Suspense / PageBoundary，为工作台提供加载、失败和刷新入口。
- src/components/ResearchWorkbench.jsx：在异步挂载完成后处理已有开始研究动作的焦点意图；直接打开页面不强制弹出输入键盘。
- src/components/research-decision.css：桌面摘要与正文间距从 28px 收紧到 16px，手机原布局保留。
- tests/routes.fixture.jsx、tests/routes.integration.mjs：等待异步页面加载完成再检查原路由内容；原断言保留。
- tests/platform-v48-ui-scenarios.mjs：新增手机/桌面慢加载、草稿恢复和模块失败刷新场景。
- tests/workspace-ui.integration.mjs：接入预检识别实际工作台包装入口。
- docs/architecture/current-implementation-map.md、docs/releases/V4.8/DETAILED_INDEX.md、MANIFEST.json：记录当前加载所有者及本轮验收链接与字节哈希。

工作区同时存在另一轮已授权页面/版本优化，见 [页面与版本表述报告](V4_8-frontend-review2-report.md)。这些修改被保留，并以 synchronized-ui 复测覆盖；不归为本轮实现。src/components/research-report-first.css 曾试调通用间距，但该属性被摘要专用样式覆盖，已撤回本轮试调；最终只修改实际所有者 research-decision.css。

## 3. 新增文件

本报告。artifacts/v48-regression/ 保存忽略的原始日志、基线副本、截图、离线执行结果、分组清单与逐场景验收汇总。没有新增产品模块、依赖或平行测试框架。

## 4. 删除文件

无仓库文件或测试删除。部署脚本仅清理自身创建的临时 Linux 目录及独立 Compose 项目资源。

## 5. 架构变更

仅改变前端资源加载时机，扩展已有 ResearchPages 页面边界。研究输入、状态和草稿仍由 App/现有 hooks 管理；导出仍调用原 shared/research-export。Gateway、模型选择、数据采集、Evidence、确定性计算和研究/复核所有者无本轮代码修改。

## 6. Schema

无持久化 Schema、研究契约或规则版本变更。Harness V4.8 与研究规则 V4.7 保持区分。

## 7. 迁移

无需迁移或回填。隔离部署脚本只在临时副本注入 schema 3 验证升级，再恢复至原 schema 2；不触及实际研究数据。

## 8. 环境

复用现有 Node/Vite、捆绑 Playwright/Edge、127.0.0.1:27029 隔离 Mongo 服务。未改 .env、依赖或锁文件。临时正式构建预览使用 127.0.0.1:5180。Linux 测试使用现有 docker:27-cli 运行器及只读源码挂载，独立项目 zhiheng-deploy-test-1789057847-28，随机回环端口；现有研究数据库不是目标。构建下载的依赖和测试镜像缓存可以保留，无全局清理。

## 9. 兼容影响

首页不再提前下载工作台和材料编辑器；进入工作台时显示现有加载提示，失败时可刷新。异步载入后仍能恢复问题、材料和研究参数。目录、证据跳转、历史公司名称和导出格式保留。服务端路由检查继续验证真实页面内容，而非放宽为任意加载占位。

## 10. Resume / recovery

研究恢复算法、原始截止日、模型 pins、工具恢复和仅重试保存语义不变。14 项集成包含实际进程退出/重启、密钥轮换兼容、模型改变阻断、重复保存/删除隔离及数据库恢复。新前端资源加载失败不会创建研究，草稿在刷新后恢复。

## 11. Feature flags

没有新增开关或默认值变化。legacy 保留；MODEL_ROUTING_MODE、MODEL_TELEMETRY_ENABLED 等原有语义不变。本轮没有恢复付费试跑，也没有生成生产准入报告。

## 12. 执行测试

- node --test tests/*.test.mjs：初始与最终全量单元。
- node --test：storage/schema/jobs-create/delete/retry/delivery、model-state、research-resume、model-telemetry、knowledge-api 共 10 个 integration 文件；MONGODB_URI 显式指向 127.0.0.1:27029。
- node tests/routes.integration.mjs：5 个入口，含异步工作台完整内容。
- node tests/workspace-ui.integration.mjs：三个互斥名称分组覆盖原 277 + 本轮 3 个场景；补测同步新增 9 个及受影响路径，合计 289 个不同场景。
- 正式构建预览同一浏览器 runner：8 个创建/报告/目录/导出/平台路径；最终布局再测 3 个。
- node node_modules/vite/bin/vite.js build：原始、优化后与最终构建，不修改警告阈值；避开无关 Knowledge 备份写入。
- node scripts/model-comparison.mjs run --plan tests/fixtures/model-comparison-offline.json --limits tests/fixtures/model-comparison-offline-limits.json --out artifacts/v48-regression/offline-comparison。
- 复用 artifacts/v4-8-7-deploy-runner.sh，在隔离 Linux 容器运行未经本轮修改的 tests/deploy.integration.sh。

## 13. 结果与问题处理

初始单元 753/753；集成 14/14；路由 5/5。最初全 UI 预跑为进入优化主动中止，原日志 ui.log 保留，不算完整验收。优化后的三个分组分别 94/94、92/93、93/93：唯一失败为 report-first-layout-1440，正文起点 y=618.55，超出原要求 y<610。未改变测试阈值、断言或隐去报告内容；收紧摘要专用间距后，相关 8/8 复测通过。通用间距首次修改未作用于该卡片，失败记录 report-retest.log 也完整保留。

同步界面复测 26/26，包含新增 9 项；最终逐项合并为 289/289，无缺失场景。ui-verified-results.json 为每一项保留实际证据文件，不声称最初三个分组都以 0 退出。正式构建初测 8/8、最终首屏 3/3。最终单元及路由结果见 unit-final.log、routes-final.log。

Linux 脚本退出 0，最终 PASS 覆盖部署、升级、数据保留、备份、回滚、健康检查、停止时备份、构建故障、迁移故障。RUN false 和注入迁移异常为预期保护测试，不能误记为产品失败。部署使用当时已含异步加载的隔离副本；最后纯 CSS 间距修正由最终正式构建和浏览器复测覆盖。无实际生产发布。

## 14. Benchmark

构建入口 JS 从 649.23 kB / gzip 216.54 kB 下降到约 550.34 kB / gzip 182.02 kB，分别减少约 15.2% / 15.9%。这是相同本地构建工具下的资源体积，不是网络时间、总路由流量或真实用户性能测量。工作台约 76.77 kB、导出约 11.81 kB 成为按需脚本；缺失时有现有加载/恢复路径。

模型方面，单元中的 60 个冻结 baseline/candidate 运输安全案例通过；实际离线 CLI 覆盖 A–F 六种模式的 12 个研究臂，36 次模拟请求。两者均不代表真实模型交付/事实质量，也不满足 >=50 个真实独立案例的生产 gate。

## 15. 安全与隐私

UI 的所有 API 使用内存夹具、禁止真实外部请求，不创建真实研究。模型对照仅离线模拟；没有发送真实材料或付费请求。数据库测试使用随机隔离库并清理自己的数据。无新增权限、私有推理展示、连接信息暴露或 Evidence / 财务校验放宽。

## 16. 回滚路径

使用 artifacts/v48-regression/before/ 与 baseline.json 核对本轮开始时文件；只撤回本报告列出的前端、测试和文档增量，保留期间并行页面/版本调整和此前 Gateway 迭代。不要全仓 reset，也不要直接用旧副本覆盖包含他人新增内容的文件。删除本报告时同步删除 MANIFEST 条目并重算变更文档哈希。无需数据库迁移或回滚研究数据。

## 17. 已知限制

主入口仍超过 500 kB，构建提醒保留；未通过提高阈值掩盖。并行前端更新已额外纳入复测，但不归为本轮功能实现。真实供应商质量、真实成本与完整端到端外网采集没有在本轮测量，离线安全通过不改变 V4.8.11 的 PARTIAL 验收状态。

## 18. 延期事项

真实 MAIN/PRO >=50 案例质量准入、用户搁置的贵州茅台/比亚迪付费试跑、生产 policy 切换、更多非首屏资源拆分与实机性能测量、V4.9+ 均保持延期；本轮没有顺带执行。
