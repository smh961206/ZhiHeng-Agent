from __future__ import annotations

import hashlib
import json
import re
import shutil
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

KNOWLEDGE_VERSION = re.compile(r"^K\d+\.\d+\.\d+$")
RULE_PATH = re.compile(r"^knowledge/modules/rules/[a-z0-9-]+\.md$")
ENTRY_VERSION = re.compile(r'^\s+knowledge_version:\s*"([^"]+)"', re.MULTILINE)
MODE_CHAPTERS = {
    "A": {0, 1, 3, 4, 5, 7, 9, 15, 16, 17, 18},
    "B": {0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18},
    "C": {0, 1, 3, 5, 7, 9, 13, 14, 15, 16, 17, 18},
    "D": {0, 1, 3, 4, 5, 6, 7, 9, 15, 16, 17, 18},
    "E": {0, 1, 3, 9, 12, 15, 16, 17, 18},
    "F": {0, 1, 3, 5, 6, 7, 8, 9, 15, 16, 17, 18},
}


def _hash(data: bytes | str) -> str:
    value = data.encode("utf-8") if isinstance(data, str) else data
    return hashlib.sha256(value).hexdigest()


def _compact(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"JSON 根节点必须为对象：{path}")
    return value


def _catalog_files(catalog: dict[str, Any]) -> list[str]:
    if catalog.get("schemaVersion") != 3 or catalog.get("entry") != "knowledge/ENTRY.md" or "version" in catalog:
        raise ValueError("Knowledge 目录必须使用 schema-v3 和 K-Series 单一版本")
    version = catalog.get("knowledgeVersion")
    if not isinstance(version, str) or not KNOWLEDGE_VERSION.fullmatch(version):
        raise ValueError("Knowledge 版本必须使用 Kx.y.z")
    modules = catalog.get("modules")
    if not isinstance(modules, list) or not modules:
        raise ValueError("Knowledge 模块目录为空")
    identifiers: set[str] = set()
    paths: set[str] = set()
    for module in modules:
        if not isinstance(module, dict):
            raise ValueError("Knowledge 模块记录无效")
        identifier, path = module.get("id"), module.get("path")
        if (
            module.get("source") != "rules"
            or not isinstance(identifier, str)
            or not isinstance(path, str)
            or not RULE_PATH.fullmatch(path)
            or identifier in identifiers
            or path in paths
        ):
            raise ValueError("Knowledge 模块路径、来源或身份无效")
        identifiers.add(identifier)
        paths.add(path)
    return ["knowledge/ENTRY.md", "knowledge/modules.json", *(str(module["path"]) for module in modules)]


@dataclass(frozen=True)
class KnowledgeSnapshot:
    version: str
    snapshot_id: str
    directory: Path
    catalog: dict[str, Any]
    manifest: dict[str, Any]

    @property
    def reference(self) -> dict[str, str]:
        return {"version": self.version, "id": self.snapshot_id}

    def read(self, relative_path: str) -> str:
        allowed = set(_catalog_files(self.catalog))
        if relative_path not in allowed:
            raise ValueError("非法 Knowledge 快照文件路径")
        return (self.directory / relative_path.removeprefix("knowledge/")).read_text(encoding="utf-8")

    def public_manifest(self) -> list[dict[str, Any]]:
        catalog_text = self.read("knowledge/modules.json")
        entry = self.read("knowledge/ENTRY.md")
        updated = self.catalog.get("updatedAt")
        return [
            {"id": "entry", "path": "knowledge/ENTRY.md", "role": "研究执行入口", "version": self.version, "updatedAt": updated, "sha256": _hash(entry)},
            {
                "id": "module-catalog",
                "path": "knowledge/modules.json",
                "role": "按需加载目录",
                "version": self.version,
                "updatedAt": updated,
                "sha256": _hash(catalog_text),
            },
            *[
                {
                    "id": module["id"],
                    "path": module["path"],
                    "role": module["title"],
                    "version": self.version,
                    "updatedAt": updated,
                    "sha256": module["sha256"],
                }
                for module in self.catalog["modules"]
            ],
        ]


