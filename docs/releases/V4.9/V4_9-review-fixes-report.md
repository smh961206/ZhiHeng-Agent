# V4.9 review 修复交付报告

日期：2026-09-11。用户“都一并修复”明确授权全部四项，包括此前登记为范围外的取消／重试问题。CURRENT 保持 V4.9。四项实现已完成；真实候选质量与生产晋升仍未接受。

工作区同期还有独立的 [模型名称统一](model-name-unification-20260911.md) 与 [前端同步](V4_9-frontend-completion-report.md)。本报告的修改范围仅归属上述四项修复；没有覆盖其他维护。最后复测基于合并后的当前源码，包含 792 项单元测试。真实环境文件的模型名称更新属于并行维护，不归为本轮四项修复。

## 四项修正

1. **逐次持久保存与安全续跑**：现有 Vision runner 在请求前保存 reserved 记录，每次完成后保存响应、用量和结果哈希；临时文件写入、fsync、原子重命名保证进度文件不会被原地截断。中断后 --resume 校验同一语料／模型配置／源码／累计请求上限和图片身份，只执行尚未登记的调用。结果不明的 reserved 请求拒绝自动重放或跳过，且统计为未完成调用、用量／费用未知。进程锁防止并发写入；旧报告不转换为伪造账本。Windows 短暂文件占用仅重试同一次原子替换，最多额外等待 385 ms，不重放模型。
2. **状态展示实际选定模型**：visionStatus 根据当前上下文选择 profile；独立调用采用通过准入的候选，旧任务与无状态历史任务继续原模型，候选 pin 保持自身身份。配置状态与发生 fallback 后的实际 extraction 身份仍有区别；后者以 canonical response 为准。
3. **取消后重试收尾协调**：原控制器保持到 checkpoint／terminal 保存确认和流收尾完成。精确版本的已取消重试可持有 mutation lock 等待该执行的完成信号，最长五秒；期间重复请求仍拒绝，收尾成功后重新检查记录、版本和容量。超时／保存失败不绕过恢复保护。真实 Mongo 测试用 IPC 暂扣保存确认，确定性验证曾经的失败窗口，没有用固定 sleep 掩盖问题。
4. **准入缓存**：缓存状态只复用于匹配的批准文件身份／元数据、配置绑定与源码身份；凭据每次检查，关闭开关、缺失／替换／损坏文件、配置或代码变更均失效或关闭。命中时不重复读源码／批准正文或重新评分，返回值可变也不污染缓存。缓存有界，仅保留一个条目。

## 完整工程记录

| 完成项 | 结果 |
|---|---|
| 1. 发布范围 | V4.9.6–.8 review 修正及明确授权的既有重试问题；不进入 V5.0 |
| 2. 修改文件 | server/{vision-model,vision-policy,research-retry,index}.mjs；scripts/vision-benchmark.mjs；tests/{vision-policy.test,research-retry.test,jobs-retry.integration}.mjs；tests/fixtures/retry-api-runtime.mjs；架构 00-system-map/current-implementation-map、model-gateway/research-state contracts；V4.9 schema/migration/rollback/runbook/README/DETAILED_INDEX/历史报告注记；MANIFEST.json |
| 3. 新增文件 | tests/vision-benchmark-resume.test.mjs、tests/fixtures/vision-benchmark-crash.mjs、本报告；本地 artifacts 验证工件 |
| 4. 删除文件 | 无 |
| 5. 架构 | 扩展现有 runner、状态和生命周期所有者；本地文件锁与内存完成信号，无新服务／分布式组件 |
| 6. Schema | Mongo 不变；比较 JSON v1 增加 completed、progress v1 和 imageInputHash，详见 schema.md |
| 7. 迁移 | 无数据迁移或历史回填；旧报告保留可读，不支持转换式续跑 |
| 8. 环境 | 本轮四项修复无依赖／锁文件／真实 .env／密钥修改；并行模型配置维护另见其报告。模拟请求无外发；已有隔离 Mongo 和临时部署项目用于验证 |
| 9. 兼容 | API 状态字段结构不变、值反映所选模型；旧读取 facade 和旧 job pin 保持；新代码使旧批准绑定失效，须重新取得匹配的真实验收 |
| 10. Resume／Recovery | 完成调用不重放；结果不明请求不跳过；取消保存确认之前不释放执行所有权；源资料、期间、财务定义、证据 cutoff 不变 |
| 11. 开关 | FEATURE_VISION_ROUTING 默认 false，真实批准缺失时仍 legacy；新增 CLI --resume 为显式本地恢复 |
| 12. 检查 | 针对性回归、全量单元、11 个 Mongo 集成文件、路由、正式构建、Linux 部署回滚、生产渲染离线对照、Harness／指纹／diff |
| 13. 结果 | 详见下表；未删测试／跳过校验／放宽原超时 |
| 14. Benchmark | 48 原件／96 模拟调用；非真实质量证据。缓存 100 次检查的五次本机采样 23/16/17/17/15 ms，中位 17 ms；修复前单次约 507 ms。仅为本机微基准，不代表生产吞吐 |
| 15. 安全／隐私 | 账本排除密钥、图片 base64 和私有推理；未知用量／计费保留未知；受信操作人文件不等于密码学远程证明 |
| 16. 回滚 | 关闭 Vision flag 并保留历史文件／pins；代码回退应保留或一并回退生命周期协调，不能先删除控制器。旧 runner 不可续跑新账本；无需数据库降级 |
| 17. 限制 | 真正结果不明的已登记请求须人工核对；崩溃遗留锁须先确认拥有者停止；请求上限不是货币硬上限；Windows 目录 fsync 不可用；历史语料仍为英文合成表格 |
| 18. 延期 | 真实模型选择／预算／付费比较／人工审核及生产晋升；V4.8.11 文本试跑与 V5.0 统一平台不在本轮 |

