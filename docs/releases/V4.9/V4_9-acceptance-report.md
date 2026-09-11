# V4.9 本轮验收记录

本文件保留“开始验收”阶段的历史结果。随后用户授权四项修复，包括此前未修的重试时序；最新实现与验证见 [review 修复报告](V4_9-review-fixes-report.md)。

日期：2026-09-11。触发：用户“开始验收”。结论：**本轮自动回归通过；真实模型质量与生产晋升仍待验收。** 当前生产选择为 legacy，未启用 FEATURE_VISION_ROUTING。

## 本轮实测

| 验收项 | 结果 | 证据 |
|---|---|---|
| 全量单元 | 782/782，0 fail/skip/cancel，10.92 s | artifacts/v4-9-acceptance-unit.log |
| 11 个 Mongo 集成文件，逐文件运行 | 15/15，0 fail/skip/cancel，16.97 s；含候选／旧模型真实进程退出恢复 | artifacts/v4-9-acceptance-mongo.log |
| 取消后重试诊断 | 2/2，第二次重试返回 200；只额外记录响应，未修改原断言 | artifacts/v4-9-acceptance-retry-diagnostic.log |
| 视觉对照 | 48 个原件、96 次模拟调用；measurement=simulated，qualityAccepted=false | artifacts/v4-9-acceptance-offline.json |
| 配置与源码快照 | 470 个 server/shared/src/scripts/tests 文件指纹；无候选型号、连接或密钥配置；active=legacy | artifacts/v4-9-acceptance-checks.json |

上一轮同一实现的页面 292/292、路由 5/5、正式构建、Linux 部署／升级／备份／回滚与故障保护均通过。本轮没有修改运行时代码，不重复启动这些服务；保留原证据，详见 [实现与历史验证报告](V4_9-completion-report.md)。本轮文档清单与模型边界检查另记录于 artifacts/v4-9-acceptance-harness.log、artifacts/v4-9-acceptance-inventory.log、artifacts/v4-9-acceptance-diff.log。

## 已知重试问题的解释

上一轮在当前源码与改动前 HEAD 均复现取消后立即重试返回 409。本轮未复现，不能因此标记“已修复”，也不能删除历史失败。保留 [问题记录](known-baseline-retry-failure.md)；当前测试通过仅表示本次运行符合断言，不证明所有存储确认／取消完成时序均正确。没有修改生命周期逻辑、增加固定等待、放宽超时或跳过测试。

## 真实模型验收前置条件

本地现有视觉基线为 deepseek-v4-flash-vision-exp。LLM_VISION_CHALLENGER_MODEL、独立连接、独立密钥与显式 INPUT=images 未配置，用户尚未指定候选及本轮费用上限。因此没有发出付费调用；未配置的候选保留缺失，模拟输出不作为真实质量。

完整固定对照为 48 原件 × 2 模型，共 96 请求，每次最多 6000 输出 tokens。请求数上限不等于费用硬限额。取得候选／配置／预算后按 [操作说明](vision-comparison-runbook.md) 执行，逐项核对真实输出，再形成绑定报告的人工审核；未满足条件前保持 legacy。密钥只在本地配置，不放入报告或对话。

## 工程影响

本轮只新增本记录与本地诊断／结果工件，更新版本文档及 MANIFEST；没有修改运行时代码、既有测试、数据结构、迁移、真实 .env、密钥、依赖或生产服务；没有模型切换、历史回填或恢复记录改写。测试使用既有隔离 Mongo，测试资料由原有 fixture 创建和清理。没有删除用户文件。回滚本轮仅需撤回本次文档更新并刷新清单，不影响 V4.9 实现或历史研究。

源码快照 SHA-256：`5e7b9e26050e1ea0caf904fca31ae7f73702e6c7d30c17991bb77b0e6400b9c5`。真实质量验收、生产晋升及既有重试问题的确定性修复仍未完成；CURRENT 保持 V4.9。

## 生产配置示例遗漏修正

用户指出 .env.production.example 缺少 V4.9 字段，本次补齐，与 .env.example 的八项默认值一致。Compose 已通过 env_file 读取 .env.production，无需修改部署逻辑；批准文件须使用容器可读路径，示例注释提示只读挂载。

| 完成项 | 记录 |
|---|---|
| 1. 版本 | V4.9 配置示例修正 |
| 2. 修改文件 | .env.production.example、本验收记录、MANIFEST.json |
| 3–4. 新增／删除文件 | 无源码或测试新增／删除；本地校验日志另存 artifacts |
| 5–8. 架构／Schema／迁移／环境 | 无运行时或数据库变化；补齐生产模板字段，真实配置不改写 |
| 9–10. 兼容／恢复 | 默认行为保持 legacy，历史任务和恢复不受影响 |
| 11. 开关 | INPUT=off、THINKING=omit、FEATURE_VISION_ROUTING=false，批准路径为空 |
| 12–13. 检查与结果 | 八项字段默认值一致、禁用路由与 Compose env_file 检查通过；Harness 7/7、diff --check 通过 |
| 14. Benchmark | 模板修正不涉及模型输出，无需重复模型比较 |
| 15. 安全／隐私 | 密钥占位为空，未外发资料或启用候选 |
| 16. 回滚 | 撤回新增模板块与本节，刷新清单即可 |
| 17. 限制 | 已有 .env.production 需按需同步新增字段；批准文件挂载由实际部署安排 |
| 18. 延期 | 真实模型质量验收和既有重试问题状态不变 |

证据：artifacts/v4-9-production-env-check.log、artifacts/v4-9-production-env-harness.log、artifacts/v4-9-production-env-diff.log。
