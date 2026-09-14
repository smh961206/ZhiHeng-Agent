# Node → Python 能力迁移矩阵

状态：Complete — Python/FastAPI 是唯一后端运行时，Node 后端源码、入口、依赖与后端测试已移除。
适用范围：Platform V5.3 / Knowledge K1.0.0

| 能力组 | Python 所有者 | 迁移结果 |
|---|---|---|
| HTTP、静态站点、SSE | `api/factory.py`, `api/events.py`, `api/middleware.py` | Complete：接口、流式事件、错误映射与应用生命周期均由 FastAPI 承担 |
| 配置与接口契约 | `config.py`, `api/schemas.py`, `domain/models.py` | Complete：启动集中校验并冻结配置，输入输出使用强类型契约 |
| 研究生命周期与恢复 | `application/research_service.py`, `application/recovery.py`, `application/workflow.py`, `application/baseline.py` | Complete：幂等、跨进程取消、可靠交付重试、优雅停机、检查点、租约、启动恢复与并发状态机均已接线 |
| 模型网关与治理 | `infrastructure/model_gateway.py`, `infrastructure/model_adapter.py`, `infrastructure/model_pricing.py`, `domain/model_governance.py`, `domain/model_cache.py` | Complete：安全配置、活动阶段、调用总期限/空闲期限、流式故障边界、错误分类、点时价格、隐私安全缓存指纹与观测、遥测及双读固定状态已实现 |
| Knowledge | `application/knowledge.py`, `cli.py` | Complete：K1.0.0 快照、校验、激活、固定和读取回执保持有效 |
| 可选关键复核与分歧裁决 | `domain/independent_review.py`, `domain/judge.py`, `application/independent_review.py`, `application/research_service.py` | 已迁移并接入研究流程；重复可分类审计失败才准入 criticalReviewer；重大同口径分歧才准入 judge，并再次审计。默认配置仍关闭。详见 [迁移报告](independent-review-migration.md) |
| 可选研究预算 | `domain/research_budget.py`, `infrastructure/model_gateway.py`, `application/research_service.py` | Complete：模型、工具轮次、网页请求和 Vision 页使用持久化预留/完成凭证；支持 disabled、dry-run、enforce，未知模型费用不作为零成本授权 |
| Vision 确定性质量评分 | `domain/vision_quality.py` | Complete：离线检查数值、单位、日期、表头、正负号、括号、脚注、行列关系和缺失值；结果只用于 benchmark，不生成财务事实 |
| 证据与财务原数 | `domain/evidence.py`, `infrastructure/official_evidence.py`, `infrastructure/web_research.py`, `infrastructure/data_providers.py`, `application/research_pipeline.py` | Complete：SEC/CNINFO/HKEX 正式披露、Tushare/LongPort 补充源和监管/发行人网页正文受截止日、来源身份与缺失语义约束后进入主流程；搜索摘要不进入证据 |
| 公共数据归档 | `infrastructure/data_archive.py`, `infrastructure/mongo_storage.py` | Complete：复用原 `report_cache` 集合，限制大小/保留期并校验内容摘要；不保存凭证或请求体 |
| 上下文、核验、审查与确定性计算 | `application/context_compiler.py`, `application/calculation_service.py`, `application/research_service.py`, `domain/review.py`, `domain/calculations.py`, `domain/financial.py`, `domain/analytics.py` | Complete：有界公平编译、包含/省略回执、分析计划、工具白名单/依赖、独立证据定位、严格审查 JSON、证据引用和模式合法动作均已接线 |
| 证券与行情 | `domain/securities.py`, `infrastructure/market.py`, `infrastructure/data_providers.py` | Complete：自动解析、比较数量约束、行情缓存与 LongPort/公开回退 |
| 文档读取 | `infrastructure/documents.py` | Complete：原生文本优先；扫描 PDF 使用视觉模型并强制标记待复核 |
| 持久化与迁移 | `infrastructure/mongo_storage.py`, `cli.py` | Complete：乐观版本、GridFS 补偿清理、租约、跨进程取消、删除墓碑、公共归档、恢复与费用未知语义通过真实 MongoDB 验收 |
| 质量与发布 | `python_tests/`, `benchmark/`, `.github/workflows/quality.yml` | Complete：pytest、覆盖率、Ruff、mypy、Python 基准、前端验证和容器构建均已接入 |

## 清理证明

- `server/` 和跨运行时 `shared/` 不存在。
- Node 后端入口、迁移脚本、诊断脚本、模型基准执行器和依赖旧后端的 TypeScript 测试已删除。
- `start.ps1`、`package.json#start`、Docker 与 `deploy.sh` 均启动或调用 Python。
- npm 依赖中已移除 MongoDB、Longbridge、PDF.js 和原生 Canvas 等后端依赖。
- TypeScript 只保留 React 前端、`src/domain/` 客户端展示规则、前端测试与构建工具。
- 生产镜像最终阶段包含 Python 与 PDF 渲染工具，不包含 Node。
- `node-python-parity-manifest.json` 对 `main@fe184c2` 的 113 个 Node 后端模块逐项给出 Python 所有者或活动配置下不可达证据，并由架构测试核验完整性。详细审计见 `active-runtime-parity-audit.md`。

真实模型与第三方生产凭证属于部署环境验收；它们不改变 Python 已成为唯一后端实现这一结论。
