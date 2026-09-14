from __future__ import annotations

import hashlib
import json
import re
import unicodedata

ALIASES = [
    ["营业收入", "收入", "营收", "營業收入", "revenue", "sales"],
    ["净利润", "归母净利", "淨利潤", "net income", "profitloss"],
    ["经营现金流", "经营活动", "經營活動", "operating activities"],
    ["资本开支", "資本開支", "capex", "property plant and equipment"],
    ["股本", "shares", "股数", "股數"],
    ["分红", "分紅", "股息", "dividend"],
    ["回购", "回購", "repurchase"],
    ["权益", "權益", "equity"],
    ["债务", "債務", "debt"],
    ["现金", "現金", "cash"],
]


def plain_blocks(text: str, prefix: str = "legacy") -> list[dict]:
    rows = [part for line in str(text).splitlines() if line.strip() for part in (re.findall(r"[\s\S]{1,2200}", line) or [])]
    return [
        {
            "id": f"{prefix}-b{index + 1}",
            "kind": "paragraphs",
            "method": "native",
            "lineStart": index + 1,
            "lineEnd": index + 1,
            "text": row,
            "needsReview": False,
        }
        for index, row in enumerate(rows)
    ]


def evidence_blocks(source: dict) -> list[dict]:
    facts = [
        {
            "id": f"fact{index + 1}",
            "kind": "xbrl-fact",
            "text": json.dumps(fact, ensure_ascii=False),
            "method": fact.get("origin", "xbrl-api"),
            "needsReview": fact.get("needsReview", False),
        }
        for index, fact in enumerate(source.get("financialFacts", []))
    ]
    return facts + (source.get("documentBlocks") or plain_blocks(source.get("text", "")))


def search_evidence(sources: list[dict], query: str, source_id: str | None = None) -> list[dict]:
    value = str(query or "").strip().lower()
    if not value:
        return []
    pages = {int(a or b) for a, b in re.findall(r"(?:pdf\s*)?第\s*(\d{1,5})\s*页|\bpage\s+(\d{1,5})\b", value)}
    clean = re.sub(r"(?:pdf\s*)?第\s*\d{1,5}\s*页|\bpage\s+\d{1,5}\b", " ", value).strip()
    terms = set(re.split(r"[\s，、,]+", clean)) - {""}
    terms.update(pair for token in re.findall(r"[\u3400-\u9fff]{2,}", clean) for pair in (token[i : i + 2] for i in range(len(token) - 1)))
    for group in ALIASES:
        if any(term in clean for term in group):
            terms.update(group)
    matches = []
    for source in sources:
        if source_id and source.get("id") != source_id or source.get("type") in {"search-result", "search-summary"}:
            continue
        blocks = evidence_blocks(source)
        counts: dict[str, int] = {}
        for block in blocks:
            counts[block["id"]] = counts.get(block["id"], 0) + 1
        duplicate_source = sum(item.get("id") == source.get("id") for item in sources) > 1
        for block in blocks:
            if pages and block.get("page") not in pages:
                continue
            lower = block.get("text", "").lower()
            score = 1 if pages and not clean else sum(term in lower for term in terms)
            if not score:
                continue
            ambiguous = duplicate_source or counts[block["id"]] > 1
            text = "\n".join(
                part
                for part in [
                    "【引用编号重复，无法唯一定位，须重新核对资料】" if ambiguous else "",
                    f"【PDF第{block['page']}页】" if block.get("page") else "",
                    block.get("context", ""),
                    block.get("text", ""),
                ]
                if part
            )
            matches.append(
                {
                    "id": source.get("id"),
                    "title": source.get("title"),
                    "url": source.get("url"),
                    "date": source.get("date"),
                    "publishedAt": source.get("publishedAt"),
                    "type": source.get("type"),
                    "provider": source.get("provider"),
                    "official": source.get("official"),
                    "blockId": block["id"],
                    "page": block.get("page"),
                    "kind": block.get("kind"),
                    "method": block.get("method"),
                    "needsReview": ambiguous or block.get("needsReview", False),
                    "referenceAmbiguous": ambiguous,
                    "truncated": bool(block.get("truncated") or source.get("truncated")),
                    "text": text,
                    "_score": score + (0.25 if block.get("kind") == "xbrl-fact" else 0),
                }
            )
    per_source: dict[str, int] = {}
    result = []
    for item in sorted(matches, key=lambda row: row["_score"], reverse=True):
        limit = 8 if source_id else 2
        count = per_source.get(item["id"], 0)
        if count >= limit:
            continue
        per_source[item["id"]] = count + 1
        item.pop("_score")
        result.append(item)
        if len(result) == 8:
            break
    return result


