# V4.9 回归问题优化交付

用户明确要求对整体回归报告中的事项“全部进行优化”。本轮在既有实现上补齐正式构建测试、首屏按需加载和统一发布检查；视觉输出约束沿用并行维护已审阅的实现与独立真实对照，不重复创建模型客户端、修改评分器或覆盖旧结果。

**状态：四项回归优化均已处理，工程验证通过。** 正式构建页面 307/307，单元 794/794，数据库/续跑 15/15；首屏 JavaScript 减少 13.17%。视觉最新独立真实批次两模型均 48/48，技术质量通过，未代签正式批准或启用候选路由。

## 改动与收益

- **正式构建测试**：工作台模块拦截同时匹配开发 `.jsx` 与生产带摘要的 `.js` 路径；延迟加载、故障注入、焦点、草稿和重试断言保留。UI 结果记录 `assetMode`，不再混淆开发与正式构建测试。
- **首屏按需加载**：ResearchHistory 复用现有 ResearchPages 的加载/失败边界；平台状态文本即时显示，首次点击说明时才加载 Popover 说明面板。加载期间按钮忙碌且防止重复操作；失败提供刷新重试，既有说明内容、键盘关闭、焦点返回与模型配置语义保留。
- **清单与配置**：新增 `pnpm test:release`，统一执行文档 MANIFEST、Gateway 与 Vision 清单检查。增加公开模板一致性、关闭晋升开关与空 API Key 占位校验，防止模板差异或把路径误填为密钥。
- **视觉约束**：同期维护已完成脚注、缺失、表头、行名和期间约束修正。本任务复核最新第九批次，两模型均 48/48，96 份输出重评分与保存结果完全一致，当前语料和代码绑定通过。旧真实响应保留原样，不用程序改写或降低评分抹去错误。

## 首屏测量

相同本地预览、无头 Edge、1440×1000、API 合成夹具、新浏览器上下文、4 倍 CPU 限速，各 7 次，中位数如下。未模拟真实用户网络，不将本地数据外推为线上性能保证。

| 指标 | 优化前 | 优化后 |
| --- | --- | --- |
| 实际首屏 JavaScript 解码字节 | 550,708 | 478,167（减少 13.17%） |
| 入口 gzip | 182.23 kB | 159.05 kB（减少约 12.72%） |
| First Contentful Paint | 856 ms | 864 ms |
| 脚本执行时间 | 279.485 ms | 282.162 ms |
| 主线程 TaskDuration | 893.228 ms | 931.906 ms |

实际收益是首屏传输/解析输入体积下降，500 kB 构建提醒消失。此轮计时没有显示稳定改善，不能据此声称首屏更快。未提高提醒阈值，未只把同步依赖拆成同样立即下载的多个块。

证据：`artifacts/v49-optimization-20260911/{before,after}-chunks.json`、`{before,after}-home.json`、`build-{before,after}.log`。模块归因发现历史页及其筛选组件提前进入首页；移出历史页后入口约 511.72 kB，再按需加载平台说明后为 478.17 kB。

## 验证

新增三个浏览器场景检查首页不提前加载历史/说明模块、说明延迟加载状态、历史/说明模块失败后刷新恢复和搜索参数保留。既有测试路径适配后无需临时钩子。

| 验证 | 最终结果 | 本地证据（artifacts/v49-optimization-20260911/） |
| --- | --- | --- |
| 正式构建全部页面 | 307/307；新增 3 项，原 3 项失败均通过；约 9 分 33 秒 | ui/ui-results.json、ui.log |
| 定向开发环境/正式构建 | 各 20/20，均无临时资源替换钩子 | ui-dev/、ui-focused/ |
| 全量单元 | 794/794，0 fail/skip/cancel，13.20 秒 | unit-final-snapshot.log |
| 统一发布检查 | 25/25，覆盖模板/文档/Gateway/Vision 清单 | release-final.log |
| 数据库/续跑 | 15/15，11 个文件 | backend-results.json、mongo-*.log |
| 路由 | 5/5 | routes.log |
| 生产构建 | 成功，无 500 kB 提醒 | build-after.log |
| Linux 部署/升级/备份/回滚/故障保护 | 通过，退出 0；临时容器/数据卷/网络清理 | deploy.log、deploy-exit.txt |
| 新视觉离线对照 | 48 原件/96 模拟调用完成，qualityAccepted=false | vision-offline.json |
| 已有真实批次复核 | 96 份输出全部重评分一致，基线/候选各 48/48 | vision-verification.json |
| 差异格式检查 | 通过 | diff-check.log |

