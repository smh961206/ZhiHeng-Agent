# V5.3 → V6.0 基础设施与数据架构迭代方案

Status: DISTRIBUTED PROPOSAL

Current baseline: Platform V5.3 / Knowledge K1.0.0

Last reviewed: 2026-09-14

## 1. 文档定位

本文把 V5.3 至 V6.0 已批准的架构原则、正式版本规划和基础设施建议整理为一份跨版本实施参考，重点回答：

- MongoDB/GridFS 是否继续作为主存储；
- 是否以及何时迁移 PostgreSQL；
- Redis、语义向量索引、消息队列、对象存储和分析型存储何时有必要；
- 新基础设施如何保持证据、时点、来源链、恢复、人工覆盖和历史兼容；
- 每项基础设施引入前必须满足什么证据门槛。

本文不是新的 release authority，不改变 `docs/releases/CURRENT`，也不授权提前实现未来版本。实际实施必须以当时的 current code/tests、当前版本规格、Contracts、Invariants 和 Accepted ADR 为准。若本文与这些来源冲突，使用仓库规定的 source-of-truth priority，并更新本文或通过新 ADR 解决。

本方案的执行项已分散到 V5.4—V6.0 各版本 `implementation.md`，并下沉到负责索引基准、存储决策、事实模式、依赖图、Research State、连续调度、决策审计、资本配置、快照清单、租户、Worker Queue 和灾备的子版本规格。本文保留跨版本决策背景；各版本及子版本规格负责范围、验收和停止条件。

## 2. 当前事实基线

当前运行形态为：

```text
React/TypeScript browser
        ↓
Python FastAPI modular monolith
        ├─ research lifecycle / checkpoint / SSE
        ├─ Knowledge K-Series snapshots
        ├─ evidence/document/financial/model modules
        └─ MongoDB collections + GridFS payloads
```

当前存储实现的主要特征：

- MongoDB/GridFS 是已经接受的生产兼容边界；
- 研究任务的大型结构化 payload 作为完整 JSON 写入 GridFS，`jobs` 保存查询摘要和 payload pointer；
- `report_cache` 使用 MongoDB TTL index；
- 市场数据、Knowledge 和部分展示资源使用进程内缓存；
- SSE 客户端队列属于单进程内存状态；
- 当前没有 Redis、独立向量数据库、外部消息队列或分布式 Worker；
- 当前重启恢复语义不是通用分布式执行语义，未来 Worker/Queue 仍属于 V6.0.13；
- ADR-018 固定 FastAPI、现有 API 与 MongoDB/GridFS 的当前兼容性，任何主库替换必须通过新的 superseding ADR 和分阶段迁移；
- 当前未来版本文档中仍可能出现历史 `server/*.ts` 路径；实际实施必须以 Python current implementation map 为准，不能重新建立已移除的 Node backend。

## 3. 不可妥协的架构原则

所有后续基础设施决策必须保持：

1. Evidence 先于结论，缺失数据保持缺失。
2. Verified Fact 必须可追溯到 Evidence 和 Source。
3. Fact、Calculation、Claim、Belief、Forecast、Decision、Outcome 保持不同语义。
4. 期间、币种、股份口径、会计范围、估值口径、发布时间和研究 cutoff 随数值传递。
5. 历史原始披露不得被后续重述原地覆盖。
6. 报告是视图，结构化研究对象是长期 canonical state。
7. 确定性财务计算和硬校验由程序执行。
8. Vector similarity 只能扩展召回，不能成为财务真值来源。
9. 人工覆盖保持 sticky、可撤销和可审计，模型重跑不能静默覆盖。
10. 生产 Knowledge/Policy 不根据线上结果自行修改；候选变化必须经过离线 benchmark 和人工批准。
11. 基础设施故障不能促使系统编造数据、改变 cutoff 或绕过验证。
12. 在真实多实例/多 Worker 需求出现前保持模块化单体，不为架构形式提前分布式化。

## 4. 推荐目标形态

目标形态采用少量基础设施承担清晰职责：

