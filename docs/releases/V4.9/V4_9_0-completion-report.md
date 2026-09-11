# V4.9.0 完成报告

日期：2026-09-11。用户明确选择进入 V4.9；本轮按顺序执行第一个子版本 Vision call inventory。V4.8.11 真实模型质量验收仍延期，不因发布指针切换而视为通过。

## 交付

[人工核对清单](vision-call-inventory.md)与[机器清单](vision-call-inventory.json)覆盖四个 Vision 语义调用点、五个 wrapper 模块消费者、20 个源码／配置示例所有者，记录图片、页数、请求、输出、渲染、OCR、上传、审计及归档限制，明确证据规则和名称兼容分支。复用现有清单检查器，无生产代码修改。

## 工程完成项

| 项目 | 结果 |
|---|---|
| 1. 发布／子版本 | CURRENT=V4.9；本轮只完成 V4.9.0，非整版 V4.9 验收 |
| 2. 修改文件 | scripts/check-model-call-inventory.mjs；docs/releases/CURRENT；docs/releases/V4.9/{README.md,DETAILED_INDEX.md,implementation.md,schema.md,migration.md,rollback.md,subreleases/V4_9_0-vision-call-inventory.md}；docs/architecture/{00-system-map.md,current-implementation-map.md}；docs/contracts/model-gateway.contract.md（仅激活状态说明）；MANIFEST.json |
| 3. 新增文件 | docs/releases/V4.9/{vision-call-inventory.md,vision-call-inventory.json,V4_9_0-completion-report.md}；tests/vision-call-inventory.test.mjs |
| 4. 删除文件 | 无 |
| 5. 架构变化 | 运行时无变化；现有开发清单检查器增加 --vision 选项，复用端点／Gateway 校验 |
| 6. Schema | 无持久化 schema 变化；清单 JSON 仅开发证据 |
| 7. Migration | 无数据库迁移、回填或归档转换 |
| 8. 环境变化 | 无依赖、锁文件、密钥、.env、服务或部署修改；仅开发发布指针切换 |
| 9. 兼容性 | API／请求／响应／模型默认值不变；旧清单及历史哈希不变；检查器既有参数仍有效 |
| 10. Resume／Recovery | 无运行时变化；如实记录进程内视觉预算、持久化定向读取记录和审计签名的不同语义 |
| 11. Feature flags | 无新增或启用；FEATURE_VISION_ROUTING 仍是未来规范，生产 legacy 和付费延期保持 |
| 12. 执行测试 | 见下方验证记录 |
| 13. 测试结果 | 最终结果见下方验证记录 |
| 14. Benchmark | 本轮无模型／行为变更，无新质量比较；至少 40 个真实视觉冻结案例的质量门槛尚未完成 |
| 15. 安全／隐私 | 没有模型网络调用、用户材料外发或生产数据读取；仅源码／.env.example 的指纹；未读取真实凭据。视觉与隐藏推理保护无修改 |
| 16. 回滚 | 撤回本轮列明清单／测试／文档改动，若取消激活则将 CURRENT 恢复 V4.8，并刷新 MANIFEST；无需数据／环境回滚 |
| 17. 已知限制 | 词法检查与源码哈希不能证明全部语义或模型质量；视觉归档缺逐次 profile，自动页数预算不跨重启持久化；详见清单 |
| 18. 延期工作 | V4.9.1–.8 请求／响应、能力清理、基准／评分、challenger／fallback／晋升门槛均未实施；V4.8.11 付费对照与真实验收仍延期 |

## 验证记录

- 修改前：9 个模型相关测试文件通过；视觉／OCR／恢复／迁移／既有调用清单基线通过。
- 新增清单回归：6/6 通过，失败／跳过／取消均为 0。
- node scripts/check-model-call-inventory.mjs --vision --baseline：四个 Vision 语义调用点、五个消费者、20 个已核对所有者；仍为一个传输入口、一个适配器；V4.8 历史源码哈希通过。
- node --test tests/*.test.mjs：759/759 通过，失败／跳过／取消均为 0；耗时约 9.79 秒，包含既有视觉、OCR、财务证据、模型迁移、恢复及 Harness 检查。日志：artifacts/v4-9-0-unit.log。
- git diff --check：通过；运行时 server/src/shared/.env.example 无改动，先前未跟踪的 output/ 保持原样。

本轮不运行数据库、浏览器 UI、部署或付费模型基准：无对应生产实现变化，本报告不将既有历史验收或本轮源码检查冒充这些套件的新结果。V4.9 全发布验收仍待后续各子版本完成。

## 状态与冲突处理

当前可执行代码已完成 V4.8 Gateway 迁移；V4.9 概览中的旧“请求规范化”分组不是 V4.9.0 的执行规格。本轮以 DETAILED_INDEX 和 normalized V4.9.0 为准，仅盘点。用户显式选择 V4.9 覆盖此前“停在 V4.8”授权边界；不覆盖真实质量、付费和生产切换约束。Model Gateway 契约只校准这一状态说明，没有修改语义或降低任何 invariant。
