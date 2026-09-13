# V5.1 工程交付报告

2026-09-12：V5.1.0–V5.1.14 的工程实现与离线验收完成。CURRENT 已从 V5.0 切换到 V5.1。真实模型质量验收沿用此前暂停状态，尚未验证实际生产节省，也未开启生产候选模型或预算优化。实现结果已在共享工作区，未提交 Git、未发布生产。

## 1. Release / subrelease

| 范围 | 交付行为 | 主要验收 |
| --- | --- | --- |
| .0–.1 定价 | 兼容旧定价；只读历史注册表，版本、生效窗口、获知时间与精确连接身份 | model-pricing |
| .2–.4 用量与单次/任务费用 | 用量来源、推理 token 子集、调用时价格快照、重试缺口、按用途/模型聚合 | model-usage、model-cost、Mongo/API |
| .5 有效任务成本 | 所有任务的模型费用 / 零关键错误的有效交付数；失败任务也计入成本 | cost-benchmark、benchmark statistics |
| .6–.8 缓存 | 文本前缀哈希、过去七日观测、样本量/覆盖率/命中率门槛 | model-cache |
| .9 成本候选排序 | 先通过既有质量、能力、健康与任务匹配检查，再按同币种已观测成本排序；只读演练 | model-cost-policy、approval binding |
| .10–.12 研究预算 | 固定限制、派发前持久预留、完成结算、恢复防重放；仅复用证据快照一致的重复检索 | research-budget、实际 Agent 继续执行、Mongo 重启 |
| .13 时段价格 | 时区、跨午夜、夏令时与调用时快照；不为低价延迟研究 | model-pricing |
| .14 可观测性 | 保存任务的费用 API 和“研究过程 → 费用与研究预算”面板 | API 隐私/隔离、6 个新增桌面/移动场景 |

顺序与阶段证据见 [execution-log](execution-log.md)；操作见 [runbook](runbook.md)。运行框架/Knowledge 4.7 保持独立于 Harness V5.1。

## 2. Modified files（59）

- `.dockerignore`
- `.env.example`
- `.env.production.example`
- `.gitignore`
- `MANIFEST.json`
- `benchmark/runner.mjs`
- `benchmark/statistics.mjs`
- `docs/architecture/00-system-map.md`
- `docs/architecture/current-implementation-map.md`
- `docs/contracts/model-gateway.contract.md`
- `docs/invariants/model.invariants.md`
- `docs/releases/CURRENT`
- `docs/releases/V4.9/vision-call-inventory.json`
- `docs/releases/V5.1/DETAILED_INDEX.md`
- `docs/releases/V5.1/README.md`
- `docs/releases/V5.1/acceptance.md`
- `docs/releases/V5.1/benchmark.md`
- `docs/releases/V5.1/migration.md`
- `docs/releases/V5.1/rollback.md`
- `docs/releases/V5.1/schema.md`
- `docs/releases/V5.1/subreleases/V5_1_0-pricing-schema.md`
- `docs/releases/V5.1/subreleases/V5_1_1-pricing-registry-history.md`
- `docs/releases/V5.1/subreleases/V5_1_10-research-budget-schema.md`
- `docs/releases/V5.1/subreleases/V5_1_11-budget-accounting.md`
- `docs/releases/V5.1/subreleases/V5_1_12-budget-aware-retrieval.md`
- `docs/releases/V5.1/subreleases/V5_1_13-peak-off-peak-pricing-support.md`
- `docs/releases/V5.1/subreleases/V5_1_14-cost-observability-ui-api.md`
- `docs/releases/V5.1/subreleases/V5_1_2-usage-normalization.md`
- `docs/releases/V5.1/subreleases/V5_1_3-per-call-cost-calculation.md`
- `docs/releases/V5.1/subreleases/V5_1_4-job-cost-aggregation.md`
- `docs/releases/V5.1/subreleases/V5_1_5-effective-task-cost.md`
- `docs/releases/V5.1/subreleases/V5_1_6-cache-fingerprint.md`
- `docs/releases/V5.1/subreleases/V5_1_7-cache-analytics.md`
- `docs/releases/V5.1/subreleases/V5_1_8-cache-eligibility-gate.md`
- `docs/releases/V5.1/subreleases/V5_1_9-cost-candidate-ranking.md`
- `package.json`
- `server/agent.mjs`
- `server/index.mjs`
- `server/job-stream.mjs`
- `server/model-adapter.mjs`
- `server/model-catalog.mjs`
- `server/model-champion.mjs`
- `server/model-gateway-result.mjs`
- `server/model-gateway.mjs`
- `server/model-rollout.mjs`
- `server/model-telemetry.mjs`
- `server/research-create.mjs`
- `server/research-resume.mjs`
- `server/research-retry.mjs`
- `server/storage.mjs`
- `server/vision-model.mjs`
- `server/vision-policy.mjs`
- `server/web-research.mjs`
- `src/components/ResearchDetail.jsx`
- `src/components/research-detail.css`
- `src/components/research-report-first.css`
- `src/config/platform-release.mjs`
- `src/platform.css`
- `tests/workspace-ui.integration.mjs`

