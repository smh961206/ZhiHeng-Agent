# 模型上下文优化规范

状态：PROPOSAL；已实施部分以现有代码、测试和当前实现地图为准  
所属规划：[模型上下文与研究质量优化路线图](model-context-research-quality-evolution.md)  
相关方案：[模型 Token 效率优化](model-token-efficiency-proposal.md)  

## 1. 目标

在不削弱证据、计算、缺口、反证、独立审计和恢复的前提下，减少模型重复接收的规则、原文、工具记录和修复历史。

本规范不建立研究 Token 预算，不因成本降低研究质量，也不创建第二套 Evidence、缓存、模型路由或研究状态系统。

## 2. 当前基线

- 六路径工具集与前置工具开放已实现；
- 股东规则按相关路径和意图加载已实现；
- Quick、Standard、Deep 安全整理已实现；
- 未完成工具调用禁止整理已实现；
- Writer 独立证据/计算上下文和完整性收据已实现；
- `modelState.contextVersion=1` 已用于新 modelState-v4 任务；
- Auditor 修复轮差量化、稳定前缀、Vision 去重和完整效率验收仍待后续迭代。

准确状态以可执行代码、测试和[当前实现地图](current-implementation-map.md)为准。

## 3. 阶段输入原则

| 阶段 | 主要输入 | 不应重复输入 |
| --- | --- | --- |
| Input | 问题与必要证券候选 | 财报正文、研究历史、后续工具 |
| Vision | 当前页、区域和读取指令 | 整份研究对话 |
| Researcher | 稳定规则、任务状态、当前证据、工具收据 | 所有旧工具消息 |
| Evidence Verifier | 未解决检查、关联原文和计算 | 无关来源 |
| Writer | 初稿、实际引用、成功计算、反证和缺口 | Researcher 完整历史 |
| Auditor | 完整报告、R0、缺口和定向证据 | Researcher 对话历史 |
| Critical Reviewer / Judge | 完整独立上下文 | 摘要替代的关键证据 |

## 4. 上下文等级

| 等级 | 内容 | 行为 |
| --- | --- | --- |
| R0 | 报告引用、计算依据、关键反证、未解决缺口 | 必须完整纳入；缺失则停止请求 |
| R1 | 当前步骤或错误直接关联的证据和工具 | 优先完整纳入 |
| R2 | 辅助背景、未引用的有效计算 | 有空间时纳入 |
| R3 | 其他来源与工具 | 仅安全目录和稳定编号 |

要求：

- 按 `sourceId + blockId` 与 `toolCallId` 去重；
- R0 在发送前完成完整性预检；
- 多公司研究按来源轮转；
- 表格、JSON 和工具结果不能任意截断；
- R1/R2 遗漏进入明确 omission 清单；
- 模型只按稳定编号请求重新加载；
- 任何遗漏都不能被描述为已经阅读或验证。

## 5. 调用前上下文清单

```json
{
  "contextVersion": 2,
  "stage": "auditor",
  "knowledgeVersion": "K1.0.0",
  "knowledgeFingerprint": "opaque-hash",
  "promptId": "auditor-main",
  "requiredEvidence": ["S2:B14"],
  "includedEvidence": ["S2:B14"],
  "requiredTools": ["call-123"],
  "includedTools": ["call-123"],
  "unresolvedGaps": ["F2", "G1"],
  "requiredComplete": true,
  "serializedCharacters": 28340
}
```

清单只保存稳定身份、计数和完整性状态，不保存 Prompt、证据、报告、工具结果或隐藏推理。

## 6. Researcher 即时上下文

当前公开研究步骤决定 R1 内容。每个完整工具轮后，旧消息可以投影为：

- 用户问题、路径、截止日和公开计划；
- 来源安全目录；
- 已完成步骤收据；
- 当前步骤的完整证据；
- 相关成功工具结果；
- 仍未解决的失败、冲突和缺口。

