# V5.0 统一模型配置操作说明

## 当前范围

实现了配置文件入口、旧变量兼容、迁移预览／校验和生产可选挂载。旧 ModelProfile／modelState 身份不改，密钥仍从环境读取。真实模型验收与生产启用不是配置校验的一部分。

JSON 格式见 [模板](../../../config/models.example.json)：schemaVersion 为 1，connections 保存 protocol／baseUrl／apiKeyEnv；profiles 保存 model／provider／connectionRef／七项 capabilities／adapterOptions；roles 将五个基础角色及可选候选角色映射到 profile。角色可共享定义，但运行时仍生成原内部身份。

## 本地

1. 保留 `.env`，不要覆盖真实密钥；高级凭据和策略开关也在此文件中维护。
2. `pnpm models:preview --out config/models.local.json`。仅在目标不存在时写入，路径须在当前项目内；无外部模型调用。
3. `pnpm models:check config/models.local.json`。比较 Catalog、连接（包括凭据有效值）、legacy／policy 状态；成功只输出布尔结果，不打印接口或密钥。
4. 在 `.env` 增加 `MODEL_CONFIG_FILE=./config/models.local.json`，校验通过并保存旧定义的受控回滚副本后，移除环境文件中的重复模型定义，重启后读取新文件。
5. 回滚时先按回滚副本将 removedDefinitions 分别恢复到原文件，并恢复 previousSelector（null 表示移除此项），再恢复原启动版本；切勿仅移除选择器而遗漏原定义。不得用示例覆盖真实文件。

## 生产

使用 `.env.production` 执行 `scripts/model-config.mjs --preview --out config/models.production.preview.json` 和 `--check config/models.production.preview.json`。预览不激活，不复制本地连接。

在已批准的部署窗口，将通过校验的文件发布为 `config/models.production.json`。deploy.sh 会选择 [只读挂载覆盖文件](../../../compose.models.yaml)，注入容器路径 `/app/config/models.production.json`。直接调用 Compose 时应同时指定基础 compose.production.yaml 与此覆盖文件。生产凭据继续来自原 env_file，容器不读取宿主机本地环境文件。

配置检查、跨进程恢复与本地回滚通过后，才进入生产切换；已有 policy／Vision／champion 批准若因代码绑定失效，仍需重新审核，不自动重签、不放宽质量门槛。没有远端部署环境时只能交付预览与部署能力，不能标记生产切换完成。

## 错误、冲突与快照

- 未配置 MODEL_CONFIG_FILE 时完全沿用旧入口；不会把默认研究与 MAIN 不同误认为冲突。
- 文件显式选中后，不逐字段回退到旧模型定义。仅密钥引用及执行／发布控制继续读取环境。
- 已存在的非空旧模型定义须与文件的对应定义一致；接口比较按既有 URL 标准化规则，视觉 auto／images 按有效图片能力比较。
- 缺失文件、非法 JSON、重复（含转义后的同名）键、未知字段、无效引用等均关闭模型读取。文件无效状态缓存到进程重启；无隐式热更新。
- 密钥缺失时相关连接不可派发，默认研究不可用时 API configured 为 false；健康检查和已有研究读取仍可用。密钥轮换不改变连接身份。
- 每次 Gateway 调用捕获有效配置及密钥快照，回调期间修改环境不会混合两个连接。
- 错误不输出原 JSON、端点、路径或密钥。实际模型 JSON 被 Git 与构建上下文忽略。

## 清理条件

2026-09-11 按用户要求，已对本地及工作区生产配置完成等价校验，将重复定义迁出环境文件。各自旧定义保存在受忽略的 config/models.local.rollback.json 与 config/models.production.rollback.json，文件不含密钥值。生产远端尚未部署。CLI 在已有选择器时预览当前文件，并与当前有效配置比较，不再回退到旧默认定义。密钥别名及运行时兼容解析继续保留。当前没有删除兼容解析，也没有改变 MAIN／PRO 已有的固定模型／提供方约束。

## 新环境与检查

新建环境先复制对应 .env 示例及 config/models.example.json，再填写密钥、调整 JSON。已有环境不得覆盖。生产直接使用 Compose 时须同时指定 compose.production.yaml 和 compose.models.yaml。

本地检查：`pnpm models:check config/models.local.json`。生产检查：`node --env-file=.env.production scripts/model-config.mjs --check config/models.production.json`。这些检查不调用模型、不代替真实质量验收。