```text
FastAPI modular monolith
├─ Domain services
│  ├─ Identity / Source / Evidence / Fact
│  ├─ Calculation / Claim / Research State
│  ├─ Decision / Portfolio / Governance
│  └─ Scheduler / Worker coordination
├─ Ports
│  ├─ Domain repositories
│  ├─ BlobStore
│  ├─ SearchIndex
│  ├─ Cache
│  └─ WorkQueue
│
├─ PostgreSQL candidate target
│  ├─ canonical structured objects
│  ├─ temporal/revision/lineage relations
│  ├─ tenant/RBAC/audit
│  ├─ durable job lease + transactional outbox
│  └─ pgvector when benchmark-accepted
│
├─ MongoDB/GridFS compatibility path
│  ├─ existing jobs and historical payloads
│  └─ legacy reads until verified cutover
│
├─ Object storage candidate
│  └─ raw files, page images and immutable packages
│
├─ Redis optional
│  └─ reconstructable cache, rate limit and live fan-out only
│
└─ RabbitMQ optional at V6.0.13
   └─ distributed work, retry and dead-letter only after measured need
```

这是一项目标候选，不是当前部署描述。PostgreSQL、对象存储、Redis 和 RabbitMQ 均须通过各自 Gate 才能进入产品依赖。

## 5. 主数据库决策

### 5.1 当前决定

V5.3–V5.4 保持 MongoDB/GridFS。当前版本不得因本文迁移数据库，也不得重写历史 payload。

### 5.2 PostgreSQL 候选理由

V5.5 之后的数据模型将出现大量稳定关系和约束：

- Issuer → Security → ShareClass → Listing → Identifier validity；
- Source → Evidence → Fact → Calculation → Claim；
- Claim → Assumption → Forecast → Research State → Decision；
- Portfolio → Position → Exposure → Risk Budget；
- Workspace → Actor → Role → Audit Event；
- revision、effective interval、dependency edge、human approval 和 immutable journal。

这些对象要求多对象事务、唯一性、引用完整性、关系查询、并发版本检查、行级租户隔离和追加审计。PostgreSQL 是更合适的长期 canonical structured store 候选；JSONB 可容纳尚未稳定的兼容扩展，规范字段仍应使用正式列和约束。

### 5.3 不允许的迁移方式

- 不允许 big-bang cutover；
- 不允许将全部 Mongo 文档原样放入单一 JSONB 并宣称迁移完成；
- 不允许先删除 Mongo/GridFS 再验证 PostgreSQL；
- 不允许根据当前数据推断历史从未保存的 PIT/provenance 字段；
- 不允许双写但没有对账、幂等和 rollback owner；
- 不允许形成长期双主权威状态。

### 5.4 PostgreSQL 决策 Gate

V5.5.0 身份盘点后，若要采用 PostgreSQL，必须先提交并接受 superseding storage ADR，至少包含：

1. 代表性 Identity/Fact/Lineage/DAG/Tenant schema prototype；
2. 当前 Mongo 数据容量、增长、查询和恢复基线；
3. PostgreSQL correctness、query plan、write/read latency 和恢复结果；
4. Mongo → PostgreSQL 字段映射及未知字段策略；
5. dual-read/new-write/cutover owner；
6. 数据、引用、hash、revision chain 和 tenant scope 对账；
7. rollback 到 Mongo read path 的验证；
8. ADR-018 兼容影响；
9. 运维、备份、升级和人员能力成本；
10. 接受或拒绝 PostgreSQL 的书面结论。

若 Gate 不通过，MongoDB 可以继续承担 canonical store；不得为了遵循本文而强行迁移。

## 6. PostgreSQL 数据建模纪律

若 PostgreSQL 被接受：