完整私有检查点继续保留恢复需要的消息和工具状态。存在未返回工具调用时禁止整理。

## 7. Writer 上下文

Writer 必须接收：

- Researcher 草稿；
- 草稿实际引用的完整证据块；
- 成功计算和指定依据；
- 与结论相反的有效证据；
- 数据覆盖、截止日和缺失清单；
- 报告结构和交付规则；
- 上下文完整性收据。

初稿引用没有进入 Writer 上下文时停止调用，不能让 Writer 在缺证据时继续润色。

## 8. Auditor 与修复轮

首轮 Auditor 必须看到完整报告和全部 R0。修复轮仅增加：

```json
{
  "repairVersion": 1,
  "baseDraftHash": "opaque-hash",
  "validationErrors": [],
  "changedSections": [],
  "newEvidence": [],
  "affectedToolReceipts": [],
  "unresolvedGapIds": []
}
```

每轮继续运行完整确定性校验。最终 Auditor 必须检查完整最终报告，不能只检查差异。

## 9. 确定性短路

- 引用不存在：拒绝交付；
- R0 缺失：不发送模型请求；
- 计算 basis 不一致：退回计算输入；
- 相同失败请求且状态没有变化：阻止重复调用；
- 报告与证据均未变化：不重复审计；
- 只需确定性表格重排：重新渲染；
- Vision 身份完全一致：复用原转写；
- 未知 Token：保持未知。

## 10. 稳定前缀

```text
固定系统原则
→ 阶段合同
→ 固定工具定义
→ 固定输出 Schema
→ 稳定适用规则
→ 动态任务状态
→ 动态证据与工具收据
```

动态日期、证券、问题和证据不能进入稳定前缀。缓存身份绑定模型连接、Prompt 组成、工具、Schema、Knowledge 和上下文版本。

## 11. Vision 去重

建议身份：

```text
sourceId + page + region/crop + decodedImageHash + instructionVersion
```

只有完全一致时才能复用。原生文本足够时不调用 Vision；扫描、版面、图表、脚注或关键数字歧义才定向读取。复用不改变 `unverified / needsReview`。

## 12. 错误所有者

| 根因 | Owner |
| --- | --- |
| Data | 数据覆盖或来源 owner |
| Retrieval | Evidence 检索和原页读取 |
| Tool / Calculation | 确定性工具 |
| Model / Format | Gateway 或当前阶段 |
| Knowledge | KCP、Lint、回归和 K 快照 |
| Runtime / Recovery | 执行与检查点 |
| Point-in-time / Provenance | 截止日期与来源关系 |
| Unknown | 失败样本，暂不修改 |

## 13. 效率指标

- 每份已验证交付输入 Token 中位数降低至少 30%；
- Writer 输入降低至少 40%；
- Auditor 输入降低至少 35%；
- Researcher 输入降低至少 25%；
- P95 总 Token 增长不超过 5%；
- 调用次数、失败率和重试次数不增加；
- 未知 Token 和缓存值保持未知；
- 引用、财务口径和交付通过率不下降。

这些是发布目标，不是当前实测结论。字符数不是 Token 数。

## 14. 硬性门禁

- R0、反证和缺口不得遗漏；
- 缺口不能在没有新证据或人工决定时减少；
- OCR/Vision 不得升级为已验证事实；
- 最终 Auditor 必须看到完整报告；
- 恢复不得重复执行已完成工具或不安全重放模型调用；
- 研究截止日不得更新；
- 公共接口不得泄露 Prompt、证据、工具结果、隐藏推理或密钥。

## 15. 兼容与回滚

- 新上下文算法使用新的私有固定；
- 旧任务缺失固定时继续历史路径；
- 不回填历史任务；
- 不修改旧固定强行兼容；
- 活动新任务由兼容代码完成或安全暂停；
- 回滚停止创建新算法任务，不删除检查点或历史记录；
- 请求 wire、检查点或恢复语义变化必须按 ADR-017 评估。
