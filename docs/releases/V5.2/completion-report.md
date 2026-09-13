# V5.2 工程交付报告

2026-09-12：V5.2.0–V5.2.10 的工程实现与离线验收完成，CURRENT 和平台展示版本为 V5.2。用户明确继续暂停真实模型验收；真实质量、成本收益和生产启用仍未验收。结果保存在共享工作区，未提交 Git、未发布生产，未修改实际密钥或生产数据。

## 1. Release / subrelease

| 范围 | 已实现行为 |
| --- | --- |
| .0–.1 | 独立旗舰角色、显式能力和默认关闭标志；数据缺失/服务失败/普通任务不升级 |
| .2 | 重复且经过程序分类的复核失败后，独立上下文关键复核；保留原研究会话 |
| .3–.4 | 同口径已完成L1/L2实质冲突；从原时点真实证据块和工具记录构造输入 |
| .5–.6 | 仅接受L1、接受L2或证据不足；引用与原结论校验，结果仍需复核 |
| .7 | 既有ModelCall/费用面板记录独立用途、费用、延迟和冲突类型；价值未知保持未知 |
| .8 | 冻结12例离线安全集，复用现有grader/statistics，真实请求0 |
| .9 | 原始实时评测工件、人工批准、成本与稀有使用率门槛；逐任务固定授权和关闭开关 |
| .10 | 既有漂移模块的只读使用率/费用告警，不自动改策略或削弱复核 |

详见 [执行记录](execution-log.md) 和 [操作说明](runbook.md)。

## 2. Modified files（51）

- `.dockerignore`
- `.env.example`
- `.env.production.example`
- `.gitignore`
- `MANIFEST.json`
- `benchmark/graders.mjs`
- `benchmark/statistics.mjs`
- `docs/architecture/00-system-map.md`
- `docs/architecture/current-implementation-map.md`
- `docs/contracts/claim.contract.md`
- `docs/contracts/model-gateway.contract.md`
- `docs/invariants/model.invariants.md`
- `docs/invariants/research.invariants.md`
- `docs/releases/CURRENT`
- `docs/releases/V4.9/vision-call-inventory.json`
- `docs/releases/V5.2/README.md`
- `docs/releases/V5.2/acceptance.md`
- `docs/releases/V5.2/benchmark.md`
- `docs/releases/V5.2/migration.md`
- `docs/releases/V5.2/rollback.md`
- `docs/releases/V5.2/schema.md`
- `docs/releases/V5.2/subreleases/V5_2_0-flagship-tier-schema.md`
- `docs/releases/V5.2/subreleases/V5_2_1-flagship-eligibility-gate.md`
- `docs/releases/V5.2/subreleases/V5_2_10-flagship-drift-usage-guard.md`
- `docs/releases/V5.2/subreleases/V5_2_2-critical-review-escalation.md`
- `docs/releases/V5.2/subreleases/V5_2_3-core-conflict-detector.md`
- `docs/releases/V5.2/subreleases/V5_2_4-judge-input-contract.md`
- `docs/releases/V5.2/subreleases/V5_2_5-judge-output-contract.md`
- `docs/releases/V5.2/subreleases/V5_2_6-judge-validation.md`
- `docs/releases/V5.2/subreleases/V5_2_7-judge-telemetry.md`
- `docs/releases/V5.2/subreleases/V5_2_8-judge-benchmark.md`
- `docs/releases/V5.2/subreleases/V5_2_9-rare-path-rollout.md`
- `package.json`
- `scripts/check-model-call-inventory.mjs`
- `server/agent.mjs`
- `server/job-stream.mjs`
- `server/model-adapter.mjs`
- `server/model-catalog.mjs`
- `server/model-config.mjs`
- `server/model-connection.mjs`
- `server/model-drift.mjs`
- `server/model-gateway.mjs`
- `server/model-rollout.mjs`
- `server/model-telemetry.mjs`
- `server/research-context.mjs`
- `server/research-create.mjs`
- `server/research-resume.mjs`
- `server/research-retry.mjs`
- `server/storage.mjs`
- `src/components/ResearchCostSummary.jsx`
- `src/config/platform-release.mjs`