- 使用“强类型核心字段 + JSONB 扩展”，禁止通用 EAV 作为核心模型；
- canonical monetary/share/rate values 使用 `NUMERIC/DECIMAL`，Python 使用 `Decimal`；
- 业务时间和系统获知时间分开；
- immutable revision 与 mutable current pointer 分开；
- 外键、唯一性、check constraint 和 exclusion constraint 执行可确定的不变量；
- 领域可按 logical schema 划分，但初期保持单数据库；
- 事务保持短小，不在数据库事务内等待模型、网页、OCR 或外部数据；
- 高增长表先测量再按时间或 workspace/time 分区；
- 不在单实例索引、分区和垂直扩容用尽前引入分片；
- 查询路径以稳定 cursor pagination、明确 `asOf` 和 tenant filter 为基础；
- API 写入使用 object version/If-Match、idempotency key 和 409 conflict；
- migration 使用 expand → dual read → new write → verified backfill → cutover → later contract。

建议的逻辑 schema：

```text
identity | source | evidence | fact | research
decision | portfolio | governance | operations
```

这不是微服务边界，也不是多个独立数据库。

## 7. Blob 与原始文件

GridFS 在当前阶段继续有效。只有当文件规模、备份窗口、跨实例访问、生命周期或成本出现实测问题时，才评估 S3-compatible object storage。

未来 BlobStore 必须保存：

- immutable object ID；
- raw content hash；
- size/MIME；
- source/acquisition receipt；
- workspace/data classification；
- retention/legal hold；
- encryption/key reference；
- parser/OCR/Vision input version；
- database metadata 与 object existence 对账状态。

对象存储只保存原始或不可变大对象，canonical Fact/Claim/Decision 不以对象文件作为唯一权威状态。数据库和对象存储备份必须有一致性 manifest。

## 8. Redis 决策

### 8.1 当前决定

V5.3–V5.11 默认不引入 Redis。当前进程内缓存和 Mongo TTL cache 继续使用，先通过遥测确认瓶颈。

### 8.2 允许用途

Redis 只能承载可丢失或可重建状态：

- cache-aside 热点数据；
- rate limit counters；
- 短期 session/revocation cache；
- 多实例 SSE/live notification fan-out；
- 非权威临时协调。

### 8.3 禁止用途

- 不作为 Fact、Research State、Decision、Audit、budget ledger 或 checkpoint 的唯一存储；
- 不以 Redis Pub/Sub 代替 durable business events；
- 不使用语义缓存直接复用最终投资结论；
- 不让 Redis 故障改变研究正确性；
- 不把简单 Redis lock 当作关键发布的唯一互斥保证。

### 8.4 引入 Gate

Redis 至少需要满足一项已测量需求：

- 两个或以上实例需要共享低延迟临时状态；
- 数据库和应用优化后，已识别热点仍违反 SLO；
- 已测得足够命中率和可量化收益；
- SSE/rate limit/session revocation 需要跨实例一致可见。

同时必须定义 TTL、versioned cache key、失效条件、回源行为、租户隔离、容量上限和 Redis 全部丢失时的演练结果。

## 9. 锁、租约和并发控制

关键写入优先使用 canonical database concurrency：

- conditional update；
- object version / optimistic concurrency；
- row/document lock；
- durable lease；
- fencing token；
- idempotency key；
- immutable operation receipt。

Mongo 阶段可以使用原子条件更新获取 lease；PostgreSQL 阶段可以使用行锁、条件更新、transaction-level advisory lock 或 `SKIP LOCKED` queue-like consumption。Redis lock 仅在证明数据库协调不适用后评估，且必须处理 lease expiry、owner token、fencing 和网络分区。

## 10. Retrieval 与向量索引

V5.4 的正式目标是 hybrid retrieval：

```text
exact/structured + BM25 + semantic + page/table + fusion/rerank
```

### 10.1 当前决定

- 需要语义召回能力，不默认需要独立向量数据库；
- 财务数字、期间、币种、范围和表格单元格优先 exact/structured/page/table；
- semantic channel 主要提高管理层讨论、风险、商业模式和定性关系的 recall；
- embedding/reranker 不创建 Evidence 或 Verified Fact；
- 所有结果保留 channel provenance、source/evidence/page/block 和 cutoff。

### 10.2 实现选择顺序

