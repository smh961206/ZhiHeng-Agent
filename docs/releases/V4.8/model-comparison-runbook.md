# V4.8.11 固定材料模型对照执行器

Implementation Status: CURRENT executor; PARTIAL live quality acceptance. 本轮仅离线验证；没有付费调用、生产切换或 V4.9 实现。

用户已选择贵州茅台 A 快速筛选、比亚迪 B 深度研究，共四次研究，总预算 100 元人民币；随后明确要求暂时搁置。该试跑不自动恢复，本轮维护只使用合成案例。MAIN 凭据、真实语料、费用及预算保障需在用户明确恢复后重新检查。

## 范围

`scripts/model-comparison.mjs` 是独立命令行入口，每个 baseline/candidate 研究在独立子进程复用 `server/agent.mjs`、Gateway、规则快照、工具、审计和交付验证。baseline 固定 legacy；candidate 使用生产准入后相同的 mode/historyYears 策略推荐和 modelState 升级链。直接构造内部候选状态用于隔离测试，不伪造生产批准报告、不启动应用服务器、不连接 MongoDB，也不修改 `.env`。

语料 v1 只接受固定文字材料。保留原文 URL、发布日期、证券归属、财务元数据、已有正文块；材料原文必须有已知发布日期且不晚于截止日。供应商不会收到测试预算、密钥或评分参考答案。实际研究提示、所需规则和语料会发送给配置的模型服务，真实运行前必须确认这些材料可外发。

主动网络搜索与最新采集关闭；已有正文块继续通过原页读取器验证，缺少原件时返回缺口，绝不伪装成功。此版本不接受图片附件或既有 Vision 记录，不评价 Vision/OCR 和动态采集质量。它评价相同归档材料下的文本研究/审计策略，不代表端到端采集性能。材料日期校验不能证明原文自身没有未来信息或模型没有用记忆补值，仍需人工事实审核。

## 离线运行：不加载真实凭据、不访问网络

从项目根目录执行，输出目录必须不存在或为空：

```text
pnpm test:model-comparison check --plan tests/fixtures/model-comparison-offline.json --limits tests/fixtures/model-comparison-offline-limits.json
pnpm test:model-comparison run --plan tests/fixtures/model-comparison-offline.json --limits tests/fixtures/model-comparison-offline-limits.json --out artifacts/comparison-offline-001
```

默认 offline，使用固定模拟凭据和 `.invalid` 服务地址；模拟分支不会调用真实网络。`check` 只校验，不启动模型、不创建输出。六个测试材料是合成缺失资料案例，不能改名当成真实质量基准。离线预算文件中的金额只是测试数字，不是建议的真实预算或报价。

## 真实语料与试跑准备

JSON 结构参考离线语料，但真实材料必须由操作人核验并设 `material: "curated"`。根字段为 version=1、kind=frozen-research-comparison、cutoff=YYYY-MM-DD、cases。每项必须有唯一文件安全 id、mode A–F，以及 mode 一致的 input；input 复用当前研究输入格式，包含 question、depth、securities/portfolio/baseline 等真实已知上下文和 sources。来源 id 为唯一 S 编号，必须提供 title、text、publishedAt、https URL。不要把抓取日冒充发布日期。证券任务的归档来源应保留实际 security 归属；没有可读归档财报时，现有采集覆盖门槛仍会拒绝执行。

建议的首轮候选范围（尚未选公司、尚未运行）：

| 案例 | 材料要求 | 主要检查 |
|---|---|---|
| A 快速筛选 | 同一公司的完整年度与近期材料 | MAIN/low、缺失披露、引用和交付 |
| B 深度研究 | 五年原文及财务基础 | 当前推荐可能直接选 PRO/max；验证真实初始策略，不强制从 MAIN 开始 |

首轮两例各运行两种策略，共四次研究。之后才扩展 C 更新、D 比较、E 组合、F 股东回报，并建立至少 50 个有区别的真实案例，覆盖六模式。不能复制同一案例改 id 充数。正式准入不接受只有小样本的报告。

## 预算与付费开关

单独创建 limits JSON：currency 为 ISO 三字母代码，maxRequests、budgetMinor、reservePerRequestMinor、timeoutMs 都是正整数。minor 为本任务约定的最小记账单位；CNY 使用分。timeoutMs 是每个研究臂的时限，最多一小时。

- maxRequests 是整个运行的 HTTP 请求尝试上限，包含 SDK 前响应重试、格式重试、研究、审计和 followup。每次发出前写入预算记录，写入失败禁止发送。
- 每次请求预扣 reservePerRequestMinor；累计预扣超过 budgetMinor 则停止。失败、超时和响应不确定均不退还预留额度，恢复运行继续累计。
- 金额是操作人提供的保守预留估计，不是实时报价或供应商账单硬上限。现有 Agent 没有所有请求的输出 token 硬上限，思考、长上下文和供应商未知计费都可能超过单次估计。不要把这个预算声称为真实费用保证。若需要严格货币限额，须另行验证供应商账户/密钥的硬限额能力。
- 保存实际可得 token 用量、延迟；未知账单/用量保留 null。不会自动取价、换汇或把未知成本写成零。先确认实际服务价格和小样本用量，再决定正式预算。

