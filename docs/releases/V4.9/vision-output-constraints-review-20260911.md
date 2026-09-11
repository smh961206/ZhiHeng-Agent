# V4.9 输出约束修正与真实复验审核

用户要求：先修正输出约束、重新通过真实对照并完成审核。本轮扩展现有视觉系统指令和对照提示词，明确保留脚注标记、限定脚注范围、要求缺失值使用指定 null；不改动评分器、冻结原件、参考答案或历史输出。

**结果：输出约束已修正，真实质量技术门槛与逐图技术审核通过；正式操作人批准待确认。** 本批次候选 glm-5.3-flash 48/48 严格通过，基线 deepseek-flash 47/48。生产 FEATURE_VISION_ROUTING 保持关闭，批准草稿不具备激活效力。

## 变更内容

- server/vision-model.mjs 的共用系统指令要求保持脚注标记全部字符、按调用者结构输出缺失值、遵守提取范围。普通文本转录继续使用自身结构，不强迫所有业务返回比较表格。
- scripts/vision-benchmark.mjs 明确字段类型、每个数据单元格只出现一次、缺失／空白／unreadable 使用 JSON null、脚注标记保留括号、不把通用说明放入脚注列表。示例使用与语料无关的标记，不包含任何原件参考答案；两个模型接受同样的提示词。
- 不事后改写模型输出，不放宽评分器或参考答案。新增已知失败模式回归，确保省略脚注括号、添加说明、返回 unreadable 字符串仍会失败。
- .env.production.example 中误填为验收路径的 API Key 占位已清空；真实环境文件、真实密钥和生产开关未修改。

## 实测结果

| 项目 | deepseek-flash | glm-5.3-flash |
|---|---|---|
| 有效响应／HTTP 请求 | 48/48 | 48/48 |
| 严格通过 | 47/48 | 48/48 |
| 九项逐单元格指标 | 各 192/192 | 各 192/192 |
| 平均／中位／P95 耗时 | 1.545／1.519／1.998 s | 8.557／8.035／11.652 s |
| 输入／输出 tokens | 77,136／8,703 | 135,712／27,601 |
| 总 tokens | 85,839 | 163,313 |
| 实际账单金额 | 未知 | 未知 |

基线 VIS-044 额外输出两个 row=Metric 的空数据单元格，把表头当成数据行；虽然参考单元格的九项指标全部正确，现有额外单元格检查仍判失败。该差异原件已在此前审阅，并经本轮同图哈希复核；没有为提高通过率忽略它。候选没有额外单元格，之前的两例脚注与基线缺失值问题均未在本轮候选中复现。统计只代表本轮冻结语料，不能证明今后每次输出都相同。

本轮实际发送 96 次 HTTP 请求，96 次均返回 200，无连接重试、失败或结果不明请求；服务端返回的 model 字段均与请求型号一致。接口回执不是供应商独立签名证明或账单。候选使用 https://open.bigmodel.cn/api/coding/paas/v4，本次进程覆盖地址；正式配置必须与此绑定一致。

## 审核与回滚

Codex 已逐图审阅全部 48 个原件：此前已审阅的 25 个保留图像与原件哈希验证，本轮补阅其余 23 个；扫描 PDF 使用生产渲染器生成的原页。所有本轮图像哈希与已审阅批次一致，16 个 PDF 审阅页也直接匹配本轮发送图像哈希。逐项记录将每个原件／图像／候选响应哈希绑定，48 份候选响应均与审阅后的参考完全满足既有评分。

完整性检查覆盖语料原件、进度校验和、96 条完成账本、结果哈希、两模型同图与当前配置／代码绑定。新批次正常结束并释放锁，之前失败批次的账本未改写。

使用本批次结果在隔离进程验证准入与回滚：测试专用见证下可选 candidate，关闭开关立即回到 legacy；旧 pin 保持可用，candidate pin 安全暂停，状态不被替换。测试见证文件已移除，不是正式操作人批准。另一个真实 Mongo／子进程重启测试通过，证明保存的候选身份、证据与工具去重在回滚／恢复中保留。

正式批准草稿为 artifacts/vision-acceptance-glm53-constraints-20260911-draft.json；保留原始 comparison，approval 的 approvedBy、approvedAt、visualReviewPassed 均为空，rollbackVerified=true。准入检查唯一未满足项为 operator_review_required。项目 [操作说明](vision-comparison-runbook.md) 要求“可信操作人的文件见证”；Codex 技术审核不冒充操作人的人工确认。用户确认这份具体结果后才能填写正式批准字段；本次未启用生产路由。