1. 小语料先用可验证的 exact vector scan 或当前数据库可用能力；
2. 若 PostgreSQL 被接受，优先评估 pgvector；
3. 若继续 MongoDB且部署能力满足，评估 MongoDB Vector Search；
4. 只有内置方案在真实规模、过滤、并发或召回上不达标，才评估独立向量数据库；
5. OpenSearch/Elasticsearch 同样只在 BM25 corpus、吞吐和运维 Gate 证明必要后引入。

### 10.3 Index Manifest

每个 lexical/vector/rerank projection 至少记录：

- indexVersion；
- sourceSnapshotHash；
- chunking/parser version；
- embedding model/provider/version/dimensions；
- distance/scoring/fusion/rerank version；
- tenant/workspace scope；
- builtAt；
- benchmark receipt；
- active/deprecated/blocked status。

索引属于可重建派生数据。新版本必须 build → benchmark → shadow/compare → pointer switch；旧 Research State 继续引用原版本，不原地重写。

### 10.4 独立向量库 Gate

只有同时具备下列证据才考虑拆分：

- 当前实现经过参数和索引优化仍不满足 SLO；
- 冻结 retrieval benchmark 证明 recall/latency 有实质提升；
- tenant/security/cutoff filter 不退化；
- exact financial accuracy、page accuracy 和 citation hit 不退化；
- index 可以从 Source/Evidence 重建；
- 运维、备份、升级、成本和降级 owner 明确。

## 11. Task Queue 与消息系统

### 11.1 V5.8–V5.11

持续研究语义先使用数据库任务/租约模型验证：

```text
jobId, workspaceId, type, status, priority
availableAt, attempt, leaseOwner, leaseUntil, fencingToken
idempotencyKey, checkpointId, budgetRef, lastError
```

单实例调度或少量 Worker 不要求外部 MQ。任务必须至少一次可重试、最终效果幂等，并保留 pause/reconcile 状态处理外部结果未知。

### 11.2 V6.0.13

只有真实 multi-instance/continuous load 需要时才引入 Worker/Queue：

- 默认候选：RabbitMQ，适合 work queue、ack、routing、retry 和 dead-letter；
- Kafka：只在需要高吞吐 durable event log、长期 replay 和多个独立 consumer group 时评估；
- RocketMQ：只在组织已有成熟运维和明确功能依赖时评估；
- Redis Streams：可以用于已有 Redis 的非关键或过渡负载，不默认承担关键发布主链路。

日志收集不作为引入业务 MQ 的理由；日志、metrics 和 traces 应进入 observability pipeline。

### 11.3 Queue Gate

引入外部 MQ 前必须证明：

- 数据库队列在真实并发下违反 backlog/latency/lock SLO，或已有多消费者解耦需求；
- Worker crash、retry、duplicate、out-of-order 和 poison message 语义已定义；
- consumer 幂等已通过故障注入；
- canonical database commit 与消息投递使用 transactional outbox；
- dead-letter 有 owner、诊断、重放和保留策略；
- broker 不可用时不丢 canonical mutation；
- rollout、drain、rollback 和旧任务兼容通过。

## 12. Transactional Outbox / Inbox

未来跨进程事件必须使用 canonical transaction 写业务对象和 outbox：

```text
BEGIN
  write domain state
  append audit event when required
  insert outbox event
COMMIT
```

发布器异步投递；消费者使用 eventId/idempotencyKey 和 inbox receipt 去重。不得依赖“数据库写完后再调用 broker”获得原子性，也不得声称 broker exactly-once 等于业务效果 exactly-once。

Audit Ledger 是 canonical domain record，不能仅存在于 outbox、broker 或日志系统。

## 13. 领域数据建模要求

### 13.1 Identity

- stable internal IDs 不使用 ticker 作为永久主键；
- Identifier 带 validity interval、source 和 ambiguity；
- Issuer/Security/ShareClass/Listing/Legal Entity/Reporting Entity 保持不同语义；
- merge/split/reversal 必须可追踪、可回滚并触发影响分析。

