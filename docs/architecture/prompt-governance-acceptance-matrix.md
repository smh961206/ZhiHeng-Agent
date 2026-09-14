# Prompt 与上下文治理验收矩阵

状态：IMPLEMENTED BASELINE；CURRENT 仅指下表明确标记并有代码/测试证据的范围  
所属规划：[模型上下文与研究质量优化路线图](model-context-research-quality-evolution.md)  

## 1. 状态定义

- `CURRENT`：当前代码和测试已有明确实现证据；
- `PARTIAL`：存在局部实现，尚未满足完整要求；
- `PROPOSED`：本文规划候选，未实施；
- `FUTURE`：受现有合同或发布边界保留为未来能力。

状态必须根据当前执行代码和测试更新，不能仅根据本文变更。

## 2. Prompt 管理要求

| ID | 要求 | Owner | 当前状态 | 当前/候选证据 | 目标工作包 |
| --- | --- | --- | --- | --- | --- |
| PMG-001 | 每个生产模型调用具有稳定 Prompt ID | Prompt Governance | CURRENT | `prompt_governance.py`、Inventory 测试 | G0 |
| PMG-002 | 每个 active Prompt 映射实际调用 owner | Prompt Governance | CURRENT | 9 项 Inventory 覆盖 8 个 Gateway purpose | G0/G3 |
| PMG-003 | Manifest 不复制 Prompt 正文 | Prompt Governance | CURRENT | Manifest Contract、隐私测试 | G1 |
| PMG-004 | PromptPlan 可确定性重建 | Context Compiler | CURRENT | 冻结定义、深拷贝消息、稳定指纹 | G2 |
| PMG-005 | 不可信数据不能进入系统指令区 | Context Compiler | CURRENT | 用户、证据、文档保持 user message | G2/G3 |
| PMG-006 | Prompt 生命周期不能由生产自动晋升 | Platform/K-Series | CURRENT | 发布清单固化 lifecycle；运行时无晋升写路径 | G1/G3 |
| PMG-007 | Prompt 变化按 P0–P4 风险分级 | Governance | CURRENT | 每项定义含 `risk_class` | G1 |
| PMG-008 | 合同变化触发 Prompt 影响分析 | Governance | CURRENT | 每项定义声明 `dependencies` | G2/G3 |
| PMG-009 | deprecated Prompt 不用于新任务 | Prompt Governance | CURRENT | 编译器只接受 active 定义 | G3 |
| PMG-010 | Provider 特有行为不进入业务 Prompt owner | Model Gateway | CURRENT | `python_backend/infrastructure/model_adapter.py`、Gateway 边界测试 | 持续门禁 |
| PMG-011 | 生产环境不直接编辑已发布 Prompt | Release | CURRENT | 定义随代码/清单发布，无生产写入口 | G1/G3 |
| PMG-012 | Prompt 观测不能自动切换策略 | Telemetry/Governance | CURRENT | 只读 `promptContext`/`promptEfficiency`，无切换路径 | G3 |

## 3. 上下文要求

