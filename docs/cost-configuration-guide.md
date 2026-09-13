# 模型费用与缓存记录配置教程

当前平台保留 V5.1 的模型用量、费用估算与缓存统计，已经取消可配置研究预算、预算阻断和预算压力下的检索缩减。费用数据只用于记录与展示，不选择模型，也不会因为价格高低改变研究环节。

## 1. 当前配置入口

费用相关只保留一个可选环境变量：

```dotenv
MODEL_PRICING_FILE=
```

| 状态 | 行为 |
| --- | --- |
| 留空 | 正常研究；继续记录供应商实际返回的 token 与缓存用量，金额保持“未知” |
| 指向有效价格文件 | 按调用时点、模型连接和价格版本估算金额 |
| 路径错误或 JSON 无效 | 使用价格时明确报错，不把缺失价格当作零 |

`MODEL_TELEMETRY_ENABLED=true` 控制调用元数据记录。记录只包含模型身份、环节、时间、状态、用量和费用等安全字段，不保存提示词、资料正文、图片、密钥或隐藏推理。

以下入口已经退出当前配置：

```dotenv
RESEARCH_BUDGET_FILE=
FEATURE_RESEARCH_BUDGET=false
FEATURE_COST_ROUTER=false
```

新任务不再创建统一 `budgetState`，不会因模型金额、工具轮次、网页请求、Vision 页数或研究时长达到预算而停止。历史任务中已保存的预算账本继续保留并校验，用于恢复与审计，但额度不再阻断执行，也不会触发预算压力检索复用。

网页读取次数、文件大小、请求超时、并发和模型总时限仍是平台的运行安全边界，它们不是研究预算配置。

## 2. 本地启用费用估算

先创建不会覆盖已有文件的本地价格副本：

```powershell
if (-not (Test-Path -LiteralPath 'config/pricing.local.json')) {
  Copy-Item -LiteralPath 'config/pricing.example.json' -Destination 'config/pricing.local.json'
}
```

然后在 `.env` 中设置：

```dotenv
MODEL_TELEMETRY_ENABLED=true
MODEL_PRICING_FILE=./config/pricing.local.json
```

修改后重启后端。价格文件不保存 API Key，也不代替 `config/models.local.json`。

## 3. 价格文件结构

公共模板是空价格历史：

```json
{
  "schemaVersion": 1,
  "entries": []
}
```

空列表合法，表示没有经过核实的费率。平台不会联网猜价格；套餐、包月额度或按次数计费也不能擅自换算成 token 单价。

完整记录示例：

```json
{
  "schemaVersion": 1,
  "entries": [
    {
      "profileId": "configured-deepseek",
      "connectionIdentity": "0000000000000000000000000000000000000000000000000000000000000000",
      "recordedAt": "2026-09-12T00:00:00.000Z",
      "pricing": {
        "schemaVersion": 1,
        "version": "replace-with-verified-version",
        "effectiveFrom": "2026-09-12T00:00:00.000Z",
        "effectiveTo": null,
        "currency": "CNY",
        "unit": "per-million-tokens",
        "input": null,
        "output": null,
        "cacheRead": null
      }
    }
  ]
}
```

示例中的连接哈希、日期、版本与费率都是占位值，不能直接作为真实价格使用。

| 字段 | 说明 |
| --- | --- |
| 外层 `schemaVersion` | 价格注册表格式，当前为 `1` |
| `profileId` | schema v2 模型别名加 `configured-` 前缀，例如别名 `deepseek` 对应 `configured-deepseek` |
| `connectionIdentity` | 由协议、规范化接口地址和模型名生成的 SHA-256，不包含密钥 |
| `recordedAt` | 实际获知并录入价格的时间 |
| `pricing.schemaVersion` | 普通价格为 `1`，分时价格为 `2` |
| `version` | 当前模型连接下唯一的价格版本 |
| `effectiveFrom` / `effectiveTo` | 含起点、不含终点的生效区间；`null` 表示尚未结束 |
| `currency` | 三位大写币种，例如 `CNY`、`USD`；平台不自动换汇 |
| `unit` | 固定为 `per-million-tokens` |
| `input` | 每百万非缓存输入 token 单价 |
| `output` | 每百万输出 token 单价 |
| `cacheRead` | 每百万缓存命中输入 token 单价 |

费率可以填写非负数或 `null`。只有供应商明确免费时才填 `0`。推理 token 如果已经包含在输出用量中，不重复计费。时间必须使用带毫秒的 UTC 格式，例如 `2026-09-12T00:00:00.000Z`。