### 13.2 Source/Evidence

- 原始来源与模型摘要分开；
- 保存 raw hash、publication/retrieval times、parser version 和许可；
- Evidence 精确到 page/block/table/cell；
- native/OCR/Vision/derived extraction 方法和限制显式；
- 外部内容始终作为 untrusted data，不能成为系统指令。

### 13.3 Fact

- canonical key 必须显式包含 entity/metric/period/unit/currency/scale/scope/share/valuation basis 等必要维度；
- value/period/currency/scope/share basis 可以拥有字段级 Evidence；
- observed/extracted/verified/derived/estimated/forecast/assumed/unknown 不互相伪装；
- conflict 保留全部候选和排除理由；
- revision 追加，不覆盖 originally reported value。

### 13.4 Calculation/Claim/State

- Calculation 固定 formula version 和所有输入引用；
- Assumption 独立于 Fact；
- supporting 与 counter Evidence 分开；
- DAG 拒绝硬依赖环；
- 上游变化传播 fresh/possibly_stale/stale/invalid/needs_revalidation；
- Research State immutable，报告从 State 渲染。

### 13.5 Decision/Portfolio

- Decision 固定 mandate、state、policy、opportunity set 和 cutoff；
- LLM 不能覆盖 hard mandate/risk constraints；
- Cash 是合法资产和决策；
- allocation 失败返回 infeasible；
- recommendation 与 execution 分离；本路线不自动交易。

## 14. 数据时间、数值和版本规范

### 14.1 双时态

至少区分：

- valid/event/effective time；
- published time；
- system known/recorded/retrieved time；
- research cutoff。

历史查询不能默认读取 currentBest；必须按 cutoff 和当时可知版本解析。缺少历史字段时标 unknown/partial，不根据后来的记录回填推断。

### 14.2 数值

- financial canonical values 使用 Decimal；
- 原始文本、normalized value、unit、scale、currency 和 rounding policy 分开；
- percentage、basis points、per-share 和物理单位通过 Unit Registry 显式转换；
- corporate action adjustment 同时保留 raw view 和 versioned adjusted view。

### 14.3 Version Manifest

关键对象或发布包含：

- schemaVersion；
- createdByRelease；
- compatibilityVersion；
- Knowledge/Formula/Policy/Retrieval versions；
- contentHash；
- parent/revision links；
- createdAt/publishedAt/cutoff。

版本生命周期使用 draft/active/deprecated/blocked/retired；deprecated/blocked 版本仍保留历史回放所需内容。

## 15. Data Lifecycle 与发布治理

### 15.1 数据进入

```text
Raw acquisition
→ Parsed observation
→ Normalized candidate
→ Validation or quarantine
→ Approved/Verified canonical object
```

外部数据不能直接写 canonical Fact。Quarantine 保存失败阶段、错误分类、原始输入引用和可重处理条件。

### 15.2 发布

Knowledge、Metric mapping、Formula、Policy、Fact resolution 等重大变化采用：

```text
Candidate → Validate → Approve → Publish immutable version
```

跨对象变化使用 Change Set，列出影响对象、依赖、回归、审批和 rollback target；禁止部分发布形成混合版本。

### 15.3 重处理

Parser/OCR/Vision/mapping/embedding 升级产生新派生版本。旧 State 继续引用旧版本；不得原地覆盖后声称历史可重现。

### 15.4 冷热分层

- hot：active jobs/current State/current positions；
- warm：recent Facts/Decisions/research history；
- cold：raw files/old calls/deprecated indexes；
- archive：immutable packages and required audit history。

归档不得破坏 hash、lineage、tenant scope 或 replay。

## 16. Multi-tenant / Security

V6.0 的 tenant boundary 必须贯穿：

- canonical rows and unique keys；
- object storage prefixes/policies；
- lexical/vector filters and partitions；
- cache keys；
- queue messages/leases；
- SSE channels；
- budgets/quotas；
- logs/traces/audit；
- export/import packages。