报告哈希：3f12235ed0a0512a8f2fda937e54aa9e65dbb814db133393a07eff8f5733248b。

## 验证与证据

- artifacts/vision-live-glm53-constraints-20260911-03.json：96 次真实对照与原始输出。
- artifacts/vision-live-glm53-constraints-20260911-transport.jsonl：HTTP 尝试／接收记录及服务端 model 字段。
- artifacts/vision-live-glm53-constraints-20260911-assessment.json：独立重评分与分项统计。
- artifacts/vision-live-glm53-constraints-20260911-case-review.md：48 例逐项表及基线差异。
- artifacts/vision-constraints-technical-review-20260911.json：全部原件审阅绑定与隔离回滚结论。
- artifacts/v4-9-output-constraints-baseline.log：修改前 11/11；artifacts/v4-9-output-constraints-focused.log：针对性 36/36。
- artifacts/v4-9-output-constraints-unit-final.log：793/793 全量单元通过，0 fail／skip／cancel。
- artifacts/v4-9-output-constraints-recovery.log：1/1 真实 Mongo／子进程回滚恢复通过。
- artifacts/v4-9-output-constraints-inventory-verified.log：20 个 Vision 所有者指纹及单 Gateway 边界通过。

过渡期全量测试日志保留：示例配置此前变化未同步指纹，以及系统指令预期改变引发六项历史请求哈希差异。前者经配置审阅同步指纹；后者在原迁移夹具中先断言完整新系统消息的固定哈希，再仅归一化这个明确授权字段，继续与未修改的历史请求／结果快照比较。调用次数、其余协议字段和结果断言保留，最终 793/793 通过。

## 完整工程记录

| 项目 | 结果 |
|---|---|
| 1. Release | V4.9 输出约束修正、真实复验与技术审核 |
| 2. 修改文件 | server/vision-model.mjs、scripts/vision-benchmark.mjs、tests/vision-quality.test.mjs、tests/fixtures/router-vision-migration-scenario.mjs、.env.production.example、model-gateway contract、current-implementation-map、Vision inventory、V4.9 README／DETAILED_INDEX／runbook／benchmark、MANIFEST.json |
| 3. 新增文件 | 本报告；本地运行／评估／技术审核脚本、原始结果、回执、审核记录与批准草稿 |
| 4. 删除文件 | 无生产或历史文件删除；隔离测试临时见证正常清理 |
| 5. 架构变化 | 扩展现有指令所有者，无新运行时子系统 |
| 6. Schema | 无持久 schema 改动 |
| 7. 迁移 | 无迁移或历史回填 |
| 8. 环境 | 仅清空生产示例错误 API Key 占位；真实配置未改；本轮进程覆盖候选 Coding 地址 |
| 9. 兼容 | 既有请求／响应结构不变；指令改变使旧比较／批准代码绑定失效，须使用本轮证据 |
| 10. Resume／Recovery | 新建独立批次，无历史重放；真实 Mongo 重启、旧身份和回滚暂停检查通过 |
| 11. Feature flags | FEATURE_VISION_ROUTING 保持关闭；未填正式批准路径 |
| 12. 测试执行 | 修改前基线、针对性、全量单元、Mongo 重启／回滚、完整真实比较、独立重评分、逐图审核、指纹／文档校验 |
| 13. 测试结果 | 11/11、36/36、793/793、Mongo 1/1；真实结果与完整性、技术审核通过；文档检查另记日志 |
| 14. Benchmark | 候选 48/48、基线 47/48；96 HTTP 全部 200；耗时／用量见上表 |
| 15. 安全／隐私 | 仅合成原件与指令外发，参考答案不外发；不保存或展示密钥、base64 原图、隐藏推理；正式人工见证不伪造 |
| 16. 回滚路径 | 保持 flag=false；部署后回滚仍用关闭开关或 start:legacy；保留批准与旧记录，candidate pin 暂停；无数据库降级 |
| 17. 限制 | 英文合成表格、单轮结果；不代表完整投研任务、复杂真实财报或长期稳定性；价格／套餐适用性未在本次证明 |
| 18. 待办／延期 | 操作人确认本报告后形成正式批准；生产启用、真实中文复杂样本扩展和后续版本功能不在本次自动执行范围 |