| ID | 要求 | Owner | 当前状态 | 当前/候选证据 | 目标工作包 |
| --- | --- | --- | --- | --- | --- |
| CTX-001 | 六路径只加载适用工具 | Agent | CURRENT | `CalculationService.mode_names` 与测试 | 已实施 |
| CTX-002 | 高级工具只在前置结果后开放 | Agent | CURRENT | DCF 敏感性与估值复核依赖校验 | 已实施 |
| CTX-003 | 股东详细规则按路径或意图加载 | Agent/Knowledge | CURRENT | `KnowledgeSession.context_for_mode` | 已实施 |
| CTX-004 | 未完成工具调用存在时禁止整理 | Agent Execution | CURRENT | Python 采用先完成结构化计划与同步确定性计算、后启动 Writer 的阶段边界 | 已实施 |
| CTX-005 | Writer 使用独立上下文和完整性收据 | Research Context | CURRENT | `ResearchContextCompiler` 与上下文回执测试 | 已实施 |
| CTX-006 | R0 缺失时禁止发送模型请求 | Research Context | CURRENT（计算证据） | 确定性计算引用缺失或被裁剪时编译失败；通用 Research IR 仍 FUTURE | 已实施边界 |
| CTX-007 | R0/R1/R2/R3 使用统一投影 | Research Context | PROPOSED | 上下文规范 | 后续 Context |
| CTX-008 | 多公司资料按来源轮转 | Research Context | CURRENT | `ResearchContextCompiler._round_robin` | 持续门禁 |
| CTX-009 | 工具和证据记录不被任意截断 | Research Context | CURRENT | 完整记录保存在检查点；模型窗口裁剪另存包含/排除回执 | 持续门禁 |
| CTX-010 | 动态任务内容不污染稳定前缀 | Context Compiler | CURRENT | 系统规则与动态 user message 分离，现有前缀缓存测试 | G2 |
| CTX-011 | 相同失败请求无状态变化时短路 | Agent/Recovery | PROPOSED | 短路方案 | 后续 Context |
| CTX-012 | 未纳入窗口不能描述为已读 | Agent/Review | CURRENT | 上下文回执、Writer 输入和审计证据使用同一证据子集 | 持续门禁 |

## 4. 审计与修复要求

| ID | 要求 | Owner | 当前状态 | 当前/候选证据 | 目标工作包 |
| --- | --- | --- | --- | --- | --- |
| AUD-001 | 正式交付必须通过当前审计和 Validator | Research Output | CURRENT | INV-RES-001、`domain/review.py::validate_review` | 持续门禁 |
| AUD-002 | 最终 Auditor 收到完整最终报告 | Agent | CURRENT | 当前 review messages | 持续门禁 |
| AUD-003 | 修复轮使用差量错误和新增证据 | Agent | PARTIAL | 原请求 + 最新失败结果 + 差量错误；运行中不注入新增证据 | 后续 Research IR |
| AUD-004 | 每轮修复后运行完整确定性校验 | Research Output | CURRENT | 当前 repair/validation loop | 后续阶段保持 |
| AUD-005 | 缺口不得无依据减少 | Review/Followup | CURRENT | F/G 缺口和审计规则 | 持续门禁 |
| AUD-006 | 章节补丁不能修改未授权章节 | Future Report View | FUTURE | 依赖结构化报告视图 | 后续发布 |

## 5. 安全与隐私要求

| ID | 要求 | Owner | 当前状态 | 当前/候选证据 | 目标工作包 |
| --- | --- | --- | --- | --- | --- |
| SEC-001 | ModelCall 不保存 Prompt 正文 | Model Telemetry | CURRENT | Model invariants、telemetry tests | 持续门禁 |
| SEC-002 | 隐藏推理不进入公共输出 | Gateway/Public Filters | CURRENT | INV-MDL-006 | 持续门禁 |
| SEC-003 | 财报和网页命令不能覆盖系统规则 | Agent/Vision | CURRENT | 信任分类 + system/user 角色边界 | G2/G3 |
| SEC-004 | Prompt 指纹不包含动态私有正文 | Prompt Governance | CURRENT | Manifest 指纹只覆盖定义元数据 | G1/G3 |
| SEC-005 | 跨任务复用必须验证权限和点时 | Future Research State | FUTURE | 未来方案 | 后续发布 |
| SEC-006 | Provider 参数仅位于 adapter | Model Gateway | CURRENT | Gateway/adapter 架构测试 | 持续门禁 |

## 6. 恢复与兼容要求

