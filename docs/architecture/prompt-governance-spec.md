# Prompt 管理与发布治理规范

状态：PROPOSAL，不激活运行时能力  
所属规划：[模型上下文与研究质量优化路线图](model-context-research-quality-evolution.md)  

## 1. 目的

本规范定义智衡生产 Prompt 的身份、组成、信任边界、生命周期、变更归属、验证、发布和回滚要求。

Prompt 管理不是新的 Knowledge 系统、模型路由系统或公开版本线。Knowledge、阶段合同、工具、输出合同、Context Compiler、Validator 和 Model Gateway 继续由现有 owner 管理。

## 2. 核心原则

- 每个生产模型调用必须有稳定 Prompt ID；
- Prompt 只引用唯一来源，不维护规则正文的平行副本；
- Prompt 的装配结果必须可确定性重建；
- 用户问题、财报、网页、附件和模型草稿均属于不可信动态数据；
- Provider 特有行为只能位于 Model Gateway adapter 后面；
- Prompt 变化不能掩盖 Knowledge、合同、工具或执行兼容性变化；
- 生产系统不能自动修改或激活 Prompt；
- 旧任务恢复时不能静默切换 Prompt 组成；
- Prompt、证据正文、隐藏推理和凭据不能进入公共遥测。

## 3. 职责边界

| Owner | 管理内容 | 不管理内容 |
| --- | --- | --- |
| Knowledge | 研究原则、Ontology、方法和专项规则 | 公司观点、当前事实、模型连接 |
| Stage Contract | Researcher、Writer、Auditor 等阶段职责 | Provider 传输和当前证据 |
| Prompt Manifest | Prompt 身份、组成、指纹、状态和影响范围 | Prompt 正文的平行副本 |
| Context Compiler | 本轮规则选择、消息装配和动态数据投影 | 事实真伪和投资结论 |
| Validator | 证据、财务、格式、完整性和交付硬约束 | 自由研究判断 |
| Model Gateway | 能力检查、调用、响应归一化和安全遥测 | 业务规则解释 |
| Platform / K-Series | 审批、激活、兼容和回滚 | 在线自动学习 |

## 4. Prompt Inventory

Prompt Inventory 应覆盖所有生产模型调用，并至少记录：

```json
{
  "promptId": "auditor-main",
  "owner": "python_backend/application/research_service.py",
  "stage": "auditor",
  "purpose": "auditor",
  "instructionSources": [],
  "knowledgeRuleIds": [],
  "toolContractIds": [],
  "outputContractVersion": 7,
  "contextVersion": 1,
  "recoveryOwner": "research-resume",
  "status": "active"
}
```

Inventory 应由程序生成或自动检查，不能依赖人工长期同步。每个生产调用必须映射一个条目，每个 active 条目必须存在实际调用 owner。

## 5. Prompt Manifest

Prompt Manifest 是派生的运行身份清单，不复制 Prompt 正文：

```json
{
  "promptId": "researcher-main",
  "stage": "researcher",
  "manifestVersion": 1,
  "status": "active",
  "knowledgeVersion": "K1.0.0",
  "ruleIds": ["KNW-EVD-001", "KNW-MIS-001"],
  "stageContractFingerprint": "opaque-hash",
  "toolContractFingerprint": "opaque-hash",
  "outputContractVersion": 7,
  "contextVersion": 1,
  "contentFingerprint": "opaque-hash"
}
```

字段要求：

- `promptId` 不包含供应商或模型名称；
- `manifestVersion` 只表示清单 Schema，不形成第三条产品版本线；
- `knowledgeVersion` 和 `ruleIds` 只能引用已激活的 K-Series 快照；
- 合同指纹来自各自 owner；
- `contentFingerprint` 对确定性组成计算，不包含动态用户或证据正文；
- `status` 不能绕过平台发布、Knowledge 激活或模型状态固定。

## 6. 类型化 PromptPlan

调用点先构造内部 `PromptPlan`，再编译为实际消息：

