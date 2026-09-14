# Linux 部署与升级

生产运行时为 Python 3.12 + FastAPI/Uvicorn，Node 只存在于镜像的前端构建阶段。服务器需要 Docker Engine、Docker Compose v2、Bash、flock 和 sha256sum。

## 首次部署

```bash
cp .env.production.example .env.production
cp config/models.example.json config/models.production.json
# 填写数据库、模型密钥和 PUBLIC_ORIGINS
bash deploy.sh up
```

应用默认绑定 `127.0.0.1:3001`。公网访问应由带认证的 HTTPS 反向代理转发，并把浏览器 Origin 写入 `PUBLIC_ORIGINS`。应用自身不提供多用户身份系统。

`MAX_REQUEST_BYTES`、`API_RATE_LIMIT_PER_MINUTE`、`API_TIMEOUT_SECONDS` 与 `TASK_LEASE_SECONDS` 控制单实例请求和长任务边界。任务运行期间会续租；续租失败会中止执行，避免另一实例重复处理同一任务。扫描 PDF 通过容器内 Poppler 渲染后交给 `vision` 模型，结果始终标为待复核。

## 升级

```bash
bash deploy.sh upgrade
bash deploy.sh status
bash deploy.sh logs
```

脚本先构建新镜像，再停止应用写入、备份 MongoDB、运行 `python -m python_backend.cli db-migrate`，最后启动并等待 `/api/health`。Python 迁移定义位于 `python_backend/infrastructure/mongo_storage.py`，版本必须连续且幂等；已发布迁移不得重排或改名。结构变化采用新增、兼容读取、新写入、验证回填、切换、后续清理的顺序。

## 备份与回滚

```bash
bash deploy.sh backup
bash deploy.sh rollback backups/实际文件名.archive.gz --confirm-data-loss
```

备份保存在 `backups/`，带 SHA-256 与旧镜像记录。回滚会覆盖备份之后的数据，必须显式提供 `--confirm-data-loss`。不要删除生产卷或仍被备份引用的镜像。

## 本地运行

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
pnpm install
pnpm build
.\start.ps1
```

开发模式运行 `pnpm dev`，Vite 提供前端热更新，Uvicorn 监听 `python_backend/` 的 Python 代码变化。

## 验证

```bash
python -m pytest python_tests
python -m ruff check python_backend python_tests benchmark
python -m mypy python_backend benchmark
python -m benchmark.runner
pnpm test
pnpm typecheck
pnpm build
```

Linux Docker 演练使用 `bash tests/deploy.integration.sh`。该测试创建隔离 Compose 项目并验证构建、数据库保留、备份、回滚、健康检查和迁移失败处理；按照仓库规则，只有明确要求完整部署验收时才运行。

模型定义位于私有的 `config/models.production.json`，凭据只通过环境变量注入。`python -m python_backend.cli models-check` 仅检查配置，不调用模型。Knowledge 备份和激活分别使用 `python -m python_backend.cli knowledge-backup` 与 `knowledge-activate`。

可选的 `config/pricing.production.json` 存在时，`deploy.sh` 会自动加入 `compose.pricing.yaml`，只读挂载文件并设置容器内 `MODEL_PRICING_FILE`；文件不存在时不会创建空目录或启用费用估算。部署前可运行 `python -m python_backend.cli pricing-check config/pricing.production.json`。

可选的 `config/research-budget.production.json` 存在时，`deploy.sh` 会自动加入 `compose.budget.yaml` 并只读挂载。预算是否生效仍由 `.env.production` 的 `RESEARCH_BUDGET_MODE` 决定；建议先使用 `dry-run`，确认实际资源分布后再切换为 `enforce`。
