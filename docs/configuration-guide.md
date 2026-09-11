# 知衡配置使用说明与教程

本文适用于当前 V5.0 配置结构。每个环境只使用一份环境文件，同时使用一份独立模型 JSON：

| 环境 | 环境文件 | 模型文件 |
|---|---|---|
| 本地开发 | `.env` | `config/models.local.json` |
| 生产部署 | `.env.production` | `config/models.production.json` |

环境文件保存密钥、运行参数、功能开关和数据源凭据；模型 JSON 保存模型名称、接口地址、能力声明和角色关系。模型 JSON 只引用密钥变量名，不保存密钥值。

## 1. 最快开始

### 1.1 本地首次配置

PowerShell：

```powershell
Copy-Item .env.example .env
Copy-Item config/models.example.json config/models.local.json
```

macOS／Linux：

```bash
cp .env.example .env
cp config/models.example.json config/models.local.json
```

然后完成两项编辑：

1. 在 `.env` 中填写 `LLM_API_KEY` 等实际凭据。
2. 在 `config/models.local.json` 中确认模型名称和接口地址与账户一致。

运行静态配置检查：

```powershell
pnpm models:check config/models.local.json
```

成功结果包含 `"equivalent":true` 和 `"paidCalls":0`。该检查不会向模型服务发起请求，也不证明模型质量、账户余额或接口连通性。

启动平台：

```powershell
pnpm db:up
pnpm dev
```

配置文件在进程启动或首次读取后固定。修改 `.env` 或模型 JSON 后，需要重启后端。

### 1.2 生产首次配置

在服务器项目目录执行：

```bash
cp .env.production.example .env.production
cp config/models.example.json config/models.production.json
```

填写生产凭据并修改生产模型 JSON，然后检查：

```bash
node --env-file=.env.production scripts/model-config.mjs --check config/models.production.json
```

通过后启动：

```bash
bash deploy.sh up
```

`deploy.sh` 检测到 `config/models.production.json` 后，会叠加 `compose.models.yaml`，把文件只读挂载到容器内，并将容器中的 `MODEL_CONFIG_FILE` 设置为 `/app/config/models.production.json`。

## 2. 两类配置分别负责什么

### 2.1 环境文件

环境文件包含以下几组设置：

| 分类 | 主要字段 | 用途 |
|---|---|---|
| 模型入口 | `MODEL_CONFIG_FILE` | 指定当前环境的模型 JSON |
| 模型凭据 | `LLM_API_KEY`、`LLM_VISION_API_KEY`、`LLM_MAIN_API_KEY`、`LLM_PRO_API_KEY`、候选模型密钥 | 由 JSON 中的 `apiKeyEnv` 引用 |
| 模型运行 | `MODEL_ROUTING_MODE`、`MODEL_TELEMETRY_ENABLED`、`LLM_TIMEOUT_MS`、`LLM_MAX_DURATION_MS`、`LLM_REVIEW_FORMAT` | 控制路由、调用记录和请求限制 |
| 准入与发布 | `MODEL_POLICY_ACCEPTANCE_FILE`、`VISION_ACCEPTANCE_FILE`、`FEATURE_VISION_ROUTING`、Champion／A/B 设置 | 控制已审核策略的启用，不定义模型本身 |
| 服务 | `PORT`、`MONGODB_URI`、`MONGODB_DATABASE`，或生产访问参数 | 控制本地服务和数据库连接 |
| 证券资料 | `SEC_USER_AGENT`、`TUSHARE_TOKEN`、Longbridge 凭据 | 访问相应资料服务 |
| 网页资料 | `WEB_SEARCH_ENABLED`、Tavily／Brave 密钥、发行人域名和 DNS 设置 | 按资料缺口补充公开网页 |

密钥字段应只写值，不要加到 `VITE_` 前缀变量，不要写入模型 JSON，也不要提交到版本库。

### 2.2 模型 JSON

模型 JSON 有四个顶层字段：

```json
{
  "schemaVersion": 1,
  "connections": {},
  "profiles": {},
  "roles": {}
}
```

- `connections`：接口和凭据引用。
- `profiles`：某个模型及其已确认能力。
- `roles`：平台职责与模型档案的映射。
- `schemaVersion`：当前固定为 `1`。

## 3. connections：配置接口与凭据

一个连接示例：

```json
"analysis-api": {
  "protocol": "openai-chat-completions",
  "baseUrl": "https://api.example.com/v1",
  "apiKeyEnv": "LLM_API_KEY"
}
```

| 字段 | 填写规则 |
|---|---|
| `protocol` | 当前只支持 `openai-chat-completions` |
| `baseUrl` | 使用 HTTPS；本机服务可使用 localhost、127.0.0.1 或 ::1 的 HTTP |
| `apiKeyEnv` | 填环境变量名称，如 `LLM_API_KEY`，不能填真实密钥或 `VITE_` 变量 |

