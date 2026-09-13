# M1.0 工程交付报告

2026-09-12：完成 V5.2 之后的 M1.0 模型配置简化。M1.0 属于独立模型轨道，核心发布指针仍为 V5.2，不占用既定的 V5.3 Knowledge Engineering 版本。此次保留 V4.8–V5.2 已交付的研究、成本、缓存、关键复核和裁决能力，取消新配置对付费试跑、模型验收文件、MAIN/PRO、Challenger、Champion、A/B、研究预算及其策略登记项的依赖。

## 1. Release / subrelease implemented

M1.0 实现“定义模型一次，再按研究环节分配”。标准环节为 Input、Vision、Researcher、Writer、Evidence Verifier、Auditor、Critical Reviewer 和 Judge。配置键使用 `input`，界面显示 `Input`；旧 `router` 仅用于 schema v1 和历史任务兼容。

## 2. Modified files

- 环境与示例：`.env`、`.env.example`、`.env.production`、`.env.production.example`、`.gitignore`、`.dockerignore`、`config/models.example.json`、`package.json`、`README.md`、`MANIFEST.json`
- 配置、部署与命令：`config/README.md`、`docs/configuration-guide.md`、`docs/cost-configuration-guide.md`、`DEPLOY.md`、`deploy.sh`、`compose.models.yaml`、`scripts/model-config.mjs`、`scripts/benchmark.mjs`、`scripts/model-comparison.mjs`、`scripts/check-model-call-inventory.mjs`
- 模型系统：`server/model-config.mjs`、`server/model-catalog.mjs`、`server/model-state.mjs`、`server/model-rollout.mjs`、`server/model-flagship.mjs`、`server/model-gateway.mjs`、`server/model-adapter.mjs`、`server/model-telemetry.mjs`、`server/research-budget.mjs`
- 研究调用与接口：`server/agent.mjs`、`server/index.mjs`、`server/research-create.mjs`、`server/research-path.mjs`、`server/security-intent.mjs`、`server/vision-model.mjs`、`server/vision-policy.mjs`
- 界面：`src/components/PlatformStatusPanel.jsx`、`src/components/DocumentReadingSummary.jsx`、`src/components/ResearchCostSummary.jsx`、`src/components/ResearchDetail.jsx`、`src/components/ResearchFramework.jsx`、`src/components/ResearchHandbook.jsx`、`src/components/ResearchMethod.jsx`、`src/components/ResearchUsageGuide.jsx`
- 架构与契约：`docs/architecture/00-system-map.md`、`docs/architecture/current-implementation-map.md`、`docs/architecture/04-model-system.md`、`docs/contracts/model-gateway.contract.md`、`docs/invariants/model.invariants.md`、`docs/tracks/M-series.md`、`docs/releases/V4.9/vision-call-inventory.json`
- 测试：`tests/model-pipeline.test.mjs`、`tests/model-call-inventory.test.mjs`、`tests/model-cost.integration.mjs`、`tests/research-budget.test.mjs`、`tests/benchmark-cli.test.mjs`、`tests/model-comparison.test.mjs`、`tests/model-config.test.mjs`、`tests/model-config.integration.mjs`、`tests/env-loading.test.mjs`、`tests/jobs-create.integration.mjs`、`tests/jobs-delivery.integration.mjs`、`tests/jobs-retry.integration.mjs`、`tests/research-resume.integration.mjs`、`tests/fixtures/resume-runtime.mjs`、`tests/workspace-ui.integration.mjs`、`tests/platform-v48-ui-scenarios.mjs`、`tests/platform-v50-ui-scenarios.mjs`、`tests/platform-v51-ui-scenarios.mjs`

工作区还包含此前尚未提交的 V5.1/V5.2 实现。本清单只描述 M1.0 直接涉及的文件，不把既有脏工作区内容重新归属到本次迭代。

## 3. New files

- `config/README.md`
- `config/pricing.example.json`
- `docs/cost-configuration-guide.md`
- `docs/architecture/model-pipeline-redesign-proposal.md`
- `docs/releases/M1.0/README.md`
- `docs/releases/M1.0/migration.md`
- `docs/releases/M1.0/rollback.md`
- `docs/releases/M1.0/completion-report.md`
- `tests/model-pipeline.test.mjs`
- `tests/fixtures/pipeline-api-env.mjs`
- `docs/releases/V4.9/archive/README.md`
- `docs/releases/V4.9/archive/vision-acceptance-glm53-fields-20260911-approved.json`（从根目录历史位置迁入，内容与 SHA-256 保持不变）

