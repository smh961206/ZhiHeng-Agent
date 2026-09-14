# Python 独立复核、预算与视觉质量同步

状态：Implemented。适用 Platform V5.3 / Knowledge K1.0.0。

本次同步恢复与研究质量、安全恢复和用量控制直接相关的 Node 契约，同时明确不恢复旧模型治理。明确剔除的范围包括 Champion/Challenger、A/B 实验、漂移检测、研究复杂度路由、任务分类、自动晋级和检查点模型升级。

## 已同步能力

- Critical Reviewer：仅在非日常模式、没有证据缺口、证据完整且普通审计连续出现两次可分类的格式或语义失败时准入。
- Judge：仅处理两个已完成、同主体和同财务口径的重大相反结论；只能选择原结论或返回证据不足。
- 独立调用恢复：调用前保存固定模型身份和净化后的输入；未确认、拒绝或配置变化的会话不得自动重放。
- 研究预算：可按模型费用、工具轮次、网页请求、Vision 页数和持续时间记录或阻断；未知费用保持未知。
- Vision 质量：确定性比较表格数值、单位、日期、结构、符号、脚注、关系和缺失值，输出只用于离线评测。
- 配置与运行边界：拒绝未知模型字段、配置中的密钥、非有限质量值、非法优先级、窗口和币种；独立复核禁止流式调用和候选重放。

## 状态与兼容性

`budgetState` 和 `flagshipState` 都是私有、additive 状态。旧任务缺少字段时维持关闭行为，不做回填。新状态通过原有 `jobs`/GridFS 记录保存，不新增集合或索引。公共费用接口只返回聚合账本，不返回提示词、原始资料、连接地址、连接哈希、密钥或隐藏推理。

## 配置

预算默认关闭。设置 `RESEARCH_BUDGET_FILE` 后，使用 `RESEARCH_BUDGET_MODE=dry-run` 观察资源分布，核对后才切换到 `enforce`。Critical Reviewer 和 Judge 由模型 schema v2 的同名 pipeline 阶段配置；空数组表示关闭。

## 验证

相关验证位于 `python_tests/test_independent_review.py`、`python_tests/test_judge.py`、`python_tests/test_research_budget.py`、`python_tests/test_vision_quality.py`、`python_tests/test_model_gateway.py` 和研究恢复测试。验证不调用真实模型。
