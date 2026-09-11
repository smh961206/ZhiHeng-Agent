# V4.9 全版实现与离线验收报告

当前修复状态：用户授权的四项 review 问题已实现修正，详见 [修复交付报告](V4_9-review-fixes-report.md)。进度保存／续跑、模型状态显示、取消后重试和晋升校验缓存均有针对性验证；真实质量仍待候选配置与预算。下列“尚未修复”等措辞属于之前的验收历史。

最新追加：用户要求“开始验收”后，本轮单元 782/782、Mongo 15/15、48 原件离线对照均通过；运行时代码未改动，历史重试问题本次未复现，不能标记已修复。真实候选配置与预算仍缺，尚未通过真实质量验收。见 [本轮验收记录](V4_9-acceptance-report.md)。下文保留上一轮结果。

日期：2026-09-11。范围：用户授权继续至 V4.9 全部完成，按 V4.9.1–.8 顺序执行，保留此前 V4.9.0。实现已覆盖全部子版本；真实候选模型质量／生产晋升尚未通过，当前晋升决定为保留 legacy。CURRENT 仍为 V4.9，不进入 V5.0，不恢复 V4.8.11 已延期的付费文本对照。

**最终验收状态：尚未全绿。** 单元 782/782、页面 292/292、路由 5/5、部署回滚通过；最终 Mongo 集成 14/15，取消后重试的 409 在改动前 HEAD 同样复现。该既有问题已记录为范围外维护项，未删除或修改断言；因此本报告不宣称 V4.9 全量验收完成。真实模型质量验收另待候选配置、预算与人工审核。

## 子版本交付

| 子版本 | 实现与证据 |
|---|---|
| V4.9.0 | 四条视觉调用、限制、名称分支与证据语义清单；历史 SHA-256 保留，后续已核对变更单列 currentSha256/currentWrapperConsumers |
| V4.9.1 | 规范化图片／页码／区域／purpose／requiredCapabilities；发送前拒绝无能力、工具／私有续接和非 user 图片 |
| V4.9.2 | 实际模型／用量／性能／图片来源 SHA-256 的内存结果；trust=unverified，旧字符串读者兼容 |
| V4.9.3 | 七个视觉业务所有者的型号／thinking 边界检查，保留 Catalog/adapter 旧协议兼容 |
| V4.9.4 | 48 个不同冻结原件：16 表格 PNG、16 截图 PNG、16 扫描 PDF；完整期望值与哈希 |
| V4.9.5 | 九维确定性评分；关键错误不可被平均分掩盖；大整数／missing／zero 不混淆 |
| V4.9.6 | 独立显式图片候选配置、生产渲染／Gateway 两侧比较、已知／未知用量汇总；96 次模拟调用完成 |
| V4.9.7 | 同能力最多一次备用尝试，独立请求且共享截止时间；取消／拒绝／截断／已读但未读清不循环 |
| V4.9.8 | 固定语料／模型／连接／配置／代码／人工复核绑定的晋升门槛，重新评分实际输出；模型 pin 与回滚兼容 |

各阶段报告为同目录 V4_9_1-completion-report.md 至 V4_9_8-completion-report.md；操作说明见 [视觉对照与晋升 runbook](vision-comparison-runbook.md)。

## 工程完成项

