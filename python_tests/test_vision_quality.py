from copy import deepcopy

from python_backend.domain.vision_quality import grade_vision_table, valid_table


def table():
    return {
        "headers": ["项目", "FY2025"],
        "footnotes": ["括号表示负数"],
        "cells": [
            {"row": "收入", "column": "FY2025", "value": "1,200.00", "unit": "CNY million", "date": "2025-12-31", "footnote": None},
            {"row": "亏损", "column": "FY2025", "value": "(20)", "unit": "CNY million", "date": "2025-12-31", "footnote": "括号表示负数"},
            {"row": "未披露", "column": "FY2025", "value": None, "unit": "CNY million", "date": "2025-12-31", "footnote": None},
        ],
    }


def test_strict_vision_grade_preserves_numbers_signs_footnotes_and_missing():
    expected = table()
    result = grade_vision_table(expected, deepcopy(expected))
    assert result["passed"] is True and result["criticalErrors"] == 0
    changed = deepcopy(expected)
    changed["cells"][1]["value"] = "20"
    result = grade_vision_table(expected, changed)
    assert result["passed"] is False
    assert result["metrics"]["numeric"]["score"] == 1
    assert result["metrics"]["sign"]["score"] < 1


def test_vision_grade_rejects_extra_cells_and_fabricated_zero():
    expected = table()
    changed = deepcopy(expected)
    changed["cells"][2]["value"] = "0"
    assert grade_vision_table(expected, changed)["metrics"]["missing"]["score"] < 1
    changed = deepcopy(expected)
    changed["cells"].append({"row": "额外", "column": "FY2025", "value": "1", "unit": "CNY", "date": "2025-12-31", "footnote": None})
    assert grade_vision_table(expected, changed)["criticalErrors"] == 1
    duplicate = deepcopy(expected)
    duplicate["cells"].append(deepcopy(duplicate["cells"][0]))
    assert valid_table(duplicate) is False