最终单元测试前后快照一致：2026-09-11 18:13:20–18:13:34（北京时间），见 source-final-before.json 与 source-final-after.json；随后只完成报告和文档摘要，发布检查再次通过。公开示例和同期视觉审核文档曾变化而未同步 MANIFEST，首轮单元 793/794 失败记录保留；审阅现行文档并同步后再测通过，未删除断言或改写原日志。原整体回归失败仍位于 `artifacts/v49-regression-20260911`。

视觉质量复核证据：`artifacts/v49-optimization-20260911/vision-verification.json`；原始真实批次 `artifacts/vision-live-glm53-fields-20260911-09.json`，reportHash=`8d0bf01699843e4d98664682e6590619ae3eefe917dcb7732acb53585afa0895`。复核采用该批次实测的 Coding 端点，在内存中覆盖候选地址，不改实际环境文件。准入只剩 operator_review_required；生产启用仍需正式操作人批准且配置必须与实测绑定一致。

该真实批次的调用和逐图技术审核由同期维护完成，本任务只读复核，未重复发起付费调用。完整原件审阅与中间批次问题见 [视觉审核报告](vision-header-constraints-review-20260911.md)。48 份英文合成原件不能代表未见中文财报、复杂图表或长期零错误。

## 工程完成项

| 项目 | 本轮记录 |
| --- | --- |
| 1. Release | 当前 V4.9 的回归问题维护，不进入未来版本 |
| 2. 修改文件 | src/App.jsx、src/components/ResearchPages.jsx、src/components/PlatformStatus.jsx、tests/platform-v48-ui-scenarios.mjs、tests/platform-v49-ui-scenarios.mjs、tests/workspace-ui.integration.mjs、tests/harness.test.mjs、package.json、README.md、current-implementation-map、V4.9 DETAILED_INDEX、MANIFEST.json |
| 3. 新增文件 | src/components/PlatformStatusPanel.jsx、本报告、本地测量/测试工件 |
| 4. 删除文件 | 无 |
| 5. 架构 | 复用既有页面懒加载/错误边界；平台说明拆分为延迟导入的展示模块，无新后端子系统 |
| 6–7. Schema/迁移 | 无数据库、API 或研究记录结构变更；UI 测试 JSON 新增 assetMode 只用于测试工件 |
| 8. 环境 | 无新增依赖或生产环境配置；仅增加发布检查命令，测试使用隔离本地端口 |
| 9–10. 兼容/恢复 | 保存规则、证据、时点、模型 pin 和研究续跑逻辑不改；页面刷新保留既有草稿/URL 行为 |
| 11. Flags | 不启用候选路由或生成正式操作人批准 |
| 12–13. 测试/结果 | 见最终验证矩阵及本地日志 |
| 14. Benchmark | 首屏 7 次前后测量见上；视觉质量使用独立绑定证据，不以模拟调用代替真实评分 |
| 15. 安全/隐私 | 不将凭据写入报告；公开模板空密钥检查；页面测试使用合成 API 数据，不改金融证据门槛 |
| 16. 回滚 | 撤回本次前端动态导入/测试/命令增量并同步本报告相关文档摘要；不重置工作区其他改动，无数据库回滚 |
| 17. 限制 | 本地时间测量无稳定改善；实际网络、跨浏览器与长期模型质量须独立验证；正式候选晋升待具体批准 |
| 18. 后续 | 不实现未来发布功能；不把技术审核或“全部优化”解释为向线上部署或代签操作人批准 |
