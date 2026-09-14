from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Annotated

from pydantic import BeforeValidator, Field
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


def _origins(value: object) -> tuple[str, ...]:
    if isinstance(value, str):
        return tuple(item.strip() for item in value.split(",") if item.strip())
    if isinstance(value, (list, tuple)):
        return tuple(str(item) for item in value)
    return ()


Origins = Annotated[tuple[str, ...], NoDecode, BeforeValidator(_origins)]


def _issuer_domains(value: object) -> dict[str, tuple[str, ...]]:
    if isinstance(value, str):
        try:
            value = json.loads(value or "{}")
        except json.JSONDecodeError:
            return {}
    if not isinstance(value, dict):
        return {}
    result: dict[str, tuple[str, ...]] = {}
    for security, domains in value.items():
        if not isinstance(security, str) or not isinstance(domains, list):
            continue
        clean = tuple(
            domain.lower().rstrip(".")
            for domain in domains
            if isinstance(domain, str) and re.fullmatch(r"[a-z0-9.-]+\.[a-z]{2,}", domain.lower().rstrip("."))
        )
        if clean:
            result[security] = clean
    return result


IssuerDomains = Annotated[dict[str, tuple[str, ...]], NoDecode, BeforeValidator(_issuer_domains)]


class Settings(BaseSettings):
    """Validated, immutable process configuration."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", frozen=True, populate_by_name=True)
    host: str = Field("127.0.0.1", validation_alias="HOST")
    port: int = Field(3001, ge=1, le=65535, validation_alias="PORT")
    root: Path = Field(default_factory=lambda: Path(__file__).resolve().parent.parent, exclude=True)
    initialize_services: bool = Field(True, exclude=True)
    mongodb_uri: str = Field("mongodb://127.0.0.1:27017", validation_alias="MONGODB_URI")
    mongodb_database: str = Field("zhiheng_agent", min_length=1, validation_alias="MONGODB_DATABASE")
    public_origins: Origins = Field(default=(), validation_alias="PUBLIC_ORIGINS")
    web_search_enabled: bool = Field(True, validation_alias="WEB_SEARCH_ENABLED")
    tavily_api_key: str = Field("", validation_alias="TAVILY_API_KEY")
    brave_search_api_key: str = Field("", validation_alias="BRAVE_SEARCH_API_KEY")
    web_research_issuer_domains: IssuerDomains = Field(default_factory=dict, validation_alias="WEB_RESEARCH_ISSUER_DOMAINS")
    sec_user_agent: str = Field("", validation_alias="SEC_USER_AGENT")
    tushare_token: str = Field("", validation_alias="TUSHARE_TOKEN")
    longbridge_app_key: str = Field("", validation_alias="LONGBRIDGE_APP_KEY")
    longbridge_app_secret: str = Field("", validation_alias="LONGBRIDGE_APP_SECRET")
    longbridge_access_token: str = Field("", validation_alias="LONGBRIDGE_ACCESS_TOKEN")
    model_config_file: str = Field("./config/models.local.json", validation_alias="MODEL_CONFIG_FILE")
    model_pricing_file: str = Field("", validation_alias="MODEL_PRICING_FILE")
    research_budget_file: str = Field("", validation_alias="RESEARCH_BUDGET_FILE")
    research_budget_mode: str = Field("disabled", pattern=r"^(disabled|dry-run|enforce)$", validation_alias="RESEARCH_BUDGET_MODE")
    model_telemetry_enabled: bool = Field(True, validation_alias="MODEL_TELEMETRY_ENABLED")
    llm_timeout_ms: int = Field(300_000, ge=1_000, le=900_000, validation_alias="LLM_TIMEOUT_MS")
    llm_max_duration_ms: int = Field(1_800_000, ge=1_000, le=3_600_000, validation_alias="LLM_MAX_DURATION_MS")
    max_concurrent_research: int = Field(3, ge=1, le=16, validation_alias="MAX_CONCURRENT_RESEARCH")
    max_request_bytes: int = Field(25 * 1024 * 1024, ge=1024, le=100 * 1024 * 1024, validation_alias="MAX_REQUEST_BYTES")
    api_rate_limit_per_minute: int = Field(120, ge=10, le=10_000, validation_alias="API_RATE_LIMIT_PER_MINUTE")
    api_timeout_seconds: float = Field(30, ge=1, le=300, validation_alias="API_TIMEOUT_SECONDS")
    material_timeout_seconds: float = Field(110, ge=10, le=300, validation_alias="MATERIAL_TIMEOUT_SECONDS")
    max_concurrent_material_reads: int = Field(2, ge=1, le=8, validation_alias="MAX_CONCURRENT_MATERIAL_READS")
    task_lease_seconds: int = Field(60, ge=15, le=600, validation_alias="TASK_LEASE_SECONDS")
    log_level: str = Field("INFO", pattern=r"^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$", validation_alias="LOG_LEVEL")

    @classmethod
    def from_env(cls) -> "Settings":
        return cls()
