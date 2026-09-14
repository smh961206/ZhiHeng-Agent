# 平台模型配置使用说明与完整教程

平台使用一份模型 JSON 定义可用模型，并把模型分配给八个研究环节。模型名称和接口只写一次，API Key 值只保存在当前环境文件中。当前配置不再包含 MAIN/PRO、Challenger、Champion、A/B、付费试跑、验收文件或研究预算限制。

## 1. 文件关系

| 环境 | 环境文件 | 模型文件 | 可选价格文件 |
| --- | --- | --- | --- |
| 本地 | `.env` | `config/models.local.json` | `config/pricing.local.json` | `config/research-budget.local.json`（可选） |
| 生产 | `.env.production` | `config/models.production.json` | `config/pricing.production.json` | `config/research-budget.production.json`（可选） |
| 公共模板 | `.env.example` / `.env.production.example` | `config/models.example.json` | `config/pricing.example.json` | `config/research-budget.example.json` |

环境文件保存服务参数和密钥；模型文件保存模型、接口和环节分配；价格文件只用于费用估算。三者职责不能互相替代。

## 2. 本地首次配置

在项目根目录执行防覆盖复制：

```powershell
if (-not (Test-Path -LiteralPath '.env')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
if (-not (Test-Path -LiteralPath 'config/models.local.json')) {
  Copy-Item -LiteralPath 'config/models.example.json' -Destination 'config/models.local.json'
}
```

在 `.env` 确认模型文件并填写 JSON 实际引用的密钥：

```dotenv
MODEL_CONFIG_FILE=./config/models.local.json
LLM_API_KEY=
LLM_MAIN_API_KEY=
MODEL_TELEMETRY_ENABLED=true
LLM_TIMEOUT_MS=300000
LLM_MAX_DURATION_MS=1800000
```

可以新增 `LLM_AUDIT_API_KEY` 等自定义后端变量，只要模型 JSON 的 `apiKeyEnv` 使用完全相同的名称。不要使用 `VITE_` 前缀，也不要把密钥值放进 JSON、文档或前端代码。

## 3. 模型 JSON 完整结构

```json
{
  "schemaVersion": 2,
  "models": {
    "deepseek": {
      "model": "deepseek-flash",
      "baseUrl": "https://api.deepseek.com",
      "apiKeyEnv": "LLM_API_KEY"
    },
    "glm": {
      "model": "glm-5.3-flash",
      "baseUrl": "https://open.bigmodel.cn/api/coding/paas/v4",
      "apiKeyEnv": "LLM_MAIN_API_KEY"
    }
  },
  "pipeline": {
    "input": "glm",
    "vision": "glm",
    "researcher": ["deepseek", "glm"],
    "writer": "deepseek",
    "evidenceVerifier": "deepseek",
    "auditor": "deepseek",
    "criticalReviewer": [],
    "judge": []
  }
}
```

### `schemaVersion`

当前新配置固定为 `2`。schema v1 只用于旧部署和历史任务兼容。

### `models`

`models` 下的键是平台内部别名，可自行命名。每个模型包含：

| 字段 | 要求 |
| --- | --- |
| `model` | 供应商实际模型标识，不能为空 |
| `baseUrl` | OpenAI Chat Completions 兼容接口根地址；平台追加 `/chat/completions` |
| `apiKeyEnv` | 保存密钥的后端环境变量名，不是密钥值 |

模型别名必须被至少一个环节使用。多个模型可以共用同一个 `apiKeyEnv`，也可以使用独立密钥。

### `pipeline`

`pipeline` 只引用 `models` 中的别名，不填写供应商名称或 URL。一个字符串表示固定模型；数组表示按顺序保存的模型池。Input 和 Vision 只能配置一个模型。

## 4. 八个研究环节