## 4. Removed files

工作区已移除 `.env.models`、`.env.models.example`、`.env.production.models`、`.env.production.models.example`、`config/research-budget.example.json`、旧 `docs/cost-budget-configuration-guide.md`，以及本地、生产各自的 preview/rollback 模型配置副本。它们均为未跟踪或被忽略的本地文件，没有产生 Git 删除记录。`package.json` 移除 `models:preview`、`start:legacy` 和 `test:model-comparison` 活动入口；模型配置 CLI 只保留 `--check`。根目录空的 `model_policy_acceptance_file` 与旧 `vision_acceptance_file` 目录也已移除，后者的批准 JSON 原样归档到 V4.9 发布记录。`.gitignore` 与 `.dockerignore` 不再预留当前旗舰/Judge acceptance 或研究预算配置路径。

## 5. Architecture changes

schema v2 在现有 Model Gateway 上增加一个严格的配置编译层：`models` 只保存模型连接定义，`pipeline` 只保存环节分配。业务模块按研究目的调用 Gateway，不依赖供应商或模型名。新任务把全部环节和连接身份固定到 modelState v4；Input、Researcher、Writer、Evidence Verifier、Auditor 和 Vision 都通过同一 Gateway/Adapter 执行。

Researcher 先生成研究草稿，Writer 再使用重新构造的公开上下文整理交付，Auditor 独立审计。Writer 上下文只包含证据、工具结果、初稿、来源目录、覆盖情况与未解网页缺口，不传递 Researcher 的隐藏推理。Critical Reviewer 与 Judge 继续使用 V5.2 的独立上下文、触发条件、调用收据和输出校验，只由对应环节是否配置模型决定是否可用。

平台状态弹窗、首页与手册同步改为“按研究环节配置”的表达。新配置展示 Input、Vision、研究、写作、证据核验、审计及可选关键复核/Judge；读取旧任务时只标记为“兼容历史模型配置”，不再向当前用户暴露候选、Champion、A/B 或验收策略。

## 6. Schema changes

模型配置新增 schema v2；私有任务状态新增 modelState v4 和 `writerCompleted` 检查点。后续预算简化停止为新任务写入可选 `budgetState`；已有字段、账本和历史任务不删除、不回填。数据库集合、索引、规范事实、计算定义、证据结构和公开报告结构没有改变。schema v1、modelState v1–v3 继续读取。

## 7. Migrations

迁移采用增加新读写路径的方式：新建任务写 v4，历史任务继续读取原状态，不批量回填、不改绑模型、不改研究截止日，也不重写历史调用、成本、历史预算账本、旗舰授权或裁决收据。新任务不再创建统一预算；旧部署可以先离线检查 schema v2 文件，再切换 `MODEL_CONFIG_FILE`。

## 8. Environment changes

本地使用 `.env` 与 `config/models.local.json`，生产使用 `.env.production` 与 `config/models.production.json`。两个实际配置和示例均已升级到 schema v2。四份环境文件统一整理为服务访问、模型凭据、运行参数、证券与披露、网页检索、模型费用记录六段，各 21 个键且无重复项。环境文件保留模型 API key 值、遥测、超时和 V5.1 价格入口；删除模型定义重叠项、Challenger、Champion、A/B、成本排序试运行、统一研究预算、策略注册表、策略版本、失效记录和 acceptance 文件变量。模型文件只引用密钥变量名，不保存密钥值。

本地与生产离线配置检查均返回 schema v2、2 个模型、8 个环节、凭据已配置、付费调用 0。

## 9. Compatibility impact

schema v1 和旧环境变量解析仍保留，供已有部署和历史记录使用。旧任务中的 `router/research/review/followup` 身份继续用于缓存、遥测与恢复；只有 schema v2 新任务采用 `input/researcher/writer/auditor/evidence-verifier`。V4.8–V5.0 的路由、Vision、研究与审计业务能力仍在；V5.1 的价格、费用与缓存仍在，研究预算只保留历史账本兼容；V5.2 的关键复核与 Judge 仍在。

## 10. Resume / recovery impact

modelState v4 固定每个环节的模型池、当前模型和连接身份。恢复时必须匹配原快照，配置变化不能静默替换历史模型。`writerCompleted` 防止 Writer 在断点恢复后重复执行；旧任务不增加 Writer 调用，保持原恢复路径。历史 `budgetState` 继续校验未确认请求并防止重复执行，但保存的额度不再阻断或缩减研究。研究截止日、原始资料和证据来源沿用任务创建时的状态。