## 3. New files（19）

- `docs/releases/V5.2/completion-report.md`
- `docs/releases/V5.2/execution-log.md`
- `docs/releases/V5.2/runbook.md`
- `docs/releases/V5.2/validation-results.json`
- `scripts/flagship-usage.mjs`
- `scripts/judge-benchmark.mjs`
- `server/model-flagship.mjs`
- `server/model-judge.mjs`
- `tests/fixtures/flagship-acceptance.mjs`
- `tests/fixtures/judge-v52.json`
- `tests/flagship-agent.test.mjs`
- `tests/flagship-review.test.mjs`
- `tests/flagship-rollout.test.mjs`
- `tests/flagship-state.integration.mjs`
- `tests/flagship-usage.test.mjs`
- `tests/judge-benchmark.test.mjs`
- `tests/judge-contract.test.mjs`
- `tests/judge-telemetry.test.mjs`
- `tests/model-flagship.test.mjs`

既有未提交的V5.1文件继续保留；上表按本次实际编辑范围列出，其中原本未跟踪的ResearchCostSummary仍按既有文件的修改计。工作区其他配置教程/架构提案不属于本次交付。

## 4. Removed files

无。临时测试记录与截图在被忽略的artifacts/v52-validation。

## 5. Architecture changes

扩展现有Catalog、配置、连接、Gateway/adapter、Agent、研究上下文、存储、遥测、benchmark与drift。新增model-flagship负责独立路径资格和持久调用收据，model-judge负责局部冲突输入与受限建议；没有第二套传输/研究存储/金融引擎、多智能体群或分布式设施。现有review_valuation_models仍拥有估值比较。架构扫描新增独立Gateway调用者的准入/恢复断言，并保留旧调用清单的历史基线。

## 6. Schema changes

配置增加ModelProfile v5和两个可选角色；既有私有job payload可增加flagshipState及复核checkpoint字段；ModelCall增加独立purpose与可选冲突类型。现有modelState v1–v3、金融事实和计算定义不变。模板“无持久变更”与发布级决策元数据要求的冲突已按additive方式明确处理。见 [schema](schema.md)。

## 7. Migrations

无数据库集合、索引、版本迁移或历史回填。旧记录字段缺失保持未知；只给通过完整准入的新任务保存授权，不升级旧任务。见 [migration](migration.md)。

## 8. Environment changes

仅公开示例新增关闭标志和空验收文件路径；私有批准工件加入Git/镜像排除项。未更改实际环境、模型、密钥、依赖/锁文件或生产服务。验证复用独立Mongo端口27029与临时数据库，UI用临时5408端口；Docker使用一次性测试项目。最终本地验证镜像为zhiheng-agent:v52-verified。

## 9. Compatibility impact

默认普通研究请求、工具列表与模型固定选择保持原路径。旧配置可不声明旗舰角色。仅已授权非A任务出现估值裁决工具；关键复核仍经过原交付校验。无新HTTP接口；既有费用面板新增两项用途的中文名称。费用未知不当作零，币种不混加。

## 10. Resume / recovery impact

派发前与结算后均要求持久确认；同一任务只复用输入、原截止日、角色/连接和输出哈希一致的已完成结果。跨任务拷贝收据、改变原任务日期或配置不能继续；未确认/失败收据在Agent入口暂停，不能自动重放或重新采集。独立输出不替换原研究模型或隐藏会话。Mongo实际子进程重启验证通过。

## 11. Feature flags

FEATURE_FLAGSHIP_REVIEW=false、FEATURE_JUDGE=false。即使打开也必须有对应FLAGSHIP_REVIEW_ACCEPTANCE_FILE/JUDGE_ACCEPTANCE_FILE原始评测工件和人工审核。程序复算质量、费用、100任务稀有使用率及代码/配置绑定。模拟测试批准文件仅存在临时测试目录并清理，未生成生产批准。