多个 profile 可以共享同一 connection。只有模型接口或凭据来源确实不同，才需要新增 connection。

## 4. profiles：配置模型和能力

一个档案示例：

```json
"research-model": {
  "model": "your-model-id",
  "provider": null,
  "connectionRef": "analysis-api",
  "capabilities": {
    "textInput": true,
    "imageInput": false,
    "streaming": true,
    "toolCalling": true,
    "jsonObject": null,
    "jsonSchema": null,
    "reasoningControl": null
  },
  "adapterOptions": null
}
```

能力值的含义：

| 值 | 含义 |
|---|---|
| `true` | 已确认当前模型与接口支持该能力 |
| `false` | 明确不支持或当前角色禁止使用 |
| `null` | 尚未确认，平台不得据此假定可用 |

七项能力必须全部出现。缺少资料时保留 `null`，不能根据模型名称推测能力。`imageInput` 只有在模型、接口和实际请求格式均验证通过后才能设为 `true`。

`adapterOptions` 通常为 `null`。候选档案需要显式控制思考参数时，可使用：

```json
"adapterOptions": {
  "thinking": "omit"
}
```

允许值为 `omit`、`disabled`、`enabled`。只有接口已确认支持时才使用后两项。

## 5. roles：配置平台职责

五个基础角色必须存在：

| 角色 | 职责 |
|---|---|
| `defaultResearch` | 固定模式研究、复核与补证判断 |
| `router` | 研究路径与证券意图识别 |
| `vision` | 图片、扫描页和 PDF 原页读取 |
| `policyMain` | 分层策略中的 MAIN 档案 |
| `policyPro` | 分层策略中的 PRO 档案 |

可选角色：

| 角色 | 职责 |
|---|---|
| `visionChallenger` | Vision 候选对照 |
| `mainChallenger` | MAIN 候选对照 |

角色值是 profile 名称。例如：

```json
"roles": {
  "defaultResearch": "research-model",
  "router": "router-model",
  "vision": "vision-model",
  "policyMain": "main-model",
  "policyPro": "pro-model"
}
```

允许多个角色指向同一个 profile。配置中不允许存在没有被角色使用的 profile，也不允许存在没有被 profile 使用的 connection。

## 6. 常用修改场景

### 6.1 更换默认研究模型

1. 找到 `roles.defaultResearch` 指向的 profile。
2. 修改该 profile 的 `model`。
3. 如果服务地址或凭据也变化，新增或修改其 `connectionRef` 对应的 connection。
4. 只声明已确认的能力。
5. 执行配置检查并重启后端。

如果 router 或 vision 也需要使用新模型，应分别检查它们的能力要求，不要只修改默认研究角色后假定其他角色自动适配。

### 6.2 为 Vision 使用独立接口

先在环境文件中填写独立凭据：

```dotenv
LLM_VISION_API_KEY=
```

在 JSON 中新增连接：

```json
"vision-api": {
  "protocol": "openai-chat-completions",
  "baseUrl": "https://vision.example.com/v1",
  "apiKeyEnv": "LLM_VISION_API_KEY"
}
```

然后把 vision profile 的 `connectionRef` 改为 `vision-api`，并在实际图片输入已经验证后设置 `capabilities.imageInput`。新增连接必须被 profile 使用。

### 6.3 共享同一套凭据

如果 MAIN、PRO 或 Vision 与默认研究确实使用同一账户，可让对应 connection 的 `apiKeyEnv` 都指向 `LLM_API_KEY`。共享必须在 JSON 中明确表达，运行时不会根据空密钥自动跨角色借用其他凭据。

### 6.4 关闭图片输入

将 vision profile 的 `capabilities.imageInput` 设为 `false`。原页读取会保留未读取或能力不足的限制，不能把缺失内容冒充已读取证据。

### 6.5 添加候选模型

候选模型需要同时添加 connection、profile 和可选角色映射，并在环境文件提供相应密钥。配置完成只表示候选可被识别；它不会自动通过质量验收，也不会自动切换生产研究。

启用候选前还需要完成真实对照、批准文件、代码与配置绑定检查，以及相应功能开关。数据缺失不能作为升级模型的理由。

## 7. 运行模式与开关

`MODEL_ROUTING_MODE` 常用值：

| 值 | 行为 |
|---|---|
| `legacy` | 使用固定默认研究路径；当前示例默认值 |
| `dry-run` | 观察策略选择，不作为正式切换 |
| `policy` | 使用已通过准入的 MAIN／PRO 分层策略 |
| `champion` | 使用已批准的任务优选策略 |

