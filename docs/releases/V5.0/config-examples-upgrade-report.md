# V5.0 配置示例与实际环境升级报告

2026-09-11。按用户要求完成统一模型配置的文件级迁移；未部署或重启远端服务。

1. **版本**：V5.0 统一模型配置后续整理。
2. **修改文件**：.env.example、.env.production.example、.env.models.example；实际 .env、.env.models、.env.production、.env.production.models；scripts/model-config.mjs、tests/model-config.test.mjs、tests/harness.test.mjs、tests/deploy.integration.sh、deploy.sh、README.md、DEPLOY.md、model-config-migration-runbook.md、Vision 当前指纹与 MANIFEST.json。
3. **新文件**：实际 config/models.production.json；本地和生产的 config/models.*.rollback.json；本报告。既有 models.local.json 和公共 models.example.json 无须改写。
4. **删除文件**：无。各环境移除 14 个重复模型定义项。
5. **架构**：沿用既有 Model Gateway 与 JSON 配置入口，不新增平行系统。预览／校验 CLI 支持已迁移的纯文件模式。
6. **Schema**：无数据库变更，沿用配置 schemaVersion 1。
7. **迁移**：本地及生产分别比较六个模型档案、连接有效值、legacy／policy 模型状态；通过后移除 env 中模型定义。
8. **环境**：基础文件指定各自 JSON；高级文件保存凭据和策略开关；生产只读挂载已校验。
9. **兼容**：实际模型、接口、密钥、策略开关及数据服务参数均保持不变；旧环境变量解析仍保留。默认研究与 MAIN 保持各自身份。
10. **恢复**：未改写历史任务、模型固定身份、研究截止日期或恢复逻辑。
11. **开关**：无新增启用；原开关不变，示例候选／champion／A/B 开关关闭。
12. **测试**：配置与环境加载单测、完整单测套件、实际双环境等价校验、Compose 配置和只读挂载检查、部署脚本语法检查。
13. **结果**：见下方最终验证记录。
14. **Benchmark**：无付费模型调用；本次仅配置整理，不宣称模型质量提升。
15. **安全隐私**：实际配置和回滚副本被 Git／镜像构建忽略；JSON 仅引用凭据变量名，回滚副本只保存旧模型定义和选择器，无密钥值。
16. **回滚**：从各自 rollback.json 的 removedDefinitions 恢复到指定 env 文件，恢复 previousSelector（null 表示删除选择器）。生产退回旧入口还需撤下正式 JSON，避免 deploy.sh 再次选择挂载；保留配置备份，勿删除历史记录。
17. **限制**：配置修改需重启生效；远端部署、Linux 全部署／数据库回滚演练本轮未执行，配置等价不代表真实模型验收。
18. **延期**：付费质量验收、生产策略发布、旧运行时兼容解析删除仍按后续批准范围执行。

## 最终验证记录

- 完整单元测试：888 / 888 通过，无失败或跳过。
- 本地／生产：各六个档案，模型、连接、凭据有效值与 legacy／policy 身份等价。
- Compose：配置解析通过，正式 JSON 只读挂载，环境参数保持一致。
- 部署脚本：Bash 语法检查通过；未执行部署集成演练。
- Git 忽略：四份真实环境文件、两份实际模型文件、两份回滚文件均确认受忽略。
- 付费模型调用：0。
