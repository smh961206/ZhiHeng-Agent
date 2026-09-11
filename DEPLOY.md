# Linux 部署与升级

服务器需安装 Docker Engine、Docker Compose v2（支持 `up --wait`）、Bash、flock、sha256sum。单实例部署，建议至少 2 核 / 4GB 内存。MongoDB 8 的 CPU/平台要求应在选机时确认。

## 首次部署

将项目代码完整上传至服务器固定目录（不上传 node_modules、.env、data、dist）。执行：

```bash
cp .env.production.example .env.production
cp config/models.example.json config/models.production.json
nano .env.production
nano config/models.production.json
bash deploy.sh up
```

在环境文件填写 LLM_API_KEY，在 JSON 文件填写模型、接口和能力。无配置文件时脚本会生成模板并退出，不会猜测密钥。项目不需要在服务器安装 Node.js；镜像构建包含前端编译和生产依赖安装。首次构建需要访问容器镜像与 npm 仓库。

可选数据源在 `.env.production` 配置 `TUSHARE_TOKEN` 与长桥的 `LONGBRIDGE_APP_KEY`、`LONGBRIDGE_APP_SECRET`、`LONGBRIDGE_ACCESS_TOKEN`。长桥凭证完整时优先为适用标的提供行情与股本，并按权限补充港美股基本面；Tushare 提供三市场结构化财务及A股股东回报、股本和历史估值。官方披露仍由巨潮、港交所和SEC读取，网页正文按已配置的搜索服务与资料缺口补充；具体覆盖取决于任务及账户权限。Compose 已通过 `env_file` 注入这些变量。长桥 SDK 含原生模块，沿用项目的 Debian/glibc 镜像；不要直接改用 Alpine。配置和验证说明见 [README 的可选数据源章节](README.md#可选接入长桥行情基本面与-tushare-财务数据)。修改凭证后需重建应用容器使新环境生效。

默认仅绑定服务器 127.0.0.1:3001。电脑端运行 `ssh -L 3001:127.0.0.1:3001 user@server` 后打开 http://127.0.0.1:3001。提供域名访问时，在外层配置带认证的 HTTPS 反向代理，转发到 127.0.0.1:3001，保留 Host，并把浏览器地址写入 `PUBLIC_ORIGINS=https://research.example.com`。该变量是访问来源白名单，不是用户认证。应用没有多用户鉴权，数据库不映射宿主机端口。仅在受控内网且已有访问控制时修改 BIND_ADDRESS。

生产 Compose 独立于本地开发 compose.yaml，固定项目名 zhiheng-production；持久化卷为 zhiheng-production_mongodb_data 和 zhiheng-production_mongodb_config。生产数据库名固定 zhiheng_agent。首次部署不会自动复制本机 MongoDB；如需搬迁现有数据，停本机写入后用 mongodump / mongorestore 导入生产库再启动应用。

## 后续代码和结构升级

将新版代码同步到相同目录，保留 `.env.production`、`config/models.production.json`、`.deploy/`、`backups/`；Git 项目也可先拉取经过审核的发布版本。然后：

```bash
bash deploy.sh upgrade
bash deploy.sh status
bash deploy.sh logs
```

脚本先构建唯一版本镜像，构建失败不影响旧服务。随后检查数据库健康、停止应用写入、创建压缩备份及校验和、保留旧镜像标签、执行数据库迁移、启动应用并等待健康检查。升级存在短暂停机，未完成研究任务在重启后会标记失败，需要重新提交。不要同时运行其他写入相同数据库的应用实例，也不要绕过脚本手动重建数据库容器。

迁移在 `server/schema-migrations.mjs` 按版本连续追加：增加 `{version:2,name:'...',async up(db){...}}`，不得改名、重排或修改已发布迁移。既有数据库首次接入时记录 v1 并确保原有索引，不删除任务。每步完成后写入 schema_migrations；失败步骤不记成功，下次重试。MongoDB DDL 不具备整批事务回滚，因此每步必须幂等，优先新增字段、分阶段回填、最后再清理旧字段。测试中应覆盖旧数据升级和中途失败重试。

数据库锁阻止同时迁移，代码拒绝比自身更新或不匹配的数据库版本。进程崩溃可能留下 schema_locks 锁；先停止应用并确认不存在迁移容器，再检查上次迁移，最后才可手动清理：

```bash
bash deploy.sh stop
docker compose --env-file .env.production -f compose.production.yaml ps -a
docker compose --env-file .env.production -f compose.production.yaml exec mongodb mongosh zhiheng_agent --eval 'db.schema_locks.deleteOne({_id:"upgrade"})'
bash deploy.sh upgrade
```

## 备份与失败恢复

模型原页视图另外保存在 `visual_attachments` 持久卷（容器内 `/app/data/visual-attachments`）。重新创建应用容器会保留此卷。现有 `deploy.sh backup` 仅备份 MongoDB，迁移服务器时还需复制此卷；原页缺失不会冒充视觉审计完成，而会在研究中记录未纳入原因。

```bash
bash deploy.sh backup
# 仅在明确接受丢弃备份之后的数据时执行：
bash deploy.sh rollback backups/实际文件名.archive.gz --confirm-data-loss
```

备份会短暂停止应用，保存在 backups/，配有 .sha256 和旧镜像 .image 记录。升级或健康检查失败会返回非零，不会自动降级数据库。可修复后重试 upgrade，或显式回滚。回滚先验证原备份和旧镜像存在，再备份当前数据库、删除当前应用库、恢复原备份并启动配套旧镜像；删除数据库用于避免新版本新增集合残留。首次空库备份没有旧镜像，因此不能用作代码回滚目标。恢复失败时应用保持停止，应修复原因后重试。

不要删除持久化卷或执行 `down -v`。不要清理仍被备份引用的镜像；镜像标签不会自动过期。将备份、.env.production、config/models.production.json 和所需镜像另存到服务器外，定期在独立环境演练恢复。此方案覆盖应用集合、字段和索引升级；MongoDB 服务端大版本升级需另行遵循官方兼容性和 FCV 流程，不能只替换镜像标签。

参考：[Compose 启动顺序](https://docs.docker.com/compose/how-tos/startup-order/)、[MongoDB 备份与恢复](https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/)。

## 开发验证

财报解析依赖随镜像安装的 PDF.js CMap/字体/WASM、`@napi-rs/canvas` 和 Tesseract 中英文模型包，部署时不要移除这些生产依赖。OCR仅在后端本地运行，不需新增密钥或运行时下载语言模型；容器需保留可写临时目录供本地识别使用。默认每份PDF最多识别4页，超过预算保留缺口。解析版本变化会重新读取并归档原件，网络失败时回退旧版文本并明确限制，不要删除现有缓存来强行刷新。

主动网页补充使用 `.env.production` 中的 `TAVILY_API_KEY`，`BRAVE_SEARCH_API_KEY` 为可选备用；`WEB_SEARCH_ENABLED=false` 可关闭。密钥不放进前端变量，更新后按正常升级流程重启应用。`GET /api/config` 的 `webSearch` 只返回配置状态和预算，不返回密钥。公司官网身份绑定可设置 `WEB_RESEARCH_ISSUER_DOMAINS`，具体流程、归档期限和联网验证见 README 的“主动网页补充”。搜索失败会保留缺口，不替代固定行情或官方报告采集。

`pnpm test` 验证业务和域名访问限制；`pnpm test:mongodb` 在随机临时库验证数据保存、迁移幂等、迁移锁、失败重试及禁止结构降级。Linux 上运行 `bash tests/deploy.integration.sh` 会创建独立 Compose 项目，演练首次部署、升级保留数据、备份与回滚、新集合清理、构建失败和迁移失败；结束后只删除该测试项目的容器及数据卷。

修改 APP_PORT 后，如浏览器使用非默认端口，请将完整访问 origin 也加入 PUBLIC_ORIGINS，例如 `http://127.0.0.1:8080`。独立 backup 操作仅恢复原先运行中的应用，已停止的应用保持停止；维护阶段健康检查失败也会停止应用。

## 可选模型策略配置

生产环境只使用 `.env.production` 保存凭据、运行参数、策略开关和批准路径，使用 `config/models.production.json` 保存模型定义。模板内发布开关关闭、批准路径为空；正式启用仍需匹配的质量验收及容器可读的批准文件，不能把填写模型当成通过验收。


### 生产配置的加载

完整字段说明、生产示例、检查结果解释和回滚步骤见 [配置使用说明与教程](docs/configuration-guide.md)。

统一模型文件为可选入口。先执行 `node --env-file-if-exists=.env.production scripts/model-config.mjs --preview --out config/models.production.preview.json`，再用同一环境文件执行 `scripts/model-config.mjs --check config/models.production.preview.json`。不要把本地配置覆盖到生产。

完成生产审核后再将预览文件发布为 `config/models.production.json`。`deploy.sh` 检测到这个确切文件时会添加 `compose.models.yaml`，只读挂载至容器并设置 `MODEL_CONFIG_FILE`；预览文件不会触发切换。本次已验证的环境文件移除了重复模型定义；旧入口仍兼容未迁移部署。回退前从受控回滚文件恢复原定义和原选择器，再撤下正式模型文件；历史任务和审批记录不删除。升级与备份时同时保留受控的实际模型配置文件。

`.env.production` 和 `config/models.production.json` 必须存在。旧部署的环境变量入口仍兼容。

Compose 的显式 environment 设置继续优先。实际环境和模型文件均不进入 Git 或镜像；修改后按正常部署流程重建应用容器。
