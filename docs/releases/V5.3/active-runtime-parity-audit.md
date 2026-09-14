# `main` Node → Python 活动运行路径对齐审计

日期：2026-09-14  
发布：Platform V5.3 / Knowledge K1.0.0  
Node 基线：`main@fe184c2d2a6ea76773ff28324b34a5eff045f303`

状态：Complete — 活动生产路径已全部迁移并通过代码、真实 MongoDB、前端契约和最终镜像验收。

## 验收口径

本审计最初比较 `main` 的 Node 后端与 Python 后端在当时活动配置下实际可执行的行为。后续用户取消“未使用能力不必对齐”的限制后，Critical Reviewer、Judge、研究预算和 Vision 确定性质量评分已补充迁移；本文件关于这些能力“不要求移植”的结论已由 [同步报告](independent-review-migration.md) 和最新机器清单取代。旧 policy/champion、A/B、漂移、复杂度路由及检查点升级则按用户决定明确废弃。

## 活动路径结果

| 活动能力 | Node 入口 | Python 所有者 | 结果 |
|---|---|---|---|
| HTTP、SSE、静态站点 | `server/index.mjs`, `server/job-stream.mjs` | `python_backend/api/` | 接口与任务流已对齐，Python 另提供只读 metrics |
| 任务创建、幂等、取消、恢复、交付 | `research-create`, `research-resume`, `research-delivery` | `application/research_service.py`, `application/recovery.py` | 已对齐；跨进程租约与取消保持有效 |
| 六个已启用模型阶段 | `research-path`, `vision-model`, `agent` | `path_resolver.py`, `documents.py`, `research_service.py` | 六阶段均有实际调用；证据核验阶段补回，模型结果只能定位已有连续原文，不能自行关闭缺口 |
| 模型配置和任务固定 | `model-config`, `model-state`, `model-rollout` 的 schema-v2 分支 | `infrastructure/model_gateway.py` | 严格校验完整阶段、模型引用和未使用模型；新固定状态采用含协议、地址、模型的连接身份，旧 Python 状态双读恢复 |
| 模型缓存观测 | `model-cache`, `model-gateway`, `storage` | `domain/model_cache.py`, `model_gateway.py`, `mongo_storage.py` | 已补回隐私安全前缀指纹、独立调用去重、七日观测、命中率/Token 比例和费用接口输出 |
| 模型费用和未知值 | `model-pricing`, `model-telemetry`, `storage` | `model_adapter.py`, `model_gateway.py`, `model_pricing.py`, `model_governance.py`, `mongo_storage.py` | 点时价格、缓存 Token、未知价格/用量及按用途/模型汇总保持显式；researcher、evidenceVerifier、writer、auditor 均绑定任务编号，流式 writer 末帧的服务端用量可被记录 |
| 证据、财务、计算、文档、行情 | 对应 Node 领域模块 | `application/research_pipeline.py`, `application/calculation_service.py`, `domain/`, `infrastructure/` | 通过统一 Python 管线承接；证据、观察、计算和假设保持不同语义 |

## 不进入活动迁移范围的代码

后续范围变更：用户明确要求补迁 criticalReviewer 和 judge。两项现已实现并接入 Python 研究流程，默认配置仍为空；下列旧治理和预算排除项保持原范围。新增验证与兼容性说明见 [独立复核迁移报告](independent-review-migration.md)。本页下方镜像及全量验收记录属于此次补迁之前的历史记录。

| Node 模块 | 不可达依据 |
|---|---|
| `model-champion`, `model-drift`, `model-experiment`, `model-policy`, `model-task-class`, `research-complexity` | `createConfiguredJobModelState` 在 schema-v2 配置下直接选择 pipeline 状态，不进入 legacy policy/champion 分支；当前环境没有对应准入配置 |
| `model-escalation` | 只处理 legacy policy 的 version-2 模型状态；活动 pipeline 使用独立阶段池与固定状态 |
| `research-budget` | `config/README.md` 明确当前不使用预算文件或预算开关，任务创建也不生成 `budgetState` |

逐模块归属和不可达证据见 `node-python-parity-manifest.json`。如果以后启用任一上述配置，该能力必须先完成 Python 实现和准入测试，不能仅凭历史 Node 文件恢复生产执行。

## 验收记录

- Python：118 passed / 1 skipped，覆盖率 74.22%；其中完整研究流程验证 `researcher → evidenceVerifier → writer → auditor`、四阶段任务编号关联和流式用量末帧，Ruff、mypy 通过。
- MongoDB：1 passed；验证任务并发/恢复、模型调用幂等写、缓存观测与费用汇总。
- 前端：TypeScript 53/53、组件 2/2、类型检查、OpenAPI 类型、SSR 5/5、生产构建通过。
- Python 迁移基准：5/5。
- 最终镜像：`sha256:f6aa3e0eaed92c012f9e286c1c8205d5c89c76c7b4bc30870ab59932626e7145`；FastAPI 健康检查通过，生产模型配置可读取并通过离线校验，Python、Poppler、LongPort 可用，最终运行阶段没有 Node。