## 验证证据

| 检查 | 结果 | 本地证据 |
|---|---|---|
| 修复前针对性基线 | 通过 | artifacts/v4-9-fixes-baseline.log |
| 首轮完整单元／Mongo | 789/789、15/15 | artifacts/v4-9-fixes-unit.log、artifacts/v4-9-fixes-mongo.log |
| 暂扣保存确认的真实重试测试 | 2/2，原断言保留并加强重复请求检查 | artifacts/v4-9-fixes-retry-integration.log |
| 崩溃／中断／并发／保存失败与缓存检查 | 最终针对性通过 | artifacts/v4-9-fixes-progress-verified.log |
| 合并源码最终完整单元／Mongo | 792/792、15/15，0 fail/skip/cancel | artifacts/v4-9-fixes-unit-verified.log、artifacts/v4-9-fixes-mongo-verified.log |
| 路由／构建 | 5/5；构建成功 3.69 s，主入口 550.71 kB，原 500 kB 提示保留 | artifacts/v4-9-fixes-routes.log、artifacts/v4-9-fixes-build.log |
| Linux 部署／升级／备份／回滚／故障保护 | 三轮通过，最终临时项目已清理；原有数据库容器保留 | artifacts/v4-9-fixes-deploy.log、artifacts/v4-9-fixes-deploy-final.log、artifacts/v4-9-fixes-deploy-verified.log |
| 最终完整离线对照 | 48/96，completed=true，qualityAccepted=false | artifacts/v4-9-fixes-offline-release.json |
| 缓存与候选状态 | 候选实际 dispatch 与状态一致，缓存中位数如上 | artifacts/v4-9-fixes-probes.json |
| Harness／指纹／diff | 7/7；20 个所有者指纹通过；正常 Git 换行配置下 diff 检查通过 | artifacts/v4-9-fixes-harness-final.log、artifacts/v4-9-fixes-inventory-final.log、artifacts/v4-9-fixes-diff-verified.log |

Windows 文件替换曾出现 EPERM，失败进度保留在 artifacts/v4-9-fixes-offline-final.json，程序安全停止，未冒充完成。随后新增文件操作有限重试测试并完成新离线对照；原失败记录不删除。没有因为该错误重放真实付费请求。

一次过渡期全量单元为 791/792，唯一失败是另一维护新增的文档引用当时尚未落盘；原日志 artifacts/v4-9-fixes-unit-final.log 保留。文档生成并同步清单后完整复测 792/792，通过原有链接校验。最终 480 个源码／测试／公开部署配置文件的 SHA-256 快照为 artifacts/v4-9-fixes-source-release.json，汇总摘要 39bae950967b4e7fd1ca66fae6ac36f2d5b51f377ae9ac4876d2f1412e2ac164。此前快照保留；其后仅两个公开环境模板变化，八个 V4.9 配置的安全默认值均再次核验一致，源码与离线比较绑定未变。

本轮四项修复未修改前端源码；并行前端维护已记录 301 场景和 20 项正式构建浏览器检查，见其独立报告，本轮不重复计为自己的浏览器测试。合并源码路由仍 5/5，通过日志 artifacts/v4-9-fixes-routes-verified.log；实际 API／恢复测试覆盖相关后端行为。部署测试使用临时项目，不是向用户生产服务发布。