```json
{
  "promptId": "auditor-main",
  "stage": "auditor",
  "instructions": [
    {
      "ruleId": "KNW-MIS-001",
      "priority": "critical",
      "source": "knowledge"
    }
  ],
  "dataBlocks": [
    {
      "type": "evidence",
      "trust": "untrusted-data",
      "id": "S2:B14",
      "required": true
    }
  ],
  "toolContract": "auditor-tools-v1",
  "outputContract": 7,
  "contextVersion": 2
}
```

`PromptPlan` 不是 [Research IR](../contracts/research-ir.contract.md)、研究事实对象或持久化执行历史。近期应保持其为可重建的内部结构；持久化需要独立 Schema、隐私和恢复分析。

## 7. 信任分区

| 内容 | 信任标签 | 允许位置 |
| --- | --- | --- |
| 平台不可变原则 | `trusted-instruction` | 系统指令 |
| 已激活 Knowledge 规则 | `governed-instruction` | 系统指令或受治理规则块 |
| 阶段和输出合同 | `trusted-contract` | 系统指令、工具或 Schema |
| 用户问题 | `untrusted-input` | 动态用户消息 |
| 财报、网页和附件 | `untrusted-data` | 动态资料块 |
| 已验证工具结果 | `validated-tool-data` | 工具消息或动态资料块 |
| 模型草稿和审计回复 | `unverified-model-output` | 修复输入，不得升级为事实 |

编译器必须阻止不可信输入、资料和模型输出进入系统指令区。信任标签描述处理权限，不证明内容在财务或语义上真实。

## 8. 生命周期

```text
draft
  ↓
linted
  ↓
regression-passed
  ↓
reviewed
  ↓
active
  ↓
deprecated
```

- `draft` 仅用于开发和离线检查；
- `linted` 已通过重复、依赖、冲突、范围和隐私检查；
- `regression-passed` 已通过正向、反向和兼容测试；
- `reviewed` 已完成人工审阅；
- `active` 只能随平台发布或 K-Series 激活进入生产；
- `deprecated` 不用于新任务，旧任务按原固定恢复；
- 生产运行不能自动晋升状态。

## 9. 变更风险分级

| 等级 | 典型变化 | 最低验证要求 |
| --- | --- | --- |
| P0 表达 | 不进入请求的注释、说明或错别字 | 静态检查和文档审阅 |
| P1 装配 | 顺序、去重、动态内容位置、等价格式 | 精确 wire、指纹、缓存、恢复和六路径回归 |
| P2 行为 | 阶段职责、工具说明、规则范围、修复协议 | 正反回归、领域测试、影响分析和人工审阅 |
| P3 合同 | 输出 Schema、工具参数、上下文兼容语义 | 合同版本、迁移、回滚、检查点和集成测试 |
| P4 研究语义 | 财务、证据等级、点时、估值或置信度规则 | 领域合同/ADR、新 K 或平台发布、完整门禁和人工批准 |

风险等级由最高影响决定。P2–P4 变化不能描述成普通文字优化以降低验收要求。

## 10. 变更归属

| 变更 | Owner | 要求 |
| --- | --- | --- |
| 研究原则、定义和方法 | Knowledge | KCP、回归、人工批准和新 K 快照 |
| 阶段职责 | Stage Contract | 平台发布和兼容评估 |
| 输出字段 | Output Contract | 合同版本和迁移分析 |
| 工具参数 | Tool Owner | 工具合同和平台测试 |
| 上下文选择与消息 wire | Context Compiler | `contextVersion` 或执行兼容评估 |
| Provider 参数 | Gateway Adapter | 能力验证和适配器测试 |
| 用户问题和任务证据 | Dynamic Context | 不产生 Prompt 版本 |

## 11. 合同同源与漂移

适合结构化表达的要求由同一合同派生：

```text
正式合同
  ├─ 模型输出说明
  ├─ JSON Schema / 工具参数
  ├─ Validator
  ├─ 测试 fixture
  └─ Prompt Manifest 指纹
```

漂移检查必须发现：

- Prompt 与 Schema 字段不一致；
- Schema 和 Validator 接受范围不同但未记录；
- Validator 要求模型从未收到；
- 工具说明与参数合同不同步；
- 合同变化但 Manifest 指纹未变化；
- 合同变化后继续恢复不兼容检查点。