1. **发布／子版本**：V4.9.0–.8 实现和离线验证。真实质量及生产晋升未接受，不能把默认模拟结果标记为真实模型通过。
2. **修改文件**：server/{vision-model,model-gateway,model-catalog,model-adapter,model-connection,model-state,model-routing}.mjs；scripts/{check-model-call-inventory,start-legacy}.mjs；.env.example；docs/architecture/{00-system-map,04-model-system,current-implementation-map}.md；docs/contracts/{model-gateway,evidence}.contract.md；docs/invariants/model.invariants.md；V4.9 索引、README、implementation、schema、migration、rollback、benchmark 和 .1–.8 子版本状态；先前新增的视觉清单／清单测试；MANIFEST.json。CURRENT 在前一阶段已切换，本轮保持 V4.9。
3. **新增文件**：server/{vision-quality,vision-policy}.mjs；scripts/{vision-benchmark.mjs,build-vision-fixtures.py}；tests/vision-{request,response,capability,benchmark-fixtures,quality,challenger,fallback,policy}.test.mjs；tests/vision-state.integration.mjs；tests/fixtures/vision-approval.mjs；tests/fixtures/vision-benchmark/ 下 48 个原件和 manifest.json；八份子版本报告、本报告、vision-comparison-runbook.md 和 known-baseline-retry-failure.md。
4. **删除文件**：无。未触碰此前未跟踪的 output/，未删除／跳过既有测试。
5. **架构变化**：扩展现有 Vision wrapper/Gateway/Catalog/adapter/连接／pin 所有者。纯视觉评分和独立准入是新增职责；准入不依赖 modelState，避免构造循环。没有第二供应商客户端、分布式基础设施或 V5.0 unified benchmark 平台。
6. **Schema**：无 Mongo 字段、索引、迁移版本或归档格式变化。新增配置 ModelProfile v3、内存 extraction/attempts 和本地比较工件 v1。已有 private modelState 字段可保存新 candidate ID，原有结构不变；新值兼容性详见 schema.md。
7. **迁移**：无数据迁移／历史回填。旧 legacy pin 与无状态历史记录保留原行为；新候选 pin 仅在有效准入时写入。旧读者不能识别时安全拒绝，禁止改写历史以绕过。
8. **环境**：生产依赖／锁文件、真实 .env、密钥与服务均未修改。配置示例新增候选字段与默认关闭 flag；Python/Pillow/reportlab 仅用于开发生成，使用已有捆绑工具。测试复用 127.0.0.1:27029 隔离 Mongo 和临时预览／部署项目。
9. **兼容性**：旧 wire、safe errors、文本读者、API 和前端行为保持。readVisionResult 是显式内存 API。公共任务模型标签取保存的 Vision profile；历史未知身份仍未知。所有实际图像仍经唯一 Gateway adapter。
10. **Resume／Recovery**：新增/旧/无 modelState 三种情况均覆盖。真实进程退出后 Mongo checkpoint 保留；回滚暂停候选任务，不降格续跑；原始 input、证据、market cutoff 和完成工具不重复；匹配准入恢复／密钥轮换可以继续。
11. **Feature flags**：FEATURE_VISION_ROUTING 默认 false；VISION_ACCEPTANCE_FILE 必须是匹配真实比较与人工复核的文件。生产未启用。start:legacy 同时覆盖文本和视觉激活。
12. **执行测试**：每阶段相关回归、全量单元、11 个 Mongo/恢复 integration 文件、路由、正式构建、全量浏览器、隔离 Linux 部署／升级／备份／回滚／故障保护、最终 Harness 清单。具体结果见下表。
13. **结果**：最终单元 782/782、页面 292/292、路由 5/5；构建和部署回滚成功。首次 Mongo/恢复 15/15；最终独立逐文件运行 14/15，唯一取消后重试失败在改动前 HEAD 也复现。不能用首次通过覆盖最终失败；详情见下表。
14. **Benchmark**：48 原件／96 模拟调用，measurement=simulated、qualityAccepted=false。参考答案自一致只验证 grader；原件真的经过生产渲染但输出为模拟，不能得出候选真实质量／成本／速度更好的结论。真实候选与预算未指定，未执行付费比较。
15. **安全／隐私**：无真实模型调用或用户材料外发。内存结果／比较排除密钥、原始 base64 和隐藏推理。可信批准文件不是密码学远程证明；操作人必须审核真实结果。Vision 数值仍待核实，未修改任何财务定义、来源、币种或时点要求。
16. **回滚**：停止当前应用实例后 pnpm start:legacy；保留兼容 pin 读者、数据库和所有历史资料。候选 pin 暂停待原准入恢复。代码撤回按本报告文件范围执行，不全仓 reset；刷新 MANIFEST 和现行源码核对指纹。
17. **限制**：英文合成两行表格不覆盖所有真实中英年报；原有跨重启视觉页数预算、旧归档逐次模型身份缺失不在本轮改造。已 pin 研究不跨模型 fallback；独立新调用才可回退。live CLI 请求数限额不是货币硬限额，不提供自动中断续费／恢复。前端功能版本展示未在这轮模型层规格中改动。
18. **延期**：真实候选配置／费用预算／模型测量／人工视觉审核／正式晋升；既有取消后立即重试 409 的范围外维护，见 [失败记录](known-baseline-retry-failure.md)；V4.8.11 已暂停文本试跑；V5.0 统一 benchmark/champion 及更后续路线图。工程实现完成不等于这些真实验收已完成。

