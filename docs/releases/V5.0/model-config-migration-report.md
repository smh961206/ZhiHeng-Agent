# V5.0 统一模型配置迁移实施记录

用户明确要求按迁移方案迭代开发。当前默认研究与 MAIN 仍可使用不同模型／连接，本次统一定义来源，不互相覆盖、不启用候选。

## 阶段进度

| 阶段 | 当前结果 |
|---|---|
| P0 盘点 | 已检查模型、连接、Gateway、启动／重试、状态接口、基准工具及原两环境配置 |
| P1 统一解析 | 旧 env 与文件入口复用 Catalog／连接／Gateway，原内部身份与缺省行为保留 |
| P2 文件入口 | 版本化连接／模型／角色文件、密钥引用、严格 JSON／字段／引用校验、显式冲突关闭和进程快照已实现 |
| P3 迁移预览 | CLI 预览／等价检查、目标防覆盖、项目路径限制已实现；两环境候选各 6 个角色校验一致 |
| P4 本地切换 | 跨进程恢复、API 与回滚校验通过；本地 .env 已增加文件选择项，未主动重启用户现有服务 |
| P5 生产切换 | 生产预览和只读 Compose 覆盖文件已准备；未发布为正式文件、未远端部署，不宣称完成生产切换 |
| P6 清理 | 按方案保留兼容入口与旧定义；待生产观察／回滚窗口结束后再清理，不提前删除 |

运行说明见 [迁移操作手册](model-config-migration-runbook.md)。真实模型验收、批准重签与生产启用保持既有门槛。本次等价性检查不是模型质量验收。

## 工程交付记录

| 项目 | 结果 |
|---|---|
| 1. Release | V5.0 用户授权配置迁移维护 |
| 2. 修改文件 | model-routing、model-catalog、model-connection、model-gateway、model-rollout、vision-policy、server/index、research-retry、scripts/model-comparison；package.json、deploy.sh、部署测试夹具、Vision 清单测试、Git／Docker 忽略；三个 env 模板、README、DEPLOY、契约、实施地图、V5.0 索引／迁移文档及指纹／MANIFEST；本地实际基础配置增加选择项 |
| 3. 新增文件 | server/model-config.mjs、scripts/model-config.mjs、config/models.example.json、compose.models.yaml、model-config 单元与集成测试、本手册与报告；被忽略的本地实际 JSON 和生产预览 JSON |
| 4. 删除文件 | 无 |
| 5. 架构 | 单一配置适配层进入既有 Gateway，复用旧 ModelProfile 身份；无新增模型传输端点、注册中心或自动路由系统 |
| 6. Schema | 新增配置文件 schemaVersion=1；API config 增加 configurationError 布尔字段；无 Mongo／任务格式改动 |
| 7. 迁移 | 旧入口默认兼容；文件入口显式选择；预览比较 Catalog、连接和状态，不回填／重写历史任务 |
| 8. 环境 | 拟议 MODEL_CONFIG_FILE 已实现；实际密钥仍在原基础／高级 env 文件；不添加明文凭据到 JSON；生产文件挂载只读 |
| 9. 兼容影响 | 未选文件时保留旧行为；新旧非空定义不一致或文件无效则关闭模型工作。MAIN／PRO 固定绑定校验保留。CLI 离线模式仍强制合成配置 |
| 10. Resume／Recovery | legacy／policy 的原 pins 已通过真实 Mongo＋子进程中断／恢复测试，原工具仅执行一次、数据时点未刷新；v3 分组等价及回退关闭由单元验证 |
| 11. Feature flags | 不启用 policy、Vision challenger、champion 或 A/B；不改变现有模式和批准路径 |
| 12. Tests | 配置与 Gateway 请求等价、冲突与密钥隔离、CLI 幂等／路径边界；隔离 Mongo 恢复及 API；全部单元、路由、构建、指纹／清单和 Compose 解析 |
| 13. Results | 最终数量见下方 |
| 14. Benchmark | 无付费／真实模型请求；合成响应只验证协议与恢复，不是质量或成本结论 |
| 15. 安全／隐私 | JSON 只包含密钥变量引用；路径／URL／原异常不进入公开错误；实际文件被 Git 与 Docker 忽略；测试只使用专用临时数据库与合成响应 |
| 16. 回滚 | 本地移除选择项即可读回保留的旧定义；生产正式文件撤下后按旧 Compose 部署。回退代码须保留旧配置和全部任务数据；失效的策略审批不可绕过 |
| 17. 已知限制 | 无热重载；生产尚未切换；旧定义保留观察。未补充旧记录中从未保存的模型信息；未声称完成真实质量验收 |
| 18. 后续工作 | 生产部署窗口、重新验收及审批、观察后弃用旧定义；任意 MAIN／PRO 模型支持与旧密钥命名清理仍单独评审 |

## 验证与切换结果

最终单元测试 **887/887 通过，无跳过**；其中新增配置专项 11 项，覆盖请求等价、重复键／冲突、引用、密钥隔离、v3 分组保留及回退关闭。实际隔离 Mongo＋子进程测试 **3/3 通过**：legacy／policy 原 pins 跨进程恢复，以及文件独立配置的 API 就绪／错误关闭；合成 Agent 不调用外部模型。测试数据库及本次临时容器／卷已清理，没有操作其他实例。

路由渲染 **5/5 通过**；正式前端构建通过（主入口 480.41 kB，gzip 159.71 kB）。未修改 UI 组件，因此未重复完整浏览器视觉回归。Compose 配置解析确认只读挂载且不会自动创建不存在的宿主机文件；部署 Bash 语法检查通过。没有执行远端部署或真实模型验收。

本地两份 env 的有效配置已与 `config/models.local.json` 校验一致；`.env` 增加 MODEL_CONFIG_FILE。旧定义保留，移除选择项后生成相同状态，回滚等价检查通过。生产 `config/models.production.preview.json` 也通过 6 角色等价校验；正式文件不存在，生产没有切换。

调用边界与 Vision 清单检查通过。原 legacy 图片能力判断移至配置模块并由 Catalog 重新导出，审查锚点和变异测试同步移到实际位置；增加该配置模块的初始审查指纹，历史基线未覆盖。校验过程中发现的旧定位／文件指纹未同步已修正，没有放宽测试或审批绑定。

本次差异格式检查通过；实际模型 JSON 与四份 env 被 Git 忽略，模型 JSON 不包含实际凭据，构建上下文也排除实际模型文件。公开文件与 JSON 的凭据隔离检查通过。

核查记录位于 `artifacts/model-config-migration/`，包含 unit-final.log、integration-final.log、routes.log、build.log、local-cutover.json、compose-validation.json，不保存真实凭据。P5 生产部署与 P6 弃用清理尚未完成，按方案门槛保留后续工作。
