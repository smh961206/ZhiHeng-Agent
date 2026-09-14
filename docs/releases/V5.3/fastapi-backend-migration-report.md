# FastAPI 后端迁移完成报告

日期：2026-09-14  
发布：Platform V5.3 / Knowledge K1.0.0  
状态：Complete  
分支：`codex/fastapi-backend`

1. **Release/subrelease implemented**：完成 Platform V5.3 Node → Python/FastAPI 后端迁移与工程化升级；Knowledge K1.0.0 快照、固定、恢复和读取链路保持有效。
2. **Modified files**：启动、容器、Compose、部署脚本、包配置、依赖锁、环境模板、README、架构/契约/不变量/ADR/发布文档、React/TypeScript 前端边界和质量配置。
3. **New files**：分层 `python_backend/api`、`application`、`domain`、`infrastructure` 模块；有界上下文编译器、独立证据定位、隐私安全模型缓存观测、公共数据归档、网页正文采集、价格注册表、Python 测试、Python 迁移基准、113 模块能力清单、生产/开发依赖锁与 GitHub Actions 质量门禁。
4. **Removed files**：完整 `server/`、跨运行时 `shared/`、Node 后端入口与运维脚本、旧 Node 模型/Vision 基准、后端专用 npm 依赖和依赖旧后端的 TypeScript 测试/fixtures。历史发布材料的大规模清理另见仓库清理记录。
5. **Architecture changes**：Python 成为唯一后端；建立 `api → application → domain` 与 `infrastructure` 适配边界。研究服务以确定性计划和工具调用准备证据，使用 evidenceVerifier 定位已有连续原文，再通过有界上下文交给 writer 与独立 auditor；业务模块不直接调用提供方端点。React/TypeScript 只承担浏览器界面、客户端展示规则、前端测试和构建。
6. **Schema changes**：保留 `jobs`、`deleted_jobs`、`model_calls`、`report_cache`、`schema_migrations` 与 GridFS `job_payloads`；任务记录增加乐观修订、租约、上下文回执、证据核验回执、完整管线检查点和模型遥测字段。新模型固定状态使用 version 2 连接身份，version 1 继续双读恢复。
7. **Migrations**：入口为 `python -m python_backend.cli db-migrate`；迁移保持幂等和版本连续，没有破坏性重写历史研究。公共数据归档复用旧 `report_cache` 集合和 TTL 索引。真实 MongoDB 集成验证了并发冲突、GridFS 清理、任务租约、取消标记、删除墓碑和归档读写。
8. **Environment changes**：Python 3.12；锁定 `requirements.lock` 与 `requirements-dev.lock`；增加请求/材料大小、速率、超时、并发、租约、日志级别、Tushare、LongPort、Tavily/Brave、发行人域名及价格文件配置；生产价格文件存在时由独立 Compose overlay 只读挂载；Docker 最终阶段复制经过校验的 `config/`、安装 `poppler-utils` 和 Linux 可用的 LongPort 3.0.18，不包含 Node。
9. **Compatibility impact**：现有 `/api`、SSE 和前端消费格式保持；旧 Node 内部导入、后端命令和后端专用依赖不再兼容。TypeScript 前端行为回归通过。
10. **Resume/recovery impact**：检查点固定输入、研究截止日、Knowledge 版本/指纹、执行兼容状态、上下文版本、模型状态和完整证据/观察/计算/缺口管线快照。Review 阶段恢复不会重跑 researcher，也不会用新抓取内容替换原任务证据；优雅停机把可恢复任务退回队列，跨进程取消与 SSE 通过持久状态生效。
11. **Feature flags**：保留 `WEB_SEARCH_ENABLED`；Tushare、LongPort、Tavily/Brave 由凭证是否存在决定可用性。后续同步已增加 `RESEARCH_BUDGET_MODE`，并迁移 Critical Reviewer 与 Judge；默认仍关闭。旧模型实验、Champion、费用路由、漂移和复杂度路由按用户决定明确废弃。安全限制和研究契约不由开关绕过。
12. **Tests executed**：Python 全量 pytest 与覆盖率、Ruff、mypy、Python 迁移基准、真实 MongoDB 集成；模型缓存对照、证据核验防编造、schema-v2 配置和双读模型状态；TypeScript 前端测试、组件测试、类型检查、OpenAPI 类型一致性、5 条 SSR 路由、Vite 生产构建；Docker 构建、运行、健康检查、运行时工具检查。
13. **Test results**：Python 118 passed / 1 skipped（跳过项为默认关闭的真实 MongoDB 测试），并以完整研究流程验证 `researcher → evidenceVerifier → writer → auditor`、四阶段任务编号关联和流式用量末帧；真实 MongoDB 单独 1 passed，并验证模型调用幂等写、缓存观测和按模型费用汇总；覆盖率 74.22%，门槛 70%；Ruff 和 mypy 通过。TypeScript 53/53、组件 2/2、tsc、OpenAPI 类型、5/5 SSR 路由和 Vite 构建通过。Vite 仅保留依赖已有的 `use client`/sourcemap 提示。
14. **Benchmark results**：Python 迁移基准 5/5 通过，覆盖点时截止、缺失值、计算血缘、视觉待复核和无 Node 后端。未使用真实模型做质量/费用比较，不能把离线契约基准解释为真实模型效果。
15. **Security/privacy implications**：密钥仅由后端环境解析；配置 URL、Host/Origin、请求体、速率、超时和官方域名受限；日志和模型遥测清洗敏感字段，不持久化提示词或隐藏推理；视觉内容不能成为已验证财务事实。
16. **Rollback path**：应用代码可回到迁移前 Git 提交或旧镜像；数据库先使用带哈希的 `mongodump` 备份，新增字段可由旧读取方忽略。历史研究不做破坏性回写；回滚后需恢复旧 Node 构建链和对应依赖，不能只恢复入口文件。
17. **Known limitations**：迁移前未写入 `model_calls` 的历史任务无法从报告反推 Token 或费用，界面明确显示“无调用记录”，不做推测性回填。生产第三方凭证、真实模型以及外部站点的生产网络、配额和行情权限未在本次验收中使用。Linux LongPort 3.x SDK 提供行情和当前估值指标，但不提供较新平台 SDK 中的历史估值、分红明细、回购与公司行动接口；这些项目会明确记录缺口并依赖正式披露补证。DCF 等需要显式假设的估值在输入不足时保持缺失；视觉转录始终需要人工复核。
18. **Deferred future-release work**：真实多实例需求出现后再评估事件总线/分布式协调；已有集中追踪平台时再接 OpenTelemetry 导出器；真实模型效果与外部站点生产验收属于部署验收。V5.4+ 的 Fact Engine、向量检索和其他路线图能力保持延期。

## 删除与运行证明

- `server/` 与 `shared/` 均不存在。
- 活动源码、启动和部署路径不再导入或启动 Node 后端。
- Docker 验证镜像 `sha256:f6aa3e0eaed92c012f9e286c1c8205d5c89c76c7b4bc30870ab59932626e7145` 构建成功；容器通过健康检查并返回 `{"ok":true,"storage":"mongodb"}`，生产模型配置存在且通过离线结构校验。
- 容器内 Python 位于 `/usr/local/bin/python`，PDF 渲染器位于 `/usr/bin/pdftoppm`，LongPort Quote/Calc 接口可导入，未发现 Node 可执行文件。
- 能力清单对 `main@fe184c2` 的 113 个 Node 后端模块逐项覆盖；活动行为必须有 Python 所有者，未使用代码必须提供当前配置与调用分支的不可达证据。
- 历史发布文档中的 `server/*` 仅用于记录当时实现，不是当前入口或运行所有者。
