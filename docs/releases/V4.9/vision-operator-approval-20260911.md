# V4.9 真实视觉质量验收正式批准

用户在本任务中明确回复“批准”，确认第九批次验收报告。正式批准于 2026-09-11T10:13:56.255Z 记录，批准人为本任务用户，Codex 仅代为落盘，不冒用姓名或独立签名。

基线 deepseek-flash 与候选 glm-5.3-flash 均 48/48 通过。正式文件 artifacts/vision-acceptance-glm53-fields-20260911-approved.json 保留完整原始 comparison，仅填写批准字段：approvedBy、approvedAt、visualReviewPassed=true、rollbackVerified=true。报告哈希为 8d0bf01699843e4d98664682e6590619ae3eefe917dcb7732acb53585afa0895。

按当前真实配置重新执行准入检查，结果 accepted=true、reasons=[]。使用正式文件在隔离进程中打开开关，正确选中 candidate；实际配置 FEATURE_VISION_ROUTING=false，仍选中 legacy。正式批准完成，生产启用未执行；未来启用需将该文件配置为 VISION_ACCEPTANCE_FILE，并确保部署代码和配置仍与批准绑定一致。

原始比较、技术审核、失败／中断批次和未批准草稿全部保留。历史技术审核中的 operatorApproval=false 反映当时状态，不改写为事后批准。用户批准出处、时间、文件哈希和检查结果见 artifacts/vision-operator-approval-20260911.json。完整实测结果与限制见 [复验报告](vision-header-constraints-review-20260911.md)。

## 工程记录

| 项目 | 结果 |
|---|---|
| 1. Release | V4.9 真实视觉质量验收正式批准 |
| 2. 修改文件 | V4.9 README、DETAILED_INDEX、benchmark、runbook、复验报告、V4.9.8 状态、MANIFEST.json |
| 3. 新增文件 | 本记录；正式批准 JSON；用户批准与检查回执 JSON |
| 4. 删除文件 | 无 |
| 5. 架构变化 | 无 |
| 6. Schema | 无；使用既有 comparison／approval 格式 |
| 7. 迁移 | 无 |
| 8. 环境 | 未修改真实或示例环境文件；批准文件尚未安装为生产路径 |
| 9. 兼容 | 仅适用于所记录的语料、模型、配置和代码绑定；后续相关变化会使准入失效 |
| 10. Resume／Recovery | 未改动研究任务或检查点；保持已验证的旧 pin／回滚暂停行为 |
| 11. Feature flags | FEATURE_VISION_ROUTING 保持 false |
| 12. 测试执行 | 报告与技术审核哈希核对、正式文件回读、当前配置准入、隔离启用与实际关闭检查、文档／inventory 检查 |
| 13. 测试结果 | 正式准入 accepted=true、无拒绝原因；隔离 candidate／实际 legacy；文档与 inventory 14/14 通过，git diff --check 通过；日志 artifacts/v4-9-operator-approval-checks.log |
| 14. Benchmark | 沿用批准的 48/48 双侧结果；本次新增模型调用 0 次 |
| 15. 安全／隐私 | 未写入密钥、原图或隐藏推理；批准主体来自本任务用户明确授权；无外部消息发送 |
| 16. 回滚路径 | 继续保持开关关闭；未来回滚关闭开关即可，保留批准与历史证据 |
| 17. 已知限制 | 冻结合成语料的质量验收，不代表所有真实财报或长期零错误；生产激活是独立操作 |
| 18. 后续工作 | 生产启用及部署核验尚未执行；不进入 V5.0 |