## 11. Feature flags

M1.0 没有新增总开关，是否使用新路径由模型配置 schema 决定。`criticalReviewer` 与 `judge` 是可选数组，空数组表示关闭。V5.1 的费用与缓存记录继续有效；成本排序和研究预算开关均已移除。schema v2 遇到旧模型定义、Challenger、Champion、A/B 或 acceptance 配置时会拒绝启动，避免新旧入口同时生效。

## 12. Tests executed

- 全量：`pnpm test`
- 发布专项：`pnpm test:release`
- 前端生产构建：`pnpm build`
- Mongo 主集成：`pnpm test:mongodb`
- 当前文件配置、遥测、Knowledge API 与进程恢复集成
- schema v1/modelState v1–v3 与历史 Vision 任务进程恢复集成
- 5 个应用路由服务端渲染集成
- 332 个浏览器界面场景与失败场景定向复跑
- 模型管线、Vision 与调用清单定向回归
- 本地与生产 schema v2 离线配置检查
- `git diff --check`

## 13. Test results

| 检查 | 结果 |
| --- | --- |
| 全量单元回归 | 937/937，通过；0 失败、0 取消、0 跳过 |
| 发布专项 | 142/142，通过；0 失败、0 取消、0 跳过 |
| 模型管线、Vision、调用清单与预算退出兼容 | 28/28，通过 |
| Mongo 主集成 | 9/9，通过；覆盖任务创建、保存、重试、删除、交付恢复、成本、迁移和 V5.2 私有收据 |
| 当前配置与进程恢复集成 | 8/8，通过 |
| 历史模型状态兼容集成 | 5/5，通过；覆盖 V5.0 两组 v3、legacy、policy 与 V4.9 Vision 状态 |
| 应用路由渲染 | 5/5，通过 |
| 浏览器界面回归 | 332/332，通过；桌面、平板与移动端，API 全部使用内存合成夹具 |
| 本地模型配置 | 通过；2 模型、8 环节、付费调用 0 |
| 生产模型配置 | 通过；2 模型、8 环节、付费调用 0 |
| 前端生产构建 | 通过；2084 个模块完成转换 |
| 差异格式检查 | 通过；只有 Git 的 CRLF 转换提示 |

## 14. Benchmark results

活动 CLI 只保留离线回归；`scripts/benchmark.mjs` 拒绝 `--live`、`--allow-paid` 和 `--limits`，模型比较 CLI 拒绝实时付费与导出流程。此次模型配置检查和全部测试的真实模型调用均为 0，未发生付费试跑。历史 benchmark/验收数据的读取与回归代码保留，用于解释旧工件，不再作为 schema v2 的启用门槛。

## 15. Security / privacy implications

API key 只保存在环境文件，公开状态和模型文件只显示变量名与模型身份。Gateway 继续阻止 `VITE_` 密钥引用、密钥写入 URL、隐藏推理公开或持久化，以及 Critical Reviewer/Judge 绕过任务授权。Writer 使用公开可复核上下文。证据优先、缺失保持缺失、时间点、来源追踪和确定性计算规则没有削弱。

## 16. Rollback path

保留当前 schema v2 文件和任务数据，把 `MODEL_CONFIG_FILE` 指回可用的 schema v1 文件并恢复对应旧环境变量，然后重启服务。切换只影响之后创建的任务。modelState v4 任务必须由支持 M1.0 的代码与原连接身份继续处理，不能交给旧版本静默改绑。回滚不得删除成本、缓存、历史预算账本、证据、审计、关键复核或 Judge 记录，也不得重新启用预算额度。

## 17. Known limitations

- 多模型数组当前固定使用第一个模型，还没有按健康状态自动切换。
- 当前没有面向管理员的可视化模型配置编辑器，配置仍通过 JSON 与环境文件维护。
- schema v1 兼容代码及历史 benchmark/验收解析代码仍在兼容窗口内，因此源码中仍能看到旧术语；它们不是 schema v2 的活动配置入口。

## 18. Deferred future-release work

安全的模型池故障切换、管理员配置界面、schema v1 兼容代码清理和旧 Writer 路径清理均延后处理。M1.0 不实现 V5.3 Knowledge Engineering 或其后的业务能力。
