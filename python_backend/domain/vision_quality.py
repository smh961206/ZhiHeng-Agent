"""Deterministic Vision table grading; results never become financial facts."""
from __future__ import annotations

import json
import re
from decimal import Decimal, InvalidOperation
from typing import Any, cast

VISION_GRADE_VERSION = 1
VISION_METRICS = ("numeric", "unit", "date", "header", "sign", "parentheses", "footnote", "relationship", "missing")


def _label(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip()) and len(value) <= 500


def _decimal(value: object) -> dict[str, Any] | None:
    if not isinstance(value, str) or len(value) > 100:
        return None
    token = value.strip().replace("−", "-")
    parentheses = token.startswith("(") and token.endswith(")")
    if parentheses:
        token = token[1:-1]
    match = re.fullmatch(r"([+-]?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(%)?", token)
    if not match or parentheses and match.group(1):
        return None
    try:
        magnitude = Decimal((match.group(2) + ("." + match.group(3) if match.group(3) else "")).replace(",", ""))
    except InvalidOperation:
        return None
    return {
        "magnitude": magnitude.normalize(),
        "negative": parentheses or match.group(1) == "-",
        "percent": bool(match.group(4)),
        "parentheses": parentheses,
    }


def valid_table(value: object) -> bool:
    if not isinstance(value, dict) or set(value) != {"headers", "cells", "footnotes"}:
        return False
    headers, cells, footnotes = value["headers"], value["cells"], value["footnotes"]
    if not isinstance(headers, list) or not 1 <= len(headers) <= 30 or not all(_label(item) for item in headers):
        return False
    if not isinstance(footnotes, list) or len(footnotes) > 30 or not all(_label(item) for item in footnotes):
        return False
    if not isinstance(cells, list) or not 1 <= len(cells) <= 200:
        return False
    coordinates: set[tuple[str, str]] = set()
    for cell in cells:
        if not isinstance(cell, dict) or set(cell) != {"row", "column", "value", "unit", "date", "footnote"}:
            return False
        if not all(_label(cell[key]) for key in ("row", "column", "unit", "date")) or cell["footnote"] is not None and not _label(cell["footnote"]):
            return False
        if cell["value"] is not None and _decimal(cell["value"]) is None:
            return False
        coordinate = (cell["row"], cell["column"])
        if coordinate in coordinates:
            return False
        coordinates.add(coordinate)
    return True


def grade_vision_table(expected: dict[str, Any], observed: object) -> dict[str, Any]:
    if not valid_table(expected):
        raise TypeError("视觉质量参考表无效")
    output = observed
    if isinstance(observed, str):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", observed.strip())
        try:
            output = json.loads(text)
        except json.JSONDecodeError:
            output = None
    valid = valid_table(output)
    parsed = cast(dict[str, Any], output) if valid else {"headers": [], "cells": [], "footnotes": []}
    expected_cells = expected["cells"]
    metrics: dict[str, dict[str, int | float]] = {name: {"correct": 0, "total": len(expected_cells)} for name in VISION_METRICS}
    actual = {(cell["row"], cell["column"]): cell for cell in parsed["cells"]} if valid else {}
    header = bool(valid and parsed["headers"] == expected["headers"])
    footnotes = bool(valid and parsed["footnotes"] == expected["footnotes"])
    critical_errors = 0
    for cell in expected_cells:
        found = actual.get((cell["row"], cell["column"]))
        want, got = _decimal(cell["value"]), _decimal(found["value"]) if found else None
        missing = bool(found is not None and (cell["value"] is None) == (found["value"] is None))
        numeric = bool(found is not None and (found["value"] is None if cell["value"] is None else got and want and got["magnitude"] == want["magnitude"] and got["percent"] == want["percent"]))
        sign = bool(found is not None and (found["value"] is None if cell["value"] is None else got and want and got["negative"] == want["negative"]))
        parentheses = bool(found is not None and (found["value"] is None if cell["value"] is None else got and want and got["parentheses"] == want["parentheses"]))
        unit = bool(found is not None and found["unit"] == cell["unit"])
        date = bool(found is not None and found["date"] == cell["date"])
        footnote = bool(footnotes and found is not None and found["footnote"] == cell["footnote"])
        relationship = numeric and sign and unit and date and footnote
        checks = {"numeric": numeric, "unit": unit, "date": date, "header": header, "sign": sign,
                  "parentheses": parentheses, "footnote": footnote, "relationship": relationship, "missing": missing}
        for name, passed in checks.items():
            metrics[name]["correct"] += int(passed)
        critical_errors += int(not all(checks.values()))
    if valid:
        expected_coordinates = {(cell["row"], cell["column"]) for cell in expected_cells}
        critical_errors += sum(coordinate not in expected_coordinates for coordinate in actual)
    for metric in metrics.values():
        metric["score"] = metric["correct"] / metric["total"]
    return {"version": VISION_GRADE_VERSION, "formatValid": valid, "passed": bool(valid and critical_errors == 0),
            "criticalErrors": critical_errors, "metrics": metrics, "trust": "benchmark-only"}
