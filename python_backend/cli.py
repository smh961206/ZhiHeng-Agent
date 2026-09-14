from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

from .application.knowledge import KnowledgeStore
from .config import Settings
from .domain.research_budget import ResearchBudgetError, load_configuration
from .infrastructure.model_gateway import ModelConfigurationError, ModelGateway
from .infrastructure.model_pricing import PricingRegistry
from .infrastructure.mongo_storage import MongoStorage


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m python_backend.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("knowledge-backup")
    activate = commands.add_parser("knowledge-activate")
    activate.add_argument("--allow-rollback", action="store_true")
    models = commands.add_parser("models-check")
    models.add_argument("path", nargs="?")
    commands.add_parser("models-identities")
    pricing = commands.add_parser("pricing-check")
    pricing.add_argument("path", nargs="?")
    budget = commands.add_parser("budget-check")
    budget.add_argument("path", nargs="?")
    openapi = commands.add_parser("openapi-export")
    openapi.add_argument("--output", required=True)
    commands.add_parser("db-migrate")
    return parser


async def _database(settings: Settings) -> None:
    storage = MongoStorage(settings.mongodb_uri, settings.mongodb_database)
    try:
        await storage.initialize()
    finally:
        await storage.close()


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    settings = Settings.from_env()
    if args.command == "knowledge-backup":
        snapshot, created = KnowledgeStore(settings.root).backup()
        if created:
            print(f"已备份 Knowledge {snapshot.version}：{snapshot.snapshot_id}")
        return 0
    if args.command == "knowledge-activate":
        snapshot, activated = KnowledgeStore(settings.root).activate(allow_rollback=args.allow_rollback)
        print(f"{'已激活' if activated else '已经激活'} {snapshot.version}：{snapshot.snapshot_id}")
        return 0
    if args.command == "pricing-check":
        path_value = args.path or settings.model_pricing_file
        registry = PricingRegistry(Path(path_value).resolve() if path_value else None)
        if registry.error:
            raise ModelConfigurationError("价格配置格式无效：" + registry.error)
        if registry.path is None:
            raise ModelConfigurationError("尚未配置价格文件")
        print(f"价格配置结构有效；记录数：{len(registry.entries)}")
        return 0
    if args.command == "budget-check":
        path_value = args.path or settings.research_budget_file
        if not path_value:
            raise ResearchBudgetError("尚未配置研究预算文件")
        configuration = load_configuration(Path(path_value).resolve(), "dry-run")
        if configuration is None:
            raise ResearchBudgetError("研究预算配置无效")
        print("研究预算配置结构有效")
        return 0
    if args.command == "openapi-export":
        from .app import app

        output = Path(args.output).resolve()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(app.openapi(), ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"OpenAPI schema written to {output}")
        return 0
    if args.command in {"models-check", "models-identities"}:
        config_file = getattr(args, "path", None) if args.command == "models-check" else None
        gateway = ModelGateway(
            settings.root,
            config_file=config_file or settings.model_config_file,
            pricing_file=settings.model_pricing_file,
            idle_timeout_ms=settings.llm_timeout_ms,
            timeout_ms=settings.llm_max_duration_ms,
        )
        status = gateway.status()
        if status["configurationError"]:
            raise ModelConfigurationError("模型配置格式或引用无效")
        if gateway.pricing.error:
            raise ModelConfigurationError("价格配置格式无效")
        if args.command == "models-identities":
            identities = {
                item["key"]: {"model": item["model"], "connectionIdentity": item["connectionIdentity"]}
                for rows in gateway.pinned_state()["assignments"].values()
                for item in rows
            }
            print(json.dumps(identities, ensure_ascii=False, indent=2))
        else:
            print("模型配置结构有效；密钥配置状态：" + ("完整" if status["configured"] else "不完整"))
        return 0
    if args.command == "db-migrate":
        asyncio.run(_database(settings))
        print("MongoDB 迁移与恢复检查完成")
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
