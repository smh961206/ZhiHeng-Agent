# FastAPI 生产运行手册

## 启动

```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
pnpm build
.\start.ps1
```

直接启动：

```powershell
.venv\Scripts\python.exe -m uvicorn python_backend.app:app --host 127.0.0.1 --port 3001
```

开发模式使用 `pnpm dev`；它只协调 Vite 与 Uvicorn，不提供 Node HTTP 服务。

## 检查

- `GET /api/health`：MongoDB 就绪状态。
- `GET /api/config`：模型、Knowledge 与公开能力状态，不返回密钥。
- `python -m python_backend.cli models-check`：离线模型配置检查。
- `python -m python_backend.cli knowledge-backup`：创建不可变快照。
- `python -m python_backend.cli knowledge-activate`：校验并激活快照。
- `python -m python_backend.cli db-migrate`：执行数据库初始化、迁移和中断恢复。

## 故障处理

数据库不可用时保持未就绪，不切换文件存储。模型配置失败时不打印密钥。行情、文档或 Web 证据失败时保留缺口、来源与原时间。任务重启只能使用范围、Knowledge 和执行版本一致的检查点。

## 回滚

代码回滚使用已保留镜像；数据回滚必须使用 `deploy.sh rollback ... --confirm-data-loss` 并校验备份哈希。已发布结构迁移不得在原位修改，后续版本采用补偿迁移。

## 验证命令

```powershell
.venv\Scripts\python.exe -m pytest python_tests
.venv\Scripts\python.exe -m ruff check python_backend python_tests
.venv\Scripts\python.exe -m mypy python_backend
pnpm test
pnpm typecheck
pnpm build
pnpm test:routes
```
