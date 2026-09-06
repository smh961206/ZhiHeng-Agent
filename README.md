# 知衡 · 价值投资研究 Agent

React + Node.js。将V4.1 CORE/FULL转为六类研究任务、证据检索、估值工具和模型审计。只使用自动抓取的数据，不预置研究结果。

## 启动

Linux Docker 一键部署、代码更新、数据库版本迁移与备份回滚见 [部署文档](DEPLOY.md)。配置 `.env.production` 后执行 `bash deploy.sh up`，后续执行 `bash deploy.sh upgrade`。

要求 Node.js **22.13+**、pnpm、已启动的 Docker Desktop（Linux 容器）。

```powershell
pnpm install
Copy-Item .env.example .env
pnpm db:up
# 在.env配置模型后运行
pnpm dev
```

开发页面 `http://127.0.0.1:5173`，后端 `http://127.0.0.1:3001`。

```powershell
pnpm build
pnpm start
```

构建后统一使用 `http://127.0.0.1:3001`。Windows也可运行 `./start.ps1`，优先系统Node，找不到时使用本机已有Codex Node运行时。本应用仅监听本机，无多用户鉴权，不应直接暴露到公网。

必须填写 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`。模型需支持Chat Completions工具调用。密钥只在后端读取；问题、组合上下文和相关财报片段会发送给配置的模型服务。未配置模型直接报错。可设置 `SEC_USER_AGENT=应用名 真实联系邮箱` 以符合SEC来源访问要求。

## 使用与数据源

填写研究问题，添加最多3个证券代码（A股6位、港股1～5位、美股Ticker）。“查看行情”预览快照；“开始研究”重新获取行情并自动抓取官方财报。任务支持取消、执行轨迹、历史搜索、重载输入和Markdown导出。

| 市场 | 行情 | 官方财报 |
|---|---|---|
| A股 | 东方财富公开行情 | 巨潮官方代码目录、定期报告目录、PDF下载和逐页提取 |
| 港股 | 东方财富公开行情 | 巨潮官方平台港股披露、年报/中期报告等PDF |
| 美股 | Yahoo Finance公开行情，腾讯独立备用源 | SEC公司代码检索、Submissions目录、Company Facts官方XBRL核心事实 |

行情是**最新可得快照，可能延迟**，不是交易所逐笔直连。行情时间与抓取时间分开记录，休市显示最近交易行情。行情币种与财报币种分别验证，不默认港股财报为HKD。未核实口径的行情PE不自动用于估值。

财报历史范围3/5/8年；初筛读取最近披露加最近年报，其余模式读取最近4份披露加所选年数年报，股东回报默认8年。巨潮A股最多6页、港股每关键词3页，SEC最多补充2个历史目录；触及范围会标记，不保证所有历史覆盖。

PDF单文件32MB、解析90秒、最多600页/150万字符，记录页码和截断。扫描页不OCR，表格布局可能丢失，关键数字需核对原文。正文按URL缓存7天，保留下载时间、SHA256与页数；行情和披露目录重新查询。界面仅预览前12000字符，模型可检索已提取全文。

美股读取**官方XBRL核心财务数据，不是完整财报正文**。覆盖10-K、10-Q、20-F、40-F及修订；保留标签、单位、期间、比较期、申报号，不自动拼接TTM。6-K、管理层讨论、全部附注和未映射标签不在当前自动覆盖范围。来源页提供官方申报原件链接。

来源403/429、接口变化、抓取或解析失败均明确报错，不绕过限制、不编造数据。任一标的完全没有可读官方财报时停止模型研究；部分失败保留缺口。公开接口没有服务可用性保证，长期生产使用应接入授权数据商。

## 架构

- `src/main.jsx`、`DataConnect.jsx`：工作台、三市场证券输入、行情、报告和历史。
- `server/market-data.mjs`：来源白名单、超时/大小限制、SEC节流、代码匹配、抓取和缓存。
- `server/pdf-worker.mjs`：独立线程提取PDF，支持超时和取消。
- `server/agent.mjs`：10轮工具调用上限、证据检索、FULL规则检索、模型审计、来源ID检查。
- `server/calculations.mjs`：P2三公式、N修正、价格锚/ROE敏感性、FCFF/FCFE DCF、收益率锚。
- `server/index.mjs`：HTTP、任务管理、取消和静态资源。
- `server/storage.mjs`：MongoDB 任务索引、GridFS 完整任务内容、财报缓存及7天过期索引。
- `knowledge/`：用户原始CORE/FULL副本；`data/`：旧版 JSON 数据，只用于迁移，保留原文件。

## MongoDB 持久化

`compose.yaml` 部署官方 `mongo:8.0`，仅映射 `127.0.0.1:27017`，使用 Docker 命名卷 `zhiheng-agent_mongodb_data` 和 `zhiheng-agent_mongodb_config`，自动重启策略为 `unless-stopped`。本地开发不设数据库认证，请勿将端口暴露到公网。

默认连接 `mongodb://127.0.0.1:27017`，数据库 `zhiheng_agent`；可通过 `.env` 中的 `MONGODB_URI`、`MONGODB_DATABASE` 修改。数据库不可用时后端启动失败，不回退到文件存储。`GET /api/health` 检查实时数据库连接。

