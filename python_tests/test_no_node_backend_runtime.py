import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def test_node_http_service_entrypoints_are_removed():
    assert not (ROOT / "server").exists()
    assert not (ROOT / "server" / "index.mjs").exists()
    assert not (ROOT / "scripts" / "start-legacy.mjs").exists()
    runtime_files = [ROOT / "Dockerfile", ROOT / "package.json", ROOT / "scripts" / "dev.ts", ROOT / "compose.production.yaml"]
    for path in runtime_files:
        source = path.read_text(encoding="utf-8")
        assert "server/index.mjs" not in source
        assert "start-legacy.mjs" not in source
    assert '"start": "python -m uvicorn' in (ROOT / "package.json").read_text(encoding="utf-8")
    start = (ROOT / "start.ps1").read_text(encoding="utf-8")
    assert "python_backend.app:app" in start
    assert "server/index" not in start


def test_node_backend_dependencies_and_tests_are_removed():
    package = (ROOT / "package.json").read_text(encoding="utf-8")
    for dependency in ('"mongodb"', '"longbridge"', '"@napi-rs/canvas"', '"pdfjs-dist"'):
        assert dependency not in package
    for path in [ROOT / "tests", ROOT / "scripts"]:
        for source in path.rglob("*.ts"):
            assert "../server/" not in source.read_text(encoding="utf-8")

    benchmark_sources = [*ROOT.joinpath("benchmark").glob("*.ts"), *ROOT.joinpath("benchmark").glob("*.mjs")]
    assert benchmark_sources == []
    retired_fixtures = (
        "cost-budget-v51.json",
        "judge-v52.json",
        "model-comparison-offline-limits.json",
        "model-comparison-offline.json",
        "model-migration-baseline.json",
        "model-routing-offline-cases.json",
        "research-complexity-cases.json",
        "router-vision-migration-baseline.json",
        "vision-benchmark",
    )
    for name in retired_fixtures:
        assert not (ROOT / "tests" / "fixtures" / name).exists()


def test_production_stage_is_python_only():
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    final_stage = dockerfile.split("FROM python:3.12-slim-bookworm", 1)[1]
    assert "COPY server" not in final_stage
    assert "node " not in final_stage.lower()
    assert "COPY config ./config" in final_stage
    assert 'CMD ["python", "-m", "uvicorn"' in final_stage


def test_fastapi_entrypoint_uses_engineering_boundaries():
    entrypoint = (ROOT / "python_backend" / "app.py").read_text(encoding="utf-8")
    factory = (ROOT / "python_backend" / "api" / "factory.py").read_text(encoding="utf-8")
    assert "from .api.factory import create_app" in entrypoint
    assert "from .middleware import AccessPolicyMiddleware, RequestContextMiddleware" in factory
    assert "from ..application.ports import ModelGatewayPort, StoragePort" in factory
    assert "from ..application.research_service import ResearchService" in factory
    assert "from ..infrastructure.mongo_storage import MongoStorage" in factory
    assert "class EventHub" not in factory
    assert "os.getenv" not in factory


def test_every_removed_node_backend_module_has_one_reviewable_disposition():
    path = ROOT / "docs" / "releases" / "V5.3" / "node-python-parity-manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    modules = [source for entry in manifest["entries"] for source in entry["sourceModules"]]
    assert manifest["sourceModuleCount"] == 113 == len(modules) == len(set(modules))
    assert all(source.startswith("server/") and source.endswith(".mjs") for source in modules)
    assert hashlib.sha256(("\n".join(sorted(modules)) + "\n").encode()).hexdigest() == manifest["sourceInventorySha256"]
    for entry in manifest["entries"]:
        assert entry["status"] in {"migrated-and-consolidated", "excluded-unused-current-runtime"}
        if entry["status"] == "migrated-and-consolidated":
            assert entry["pythonOwners"] and all((ROOT / owner).is_file() for owner in entry["pythonOwners"])
        else:
            assert entry["pythonOwners"] == [] and entry["rationale"] and entry["runtimeEvidence"]

    active = manifest["activeRuntimeBaseline"]
    assert active["schemaVersion"] == 2
    config = ROOT / active["modelConfig"]
    assert hashlib.sha256(config.read_bytes()).hexdigest() == active["modelConfigSha256"]
    assert active["enabledStages"] == ["input", "vision", "researcher", "writer", "evidenceVerifier", "auditor"]