def _normalize(value: str) -> str:
    return re.sub(r"\s", "", unicodedata.normalize("NFKC", str(value)).replace("−", "-").replace("–", "-"))


def usable_evidence(source: dict | None, block: dict | None) -> bool:
    if source is None or block is None:
        return False
    return bool(
        not source.get("stale")
        and not source.get("legacyParser")
        and source.get("type") in {"official-report", "official-xbrl", "web-evidence"}
        and (
            source.get("official") is True
            or source.get("type") == "web-evidence"
            and source.get("documentRead")
            and source.get("authorityVerified")
            and source.get("publishedAt")
            and not source.get("metadataWarnings")
        )
        and block.get("method") not in {None, "ocr", "vision"}
        and not any(block.get(key) for key in ("needsReview", "symbolReview", "truncated"))
    )


def verify_financial_inputs(items: list[dict], sources: list[dict]) -> dict:
    if not isinstance(items, list) or not 1 <= len(items) <= 60:
        raise ValueError("原数核对每次须提交1至60项")
    seen = set()
    checks = []
    for item in items:
        required = ("key", "sourceId", "blockId", "quote", "label", "period", "unit")
        if (
            not isinstance(item, dict)
            or any(not isinstance(item.get(key), str) or not item[key].strip() for key in required)
            or item["key"] in seen
            or not isinstance(item.get("value"), (int, float))
            or item.get("scale") not in {1, 1000, 10000, 1000000, 100000000}
        ):
            raise ValueError("原数核对字段无效、重复或单位缩放未声明")
        seen.add(item["key"])
        candidates = [source for source in sources if source.get("id") == item["sourceId"]]
        source = candidates[0] if candidates else None
        blocks = [block for block in evidence_blocks(source) if block["id"] == item["blockId"]] if source else []
        block = blocks[0] if blocks else None
        status, reason = "matched-needs-review", "数值与标签在指定原文摘录中出现；期间、单位与行列关系仍需核对。"
        if source is None or block is None or len(candidates) != 1 or len(blocks) != 1 or not usable_evidence(source, block):
            status, reason = "unusable", "来源或证据块缺失、重复、截断或尚不适合作为数值证据。"
        elif _normalize(item["quote"]) not in _normalize("\n".join(filter(None, [block.get("context"), block.get("text")]))) or _normalize(
            item["label"]
        ) not in _normalize(item["quote"]):
            status, reason = "mismatch", "摘录不是指定证据块的连续原文，或缺少指标标签。"
        else:
            tokens = re.findall(r"(?<![\d.,])\(?[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?\)?(?![\d.,])", unicodedata.normalize("NFKC", item["quote"]))
            values = []
            for token in tokens:
                negative, percent = token.startswith("(") and token.endswith(")"), "%" in token
                number = float(re.sub(r"[(),%]", "", token))
                number = -abs(number) if negative else number
                values.append(number / 100 if percent else number * item["scale"])
            if not any(abs(value - item["value"]) <= 2.22e-16 * max(1, abs(value), abs(item["value"])) * 2 for value in values):
                status, reason = "mismatch", "摘录中没有与所声明符号及缩放一致的完整数字。"
        checks.append(
            {
                **item,
                "page": block.get("page") if block else None,
                "status": status,
                "reason": reason,
                "quoteSha256": hashlib.sha256(item["quote"].encode()).hexdigest(),
            }
        )
    matched = sum(row["status"] == "matched-needs-review" for row in checks)
    return {
        "checks": checks,
        "recovery": [],
        "recoveryLimited": False,
        "matched": matched,
        "unresolved": len(checks) - matched,
        "notice": "匹配不等于数字已独立验证；仍须核对所属列、期间、币种、合并范围与来源真实性。",
    }