| ID | 要求 | Owner | 当前状态 | 当前/候选证据 | 目标工作包 |
| --- | --- | --- | --- | --- | --- |
| REC-001 | 新任务固定上下文算法版本 | Model State | CURRENT | `contextReceipt.version=2` 与 Prompt 遥测 | 已实施 |
| REC-002 | 旧任务继续兼容上下文路径 | Model State/Resume | CURRENT | 当前迁移与恢复测试 | 持续门禁 |
| REC-003 | 恢复保持原市场和研究截止日 | Research Resume | CURRENT/PARTIAL | INV-RES-004、INV-PIT-003；全局 PIT 仍有限制 | 持续门禁 |
| REC-004 | 不能修改固定值强行兼容 | Research Resume | CURRENT | ADR-017、兼容校验 | 持续门禁 |
| REC-005 | Prompt 组成变化进入兼容评估 | Prompt Governance | CURRENT | 新任务固定 `promptState` Inventory 指纹与版本 | G1/G3 |
| REC-006 | 新格式活动任务由兼容代码完成或暂停 | Platform Operations | CURRENT | 恢复时不兼容 Prompt 清单显式失败；回滚手册已记录 | G4 |

## 7. Knowledge 与规则要求

| ID | 要求 | Owner | 当前状态 | 当前/候选证据 | 目标工作包 |
| --- | --- | --- | --- | --- | --- |
| KNW-001 | Prompt 只引用已激活 K-Series 规则 | Knowledge | CURRENT | ADR-016、K1.0.0 pin | 持续门禁 |
| KNW-002 | Rule ID 唯一且依赖无环 | Knowledge Linter | CURRENT | V5.3 tests | 持续门禁 |
| KNW-003 | Critical 规则关联回归 | Knowledge Governance | CURRENT | V5.3 regression mapping | 持续门禁 |
| KNW-004 | 非 Knowledge 根因不能提交 KCP | Knowledge Governance | CURRENT | `validateKnowledgeChangeProposal` | 持续门禁 |
| KNW-005 | 规则删除或缩短有变异证据 | Knowledge/Prompt Tests | PROPOSED | 变异测试候选 | G3 |
| KNW-006 | Knowledge 不保存当前公司观点 | Knowledge | CURRENT | ADR-008 | 持续门禁 |

## 8. 未来研究对象边界

| ID | 要求 | 当前状态 | 边界 |
| --- | --- | --- | --- |
| FUT-001 | Research IR | FUTURE | V5.7+ 明确发布后才能实现 |
| FUT-002 | Canonical Claim/Hypothesis/Belief | FUTURE | 不能由 Prompt Manifest 替代 |
| FUT-003 | Dependency DAG 与失效传播 | FUTURE | 不能由 Prompt 依赖图冒充 |
| FUT-004 | 安全跨任务研究复用 | FUTURE | 需权限、点时、重述和迁移设计 |
| FUT-005 | Outcome/Calibration/Failure registry | FUTURE | 只允许离线治理式学习 |

## 9. Prompt 治理进入条件

- 所属平台发布和范围明确；
- 当前生产 Prompt Inventory 完成；
- 调用 owner 和职责确认；
- 当前请求 wire 指纹基线冻结；
- 恢复和检查点行为有测试；
- 当前后端迁移的重叠文件风险已评估；
- 不需要改写历史研究记录；
- 回滚路径明确。

## 10. G0 退出条件

- 生产调用覆盖率 100%；
- 没有无法解释的模型调用；
- 每个调用有 Prompt ID、阶段、来源、工具、输出合同和恢复 owner；
- Inventory 可自动生成或检查；
- Inventory 不包含密钥、Endpoint、Prompt 或证据正文；
- 运行时请求保持不变；
- 完成报告列出发现的冲突和延后工作。

## 11. 总体验收

发布必须同时通过：

1. Prompt Inventory 与 Manifest 完整性；
2. Knowledge lint 与规则回归；
3. 精确 wire 或规范化语义比较；
4. Evidence、财务、引用和交付验证；
5. 检查点与恢复测试；
6. 隐私与公共字段检查；
7. 相关阶段 Token、失败和修复观测；
8. 对应风险级别的人工审阅；
9. 明确回滚演练或可执行路径。