后端每次启动会导入 `data/*.json` 研究任务和 `data/cache/*.json` 未过期缓存。已有任务不会覆盖，旧文件不会删除；损坏文件会明确报错并阻止启动，修复后可重试。也可独立执行 `pnpm db:migrate`。请只运行一个后端实例；重启时将遗留的排队/运行任务标记为中断失败。

任务摘要保存在 `jobs`，完整任务保存在 `job_payloads.files/chunks`，支持超过16MB的研究资料；历史内容版本保留以保障并发读取。财报正文保存在 `report_cache`，读取立即过滤过期数据，TTL 索引异步清理。只有正在运行或保存失败的任务保留在内存供界面查看。

`pnpm db:stop` 停止数据库，`pnpm db:up` 恢复。普通容器重建保留数据；不要执行 `docker compose down -v`，该命令会删除持久化卷。备份可使用容器中的 `mongodump`，恢复使用 `mongorestore`。

`pnpm test:mongodb` 在随机命名的临时数据库验证大文本、重连持久化、任务恢复、缓存过期和幂等迁移，结束后清理测试数据库。实现参考 [MongoDB GridFS 文档](https://www.mongodb.com/docs/drivers/node/current/crud/gridfs/) 和 [MongoDB 官方镜像](https://hub.docker.com/_/mongo)。

业务适配和大部分研究审计仍由模型执行。数值工具不认证事实，官方采集不代表全部假设已核实。跨币种、正常化、历史覆盖、P2行业适配仍需复核；没有完整组合上下文不得输出具体权重。

## API与验证

- `GET /api/config`：非敏感配置。
- `POST /api/quotes`：`{securities:[{market:"CN"|"HK"|"US",symbol}]}`，逐标的返回行情或错误。
- `POST /api/jobs`：`{question,mode:"auto"|"A".."F",depth:"Quick"|"Standard"|"Deep",portfolio,securities,historyYears:3|5|8}`。
- `GET /api/jobs`、`GET /api/jobs/:id`、`POST /api/jobs/:id/cancel`：列表、详情与取消。

`pnpm test` 覆盖公式、输入、行情精度、来源安全、XBRL期间和模拟工具闭环。测试常量只存在于测试文件，不进入应用。


ode scripts/data-smoke.mjs` 做真实三市场抓取测试，将元数据写入 `artifacts/data-smoke.json`，不调用模型、不建立研究任务。`scripts/smoke.mjs` 是可选Playwright真实行情界面测试，设置 `PLAYWRIGHT_MODULE` 为已安装Playwright入口。

依据：[巨潮资讯](https://www.cninfo.com.cn/new/index)、[SEC官方API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)、[PDF.js](https://mozilla.github.io/pdf.js/examples/)、[OpenAI接口](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)。
`LLM_TIMEOUT_MS` 控制单次模型请求超时，默认300000毫秒、允许30000～600000毫秒。审计使用独立精简上下文；未审计草稿不会作为最终报告展示。

## 问题自动填充与界面
输入公司名称或股票代码后，系统防抖查询巨潮与SEC官方证券目录，自动填入A股、港股、美股标的；两地上市或多股类会要求选择，无法识别时可手动调整。修改问题会清除旧的自动结果；手动调整后须点击“恢复自动识别”才恢复联动。点击“开始研究”后抓取行情与官方财报。

`POST /api/securities/resolve` 接收 `{question}`，返回证券、歧义候选、未识别项和来源警告。单次最多3个标的。

界面使用 [shadcn/ui](https://ui.shadcn.com/docs/installation/vite)、Radix与Tailwind，桌面侧栏和手机抽屉导航自适应；前端不再提供模型配置模块，模型参数统一在后端环境变量管理。