财务定义、证据原则和研究方法继续由 Knowledge 与领域合同管理，不能从 JSON Schema 反向生成。

## 12. 依赖与影响分析

```text
Prompt ID
  ├─ Stage Contract
  ├─ Knowledge Snapshot / Rule IDs
  ├─ Tool Contracts
  ├─ Output Contract
  ├─ Context Compiler Version
  ├─ Gateway Capability Requirements
  └─ Regression / Benchmark IDs
```

依赖变化必须列出受影响 Prompt、阶段、路径、检查点、测试、缓存身份和历史任务。该依赖只描述软件与规则组成，不实现未来的研究对象 Dependency DAG。

## 13. 发布流程

```text
失败或改进机会
→ 根因分类
→ 确认 owner
→ 影响分析
→ 修改唯一来源
→ Lint 和正反回归
→ 兼容与恢复检查
→ 人工审阅
→ 平台发布或 K-Series 激活
→ 新任务使用新身份
→ 只读观测或回滚
```

生产异常只能产生诊断或变更提案，不能自动切换 Prompt、Knowledge、模型或研究路径。

## 14. 供应链完整性

```text
受版本控制的源 / K 快照 / 合同
→ 确定性解析与选择
→ PromptPlan
→ 确定性消息编译
→ Manifest 与组成指纹
→ Model Gateway
```

- 生成物不是人工维护的第二来源；
- 源、规则、合同或编译器变化会改变对应指纹；
- 时间、机器路径和无关对象顺序不污染语义指纹；
- 指纹不包含凭据、Endpoint、用户或证据正文；
- 发布包可从固定源重建相同 Manifest；
- 生产环境不直接编辑已发布 Prompt；
- 回滚选择已有兼容组成，不覆盖历史版本或 K 快照。

## 15. 安全观测

允许的白名单聚合候选：

- Prompt ID 和不可逆组成指纹；
- stage、路径、深度和上下文版本；
- 已知 input、output、cached-input Token；
- 未返回 Token 的调用数；
- format fallback、Validator 拒绝和修复轮数；
- R0/R1 纳入与遗漏计数；
- 最终交付状态和安全错误类别。

禁止保存 PromptPlan 正文、动态资料、报告、证据、工具结果、凭据或隐藏推理。未知值保持未知。

## 16. 正式交付物

进入实现前需要明确平台发布范围，并评审：

1. Prompt Manifest Contract；
2. Prompt Invariants；
3. 生产 Prompt Inventory；
4. Prompt Governance Tests。

这些目前均为候选交付物，不是现有运行时能力。

## 17. 最小实施顺序

| 工作包 | 内容 | 行为影响 |
| --- | --- | --- |
| G0 | 只读 Inventory | 无请求变化 |
| G1 | Contract、Invariants、风险与生命周期 | 文档和测试设计 |
| G2 | 旁路生成 Manifest、PromptPlan 和指纹 | 不参与 dispatch |
| G3 | Inventory、漂移、信任和隐私测试 | 阻止不合规变更 |
| G4 | 逐阶段采用编译结果 | 受控平台发布 |
| G5 | 根因明确的语义修改 | 独立质量验收 |

G4 只有在精确 wire 或规范化语义等价、恢复和交付回归通过后才能切换。G5 不能仅凭静态哈希或合成响应宣称真实模型质量等价。

## 18. 完成定义

- Inventory 覆盖全部生产模型调用；
- 每个调用都有稳定 Prompt ID 和 owner；
- Manifest 与 PromptPlan 可确定性重建；
- 指令和不可信数据结构化分区；
- 风险、影响、兼容和回滚已记录；
- 正向、反向、漂移、隐私和恢复测试通过；
- P1 等价迁移有请求证据；
- P2–P4 有对应领域与人工验收；
- 旧任务按原固定继续或安全暂停；
- 遥测没有新增私有正文；
- 未知 Token、缓存和质量样本保持未知；
- 完成报告列明限制和延后工作。