## 3. New files（21）

- `config/pricing.example.json`
- `config/research-budget.example.json`
- `docs/releases/V5.1/completion-report.md`
- `docs/releases/V5.1/execution-log.md`
- `docs/releases/V5.1/runbook.md`
- `docs/releases/V5.1/validation-results.json`
- `scripts/cost-benchmark.mjs`
- `server/model-cache.mjs`
- `server/model-pricing.mjs`
- `server/research-budget.mjs`
- `src/components/ResearchCostSummary.jsx`
- `tests/cost-benchmark.test.mjs`
- `tests/fixtures/cost-budget-v51.json`
- `tests/model-cache.test.mjs`
- `tests/model-cost-policy.test.mjs`
- `tests/model-cost.integration.mjs`
- `tests/model-cost.test.mjs`
- `tests/model-pricing.test.mjs`
- `tests/model-usage.test.mjs`
- `tests/platform-v51-ui-scenarios.mjs`
- `tests/research-budget.test.mjs`

验证日志、截图和临时运行脚本位于被忽略的 artifacts/v51-validation。工作期间出现的 docs/architecture/model-pipeline-redesign-proposal.md 不属于本次交付，未修改或纳入清单。

## 4. Removed files

无。

## 5. Architecture changes

扩展现有 Catalog、Gateway、ModelCall、Champion、研究任务及 checkpoint、统一 benchmark 和详情面板。新增三个职责单一的辅助模块负责定价、缓存分析、预算记账；没有第二套 Gateway、模型选择器、研究存储或多智能体系统。确定性费用/预算计算由程序执行。Champion 和 Vision 既有质量批准指纹绑定新预算配置与相关代码，防止配置变化绕过质量批准。

模板中的 server/model-gateway/ 已与真实扁平模块路径对齐；模板“无持久变更”与定价历史/预算要求的冲突按发布级 additive schema 解决并记录。历史 Vision 清单基线哈希不变，仅更新当前审查哈希。

## 6. Schema changes

ModelCall 增加可选 usageDetails/cost/cache/transportAttempts；既有 job 私有 payload 可含预算 v1 账本，既有 toolRecords 可含检索快照哈希。定价 v1/v2 和只读注册表显式保留版本/时点。金融事实、财务期间、币种、来源与研究截止日语义不变。详见 [schema](schema.md)。

## 7. Migrations

无需数据库集合、索引或版本迁移；无回填、删除或历史记录重算。旧值缺失保持未知。读取旧记录保持兼容后再新增字段写入；注册表由操作者保存历史，服务不写该文件。见 [migration](migration.md)。

## 8. Environment changes

只修改公开示例：MODEL_PRICING_FILE、RESEARCH_BUDGET_FILE 为空，FEATURE_COST_ROUTER、FEATURE_RESEARCH_BUDGET=false。私有配置从 Git 和镜像构建上下文排除。未改实际环境文件、密钥、依赖版本、生产数据库或运行服务。验证使用隔离 Mongo 27029、临时 UI 端口和 Docker 项目；最终本地验证镜像为 zhiheng-agent:v51-verified。

## 9. Compatibility impact

旧价格定义、四项基础用量、无预算的任务、旧 ModelCall 及冻结 benchmark 收据继续有效；可选字段缺失时不改变旧规范化对象哈希。新增只读 GET /api/jobs/:id/cost，旧接口字段兼容。连接身份为不透明哈希，多币种分开；未知费用不按零显示。

## 10. Resume / recovery impact

预算固定在任务创建时，强制保存预留和结算，再推进既有 checkpoint；保留原截止日、模型固定选择、证据和已完成工具。已完成轮次不重复收费。请求结果是否已完成不确定，或结果尚未进入原 checkpoint 时暂停并保存缺口，不能自动重放。配置关闭可停止预算强制执行，但不能推断不确定请求未执行。实际 Agent 继续执行及 Mongo 跨进程恢复均通过。

## 11. Feature flags

