# V5.0 整体回归与优化报告

日期：2026-09-11。当前发布为 V5.0，框架/Knowledge 仍为 V4.7。本轮按用户要求重新执行工程回归并修复发现的问题；真实模型质量验收、付费比较和生产候选启用继续保持暂停。

本轮日志、快照、模拟基准和截图在 `artifacts/v50-regression-20260911/`。初始单元为 868/868，修复后的全量单元为 871/871。前一轮报告的通过数不作为本轮执行证据。

**工程回归结论：通过。** 全量单元 871/871、发布检查 102/102、Mongo 17/17、完整正式构建页面 318/318；同期后续前端变更另有最新构建的 19/19 增量验证。真实完整研究质量验收仍暂停，此结论不授予生产晋升。

## 修复与优化

1. **完成后的续跑也必须检查预算账本。** 原实现仅在实际执行一个样例时初始化账本；已完成 run 的 `resume` 跳过执行，因此账本缺失仍返回成功。新增真实执行分支的 mock 用例先复现 `Missing expected rejection`。现在由 runner 持有原独占锁后调用 executor 的准备步骤，先核验账本再检查样例；缺失/损坏则失败，恢复原账本后复用原结果，16 次合成请求不会增加。没有把模拟结果冒充模型质量，也没有修改预算限额或旧记录。
2. **基准命令拒绝含糊参数。** 原 CLI 用 indexOf/includes 取值，未知/重复参数会被忽略。现在在读取限额文件、写 run 或调用模型前拒绝未知项、重复项、缺值、额外位置参数、无效 kind/repeats 和不完整付费组合；`--live false` 明确无效。合法离线和明确授权的付费参数形式保留。
3. **统一发布检查覆盖 V5.0。** `pnpm test:release` 在既有文档、模板、Gateway 和 Vision 清单之外，加入当前完整 benchmark/challenger/classifier/champion/experiment/drift 单元套件。无需另记一个容易遗漏的专项入口。
4. **页面验证与构建对象一致。** 首次预览端口与同期其他预览冲突，旧运行器错误接受其他进程的就绪响应；失效测试被停止，日志保留。本轮验证运行器改为等待自己成功绑定的 Vite 预览实例，使用独立端口。随后一轮出现两项同期新增文案检查与旧构建不匹配，已重建当前前端。另有手机手册返回时定位检查早于布局稳定；增加同帧位置就绪等待，保留标题必须低于固定标签栏且在视口内的原断言。

同期维护先修改 ResearchMethod/ResearchUsageGuide 的调用记录入口说明并增加两个 UI 场景，本轮阅读后纳入 318 项完整构建回归；全量运行期间又补充历史调用缺少编号的说明和两项测试，另以最新构建执行 19 项相关增量回归。本任务不将这些文案变更归为自身实现。失败截图中手机标题最终可见，不能仅凭瞬时测量失败宣称存在持续遮挡。

## 验证矩阵

| 验证 | 本轮最终结果 | 证据 |
| --- | --- | --- |
| 全量单元 | 871/871，0 fail/skip/cancel | unit-final-snapshot.log |
| 统一发布检查 | 102/102，最终文档摘要核对通过 | release-pre-final.log、release-final.log |
| 预算恢复与 runner 定向 | 10/10 | budget-after-fix.log；失败复现 budget-before-fix.log |
| CLI 参数检查 | 2/2 | cli-after-fix.log |
| Mongo/API/续跑 | 12 组、17/17；修复后 A/B 两组再测 2/2，不重复计入 17 项 | core-results.json、mongo-*.log、mongo-experiment-final.log |
| 路由 | 5/5 | routes.log |
| 新生产构建 | 成功；入口 480.37 kB / gzip 159.70 kB | build-final.log |
| 完整正式构建 UI | 318/318，assetMode=production，基于 final-build | ui-complete/ui-results.json、ui-complete.log |
| 后续前端增量 | 19/19；最新 late-build，覆盖 V5.0 全部 13 项和指南导航/返回 6 项，包含新加入的历史缺编号场景 | ui-late/ui-results.json、ui-late.log |
| 部署、备份与回滚 | 全部通过，退出 0；临时项目、容器/数据卷/网络清理 | deploy.log、deploy-exit.txt |
| 文本离线基准 | 32/32（8 例×2 模型×2 次） | benchmark-text/summary.json |
| 视觉离线基准 | 192/192（48 例×2 模型×2 次） | benchmark-vision/summary.json |
| 原 V4.9 Vision 离线 | 48 个原件/96 次模拟完成 | vision-offline.json |
| 统计与基线复用 | 224 条重校验、结果不变；基线单侧 16+96 条重放并冻结，拒绝覆盖；模拟结果全部拒绝晋升，网络请求 0 | benchmark-verification.json |
| 差异格式 | 通过 | diff-check.log |

