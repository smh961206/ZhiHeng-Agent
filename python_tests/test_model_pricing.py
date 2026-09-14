from __future__ import annotations

import json
from datetime import datetime, timezone

import pytest

from python_backend.cli import main
from python_backend.domain.model_governance import Price, usage_cost
from python_backend.infrastructure.model_gateway import ModelConfigurationError
from python_backend.infrastructure.model_pricing import PricingRegistry


def test_pricing_registry_resolves_point_in_time_and_cached_input(tmp_path):
    identity = "a" * 64
    path = tmp_path / "pricing.json"
    path.write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "entries": [
                    {
                        "profileId": "configured-primary",
                        "connectionIdentity": identity,
                        "recordedAt": "2025-01-02T00:00:00Z",
                        "pricing": {
                            "schemaVersion": 1,
                            "version": "v1",
                            "effectiveFrom": "2025-01-01T00:00:00Z",
                            "effectiveTo": None,
                            "currency": "USD",
                            "unit": "per-million-tokens",
                            "input": 2,
                            "output": 4,
                            "cacheRead": 0.5,
                        },
                    }
                ],
            }
        ),
        encoding="utf-8",
    )
    registry = PricingRegistry(path)
    assert registry.error is None
    before = registry.resolve("primary", identity, datetime(2025, 1, 1, tzinfo=timezone.utc))
    assert before.input_per_million is None
    price = registry.resolve("primary", identity, datetime(2025, 1, 3, tzinfo=timezone.utc))
    result = usage_cost({"inputTokens": 1000, "cachedInputTokens": 400, "outputTokens": 200}, price)
    assert result["cost"] == (600 * 2 + 400 * 0.5 + 200 * 4) / 1_000_000


def test_usage_cost_keeps_unknown_price_unknown():
    result = usage_cost({"inputTokens": 10, "cachedInputTokens": 5, "outputTokens": 2}, Price(1, 2))
    assert result["cost"] is None and result["status"] == "unknown"


def test_pricing_cli_checks_price_file_without_loading_model_configuration(tmp_path, capsys):
    path = tmp_path / "pricing.json"
    path.write_text('{"schemaVersion":1,"entries":[]}', encoding="utf-8")
    assert main(["pricing-check", str(path)]) == 0
    assert "记录数：0" in capsys.readouterr().out

    path.write_text("{}", encoding="utf-8")
    with pytest.raises(ModelConfigurationError, match="价格配置格式无效"):
        main(["pricing-check", str(path)])
