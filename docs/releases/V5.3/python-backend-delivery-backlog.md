# Python 后端交付清单

状态：Complete — 2026-09-14
发布线：Platform V5.3 / Knowledge K1.0.0

- [x] FastAPI 生产入口、应用生命周期与静态站点
- [x] 严格配置、Schema、端口和统一错误
- [x] MongoDB/GridFS、乐观并发、补偿清理与结构迁移
- [x] 任务幂等、取消、重试、SSE、检查点、租约和跨进程恢复
- [x] K-Series 快照、激活、任务固定和读取回执
- [x] 模型网关、适配器、质量优先候选、健康、固定状态、故障转移与费用未知语义
- [x] 证券、行情、文档、SEC/CNINFO/HKEX 官方来源、Tushare/LongPort 补充源和受限网页正文接入主流程
- [x] 公共数据完整性归档、点时约束、财务原数、派生指标和可满足输入契约的确定性计算接入主流程
- [x] 有界上下文编译、逐块回执、模型分析计划、结构化审查和模式合法的无证据降级动作
- [x] 模型价格注册表、缓存 token 费用、分时价格和前端费用摘要契约
- [x] 扫描 PDF 视觉读取并保持 `needsReview=true`
- [x] 删除 `server/`、跨运行时 `shared/`、Node 后端入口、脚本和后端 TypeScript 测试
- [x] 删除后端专用 npm 依赖并更新锁文件
- [x] Python 行为测试、真实 MongoDB 集成、Ruff、mypy、覆盖率、CI、Python 基准、前端测试、路由渲染和生产构建
- [x] Docker 构建、启动、健康检查与最终镜像无 Node 验收
- [x] 更新架构、运行、迁移与交付文档为最终实测状态

## 环境验收边界

本次没有使用生产第三方凭证或真实模型调用。SEC、CNINFO、HKEX、Tushare、LongPort、Tavily/Brave 与模型提供方通过受控契约和 Linux SDK 测试验证，生产网络、配额、行情权限和凭证仍由部署环境验收。架构规则不允许在没有真实多实例需求时引入外部事件总线；MongoDB 租约、取消标记、删除墓碑、持久检查点和 SSE 状态轮询覆盖当前部署模型。