真实运行须单独授权案例和预算后，由操作人明确添加两个标志；缺少 `--allow-paid` 会在任何输出或付费请求前拒绝：

```text
node --env-file-if-exists=.env scripts/model-comparison.mjs check --plan artifacts/live-cases.json --limits artifacts/live-limits.json --live
node --env-file-if-exists=.env scripts/model-comparison.mjs run --plan artifacts/live-cases.json --limits artifacts/live-limits.json --out artifacts/comparison-live-001 --live --allow-paid
```

需要现有 LLM_API_KEY 和 LLM_MAIN_API_KEY，以及 LLM_PRO_API_KEY 或 legacy key 回退；模型/服务地址沿用已配置的 Catalog/连接解析器。命令只在子进程固定 legacy 环境，再对候选研究显式设置内部状态。应用的 MODEL_ROUTING_MODE 不变，无需先打开生产 policy。

## 输出与恢复

- run.json：固定语料、执行代码/配置摘要、各臂状态、预留流水；不保存密钥。
- results/：实际 Agent 结果、工具、证据、模型元数据、白名单用量记录；不输出 hidden reasoning。
- private/：原始私有研究 checkpoint，用于同模型续跑，可能包含供应商私有推理与材料。不得分享为公开报告；目录仅限受信任本机操作人。文件权限在支持的平台请求 0600/0700；Windows 需使用受控目录 ACL。
- comparison.json：结果摘要、文件哈希、预算预留、待审核的 citationPassed=null / criticalFactErrors=null。永远 qualityAcceptance=false，不能直接打开准入。

同一运行持有独占 .lock；锁已存在时拒绝并发。意外杀死父进程可能遗留锁，必须先确认父/子进程均已终止，再人工移除该运行的锁。禁止盲目自动删锁。

案例 id 必须是字符串，且忽略大小写后仍唯一，避免 Windows 文件名覆盖。恢复和导出都会检查存储语料摘要；完成结果还必须匹配运行 id、案例/策略、语料摘要、截止日和实际输入摘要。每个新研究臂在父进程和工作进程启动时检查 UTC 执行日，跨日停止，保留已完成结果与预算流水。已有合法格式不变，损坏或错配记录会被拒绝。

私有检查点还必须属于当前运行及研究臂，模式和完整固定输入（含截止日说明、问题、原文）必须匹配，再交由现有 researchResume 校验内部状态。错配以 checkpoint_input_mismatch 停止，不追加模型请求或预算预留，不用另一案例的结果覆盖当前案例。

有 securities 的案例沿用 Agent 的官方财报读取门槛。固定材料只将 official=true 的 official-report 正文计入正文读取，股东回报事件披露单独保留；美国 official-xbrl 还须有数量一致的非空 financialFacts 和原申报 filingUrl，单列核心事实覆盖。按原申报 URL 去重，行情、目录、空 XBRL、非官方材料均不能补足财报读取。来源内容和缺口原样保留，核心事实不表示读完正文，来源标签仍须由归档操作人核实。

正常恢复添加 `--resume`，复用完全相同的 plan/limits/out 和付费标志；完成臂只校验输出哈希，不再收费。输入、运行代码、模型/服务配置、依赖、Knowledge 或预算变化会拒绝恢复；密钥轮换不改连接身份。为保持新研究提示中的日期一致，跨 UTC 日启动剩余臂也会拒绝，需建立另一个独立对照运行。

失败或中断臂必须显式加 `--resume --retry-incomplete`。这可能重复一次供应商已计费但未保存的模型请求，原预留仍保留。现有兼容 checkpoint 才能续跑，复用已完成工具；没有 checkpoint、版本不一致或持久化损坏均拒绝重新采集/自动从头运行。预算耗尽后不能通过修改同一运行的 limits 绕过上限；另开更大预算的运行必须重新授权。

## 人工质量审核与准入导出

单独创建 review JSON，写入 runId、corpusHash、dryRunAccepted、rollbackVerified、approvedBy、approvedAt，以及每个 case 的 id、baseline/candidate 各自的 artifactHash、citationPassed、criticalFactErrors 和非空 notes。逐项比对原文引用、关键事实、期间/币种/股本口径、假设与缺失披露、截止日。自动 deliveryPassed 只能来自 Agent 正常完成，不允许人工把失败交付改成成功。

真实完成不少于 50 个案例、六模式覆盖且人工审核通过后：

```text
node --env-file-if-exists=.env scripts/model-comparison.mjs export --out artifacts/comparison-live-001 --review artifacts/comparison-review.json
```

导出复核完整性、摘要、代码配置和现有 validateModelRollout 条件，以排他创建方式写 acceptance.json；不会设置 MODEL_POLICY_ACCEPTANCE_FILE 或切换生产。批准是可信操作人的见证，不是对语义正确性的密码学证明。离线、缺审核、重复案例、少于 50、输出被改、失效配置或关键事实错误均拒绝。

本轮停止于离线执行器验收。实际案例、实际预算、付费授权、dry-run/回滚见证和正式生产切换分别待确定。