| JSON 字段 | 页面名称 | 负责内容 | 配置要求 |
| --- | --- | --- | --- |
| `input` | Input · 输入理解 | 识别证券、代码、比较意图与研究路径 | 必填，单模型 |
| `vision` | Vision · 原页读取 | 读取扫描页、图片、图表和原始版面 | 必填，单模型 |
| `researcher` | 研究 | 搜索、调用工具、组织证据并生成分析草稿 | 必填 |
| `writer` | 写作 | 使用公开可复核上下文整理报告 | 必填 |
| `evidenceVerifier` | 证据核验 | 核对缺口、来源和补证结果 | 必填 |
| `auditor` | 审计 | 检查引用、口径、计算、边界和交付结构 | 必填 |
| `criticalReviewer` | 关键复核 | 在重复且已验证的结构问题时独立复核 | 可选，`[]` 关闭 |
| `judge` | Judge · 证据裁决 | 裁决已记录的重大 L1/L2 证据冲突 | 可选，`[]` 关闭 |

多模型数组会完整保存到新任务快照，目前固定使用数组中的第一个模型。平台不会按价格自动改派，也不会因数据缺失升级模型。配置 Critical Reviewer 或 Judge 只表示模型可用，业务代码仍会检查异常资格、独立上下文、调用收据与输出结构。

## 5. 常见分配方式

所有环节共用一个模型：

```json
"pipeline": {
  "input": "main",
  "vision": "main",
  "researcher": "main",
  "writer": "main",
  "evidenceVerifier": "main",
  "auditor": "main",
  "criticalReviewer": [],
  "judge": []
}
```

研究与审计分开：

```json
"pipeline": {
  "input": "fast",
  "vision": "vision",
  "researcher": ["research", "backup"],
  "writer": "writer",
  "evidenceVerifier": "audit",
  "auditor": "audit",
  "criticalReviewer": ["review"],
  "judge": ["judge"]
}
```

数组顺序属于任务身份。改变顺序只影响新任务，进行中的任务不会静默切换。

## 6. 配置检查

本地：

```powershell
pnpm models:check config/models.local.json
```

生产：

```bash
python -m python_backend.cli models-check config/models.production.json
```

成功结果包括：

```json
{
  "equivalent": true,
  "schemaVersion": 2,
  "models": 2,
  "stages": 8,
  "credentialsConfigured": true,
  "paidCalls": 0
}
```

检查只验证 JSON 结构、引用关系和密钥是否已配置，不调用模型、不消耗额度、不检查余额，也不宣称模型质量通过验收。

## 7. 配置生效与任务恢复

修改模型名、接口、密钥变量名、环节分配或数组顺序后重启服务。新任务固定新的模型管线；进行中的任务继续使用创建时保存的模型、连接身份、Knowledge 版本和研究截止日期。

如果当前配置与旧任务快照不兼容，平台会停止恢复并提示恢复原配置。只轮换同一 `apiKeyEnv` 的密钥值不会改变连接身份。

## 8. 生产部署

首次准备：

```bash
cp .env.production.example .env.production
cp config/models.example.json config/models.production.json
```

编辑两个生产文件后运行：

```bash
python -m python_backend.cli models-check config/models.production.json
python -m python_backend.cli pricing-check config/pricing.production.json
bash deploy.sh up
```

`deploy.sh` 通过 `compose.models.yaml` 将生产模型文件只读挂载到容器；检测到价格或预算生产文件时分别加入 `compose.pricing.yaml`、`compose.budget.yaml`。`.env.production`、模型、价格和预算生产文件都属于私有配置，不提交 Git、不写入镜像。

## 9. 外部数据与网页正文

后端可按环境启用 Tushare、LongPort 以及 Tavily/Brave 搜索发现：

```dotenv
TUSHARE_TOKEN=
LONGBRIDGE_APP_KEY=
LONGBRIDGE_APP_SECRET=
LONGBRIDGE_ACCESS_TOKEN=
WEB_SEARCH_ENABLED=false
TAVILY_API_KEY=
BRAVE_SEARCH_API_KEY=
WEB_RESEARCH_ISSUER_DOMAINS={"US:AAPL":["investor.apple.com"]}
```

