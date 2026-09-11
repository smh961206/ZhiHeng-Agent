# V4.9 模型名称统一（2026-09-11）

按用户明确要求，当前运行代码和配置中的 `deepseek-v4-pro`、`deepseek-v4-flash-vision-exp` 统一改为 `deepseek-flash`。这是当前 V4.9 的定向配置维护，不构成候选模型质量验收或自动上线授权。

1. **发布范围**：V4.9，沿用 V4.9.3 的 Catalog/adapter 能力边界及现有模型身份保护。
2. **修改文件**（本次增量，不包含工作区原有其他修改）：
   - 运行与脚本：`server/model-routing.mjs`、`server/model-catalog.mjs`、`server/model-adapter.mjs`、`scripts/model-comparison.mjs`。
   - 配置：`.env`、`.env.production`、`.env.example`、`.env.production.example`；仅替换旧模型名称及相关注释。
   - 测试：`tests/model-catalog.test.mjs`、`tests/model-gateway.test.mjs`、`tests/model-escalation.test.mjs`、`tests/model-rollout.test.mjs`、`tests/model-state.test.mjs`、`tests/document-routing.test.mjs`、`tests/visual-reading.test.mjs`、`tests/router-vision-migration.test.mjs`、`tests/workspace-ui.integration.mjs`、`tests/fixtures/router-vision-migration-scenario.mjs`。
   - 文档与清单：`README.md`、`docs/architecture/04-model-system.md`、`docs/architecture/current-implementation-map.md`、`docs/contracts/model-gateway.contract.md`、`docs/invariants/model.invariants.md`、`docs/adr/ADR-002-model-gateway.md`、`docs/adr/ADR-014-quality-before-cost.md`、`docs/releases/V4.9/vision-call-inventory.json`、`MANIFEST.json`。
3. **新增文件**：本报告。
4. **删除文件**：无。
5. **架构变化**：无新子系统。默认分析、路由回退、视觉及 policy PRO 使用新名称；MAIN 仍为 `glm-5.3-flash`。分析与视觉保留独立职责、连接、密钥回退及请求约束。视觉继续使用非思考读取；分析调用保持原有思考配置。
6. **Schema 变化**：无持久化结构变化；policy PRO 的允许模型绑定更新。
7. **迁移**：无数据库迁移或历史回填。Vision 清单只同步四个变更文件的 currentSha256 和当前分支锚点，保留原始 sha256。Harness 清单同步六个变更文档的实际字节摘要。
8. **环境变化**：模型默认值与相关配置统一；已有自定义环境覆盖仍然有效。仓库本地配置已更新，远程线上服务未部署或重启。运行服务需重新加载配置才能生效。
9. **兼容性**：`LLM_VISION_INPUT=off` 仍关闭视觉；`images` 仍显式启用；`auto` 识别新默认名称。未知模型不会因名字相似而获得图像能力。PRO 仍是职责档位，名称变化不合并档位或扩大分析模型的图像权限。
10. **续跑/恢复**：保存的旧模型身份保持原样；与当前配置不一致时在派发和工具执行前拒绝续跑。新任务使用新配置，原市场时点、证据与检查点不被重写。旧 policy 任务需要恢复旧代码绑定和旧环境后续跑。
11. **Feature flags**：不改路由模式、候选晋升、回退或质量门槛。已有验收指纹随模型/代码变化失效，仍须重新验收。
12. **测试执行**：修改前相关测试 134 项通过；修改后执行全量单元测试、Gateway 架构清单检查及可用的隔离 Mongo 续跑测试。
13. **测试结果**：全量单元测试 792/792 通过，隔离 Mongo 模型身份与进程重启续跑测试 2/2 通过；Gateway 架构清单检查及 `git diff --check` 通过（Git 提示 Windows 换行转换）。新增测试覆盖 Flash 默认配置、PRO 绑定及旧任务身份不回写；既有视觉模式矩阵、请求参数、工具调用、审计、遥测与恢复校验通过。界面仅调整合成测试数据，本轮未运行浏览器集成测试。
14. **Benchmark**：全量测试包含离线比较用例；未发出真实付费模型调用，没有产生新的真实质量验收。历史请求快照保留原始哈希，测试先断言实际模型为 Flash，再仅归一化该名称以比较其余请求与结果，不能掩盖其他参数变化。
15. **安全/隐私**：不修改或输出密钥，不公开内部推理，不放宽证据、图像边界或校验。历史研究与验收记录保留当时模型名称；测试中的旧名称仅用于历史兼容验证。
16. **回滚**：停止新任务派发，恢复本次三个模型运行文件的旧绑定及原环境配置，重新启动；检查清单与测试随该增量恢复。保留已有研究数据，不重置工作区其他修改；变更后新任务同样受模型身份校验保护。
17. **已知限制**：离线请求验证不证明实际供应商端点支持图像、思考参数或研究质量；未执行远程部署。当前操作是用户指定的名称统一，不替代真实模型验收。
18. **后续事项**：真实端点能力/研究质量验证和候选晋升仍按既有发布与费用授权流程处理；未引入未来发布功能。
