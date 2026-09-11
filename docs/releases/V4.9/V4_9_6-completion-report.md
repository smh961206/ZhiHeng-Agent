# V4.9.6 完成报告

新增显式配置的 Vision challenger（ModelProfile v3），独立连接／密钥、图片能力及 adapter thinking 选项。Catalog 校验 v3 只能服务 vision；未知型号不推断能力，候选密钥不回退到分析密钥。既有 v1/v2 及固定 job modelState 不变。

scripts/vision-benchmark.mjs 复用生产 renderer 与 readVisionResult/Gateway，对 48 个冻结原件运行 baseline/candidate。默认纯模拟服务；真实模式须显式 --live --allow-paid --max-requests，独立输出以排他方式创建，不能覆盖既有记录。请求总量有上限、无隐式重试或恢复；这不是货币账单硬限额。

修改 model-catalog、model-connection、model-adapter、vision-model 和既有视觉基准脚本；新增 tests/vision-challenger.test.mjs、本报告。无删除、Mongo schema／迁移／历史回填、生产配置或 feature flag 启用。ModelProfile v3 是配置类型，比较 JSON 是开发工件，均非研究持久化 schema。旧调用兼容、模型固定和恢复行为保留；候选不能绕过既有 job pin。

候选／请求／响应／Catalog／modelState／旧 wire 回归 46 个通过；48 个原件、96 次模拟 Gateway 请求完成，qualityAccepted=false，文件 artifacts/v4-9-6-vision-offline.json。模拟服务返回参考答案只验证执行与评分链路，绝不证明真实模型识别质量；账单未知仍 null。

无真实模型调用、凭据泄露或用户材料外发。回滚撤回候选配置与离线入口，既有 legacy 可继续；保留旧研究与归档。限制：无真实候选型号／预算／质量记录；无跨中断自动恢复，未完成 live run 不自动续费重跑。V4.9.7–.8 负责受限 fallback 与晋升门槛。
