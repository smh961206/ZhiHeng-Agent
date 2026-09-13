# M1.0 — 按研究环节配置模型

M1.0 记录 V5.2 之后按研究环节配置模型的工程里程碑。当时使用独立编号以保留既定的 V5.3 Knowledge Engineering 安排。当前模型能力随平台发布，M1.x 不作为第三条发布版本线；实际兼容性仍由保存的模型配置、modelState 和上下文编号保证，见 [ADR-017](../../adr/ADR-017-platform-execution-compatibility.md)。

## 目标

用户只需定义可用模型，并将模型分配给 Input、Vision、Researcher、Writer、Evidence Verifier、Auditor、Critical Reviewer 和 Judge。平台继续使用既有 Model Gateway、Provider Adapter、V5.1 价格/成本/缓存，以及 V5.2 关键复核和证据裁决能力。可配置研究预算已在后续简化中退役。

当前激活路径不再要求维护 MAIN/PRO、Challenger、Champion、A/B、策略注册表、策略版本、失效记录或 acceptance 文件，也不再要求批量付费试跑后才能使用用户明确配置的模型。

## 运行方式

- schema v2 模型文件将连接定义与研究环节分配分开。
- 新任务保存 modelState v4，固定全部环节的模型池和连接身份。
- schema v1 与 modelState v1-v3 继续兼容，用于既有部署和历史任务恢复。
- 旧任务继续使用原 `router/research/review/followup` 身份，避免缓存、遥测和恢复语义变化；历史预算账本保留但不再执行额度限制。
- Critical Reviewer/Judge 由可选模型池开启，但 V5.2 的触发条件、独立上下文、单次收据和输出校验仍然有效。
- 价格未知仍保持未知；价格数据不会限制研究或静默更换模型。

## 配置入口

- 本地：`.env` + `config/models.local.json`
- 生产：`.env.production` + `config/models.production.json`
- 示例：`.env.example` / `.env.production.example` + `config/models.example.json`

详细操作见 [模型配置使用说明](../../configuration-guide.md)。架构与迁移依据见 [模型管线方案](../../architecture/model-pipeline-redesign-proposal.md)，最终实现与验证结果见 [工程交付报告](completion-report.md)，平台文案与交互同步见 [前端交付报告](frontend-completion-report.md)，跨版本维护见 [V5.1/V5.2/M1.0 整体回归报告](regression-optimization-report.md)。

## 边界

M1.0 没有新增数据库集合，没有重写历史任务，没有把报告文本变成规范事实，也没有更改证据、财务口径、研究截止日和确定性校验规则。多模型池目前固定使用首个模型；自动健康切换只能在明确安全边界内后续启用。

## 验收

- 配置 v2 严格解析并且不泄露密钥。
- 所有模型调用继续经过单一 Gateway/Adapter。
- 新任务固定 v4 环节快照，旧状态继续可读。
- V5.1 与 V5.2 回归通过。
- 当前环境示例不再包含旧模型治理变量。
- 完整单元测试、发布检查和前端构建通过。
