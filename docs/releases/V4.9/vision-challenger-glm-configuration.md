# V4.9 候选视觉模型配置更新

2026-09-11，按用户明确要求，将 `LLM_VISION_CHALLENGER_MODEL` 设为 `glm-5.3-flash`。本次仅选择候选模型名称，不构成图像能力认证或真实质量验收。

| 工程记录 | 结果 |
|---|---|
| 1. Release | V4.9 候选配置 |
| 2. 修改文件 | .env、.env.production、.env.example、.env.production.example、MANIFEST.json |
| 3. 新增文件 | 本报告；artifacts/v4-9-glm-challenger-baseline.log、artifacts/v4-9-glm-challenger-tests.log 本地验证日志 |
| 4. 删除文件 | 无 |
| 5. 架构变化 | 无；使用现有 Catalog |
| 6. Schema | 无 |
| 7. 迁移 | 无 |
| 8. 环境变化 | 四份环境文件仅设置 LLM_VISION_CHALLENGER_MODEL=glm-5.3-flash；真实环境原先没有此键，本次新增 |
| 9. 兼容影响 | 保存后的环境配置供下次进程加载；未重启或部署；其他环境键值逐一比对保持一致 |
| 10. Resume／Recovery | 历史任务与产物不改写；候选配置绑定改变时，旧候选验收与比较续跑仍须通过原校验 |
| 11. Feature flags | 未修改路由开关和 INPUT；示例继续 false／off |
| 12. 测试 | 修改前 Catalog／challenger；修改后 Catalog／challenger／policy／capability，另执行配置解析与字段保持检查 |
| 13. 结果 | 修改前 18/18；修改后 24/24；四份配置均解析为指定候选名称，其他键值保持 |
| 14. Benchmark | 纯配置修改，无新增基准；没有执行真实模型请求 |
| 15. 安全／隐私 | 未输出或更改密钥；未自动复用其他模型的服务连接 |
| 16. 回滚 | 两份示例将该值清空；真实环境移除本次新增的该键；下次加载生效 |
| 17. 已知限制 | 名称不证明服务支持图片；连接、图片能力声明、真实对照和审核仍需满足现有准入规则 |
| 18. 延期 | 真实模型质量验收与生产晋升仍未完成；没有扩展版本范围 |
