import hashlib
import json
from pathlib import Path

import pytest

from python_backend.application.knowledge import KnowledgeSession, KnowledgeStore


def _write_tree(root: Path, version: str = "K1.0.0") -> None:
    knowledge = root / "knowledge"
    rule = knowledge / "modules" / "rules" / "01-rule.md"
    rule.parent.mkdir(parents=True)
    entry = f'---\n  knowledge_version: "{version}"\n---\n# Entry\n'
    text = "# Rule\n\nEvidence before conclusions.\n"
    (knowledge / "ENTRY.md").write_bytes(entry.encode())
    rule.write_bytes(text.encode())
    catalog = {
        "schemaVersion": 3,
        "knowledgeVersion": version,
        "updatedAt": "2026-09-14",
        "entry": "knowledge/ENTRY.md",
        "modules": [
            {
                "id": "01-rule",
                "source": "rules",
                "chapter": 1,
                "title": "Rule",
                "path": "knowledge/modules/rules/01-rule.md",
                "bytes": len(text.encode()),
                "sha256": hashlib.sha256(text.encode()).hexdigest(),
                "originalLine": 1,
                "sections": [{"level": 1, "title": "Rule", "line": 1, "index": 0, "endLine": 3}],
            }
        ],
    }
    (knowledge / "modules.json").write_text(json.dumps(catalog, ensure_ascii=False), encoding="utf-8")


def test_backup_open_and_activate_are_immutable(tmp_path):
    _write_tree(tmp_path)
    store = KnowledgeStore(tmp_path)
    snapshot, created = store.backup()
    assert created is True
    assert snapshot.read("knowledge/modules/rules/01-rule.md").startswith("# Rule")
    same, created = store.backup()
    assert created is False and same.snapshot_id == snapshot.snapshot_id
    active, changed = store.activate()
    assert changed is True and store.current().snapshot_id == active.snapshot_id


def test_backup_rejects_catalog_digest_drift(tmp_path):
    _write_tree(tmp_path)
    (tmp_path / "knowledge" / "modules" / "rules" / "01-rule.md").write_text("changed", encoding="utf-8")
    with pytest.raises(ValueError, match="目录校验不一致"):
        KnowledgeStore(tmp_path).backup()


def test_open_rejects_tampered_snapshot(tmp_path):
    _write_tree(tmp_path)
    store = KnowledgeStore(tmp_path)
    snapshot, _ = store.backup()
    (snapshot.directory / "ENTRY.md").write_text("tampered", encoding="utf-8")
    with pytest.raises(ValueError):
        store.open(snapshot.version, snapshot.snapshot_id)


def test_rule_context_search_and_excerpt_are_bound_to_snapshot(tmp_path):
    _write_tree(tmp_path)
    snapshot, _ = KnowledgeStore(tmp_path).backup()
    session = KnowledgeSession(snapshot)
    context = session.context_for_mode("A")
    assert "Evidence before conclusions" in context
    result = session.search("Evidence", limit=1)
    assert result["sections"][0]["source"] == "knowledge/modules/rules/01-rule.md"
    record = next(item for item in session.records if item["path"] == "knowledge/modules/rules/01-rule.md")
    assert session.excerpt(record["key"])["snapshot"] == snapshot.reference


def test_repository_active_snapshot_passes_integrity_check():
    root = Path(__file__).resolve().parent.parent
    snapshot = KnowledgeStore(root).current()
    assert snapshot.version == "K1.0.0"
    assert snapshot.snapshot_id
