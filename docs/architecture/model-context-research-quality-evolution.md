# 模型上下文与研究质量优化路线图

状态：PROPOSAL，仅记录架构方向，不激活新运行时能力  
当前平台基线：V5.3 / K1.0.0  
当前模型工程基线：基础上下文裁剪能力已实施，其余能力按本文后续阶段推进  

## 1. 目标

智衡继续使用 Prompt 工程，但研究可靠性不能主要依赖更长的提示词。目标是建立由程序控制、可验证、可恢复的模型上下文系统：

1. Prompt 指导研究行为、分析重点和表达方式；
2. 程序决定模型何时工作、接收哪些上下文以及能够修改什么；
3. 证据、财务口径、计算、引用、截止日期和恢复由确定性合同约束；
4. 报告逐步成为结构化研究状态的可读视图；
5. 失败先按 owner 分类，只有 Knowledge 根因进入规则变更；
6. 生产系统不自动修改 Prompt、Knowledge 或模型策略。

## 2. 文档导航

| 文档 | 负责内容 |
| --- | --- |
| [Prompt 管理与发布治理规范](prompt-governance-spec.md) | Inventory、Manifest、PromptPlan、信任分区、生命周期、风险、发布和回滚 |
| [模型上下文优化规范](model-context-optimization-spec.md) | 阶段输入、R0–R3、稳定前缀、修复轮、调用短路、Vision 去重和效率 |
| [未来研究质量演进方向](future-research-quality-evolution.md) | 确定性报告、依赖关系、信息价值、反证、跨任务复用和离线校准 |
| [Prompt 与上下文治理验收矩阵](prompt-governance-acceptance-matrix.md) | Requirement ID、owner、当前状态、证据、进入和退出条件 |
| [模型 Token 效率方案](model-token-efficiency-proposal.md) | Token 效率优化的原始设计、目标和实施位置 |

本文只维护总体决策和执行顺序。具体要求由上表中的专项文档维护，避免重复正文产生新的漂移。

## 3. 当前基线

当前已经实现：

- 所有模型请求通过统一 Model Gateway 和 adapter；
- 八个阶段按目的配置模型并固定到任务；
- 六条研究路径使用不同工具集合；
- 高级估值工具按前置结果开放；
- 部分专项规则按路径和意图加载；
- Researcher 在完整工具轮边界安全整理上下文；
- Writer 使用独立证据与计算上下文；
- Auditor 独立复核完整报告；
- Vision 转写保持待核实；
- Token 遥测不保存 Prompt、证据正文、隐藏推理或凭据；
- V5.3 提供 Rule ID、Resolver、Compiler、Lint、回归和 K-Series 固定。

准确状态以可执行代码、测试和[当前实现地图](current-implementation-map.md)为准。

## 4. 永久边界

- 证据先于结论，缺失数据保持缺失；
- 财务数字不得由模型记忆或自由推断补齐；
- 期间、币种、股本、单位、会计范围和估值口径保持显式；
- 确定性财务数学和硬校验保留在程序中；
- 报告引用关联本次任务实际证据；
- 反证、失败、冲突和窗口遗漏不能静默消失；
- OCR/Vision 不因缓存或摘要升级为已验证事实；
- 恢复保持原市场/研究截止日、模型、Knowledge 和工具收据；
- Prompt、来源正文、隐藏推理和凭据不进入公共历史；
- 生产不根据单次失败自动修改 Knowledge、Prompt 或模型策略；
- 当前报告文本不冒充尚未实施的 Research State、Claim 或 Belief；
- 不创建平行 Evidence、模型路由、缓存或研究预算系统。

## 5. 目标关系

```text
Prompt Governance
  管理身份、来源、生命周期、影响和发布
        ↓
Context Compiler
  选择规则、任务状态、证据、工具和输出合同
        ↓
Completeness Gate
  检查必需记录、信任边界和兼容固定
        ↓
Model Gateway
  按阶段能力安全调用模型
        ↓
Validator / Error Ownership
  验证结果并路由到正确 owner
        ↓
Delivery / Controlled Repair
```

Prompt Governance 不拥有 Knowledge 正文；Context Compiler 不判断事实真伪；Model Gateway 不解释业务规则；Validator 不代替自由研究判断。

## 6. 优化层次

### 6.1 Prompt 管理

建立稳定 Prompt ID、生产 Inventory、派生 Manifest、类型化 PromptPlan、信任分区、风险分级和受控生命周期。

### 6.2 Prompt 装配

固定不可变原则、阶段合同、工具、Schema、专项规则和动态任务数据的顺序；动态内容不污染稳定前缀。

### 6.3 上下文编译

使用 R0–R3 等级选择本轮内容。R0 缺失时停止请求；已遗漏内容不能描述为已经阅读。

### 6.4 调用与修复

确定性问题由程序短路；Auditor 首轮和最终轮检查完整报告，修复轮使用受控差量包。

### 6.5 结构化研究

未来由程序生成确定性财务表格、来源和缺失清单，模型负责解释与文字。Research IR、Claim、Belief 和 Dependency DAG 仍为未来能力。

### 6.6 决策质量

未来按信息价值安排取证，强制保留反证，以客观证据特征限制置信度，并通过离线结果校准提出受治理变更。

## 7. 执行阶段

### 7.1 发布范围准备

进入条件：

- 明确所属平台发布；
- 完成当前生产调用和 owner 盘点；
- 冻结现有请求基线；
- 评估当前后端迁移的文件重叠；
- 确认兼容、恢复和回滚责任。