## 12. Tests executed

全量node --test tests/*.test.mjs；test:release发布专项；14组Mongo/API/恢复集成；5条路由；完整生产构建UI；Judge、文本、Vision和费用离线基准；现有Linux部署/备份/回滚与故障注入；最终镜像断网模块加载。具体日志、计数和SHA-256见 [validation-results.json](validation-results.json)。

## 13. Test results

| 检查 | 结果 |
| --- | --- |
| 全量单元 | 928/928；无失败、取消或跳过 |
| 发布专项 | 142/142；无失败、取消或跳过 |
| Mongo/API/跨进程 | 14组、19/19；无失败、取消或跳过 |
| 路由 | 5/5 |
| UI | 332/332；桌面/手机费用面板截图已检查 |
| 生产构建 | 通过；入口480.41 kB，gzip159.71 kB |
| Linux部署 | 部署、升级、持久数据、备份/回滚、健康/停止后备份、构建/迁移故障注入通过 |
| 最终镜像 | 构建与断网模块加载通过；默认旗舰准入关闭 |

首轮全量为921/928，失败来自未刷新清单和新增Gateway调用者未登记；随后发现交付报告链接尚未生成及Vision单次请求注释锚点需跟随兼容写法更新。补齐清单、断言和文档后全量928/928。专项初始模拟URL类型和受限数据fixture错误已纠正，未放宽生产证据/交付校验。部署日志中的注入失败是预期测试分支。身份/截止日补强后再次执行全量与Mongo恢复验证。

## 14. Benchmark results

文本32/32、Vision192/192离线尝试通过，关键错误0；费用固定6/6；Judge固定12/12。全部simulation，真实模型调用0。Judge候选输出为测试oracle，其正确率差异不是真实模型提升。qualityAccepted=false、productionValueAccepted=false；真实费用收益和稀有路径覆盖未验收。

## 15. Security / privacy implications

独立上下文无原模型隐藏会话；输出、遥测、公开接口均白名单处理。私有状态从列表、详情和SSE排除，保留任务/来源/工具关联。实际块号、连续原文、出版时点、反证和财务口径不能以相似度或模型记忆替代。未知价格/缺失时间不推断。没有外发消息、线上选模、生产凭据变更或新的认证边界。

## 16. Rollback path

关闭两个标志并保留V5.2读取/恢复代码和全部收据。旧代码只能处理未使用新状态的任务；已有flagshipState任务必须暂停或由V5.2管理，不能删记录强制续跑。备份恢复沿用既有工具；见 [rollback](rollback.md)。

## 17. Known limitations

- 用户暂停真实验收，因此不能宣称实际纠错收益、成本优势、生产稀有调用比例或全部生产验收完成。
- 关键复核只接受保守的程序已分类结构/动作失败；完全无效JSON且缺口状态未知时仍不升级。
- 自动Agent裁决只接已有主估值/交叉核验计算记录；核心论点有内部输入契约，但未把任意报告文本伪装成规范Claim。
- 必须有已知原始出版时间、真实唯一块号和完整上下文；未知、OCR、截断或缺口会导致不适用。阈值/上下文上限仍是待真实校准的工程规则。
- Judge引用一致性校验不能证明任意语义真伪；结果保持待复核建议，最终仍走既有校验。
- 未确认调用无自动对账/重放；每任务每独立角色最多一条收据。人工评测工件属于可信操作者记录，并非诚实评测的密码学证明。
- 冻结Judge/费用CLI需在含测试fixture的仓库运行，精简生产镜像不包含这些fixture。

## 18. Deferred future-release work

真实模型验收恢复、生产启用、通用语义Claim体系、自动事实创建、在线调参/自动扩容、分布式编排、供应商对账及V5.3以后功能均未越界实施。