建议 API authorization 与数据库 Row-Level Security 双层执行；owner/migration/runtime/read-only identities 分开。后台任务只能使用已经验证并固定的 workspace context。

Data Classification 与 Provider Governance 在模型和检索调用前 hard gate。RESTRICTED 数据不得因成本或 fallback 发送到未授权 provider。

敏感内容可以在需求成立时使用 workspace-scoped envelope encryption；密钥引用和轮换记录与业务数据分开，密钥不进入日志、Research Package 或镜像。

## 17. AI 与外部内容安全

- retrieved text、文件、图片和网页指令始终标记为 untrusted content；
- LLM output 只能形成 proposal，经过 schema/evidence/domain/permission validation 后才能 canonical commit；
- 不允许模型直接 Verified Fact、修改 Formula、发布 Knowledge、覆盖 Human Override 或修改 Portfolio；
- tool calls 使用 allowlist、typed arguments、timeout、size、redirect 和 egress policy；
- semantic cache 不复用跨 security/period/currency/scope/cutoff/K/policy 的最终结论；
- model/task/template/tool/output contract 均版本化，但 secrets 和 hidden reasoning 不持久化或外显。

## 18. Observability、Audit 与错误分类

### 18.1 四类数据分开

- Audit：关键领域行为的不可变记录；
- Logs：运行诊断，可按 retention 清理；
- Metrics：SLO、容量、成本和质量趋势；
- Traces：一次任务跨 API/search/model/worker 的因果链路。

统一关联 `requestId/jobId/operationId/workspaceId/researchStateId/traceId`。高基数对象 ID 放 logs/traces，不默认作为 metrics labels。

### 18.2 Error Taxonomy

至少区分：

- validation；
- missing_data；
- ambiguous_identity；
- source_conflict；
- permission/data_governance；
- provider_unavailable/rate_limited；
- timeout/budget_exhausted；
- stale_dependency/incompatible_version；
- uncertain_external_outcome；
- internal_bug。

错误类别决定 retry、pause、fallback、human review 和统计；不得把供应商失败转换为公司没有数据。

## 19. API、Workflow 与 Human Override

- 外部 API/MCP 能力拆分 read/search/export/propose/approve/publish/decision/portfolio 权限；
- read/search/export 先行，write 必须 RBAC + audit + validation + object version；
- cursor pagination 使用稳定排序和明确 `asOf`；
- 大型导出异步执行，限制时间跨度、图深度、页大小和查询资源；
- webhook 使用签名、delivery ID、timestamp、replay protection 和 redaction；
- Reviewer workflow 支持 assignment/lease/due/priority/reassign/versioned submit；
- Human Override 保存 actor/time/old/new/reason/status，模型重跑不能覆盖；
- UI 必须展示 Fact/Assumption/Forecast 类型、lineage、conflict、staleness、override 和 blocking constraint。

## 20. SLO 与基础设施决策指标

进入实现前必须定义并记录基线：

- API P50/P95/P99；
- job queue wait/run/recovery time；
- database read/write/query plan；
- retrieval Recall@K/MRR/page accuracy/citation hit；
- exact financial false-positive/false-negative；
- cache sample/coverage/hit/staleness；
- Worker retry/duplicate/dead-letter；
- per-workspace concurrency/quota fairness；
- model/data/search/storage cost；
- backup RPO/RTO and verified restore time。

组件引入必须关联一个已经违反或即将违反的 SLO，并在相同 workload 下比较 before/after。没有 owner、基线、收益、降级和退出方案的组件不能进入生产依赖。

## 21. Testing 与故障注入

### 21.1 直接相关测试

每个子版本默认只运行直接相关的既有测试和新增测试。完整 UI、全量 release gate、完整 benchmark、Docker deployment/rollback 和 real-model acceptance 仍需用户明确要求。

### 21.2 必要测试类型

- schema/contract roundtrip and legacy read；
- property tests for PIT/lineage/DAG/idempotency/Decimal；
- migration mapping and reconciliation；
- tenant isolation negative tests；
- prompt-injection/tool-permission tests；
- retrieval channel ablation and cross-security contamination；
- immutable history and human override concurrency；
- backup/restore and missing blob/reference integrity；
- queue crash/retry/duplicate/poison message；
- feature flag shadow/dual/new-primary/rollback。