class KnowledgeSession:
    def __init__(self, snapshot: KnowledgeSnapshot, records: list[dict[str, Any]] | None = None):
        self.snapshot = snapshot
        self.records = records if records is not None else []
        self._keys = {str(item.get("key")) for item in self.records}
        self._cache: dict[str, str] = {}

    def _record(self, module: dict[str, Any], content: str, reason: str, *, line: int = 1, end_line: int | None = None, truncated: bool = False) -> None:
        last_line = end_line or line + content.count("\n")
        base = {
            "snapshotId": self.snapshot.snapshot_id,
            "moduleId": module["id"],
            "path": module["path"],
            "heading": module.get("title", module["id"]),
            "line": line,
            "endLine": last_line,
            "sectionEndLine": last_line,
            "sha256": module["sha256"],
            "contentSha256": _hash(content),
            "characters": len(content),
            "reason": reason,
            "kind": "context",
            "truncated": truncated,
        }
        key = _hash(_compact(base))
        if key not in self._keys:
            self._keys.add(key)
            self.records.append({**base, "key": key, "at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")})

    def _load(self, module: dict[str, Any], reason: str) -> str:
        identifier = str(module["id"])
        if identifier not in self._cache:
            text = self.snapshot.read(str(module["path"]))
            if _hash(text) != module["sha256"]:
                raise ValueError(f"{module['path']} 内容与固定快照不一致")
            self._cache[identifier] = text
        text = self._cache[identifier]
        self._record(module, text, reason)
        return text

    def context_for_mode(self, mode: str, *, max_characters: int = 80_000) -> str:
        if mode not in MODE_CHAPTERS:
            raise ValueError("研究模式无效")
        entry = self.snapshot.read("knowledge/ENTRY.md")
        entry_module = {"id": "entry", "path": "knowledge/ENTRY.md", "title": "研究执行入口", "sha256": _hash(entry)}
        self._record(entry_module, entry, "任务入口")
        parts = [entry]
        remaining = max_characters - len(entry)
        for module in self.snapshot.catalog["modules"]:
            if module.get("chapter") not in MODE_CHAPTERS[mode] or remaining <= 0:
                continue
            text = self._load(module, f"任务范围 {mode}")
            selected = text[:remaining]
            if selected != text:
                self._record(module, selected, f"任务范围 {mode}", truncated=True)
            parts.append(selected)
            remaining -= len(selected)
        return "\n\n".join(parts)

    def search(self, query: str, *, limit: int = 4, max_characters: int = 24_000) -> dict[str, Any]:
        terms = [item for item in re.split(r"[\s，、,]+", query.lower().strip()) if item]
        if not terms:
            return {"sections": [], "notice": "请提供规则关键词"}
        candidates: list[tuple[int, int, dict[str, Any], dict[str, Any]]] = []
        for module in self.snapshot.catalog["modules"]:
            text = self._load(module, f"检索候选：{query}")
            lines = text.splitlines()
            for section in module.get("sections", []):
                start = max(0, int(section.get("line", 1)) - 1)
                end = int(section.get("endLine", len(lines)))
                content = "\n".join(lines[start:end])
                title = str(section.get("title", ""))
                score = sum(30 if term in title.lower() else 1 if term in content.lower() else 0 for term in terms)
                if score:
                    candidates.append((score, int(section.get("level", 0)), module, {**section, "content": content}))
        candidates.sort(key=lambda item: (-item[0], -item[1], int(item[2].get("originalLine", 0)), int(item[3].get("line", 0))))
        selected: list[dict[str, Any]] = []
        remaining = max_characters
        for _, _, module, section in candidates:
            if len(selected) >= limit or remaining <= 0:
                break
            content = section["content"][:remaining]
            row = {
                "source": module["path"],
                "heading": section.get("title", module["title"]),
                "line": section.get("line", 1),
                "endLine": section.get("endLine", section.get("line", 1)),
                "content": content,
                "truncated": len(content) < len(section["content"]),
            }
            if any(item["source"] == row["source"] and row["line"] <= item["endLine"] and row["endLine"] >= item["line"] for item in selected):
                continue
            selected.append(row)
            remaining -= len(content)
            self._record(module, content, f"规则补读：{query}", line=int(row["line"]), end_line=int(row["endLine"]), truncated=row["truncated"])
        return {
            "sections": selected,
            "notice": "部分章节已截断，请用小节标题定向读取"
            if any(item["truncated"] for item in selected)
            else "规则来源与行号随内容返回"
            if selected
            else "未匹配章节，请缩短关键词",
        }

    def excerpt(self, key: str) -> dict[str, Any]:
        record = next((item for item in self.records if item.get("key") == key), None)
        if not record or record.get("snapshotId") != self.snapshot.snapshot_id:
            raise KeyError("此任务未保存对应规则的读取记录")
        module = next((item for item in self.snapshot.catalog["modules"] if item.get("path") == record.get("path")), None)
        if not module or module.get("sha256") != record.get("sha256"):
            raise ValueError("读取记录与原规则快照不一致")
        text = self.snapshot.read(str(record["path"]))
        lines = text.splitlines(keepends=True)
        offset = sum(len(item) for item in lines[: int(record["line"]) - 1])
        content = text[offset : offset + int(record["characters"])]
        if _hash(content) != record["contentSha256"]:
            raise ValueError("本次读取内容未通过校验")
        return {name: record.get(name) for name in ("key", "heading", "path", "line", "endLine", "truncated", "sha256", "contentSha256")} | {
            "content": content,
            "snapshot": self.snapshot.reference,
        }


