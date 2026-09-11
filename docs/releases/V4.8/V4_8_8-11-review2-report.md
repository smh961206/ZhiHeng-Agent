# V4.8.8–V4.8.11 第二轮 Review Completion Report

本轮完成两项执行器安全修复及离线回归。生产保持 legacy；V4.8.11 真实质量验收仍为 PARTIAL。贵州茅台 A / 比亚迪 B、合计 100 元的试跑继续搁置，未准备新语料、未调用付费模型、未启动 V4.9。

## 发现、证据与修复

1. **P1：私有检查点未绑定当前对照案例。** 原 worker 只调用 researchResume，验证检查点与其自身的 job 一致，未验证其属于当前 run/arm/input。另一个运行的合法检查点可被接收，输出却标记成当前案例。回归修改已完成运行的私有 job id，设为待恢复，修复前没有拒绝。现在先校验预期 job id、模式及完整固定输入，再执行已有恢复校验。五种错配分别覆盖其他运行、其他臂、模式、问题、原文；均在新请求/预留前拒绝。恢复原检查点可完成研究，工具读取只保留一次，marketData 沿用原状态。
2. **P1：固定材料覆盖将任意来源计为已读财报。** 原注入 collectData 按证券统计所有来源，只有行情和公告目录也能越过 Agent 的“未获得可读官方财报则停止”门槛。实际离线 Agent 回归在修复前错误完成研究。现在以现有 market-data 的正文/US 核心事实语义重放覆盖，按原申报 URL 去重；股东回报事件、行情、目录、非官方材料和无事实 XBRL 不能充当财报读取。来源内容不改写，全文读取和核心事实分别计数。负例现在零模型请求停止，正文正例能运行及恢复，XBRL 正例仅计核心事实。

这两项回归在修复前均失败（2/2），失败原因为预期拒绝未发生；不是测试环境故障。修复后执行器 17/17 通过。未删除、跳过或放宽任何原有测试、审计和 Evidence 断言。

## 检查范围

- V4.8.8：model-health、Gateway 冷却及安全候选筛选、连接身份和乱序观测处理；未发现新的已确认缺陷。
- V4.8.9：model-state、research-create/resume/retry、检查点内部一致性、生产与本地执行器的调用边界；修复仅落在本地执行器。
- V4.8.10：model-escalation、Agent 恢复与审计上下文、已完成工具保留；上一轮修复及现有升级限制通过回归。
- V4.8.11：rollout 准入、comparison parent/worker、预算流水、输出绑定、固定材料、人工质量见证；对照 market-data 和官方报告/XBRL 来源实现，避免重放覆盖偏离已有门槛。

## 工程交付记录

1. 版本：V4.8.8–V4.8.11 维护审查；本轮实际代码修改只涉及 .11 隔离执行器。
2. 修改文件：scripts/model-comparison.mjs、scripts/model-comparison-worker.mjs、tests/model-comparison.test.mjs、docs/architecture/current-implementation-map.md、docs/contracts/model-gateway.contract.md、docs/invariants/model.invariants.md、docs/releases/V4.8/DETAILED_INDEX.md、docs/releases/V4.8/model-comparison-runbook.md、MANIFEST.json。
3. 新增文件：本报告；忽略目录 artifacts 下另存日志和本轮哈希核对记录。
4. 删除文件：无。
5. 架构：保留现有 Gateway、Agent、恢复与采集所有者；只修正固定材料执行器对现有能力的绑定及重放，不新增平行系统。ADR 决策无变化。
6. Schema：无 Mongo schema、业务持久化类型或本地文件格式变更；增加安全失败原因 checkpoint_input_mismatch。
7. 迁移：无。按既有执行代码指纹规则，升级前创建的对照运行不得在新代码下续跑；建立新运行需保留旧结果和预算流水，不能伪造指纹强行恢复。
8. 环境：无依赖、锁文件、.env 或运行配置改动；集成测试仅使用 127.0.0.1:27029 隔离 Mongo，随机临时库由原测试清理。
9. 兼容：应用 server/shared/Knowledge 本轮均未改动；生产研究行为不变。执行器 Runtime behavior change 不为 0：错配恢复及无财报覆盖现在拒绝；合法文本输入和现有财务校验保持。
10. 恢复：完整固定输入包含截止日说明和原文；合法检查点继续复用已完成工具及采集时点，错配不重采集、不新增预留。
11. Feature flags：无新增或变更；生产 legacy；试跑 automaticResume=false、paidRunAuthorized=false。
12. 测试命令：见下节原始执行记录。
13. 结果：753 项单元、14 项 Mongo/集成、5 个路由场景通过。最终 Harness 文档及清单另复核；无失败、跳过或取消。
14. Benchmark：现有 60 个合成安全案例与六模式 Agent/Gateway 离线对照通过；不是实际模型研究质量、费用或投资判断验收。
15. 安全隐私：没有读取或输出密钥，没有访问生产数据库或发送付费模型请求；私有检查点仍属受信任本地材料，非公开报告。来源类型与官方属性是归档操作人的声明，本修复不声称能证明真实来源或语义正确。
16. 回滚：只恢复本轮所列修改，参照 artifacts/v4-8-8-11-review2-baseline.json 和 review2-audit.json；保留此前已接受的未提交工作及预算/结果文件。不涉及数据库或部署回滚。
17. 限制：没有重跑 UI 或 Linux 部署验收；本轮没有前端、应用服务、部署或数据库修改。预算仍为操作人估计的预留，不能证明供应商账单硬上限。归档的缺失附注、期间及文本不完整性不因覆盖数而消失。
18. 延期：用户搁置的两标的试跑、价格及账户硬限额验证、至少 50 案例真实质量审核、生产 policy 切换；不实施 V4.9+。

## 实际测试记录

所有最终运行退出码均为 0；日志位于 artifacts/v4-8-8-11-review2-*.log。

| 实际命令 | 结果 | 日志后缀 |
| --- | --- | --- |
| node --test tests/model-comparison.test.mjs | 17 通过，0 fail/skip/cancel | focused-final |
| pnpm test | 753 通过，0 fail/skip/cancel | unit |
| pnpm test:mongodb | 7 通过，0 fail/skip/cancel | mongodb |
| node --test tests/model-state.integration.mjs tests/research-resume.integration.mjs tests/model-telemetry.integration.mjs tests/knowledge-api.integration.mjs | 7 通过，0 fail/skip/cancel，含真实进程重启恢复 | integration |
| pnpm test:routes | 5 个路由渲染场景通过 | routes |
| node --test tests/harness.test.mjs | 7 通过，0 fail/skip/cancel；478 个清单文件的大小及哈希一致 | harness |

仅复现阶段使用 --test-name-pattern 定位两个新增缺陷；最终执行器和全量单元未使用过滤器。最终文档落地后单独执行 node --test tests/harness.test.mjs 验证导航与 MANIFEST。

实际配置只读检查：requested=legacy、active=legacy、reasons=[]；试跑记录仍为 deferred-by-user、automaticResume=false、paidRunAuthorized=false、paidCallsPerformed=0、budget.totalMinor=10000。

CURRENT 最终为 V4.8；.11 真实质量验收及生产切换仍待授权与验证。未恢复付费试跑。