### 21.3 Fault Matrix

至少覆盖：

- canonical commit 前崩溃；
- commit 后、outbox publish 前崩溃；
- worker 完成后、ack 前崩溃；
- request 结果是否执行未知；
- cache/vector/reranker/MQ 全部不可用；
- blob exists/metadata missing 及其反例；
- human approval 与 background refresh 并发；
- restore 到旧时点；
- one workspace 负载、事件或权限不得影响另一个 workspace。

## 22. Backup、DR 与供应链

恢复验收必须验证：

- Research State readable；
- Fact → Evidence → Source/Blob chain 完整；
- originally reported/revision history 完整；
- Knowledge/Formula/Policy/index manifests 可解析；
- Decision Journal immutable；
- tenant isolation preserved；
- unfinished jobs safely paused/resumed；
- hashes reconcile。

数据库、对象存储、配置和版本 manifest 必须拥有一致恢复点或可验证组合。备份存在不等于恢复有效；需要定期 restore drill。

构建与发布逐步增加 dependency lock、SBOM、image scan、artifact signature、migration hash 和 Research Package signature。密钥与私有配置不得进入镜像或构建日志。

## 23. Release-by-release 迭代映射

| Release | 基础设施与数据重点 | 明确不提前做 |
|---|---|---|
| V5.3 CURRENT | 保持 Mongo/GridFS；完成 K1.0.0 治理；本文只记录未来 Gate | PostgreSQL 迁移、Redis、向量库、MQ |
| V5.4 | Source/Evidence contract；BM25/semantic/fusion benchmark；SearchIndex port；index manifest | Vector-only RAG、Verified Fact、默认独立向量库 |
| V5.5 | Identity/Fact schema；双时态；Decimal；field lineage；执行 PostgreSQL storage ADR/prototype | big-bang migration、删除 legacy observations |
| V5.6 | Formula/Calculation/Assumption/Claim；DAG；staleness；数据库可执行 invariants | 概率 Belief、Claim 代替 Evidence |
| V5.7 | Belief/Forecast/Scenario/Research State；immutable state/version manifest | Position/Decision execution、在线学习 |
| V5.8 | Event/Delta/Selective revalidation；数据库 job/lease/outbox；scheduler semantics | Event 直接改 Fact/Thesis、提前外部 MQ |
| V5.9 | Mandate/Decision；object version；audit reason；Decision Journal compatibility | 自动交易、LLM 绕过 hard constraint |
| V5.10 | Portfolio/Position/Exposure/Risk；关系投影和分析查询基线 | 微服务、图数据库、价格相关性作为唯一风险 |
| V5.11 | Snapshot/replay/provenance/failure/outcome/calibration；index/config/runtime manifests | future leakage、线上自动发布 Knowledge/Policy |
| V6.0.0–.12 | ownership inventory、workspace/RBAC/RLS、audit、classification、workflow、package/API | 先做 auth 后补隔离、暴露 secrets/CoT |
| V6.0.13 | 仅在 Gate 通过时引入 RabbitMQ/Worker；outbox/inbox/DLQ | premature microservices、broker 成为 canonical store |
| V6.0.14–.15 | tenant-safe schedules/quotas；SLO、retention、backup/restore/outage drills | 跨 workspace 触发、未验证 DR |

## 24. Feature Flag 状态模型

高风险基础设施迁移至少支持：

- `disabled`；
- `shadow`；
- `dual_read_compare`；
- `dual_write`；
- `new_primary`；
- `rollback`。

任务必须固定实际 flag/config/version snapshot。双写不等于双主；必须声明 canonical owner。关闭新路径不能删除新写数据或改变历史收据。

## 25. 降级矩阵