初始 UI 端口失败见 ui.log/ui-preview.log；旧构建与新测试的一轮为 315/318，见 ui-final.log，其三项失败均保留。最终结论只使用新构建的完整回归。所有浏览器 API 使用内存夹具，不提交真实研究。

全量单元前后 1171 个文件的快照摘要一致：北京时间 2026-09-11 21:49:37–21:49:50，见 source-final-before.json/source-final-after.json。随后后端/benchmark/CLI 未再修改；同期指南文案与 UI 场景增量由 late-build 的 19 项回归验证，报告和相关清单在收尾时复核。最终路径对照见 completion.json。部署覆盖安装、升级、持久化、备份、回滚、健康检查、停服备份、构建失败与迁移失败保护。

## 兼容性、边界与限制

没有修改模型传输、研究证据、财务公式、评分器、统计阈值、模型组分配、实际环境或数据库结构。`prepare` 是运行器的内部可选准备回调，原调用者默认为空操作；生产 HTTP API 不变。预算账本格式和 run/result schema 均不变，账本准备发生在同一独占锁内，避免并发读取旧预算后重新获得额度。

相关源码变化会按现有机制使旧基准/批准的代码绑定失效。旧 run、批准、输出和预留账本保留，不改写哈希以强行继续；需匹配的工程版本或另建明确标识的新 run。恢复未确认请求依然拒绝重发，既有 v3 job pin/原资料时点/已完成工具记录不改。

全部新增执行测试使用合成凭据、mock transport 或强制模拟环境，新增真实模型请求为 0。224 条离线结果的 qualityAccepted 均为 false；组件提取夹具不等于完整研究质量验收，样本量/真实证据要求保持。真实验收暂停不等于 V5.0 已完整接受。

本地浏览器回归不覆盖所有真实网络、浏览器和长期模型质量；首屏体积不能直接证明线上提速。新前端文案来自同期维护，当前构建体积变化不归因于本轮预算修复。部署验证使用临时 Docker 项目，未向线上部署。

## 18 项工程交付记录

| 项目 | 本轮记录 |
| --- | --- |
| 1. Release | V5.0 工程回归，主要维护 .4/.7；真实验收仍暂停 |
| 2. 修改文件 | benchmark/runner.mjs、benchmark/executor.mjs、scripts/benchmark.mjs、package.json、tests/benchmark-executor.test.mjs、tests/platform-v50-ui-scenarios.mjs、docs/architecture/current-implementation-map.md、docs/releases/V5.0/DETAILED_INDEX.md、runbook.md、MANIFEST.json |
| 3. 新增文件 | tests/benchmark-cli.test.mjs、本报告及本轮验证工件 |
| 4. 删除文件 | 无 |
| 5. 架构 | 扩展现有 runner/executor 内部准备步骤，沿用 Gateway、预算所有者与独占运行锁 |
| 6. Schema | 无持久化结构变化，原格式/身份语义保留 |
| 7. 迁移 | 无迁移或回填；既有部署迁移在隔离环境复测 |
| 8. 环境 | 无依赖或实际环境修改；test:release 扩大覆盖，CLI 参数要求更明确 |
| 9. 兼容 | 合法现有 CLI 保持；旧代码绑定不被强行重写，不完整/歧义参数提前拒绝 |
| 10. 恢复 | 完成后的 live-path resume 同样核验账本；正确账本零新增请求；不变更研究 pin/时点 |
| 11. Feature flags | 无实际开关改变，不启用 champion、A/B 或生产候选 |
| 12. 测试执行 | 初始和最终全量、定向红绿测试、Mongo、UI、部署与新离线基准 |
| 13. 测试结果 | 见最终矩阵和保留的原始失败日志 |
| 14. Benchmark | 224 条新模拟结果；原 Vision 离线兼容链路复测；真实请求 0 |
| 15. 安全隐私 | 合成 API/模型数据、隔离数据库/容器；不暴露密钥、私有推理或修改金融值 |
| 16. 回滚 | 按本轮增量撤回 runner/executor/CLI/测试与文档并同步摘要；不重置同期前端改动，无数据回滚需求 |
| 17. 限制 | 真实完整研究质量仍待验收；硬终止后的遗留运行锁须按现有人工排查流程处理，不能删除预留请求以恢复预算 |
| 18. 延期 | 用户暂停的真实评估与生产激活保持暂停；不进入后续发布 |