FEATURE_COST_ROUTER=false：排序接口保持禁用标记；true 仍仅 dry-run，不更换生产模型。FEATURE_RESEARCH_BUDGET=false：配置预算可观测记账；新任务仅在明确开启时固定 enforce 模式。老任务不因新配置自动添加或升级预算。原有模型候选、Vision 路由、A/B 批准流程保持原状态。

## 12. Tests executed

执行现有全部单元测试、扩展 test:release、13 组 Mongo/API/恢复集成测试、路由测试、完整生产构建 UI 回归、文本/Vision 离线基准、冻结成本基准、Linux 完整部署回滚套件和最终镜像断网模块加载。具体文件及日志 SHA-256 见 [validation-results.json](validation-results.json)。

## 13. Test results

| 检查 | 最终结果 |
| --- | --- |
| 全量单元 | 911/911，0 失败/取消/跳过 |
| 发布专项 | 125/125，0 失败/取消/跳过 |
| Mongo/API/跨进程恢复 | 13 组、18/18；根据断言统计核实，不只看退出码 |
| 路由渲染 | 5/5 |
| UI | 332/332；含 6 个新增费用场景；移动截图已检查 |
| 生产构建 | 通过；入口 480.41 kB / gzip 159.70 kB |
| Linux 部署 | 部署、升级、持久数据、备份、回滚、健康检查、停止后备份、构建/迁移故障注入全部通过 |
| 最终镜像 | 构建与断网模块加载通过 |

首次单元回归发现历史收据形状、fixture 调用 ID 冲突、异步时序及源码清单边界问题，均修复后通过全量。首次 UI 为 316/332，因成本面板复用旧文档面板 CSS 类触发旧选择器歧义；分离类名后 332/332。数据库三项在并行重型验证期间超时，未计为通过；单独重跑对应三个文件的四项测试全部通过且零取消，未放宽断言或超时。首次 Docker 运行遇到跨 daemon 临时挂载路径问题，以共享目录重跑原套件通过。故障注入日志内预期的构建失败不是最终失败。

## 14. Benchmark results

文本 32/32、Vision 192/192 离线尝试通过，关键错误为 0；成本/质量固定六例 6/6。成本 fixtureHash：fd5439cdd8a986ba82a6e621beaa5b25b646a40cfed9d19e1c56e9c8ed438ad2。全部为 simulation，真实模型请求 0；qualityAccepted=false、productionSavingsAccepted=false。低价但质量下降、未交付、未知费用/重试或跨币种均不能建立可接受的有效成本优势。没有由模拟得出的真实节省百分比。

## 15. Security / privacy implications

费用 API 按任务读取并只输出白名单；私有预算账本从详情、列表及 SSE 排除。缓存仅存哈希及观测元数据，不存提示正文、图片、隐藏推理、端点或密钥。复用只在同一任务中、原始来源快照一致时成立；没有跨用户缓存内容共享。集成覆盖未知任务、隔离、删除及敏感字段排除。沿用平台既有访问边界，未新增认证或外发通道。

## 16. Rollback path

优先保留 V5.1 程序并关闭两个新标志，保留原账本和费用证据。移除价格/预算配置仅停止新估算/新任务预算，不重写历史。旧程序不能安全恢复预算任务：这些任务须暂停或由当前程序继续管理。隔离部署验证备份/恢复，预算测试验证关闭限制不清零消耗。详见 [rollback](rollback.md)。

## 17. Known limitations

- 实际模型质量、成本优势和生产规模延迟/吞吐尚未验收；此前暂停保持有效。
- 遥测为 best-effort，缺失记录无法证明零消费；统一费用只估算模型费用，外部数据服务收费未知。
- 货币预算需要已知费率与模型上下文/输出上限；不确定时显式停止。预留为保守估算，不能充当供应商账单保证。
- 耗时限制在新资源操作边界检查；已执行操作仍服从原传输超时。网页预算计搜索/读取操作，不逐一计算内部重定向。
- 不确定请求无自动对账恢复；预算紧张时仅复用确切重复检索，不做推测性证据优先级删减。
- 缓存门槛是保守工程规则，需实际历史观测；成本候选排序仅只读，不执行线上切换。
- 冻结成本 CLI 从仓库测试 fixture 运行；精简生产镜像不包含该测试 fixture。

## 18. Deferred future-release work

未实现用户手动选模、实时价格抓取、自动在线调参/选模、供应商账单对账、自动不确定请求重放、分布式预算账本或 V5.2 及后续功能。真实模型验收恢复与受控生产启用属于后续明确操作，本次未擅自执行。