| Failure | Required behavior |
|---|---|
| Redis unavailable | 回源 canonical store 或关闭缓存；正确性不变 |
| Semantic index unavailable | 回退 exact/BM25/page；披露 semantic recall 降级 |
| Reranker timeout | 返回合法 fused candidates；不丢 Evidence |
| MQ unavailable | outbox 保留事件，暂停新分布式领取；canonical commit 不丢 |
| Embedding provider unavailable | 暂停新增 embedding；不生成伪向量 |
| External data unavailable | 保持 missing/stale；不改变 cutoff、不升级模型 |
| Canonical database unavailable | 停止权威写入；不得降级写缓存 |
| Blob unavailable/hash mismatch | 不发布依赖该原件的 Verified Fact |
| Migration reconciliation mismatch | 停止 cutover，继续旧 canonical read |
| Worker uncertain outcome | pause/reconcile；不盲目 replay |

## 26. 组件退出策略

每个新依赖在批准前同时定义退出路径：

- Redis：全部清空后能够回源和恢复；
- Vector index：能够从 Source/Evidence 和 index manifest 重建；
- RabbitMQ：暂停领取并 drain/outbox 后可退回数据库任务路径；
- Search engine：回退 exact/BM25/page baseline；
- Object storage：manifest 驱动迁移且 hash 不变；
- PostgreSQL：在 cutover 前可回退 Mongo canonical read；cutover 后旧库转为明确只读兼容，不形成双主；
- Provider/embedding model：旧记录保留 provider-neutral version identity，不丢 provenance。

## 27. 架构复杂度预算

任何新组件必须回答：

1. 它解决哪个已测量问题？
2. 现有组件为什么不能解决？
3. 谁负责部署、备份、升级、安全和事故？
4. 故障时如何降级？
5. 是否增加新的 canonical copy 或一致性域？
6. 如何本地开发、测试、迁移和回滚？
7. 如何验证 tenant、PIT、provenance 和 human override？
8. 何时可以删除该组件？

未能回答以上问题的组件保持 Deferred。

## 28. 待形成的 ADR / Spike

本文建议按版本创建、而不是现在提前接受：

1. **V5.5 Storage ADR**：MongoDB continuation vs PostgreSQL canonical store；
2. **V5.4 Search ADR**：BM25/semantic implementation and index lifecycle；
3. **V5.5 Blob ADR**：GridFS continuation vs object storage；
4. **V5.8 Durable Work ADR**：database lease/outbox semantics；
5. **V6.0 Cache/Live ADR**：Redis need and allowed data classes；
6. **V6.0.13 Queue ADR**：database queue vs RabbitMQ/Kafka/RocketMQ；
7. **V6.0 Tenant ADR**：workspace ownership, RLS and encryption boundaries；
8. **V6.0 DR ADR**：RPO/RTO, backup consistency and restore validation。

每个 ADR 必须引用当时实际代码、负载指标和测试证据；本文中的技术偏好不能替代该证据。

## 29. 推荐结论

- 当前继续使用 MongoDB/GridFS。
- V5.5 开始正式评估 PostgreSQL；若 Gate 通过，采用增量迁移使其逐步承担 canonical structured state。
- 语义检索在 V5.4 引入，但独立向量数据库保持 Deferred；若 PostgreSQL 被接受，优先评估 pgvector。
- Redis 不是当前依赖；V6.0 多实例环境只用于可重建缓存、限流和 live fan-out。
- V5.8 先使用数据库 job/lease/outbox；V6.0.13 只有真实负载需要时引入外部队列，默认优先评估 RabbitMQ。
- Kafka 只适合已经证明需要长期事件流、重放和多消费组的场景；RocketMQ 只在组织已有明确生态和运维能力时评估。
- 不提前引入微服务、图数据库、独立搜索集群、分析数仓、分片或 Kubernetes。
- 最优先建设双时态、不可变历史、Decimal、字段级 provenance、幂等写入、transactional outbox、tenant isolation 和 restore drill。

这条路线的目标不是使用更多基础设施，而是让每个新增组件都提高可证明的正确性、可恢复性、隔离性或容量，同时保持历史研究可解释、可回放、可回滚。