## 4. 获取当前模型身份

在项目根目录运行以下只读命令。它不会请求模型，也不会输出接口地址或密钥：

```powershell
@'
import {modelEnvironment} from './server/model-config.mjs';
import {createPipelineModelCatalog} from './server/model-catalog.mjs';
import {modelConnectionIdentity} from './server/model-connection.mjs';
const env = modelEnvironment(process.env);
console.log(JSON.stringify(createPipelineModelCatalog(env).profiles.map(profile => ({
  profileId: profile.id,
  model: profile.model,
  connectionIdentity: modelConnectionIdentity(profile, env)
})), null, 2));
'@ | node --env-file-if-exists=.env --input-type=module
```

把输出的 `profileId` 和 `connectionIdentity` 原样写入价格记录。修改模型名、接口地址或协议后身份会变化；只轮换同一个 `apiKeyEnv` 对应的密钥不会改变身份。

## 5. 分时价格

仅当供应商确实按时段提供不同 token 价格时使用 `pricing.schemaVersion: 2`，并在完整 pricing 对象中加入：

```json
{
  "timezone": "Asia/Shanghai",
  "tiers": [
    {
      "id": "offpeak",
      "startMinute": 0,
      "endMinute": 360,
      "input": null,
      "output": null,
      "cacheRead": null
    }
  ]
}
```

该例表示当地 00:00–06:00，含起点、不含终点。22:00–次日 06:00 使用 `startMinute: 1320`、`endMinute: 360`。时段不能重叠；未命中时段时使用基础费率。平台不会等待低价时段，也不会修改研究截止日期。

## 6. 离线检查

检查模型配置：

```powershell
pnpm models:check config/models.local.json
```

检查价格文件格式：

```powershell
@'
import {loadPricingRegistry} from './server/model-pricing.mjs';
const registry = loadPricingRegistry('./config/pricing.local.json');
console.log(JSON.stringify({valid: true, entries: registry.entries.length, modelRequests: 0}));
'@ | node --input-type=module
```

这些检查不会调用模型，不检查账户余额，也不能证明填入的费率真实。`entries: 0` 只表示空文件格式有效。

## 7. 生产配置

建立生产私有副本：

```bash
cp config/pricing.example.json config/pricing.production.json
```

在 `.env.production` 填容器内路径：

```dotenv
MODEL_TELEMETRY_ENABLED=true
MODEL_PRICING_FILE=/app/config/pricing.production.json
```

在实际 Compose 配置的 `services.app.volumes` 中加入只读挂载：

```yaml
- ./config/pricing.production.json:/app/config/pricing.production.json:ro
```

`pricing.production.json` 是私有运营配置，不提交 Git、不写入镜像。更新后重建应用容器，新调用使用当时生效的价格；已保存的历史费用不会被新费率重算。

## 8. 页面和接口怎么看

研究详情中的“模型费用与缓存”展示：

- 已记录模型调用次数；
- 按币种分开的已知估算金额；
- 费用未知的调用数量；
- 各研究环节的调用与金额；
- 供应商实际返回的缓存输入用量。

`GET /api/jobs/:id/cost` 返回同一份白名单数据，不返回价格文件路径、连接哈希、提示词、资料正文、密钥或隐藏推理。不同币种不会相加；用量缺失或费率未知时，金额继续显示为未知。

## 9. 更新价格与回滚

价格发生变化时保留旧记录，为旧窗口填写真实 `effectiveTo`，再新增不重叠的新版本。不要修改历史 `recordedAt`，也不要用今天获知的价格倒算过去的任务。

回滚只需恢复上一份价格文件和对应的 `MODEL_PRICING_FILE` 路径后重启服务。回滚不会改写已保存的费用、调用记录、缓存用量、模型快照、研究截止日或证据。

## 10. 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 页面显示费用未知 | 未配置价格、身份不匹配、费率为 `null`，或供应商没有返回可靠用量 |
| 配置了价格仍未匹配 | 核对 `configured-<模型别名>`、连接身份、生效时间和当前模型文件 |
| 缓存 token 为未知 | 供应商没有返回可验证的缓存用量；平台不会推测 |
| 同一任务出现多种币种 | 各币种分别展示，不自动换汇 |
| 修改文件后没有生效 | 重启后端或重建生产应用容器 |
| 旧预算字段仍存在于私人环境 | 删除 `RESEARCH_BUDGET_FILE` 和 `FEATURE_RESEARCH_BUDGET`；当前运行时不会再为新任务创建预算 |