填写 MAIN、PRO 或候选档案不会自动改变运行模式。开启 `FEATURE_VISION_ROUTING`、`MODEL_CHAMPION_ENABLED` 或 `MODEL_AB_ENABLED` 也不能跳过批准文件、策略版本和质量门槛。

## 8. 配置检查与结果解释

本地：

```powershell
pnpm models:check config/models.local.json
```

生产：

```bash
node --env-file=.env.production scripts/model-config.mjs --check config/models.production.json
```

检查内容包括：

- JSON 结构、字段和值是否合法。
- role、profile、connection 引用是否完整。
- 模型档案和连接有效值是否一致。
- legacy 与 policy 的任务模型身份是否保持一致。
- 默认研究所需凭据是否存在。

检查不执行以下事项：

- 不调用模型或消耗额度。
- 不检查账户余额。
- 不证明模型具备声明的能力。
- 不批准候选、Policy、Champion 或 A/B 发布。

## 9. 从旧环境变量迁移

仅旧部署仍在环境文件中定义 `LLM_MODEL`、`LLM_BASE_URL` 等字段时使用迁移预览：

```powershell
pnpm models:preview --out config/models.local.preview.json
pnpm models:check config/models.local.preview.json
```

预览写入不会覆盖已有文件。确认等价后，再将审核通过的内容作为当前环境模型文件，并设置 `MODEL_CONFIG_FILE`。先保存回滚副本，再删除重复的旧模型定义。

当前已经使用 `MODEL_CONFIG_FILE` 的环境，`models:preview` 读取的是当前选中的 JSON；它不会重新使用旧默认值生成另一套配置。

## 10. 常见错误

### 配置文件不存在或 JSON 无效

现象：新研究显示模型未配置，模型任务不派发。

处理：确认 `MODEL_CONFIG_FILE` 路径、JSON 语法、文件权限和容器挂载，然后重启进程。显式选择的错误配置不会自动回退到另一模型。

### 缺少密钥

现象：相关 connection 无法派发；默认研究凭据缺失时配置状态为不可用。

处理：查看 connection 的 `apiKeyEnv`，在当前环境文件中添加同名变量。不要把密钥写入 JSON。

### 存在未使用的 profile 或 connection

现象：配置检查失败。

处理：删除未使用项，或用 role 引用 profile、用 profile 引用 connection。配置要求引用闭合，避免保留看似可用但实际不会执行的定义。

### 图片能力配置错误

现象：Vision 请求被能力检查拒绝，或原页保留未读取限制。

处理：核对模型、接口、请求格式和真实验收结果。未经验证时使用 `null` 或 `false`。

### 修改后没有生效

原因：配置在启动或首次读取时被固定。

处理：安全结束当前任务后重启后端或应用容器。不要在运行中的研究任务之间热切换配置。

### 生产容器找不到模型文件

处理：确认宿主机存在 `config/models.production.json`，并使用 `deploy.sh`；直接调用 Compose 时同时指定 `compose.production.yaml` 与 `compose.models.yaml`。

## 11. 备份与回滚

每次修改前一起备份环境文件和对应模型 JSON。两者属于同一有效配置，不应只恢复其中一个。

本地回滚步骤：

1. 停止后端。
2. 恢复配套的 `.env` 和 `config/models.local.json`。
3. 运行 `pnpm models:check config/models.local.json`。
4. 重新启动。

生产回滚步骤：

1. 在批准的维护窗口停止或升级服务。
2. 恢复配套的 `.env.production` 和 `config/models.production.json`。
3. 运行生产配置检查。
4. 通过 `deploy.sh` 重建应用容器并检查状态。

回滚不得改写历史任务中的模型身份、审批记录、研究截止日期或证据。若要退回旧环境变量入口，应先从受控回滚文件恢复旧定义和原选择器，再撤下正式 JSON。

## 12. 上线前检查清单

- 当前环境只存在一份生效的环境文件。
- `MODEL_CONFIG_FILE` 指向当前环境的模型 JSON。
- JSON 没有真实密钥、查询参数或凭据地址。
- 每个 `apiKeyEnv` 在环境文件中有对应变量。
- 所有 profile 和 connection 都被引用。
- 未确认能力使用 `null` 或 `false`。
- 默认研究、router 和 vision 各自满足实际用途。
- 候选与发布开关保持关闭，直到真实验收和批准完成。
- 配置检查通过。
- 修改后已重启对应进程。
- 生产环境文件和模型 JSON 已在服务器外备份。

公共起始模板为 [`.env.example`](../.env.example)、[`.env.production.example`](../.env.production.example) 和 [`config/models.example.json`](../config/models.example.json)。旧配置迁移的兼容细节见 [V5.0 模型配置迁移说明](releases/V5.0/model-config-migration-runbook.md)。
