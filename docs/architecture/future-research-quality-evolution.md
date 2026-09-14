# 未来研究质量演进方向

状态：FUTURE PROPOSAL，不属于当前 V5.3 实施范围  
所属规划：[模型上下文与研究质量优化路线图](model-context-research-quality-evolution.md)  

## 1. 边界

本文描述 Prompt 和上下文优化成熟后的长期方向。Research IR、canonical Fact、Claim、Hypothesis、Belief、Dependency DAG、Outcome、Failure registry 和完整离线学习均按现有合同保持 FUTURE 或 PARTIAL。

本文不授权实现持久化对象、Schema、迁移、自动学习或跨任务复用。

## 2. 目标运行关系

```text
原始来源
→ Evidence
→ Verified / Derived Facts
→ Deterministic Calculations
→ Claims / Counter-evidence
→ Assumptions / Forecasts
→ Valuation / Decision
→ Outcome / Calibration
```

各层必须保持不同语义，不能因为展示方便合并为自由文本。

## 3. 确定性报告装配

长期目标：

- 程序生成财务数字表、来源表、计算表和缺失清单；
- 模型撰写业务解释、风险、竞争性解释和判断边界；
- 模型不能修改已验证的确定性数值；
- 报告是结构化研究状态的可读视图。

未来候选字段示例：

```json
{
  "metric": "revenue",
  "period": "2025FY",
  "value": 1250000000,
  "currency": "CNY",
  "unit": "yuan",
  "accountingScope": "consolidated",
  "sourceId": "S3",
  "blockId": "B17",
  "verification": "verified"
}
```

正式字段必须由对应领域合同和发布定义，不能从本示例直接实现。

## 4. 章节级修复

Writer 后续修复可以返回受控补丁：

```json
{
  "baseDraftHash": "opaque-hash",
  "replacements": [
    {
      "sectionId": "valuation",
      "reason": "币种口径已修正",
      "markdown": "更新后的章节"
    }
  ]
}
```

程序验证基线、修改范围、引用和计算，重新装配完整报告，再交给最终 Auditor。

## 5. 变化影响

依赖关系成熟后，上游变化使下游进入 `needs_revalidation`：

```text
Evidence revision
→ Fact stale
→ Calculation stale
→ Claim needs review
→ Forecast / Valuation invalidated
→ Decision needs reassessment
```

历史 originally-reported 数据不能被重述数据覆盖。旧研究继续保留原时点依赖。

## 6. 信息价值取证

每个待核实问题未来可描述：

- 影响的判断；
- 财务重要性；
- 当前证据和反证覆盖；
- 合法来源；
- 解决或停止条件。

优先处理可能改变核心判断、估值输入或证据强度的问题。排序不能降低强制证据要求，也不能因成本把必要研究标记为完成。

## 7. 反证优先

每个核心判断至少保留：

- 支持证据；
- 反对证据；
- 未解决问题；
- 可证伪条件。

没有找到反证只表示覆盖不足，不证明反证不存在。

## 8. 客观置信度

未来置信度上限可由以下客观特征决定：

- 官方原文覆盖；
- 原数核对；
- 计算来源完整性；
- 期间与口径缺口；
- OCR/Vision 依赖；
- 未解决冲突；
- 假设数量和敏感性。

模型解释限制，程序约束上限。canonical Belief 未实施前，展示评分不能声明为正式 Belief。

## 9. 安全跨任务复用

候选兼容条件：

```text
source hash
+ publishedAt <= research cutoff
+ financial period
+ originally-reported / restated version
+ currency and accounting scope
+ evidence block identity
+ access permission
```

优先复用原始证据和确定性计算收据，不复用旧报告结论作为事实。向量相似度只能帮助定位，不能授权复用或成为财务真相来源。

## 10. 结果校准

未来可将当时明确记录的预测条件与后来观察对照：

```json
{
  "originalCutoff": "2026-06-30",
  "forecast": "库存周转继续恶化",
  "conditions": [],
  "laterObservation": {},
  "outcome": "supported | contradicted | inconclusive",
  "failureCause": "evidence | assumption | calculation | model | unknown"
}
```

后来观察不能回写成原研究时点已经知道的事实。

## 11. 离线学习

```text
Decision
→ Outcome
→ Attribution
→ Calibration
→ Failure Analysis
→ Knowledge / Policy Proposal
→ Benchmark
→ Human Approval
→ New Version
```

生产不在线修改 Knowledge、Prompt 或模型策略。

## 12. 实施前置条件

- 当前 Prompt Inventory 和治理基础完成；
- 上下文 R0 完整性和恢复固定稳定；
- Evidence 与 Calculation 正式合同达到对应发布要求；
- Research IR 所属发布明确激活；
- Schema、迁移、回滚、点时和溯源分析完成；
- 不创建平行 Evidence、Claim 或研究状态系统；
- 有领域回归和人工验收。
