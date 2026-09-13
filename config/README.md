# 配置目录说明

当前目录只保留两类活动配置：模型文件负责“由哪个模型执行哪个研究环节”，价格文件负责“已发生的模型调用如何估算费用”。研究预算配置已经退出当前运行入口。

| 类型 | 公共模板 | 本地私有文件 | 生产私有文件 | 文档 |
| --- | --- | --- | --- | --- |
| 模型与环节 | `models.example.json` | `models.local.json` | `models.production.json` | [模型配置完整教程](../docs/configuration-guide.md) |
| 价格历史（可选） | `pricing.example.json` | `pricing.local.json` | `pricing.production.json` | [费用与缓存记录教程](../docs/cost-configuration-guide.md) |

仓库只提交公共模板。本地和生产私有文件由 `.gitignore` 排除。模型 JSON 只保存模型名、接口地址和密钥变量名；真实密钥只写入 `.env` 或 `.env.production`。

`models.example.json` 使用 schema v2，包含 `models` 与 `pipeline`。`models` 定义连接，`pipeline` 将模型别名分配给 Input、Vision、Researcher、Writer、Evidence Verifier、Auditor、Critical Reviewer 和 Judge。

`pricing.example.json` 的空 `entries` 表示价格未知，不表示免费。需要费用估算时复制成当前环境的私有文件，填写经过核实的价格历史，再设置 `MODEL_PRICING_FILE`。

当前配置不使用 `research-budget.*.json`、`RESEARCH_BUDGET_FILE`、`FEATURE_RESEARCH_BUDGET` 或 `FEATURE_COST_ROUTER`。历史任务已保存的预算记录由兼容代码保留，不应手工删除或改写。
