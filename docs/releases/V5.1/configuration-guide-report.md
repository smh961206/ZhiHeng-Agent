# 费用与预算配置说明维护记录

用户请求：为截图中的四个环境变量和两个 JSON 示例提供说明与指导。本次只完善文档与公开模板注释；检查时 CURRENT 已由其他工作切换为 V5.2，本次保留该指针和其他正在进行的实现。

入口：[当前费用与缓存记录教程](../../cost-configuration-guide.md)、[config 目录说明](../../../config/README.md)。

| 交付项 | 结果 |
| --- | --- |
| 1. Release/subrelease | V5.1 配置说明维护；不激活、实现或回退其他发布 |
| 2. Modified files | `.env.example`、`.env.production.example`、`docs/configuration-guide.md`、`docs/releases/V5.1/runbook.md`、`MANIFEST.json` |
| 3. New files | `config/README.md`、当时的 `docs/cost-budget-configuration-guide.md`（现由 `docs/cost-configuration-guide.md` 取代）、本报告 |
| 4. Removed files | 无 |
| 5. Architecture changes | 无；说明根据当前定价、预算、Catalog、Gateway 与配置所有者核对 |
| 6. Schema changes | 无；JSON 示例保持原内容，新增指南解释严格字段要求 |
| 7. Migrations | 无 |
| 8. Environment changes | 无实际环境修改；公开模板仅加注释，路径仍为空，开关仍为 false |
| 9. Compatibility impact | 无运行时行为变化；保留两个示例文件原有结构与默认值 |
| 10. Resume/recovery impact | 无代码变化；教程明确固定旧预算、原截止日和不确定请求暂停机制 |
| 11. Feature flags | 无启用；明确成本路由 true 也只做演练，预算 true 须配合文件且只决定新任务模式 |
| 12. Tests executed | 指南四个 JSON 片段用真实校验器核对；两段只读代码使用公开样例执行；检查模板键值/重复键及文档文件链接 |
| 13. Test results | 全部通过：4 个 JSON 片段、2 段命令、3 个默认角色身份、2 份模板；模型请求 0。日志：artifacts/v51-configuration/check-guide.log |
| 14. Benchmark results | 不适用，未变更运行代码或重跑模型基准 |
| 15. Security/privacy | 不读取或输出用户密钥；演示身份计算仅输出内部角色与不透明哈希；未改实际私有 JSON |
| 16. Rollback path | 撤回本次模板注释和文档改动及对应清单条目即可，无数据回滚 |
| 17. Known limitations | 结构校验不验证报价真实性、余额、质量或真实连接匹配。默认 Catalog 缺金额预留所需模型上限，教程明确先保留 maxModelCost=null |
| 18. Deferred work | 未实现自动抓价、金额上限配置入口、自动成本选模或任何其他运行时能力；这些不属于本次说明请求 |

MANIFEST 仅更新本次修改/新增文档与模板的条目，不重算其他并行工作涉及的文件。已有 V5.1 完整实现与验收报告作为历史交付证据保留，不用本次文档验证覆盖其记录。