Tushare 与 LongPort 记录只作为未核验的数据商补充，不能替代正式披露。主动网页研究仅把搜索结果用于发现候选 URL，模型摘要和搜索摘要不会进入证据；正文仅从监管/披露域名或按 `市场:代码` 显式绑定的发行人域名读取。读取后的公共正文进入带大小、期限和摘要校验的 MongoDB 归档。未配置凭证时对应数据源保持不可用并记录缺口，平台不会编造替代值。

Linux 生产镜像使用锁定的 LongPort 3.x SDK：行情和当前估值指标可用；该 SDK 未提供的历史估值、分红明细、回购和公司行动接口会明确形成缺口，并由正式披露来源补证。配置生产凭证后仍须验证账户行情权限、站点配额和网络策略。

## 10. 费用与缓存记录

费用估算是可选功能：

```dotenv
MODEL_TELEMETRY_ENABLED=true
MODEL_PRICING_FILE=./config/pricing.local.json
```

不配置价格时，平台仍可记录供应商实际返回的 token 与缓存用量，但金额保持未知。价格数据不会选择模型或限制研究。完整字段、身份生成、分时价格和生产挂载方式见[模型费用与缓存记录配置教程](cost-configuration-guide.md)。

当前配置已经移除：

```dotenv
RESEARCH_BUDGET_FILE=
FEATURE_RESEARCH_BUDGET=false
FEATURE_COST_ROUTER=false
```

新任务不会创建统一预算，也不会因为金额、工具轮次、网页请求、Vision 页数或持续时间达到预算而停止。网页、文件、并发、超时和上下文仍受代码中的安全边界约束。

## 11. 历史兼容

服务继续读取 schema v1 模型文件、modelState v1–v3 和旧任务已经保存的预算账本。历史预算记录只用于恢复、审计和防止不确定请求被重复执行；预算额度不再阻断后续研究，也不会修改历史记录。

V4.8–V5.2 的 Gateway、多模态、调用元数据、费用、缓存、关键复核和 Judge 业务能力继续保留。日常配置不再要求 MAIN/PRO、Challenger、Champion、A/B、策略注册表、策略版本、失效记录、acceptance 文件、preview 或 rollback 模型副本。

## 12. 常见错误

| 现象 | 处理 |
| --- | --- |
| 模型配置文件不存在 | 核对 `MODEL_CONFIG_FILE` 路径和容器挂载 |
| `credentialsConfigured: false` | 找到模型的 `apiKeyEnv`，在当前环境文件填写同名变量 |
| 环节引用不存在的别名 | 在 `models` 增加该模型，或修正 `pipeline` 引用 |
| Input/Vision 使用数组 | 改成单个模型别名 |
| 修改后仍显示旧模型 | 重启后端；进行中的任务仍使用原快照属于正常行为 |
| 费用一直未知 | 按费用教程配置匹配当前模型身份的真实价格 |
| 旧预算变量仍在 | 从私人 `.env` 删除 `RESEARCH_BUDGET_FILE` 与 `FEATURE_RESEARCH_BUDGET` |

## 13. 修改与回滚清单

修改前一起备份环境文件、模型 JSON 和可选价格文件。修改后依次完成：

1. 检查 JSON 中没有真实密钥；
2. 确认八个环节完整且引用存在；
3. 运行离线模型配置检查；
4. 安全结束正在执行的任务后重启服务；
5. 新建一项测试研究，核对页面显示的各环节模型；
6. 保留旧配置供历史任务恢复。

回滚时恢复配套的环境文件与模型 JSON，重新运行配置检查并重启。不要删除或改写历史任务、模型调用、费用、缓存、证据、审计、关键复核或 Judge 记录。