### 7.2 Prompt 治理基础

```text
G0 只读 Inventory
→ G1 Contract / Invariants
→ G2 Shadow Manifest / PromptPlan
→ G3 Governance Tests
→ G4 Compatible Cutover
→ G5 Governed Semantic Changes
```

G0–G3 不应改变模型请求。G4 需要精确 wire 或规范化语义等价证据。G5 需要对应风险等级的领域与人工验收。

### 7.3 后续候选

1. Auditor 和修复轮增量化；
2. 稳定前缀与缓存整理；
3. Vision 定向读取与去重；
4. 效率观测与发布验收。

这些候选项由平台发布拥有，并遵循 [ADR-017](../adr/ADR-017-platform-execution-compatibility.md)，不创建第三条发布线。

### 7.4 中期候选

- 私有上下文清单；
- 通用 R0 完整性门禁；
- 相同失败请求短路；
- 错误 owner 分类；
- Prompt 漂移和供应链检查；
- 规则与运行时 Validator 映射。

### 7.5 未来发布

只有对应发布明确激活后，才能实施：

- Research IR；
- canonical Fact / Calculation 完整合同；
- Claim、Hypothesis、Belief；
- Dependency DAG 和失效传播；
- 确定性报告渲染；
- 安全跨任务复用；
- Outcome、Calibration 和 Failure registry。

## 8. 推荐顺序

1. 明确 Prompt 治理所属平台发布和兼容边界；
2. 建立生产 Prompt Inventory 和调用映射；
3. 评审 Manifest Contract、Prompt Invariants 和测试设计；
4. 旁路生成 Manifest、PromptPlan 和指纹；
5. 完成 Auditor 修复轮差量化；
6. 整理稳定前缀、请求顺序和信任分区；
7. 增加 Vision 页级安全去重；
8. 完成按阶段效率观测和发布门禁；
9. 增加私有上下文清单和 R0 门禁；
10. 建立错误 owner 和重复调用短路；
11. 将适合的 Knowledge 规则提升为 Validator；
12. 在未来正式发布中建设结构化研究对象和报告视图；
13. 最后建设跨任务复用、结果校准和离线学习。

## 9. 总体验收

发布必须同时验证：

- Prompt Inventory 和 Manifest 完整；
- Knowledge lint 与规则回归通过；
- 请求 wire 或规范化语义符合对应风险等级；
- Evidence、财务、引用和交付校验无退化；
- 检查点与恢复保持原固定；
- 公共字段和遥测没有私有正文；
- R0、反证和缺口没有静默遗漏；
- 最终 Auditor 检查完整报告；
- Token 未知值保持未知；
- 回滚路径明确且不改写历史任务。

具体 Requirement ID 和当前状态见[验收矩阵](prompt-governance-acceptance-matrix.md)。

## 10. 版本、迁移与回滚

- 平台 V-Series 和 Knowledge K-Series 仍是两条公开版本线；
- Prompt Manifest 版本只表示清单 Schema；
- 新上下文算法使用任务私有固定；
- 旧任务继续历史路径，不回填、不重写；
- 请求 wire、检查点或恢复语义变化时评估执行兼容性；
- 回滚停止创建新格式任务；
- 活动任务由兼容代码完成或安全暂停；
- 不覆盖 K 快照、历史证据、计算、报告或检查点。

## 11. 安全与隐私

- PromptPlan、Prompt、证据、工具结果、报告、隐藏推理和凭据不进入公共遥测；
- 安全清单只记录白名单身份、哈希、计数和完整性状态；
- 哈希不是访问控制；
- 不可信数据不能进入系统指令区；
- Provider 特有行为只在 adapter；
- 跨任务复用不能绕过权限、来源和点时检查；
- 人工覆盖不能被后续模型静默替换。

## 12. 不采用方向

- 使用更长的万能 Prompt 代替阶段合同；
- 用模型摘要替代关键财务原文；
- 用向量相似度作为财务事实来源；
- 生产模型自动重写或激活 Prompt；
- 因数据缺失或供应商故障升级更强模型；
- 为节省 Token 跳过 Auditor 或裁剪 R0；
- 默认引入多 Agent 群或分布式基础设施；
- 建立平行 Evidence、Claim 或缓存系统；
- 复用旧报告结论作为新任务事实。

## 13. 已知限制

- 上下文完整不等于模型理解正确；
- 离线测试不能证明真实模型语言质量完全相同；
- 供应商 Token 和缓存观测可能缺失；
- 字符数不是 Token 数；
- 反证语义完整性不能由简单结构检查完全证明；
- canonical Research State、Claim、Belief 和 Dependency DAG 尚未实现；
- 完整历史 point-in-time 执行仍有既有边界；
- 跨任务复用带来权限、重述和时间风险；
- 达到质量与成本平衡后应停止压缩关键上下文。

## 14. 最终责任边界

```text
模型负责：
理解问题、提出解释、分析风险、比较假设、撰写文字

程序负责：
证据身份、事实状态、财务口径、确定性计算、来源关系、
截止日期、缺失状态、上下文完整性、变化影响、校验与恢复

人负责：
规则审批、重大冲突、模型质量验收、投资判断与行动决定
```

衡量优化是否成功，应优先看事实错误是否下降、必要证据是否完整、缺口是否更早暴露、报告是否更容易复核，以及恢复是否保持原研究语义。Token 和缓存是效率指标，不能取代研究质量门槛。