class KnowledgeStore:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.knowledge = self.root / "knowledge"

    def open(self, version: str, snapshot_id: str) -> KnowledgeSnapshot:
        if not KNOWLEDGE_VERSION.fullmatch(version) or not re.fullmatch(r"[a-f0-9]{64}", snapshot_id):
            raise ValueError("Knowledge 快照标识无效")
        directory = self.knowledge / "versions" / "auto" / version / snapshot_id
        manifest = _read_json(directory / "manifest.json")
        if manifest.get("id") != snapshot_id or manifest.get("version") != version:
            raise ValueError("Knowledge 快照清单不一致")
        catalog_text = (directory / "modules.json").read_text(encoding="utf-8")
        catalog = json.loads(catalog_text)
        expected = _catalog_files(catalog)
        entry = (directory / "ENTRY.md").read_text(encoding="utf-8")
        match = ENTRY_VERSION.search(entry)
        if catalog.get("knowledgeVersion") != version or not match or match.group(1) != version:
            raise ValueError("Knowledge 入口、目录与版本不一致")
        rows = manifest.get("files")
        if not isinstance(rows, list) or len(rows) != len(expected):
            raise ValueError("Knowledge 快照文件清单不完整")
        by_name = {row.get("name"): row for row in rows if isinstance(row, dict)}
        digests: list[dict[str, str]] = []
        for relative in expected:
            name = relative.removeprefix("knowledge/")
            data = (directory / name).read_bytes()
            row = by_name.get(name)
            digest = _hash(data)
            if not row or row.get("sha256") != digest or row.get("bytes") != len(data):
                raise ValueError(f"Knowledge 快照文件校验失败：{relative}")
            digests.append({"name": name, "sha256": digest})
            module = next((item for item in catalog["modules"] if item.get("path") == relative), None)
            if module and (module.get("sha256") != digest or module.get("bytes") != len(data)):
                raise ValueError(f"Knowledge 模块与目录校验不一致：{relative}")
        if _hash(_compact(digests)) != snapshot_id:
            raise ValueError("Knowledge 快照摘要不一致")
        return KnowledgeSnapshot(version, snapshot_id, directory, catalog, manifest)

    def current(self) -> KnowledgeSnapshot:
        pointer = _read_json(self.knowledge / "current.json")
        if pointer.get("schemaVersion") != 1 or pointer.get("status") != "active" or pointer.get("snapshotId") != pointer.get("fingerprint"):
            raise ValueError("Knowledge 活动指针无效")
        return self.open(str(pointer.get("knowledgeVersion", "")), str(pointer.get("snapshotId", "")))

    def backup(self) -> tuple[KnowledgeSnapshot, bool]:
        catalog_path = self.knowledge / "modules.json"
        catalog = _read_json(catalog_path)
        relative_paths = _catalog_files(catalog)
        version = str(catalog["knowledgeVersion"])
        source_rows: list[tuple[str, bytes, str]] = []
        for relative in relative_paths:
            source = self.root / relative
            before = source.stat()
            data = source.read_bytes()
            after = source.stat()
            if before.st_mtime_ns != after.st_mtime_ns or before.st_size != after.st_size or not data:
                raise ValueError(f"{relative} 正在写入或为空，稍后重试")
            source_rows.append((relative.removeprefix("knowledge/"), data, _hash(data)))
        entry = next(data for name, data, _ in source_rows if name == "ENTRY.md").decode("utf-8")
        match = ENTRY_VERSION.search(entry)
        if not match or match.group(1) != version:
            raise ValueError("Knowledge 入口与目录版本不一致")
        for module in catalog["modules"]:
            name = str(module["path"]).removeprefix("knowledge/")
            row = next((item for item in source_rows if item[0] == name), None)
            if row is None or module.get("sha256") != row[2] or module.get("bytes") != len(row[1]):
                raise ValueError(f"{module['path']} 与目录校验不一致，请先更新模块索引")
        fingerprint_rows = [{"name": name, "sha256": digest} for name, _, digest in source_rows]
        snapshot_id = _hash(_compact(fingerprint_rows))
        parent = self.knowledge / "versions" / "auto" / version
        directory = parent / snapshot_id
        manifest = {
            "schemaVersion": 1,
            "id": snapshot_id,
            "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "version": version,
            "files": [{"name": name, "bytes": len(data), "version": version, "sha256": digest} for name, data, digest in source_rows],
        }
        if directory.exists():
            return self.open(version, snapshot_id), False
        parent.mkdir(parents=True, exist_ok=True)
        temporary = Path(tempfile.mkdtemp(prefix=".pending-", dir=parent))
        try:
            for name, data, _ in source_rows:
                target = temporary / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
            (temporary / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            temporary.replace(directory)
        except Exception:
            shutil.rmtree(temporary, ignore_errors=True)
            raise
        return self.open(version, snapshot_id), True

    def activate(self, *, allow_rollback: bool = False) -> tuple[KnowledgeSnapshot, bool]:
        snapshot, _ = self.backup()
        pointer_path = self.knowledge / "current.json"
        current = _read_json(pointer_path) if pointer_path.exists() else None
        if current and current.get("knowledgeVersion") == snapshot.version and current.get("snapshotId") != snapshot.snapshot_id:
            raise ValueError(f"{snapshot.version} 已对应另一个正式指纹")
        if current and not allow_rollback and self._version_key(snapshot.version) < self._version_key(str(current.get("knowledgeVersion", ""))):
            raise ValueError("Knowledge 版本倒退必须使用显式 rollback 流程")
        pointer = {
            "schemaVersion": 1,
            "knowledgeVersion": snapshot.version,
            "fingerprint": snapshot.snapshot_id,
            "snapshotId": snapshot.snapshot_id,
            "status": "active",
        }
        if current == pointer:
            return snapshot, False
        temporary = pointer_path.with_name(f".current-{snapshot.snapshot_id[:12]}.json")
        temporary.write_text(json.dumps(pointer, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(pointer_path)
        return snapshot, True

    @staticmethod
    def _version_key(version: str) -> tuple[int, int, int]:
        match = re.fullmatch(r"K(\d+)\.(\d+)\.(\d+)", version)
        if not match:
            raise ValueError("Knowledge 版本必须使用 Kx.y.z")
        return tuple(int(value) for value in match.groups())  # type: ignore[return-value]