## 最终验证记录

| 检查 | 结果 | 本地证据 |
|---|---|---|
| 全量单元（首次整合） | 782/782，0 fail/skip/cancel | artifacts/v4-9-unit.log |
| Mongo／恢复（首次整合） | 15/15，含候选真实进程重启 | artifacts/v4-9-integration.log |
| 路由 | 5/5 | artifacts/v4-9-routes.log |
| Vite 正式构建 | 成功，7.17s；主入口 550.55 kB/gzip 182.10 kB，原 500 kB 提示保留 | artifacts/v4-9-build.log |
| 浏览器首次运行（正式预览） | 288/292；1 项点击超时、3 项 lazy 场景拦截开发源码 URL，需在开发服务验证 | artifacts/v4-9-ui.log、artifacts/v49-ui/ui-results.json |
| 全量浏览器（开发服务复测） | 292/292，未过滤场景，全部通过；含首次运行的 4 项失败场景 | artifacts/v4-9-ui-dev.log、artifacts/v49-ui-dev/ui-results.json |
| 最终源码单元 | 782/782，0 fail/skip/cancel | artifacts/v4-9-unit-final.log |
| 最终源码 Mongo 并行复测 | 7/15 通过，8 项超时取消；再试为 8/15、7 项超时取消 | artifacts/v4-9-integration-final.log、artifacts/v4-9-integration-clean.log |
| Mongo 逐文件诊断 | 14/15；取消后重试返回 409，原断言要求 200；独立正常权限复测仍复现 | artifacts/v4-9-integration-verified.log、artifacts/v4-9-retry-diagnostic.log |
| 最终 Mongo 独立逐文件运行 | 14/15，0 skip/cancel；唯一失败仍为取消后重试；候选与旧模型真实进程恢复均通过 | artifacts/v4-9-integration-isolated.log |
| 改动前 HEAD 对照 | 原有重试测试 1/2；相同测试第 66 行仍出现 409 != 200，两份测试规范化 LF 后 SHA-256 相同 | artifacts/v4-9-retry-baseline.log |
| 最终源码 Linux 部署回滚 | 成功；部署、升级、持久数据、备份、回滚、健康检查、停止后备份、构建失败与迁移失败保护全部通过；自身临时资源已清理 | artifacts/v4-9-deploy-final.log |
| 最终视觉离线对照 | 48 个原件、96 次模拟调用；qualityAccepted=false | artifacts/v4-9-vision-verified-offline.json |
| Harness／指纹／diff | Harness 7/7，模型调用边界及指纹通过，diff --check 无错误 | artifacts/v4-9-harness-final.log、artifacts/v4-9-inventory-final.log、artifacts/v4-9-diff-check.log |

曾发现并修正：无效 grader 输入的 passed 必须为 false；跨平台语料绑定须规范化 JSON 换行；完全没有 modelState 的历史任务不能随全局晋升换模型。针对性测试和最终全量回归保留原断言，未删测试或降低门槛。
