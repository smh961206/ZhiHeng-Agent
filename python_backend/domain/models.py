"""Typed canonical contracts at the backend's application boundaries."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DomainModel(BaseModel):
    """Strictly validates owned fields while preserving compatible historical extensions."""

    model_config = ConfigDict(extra="allow", populate_by_name=True, validate_assignment=True)


class JobStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StageStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    PARTIAL = "partial"
    SKIPPED = "skipped"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SecurityRef(DomainModel):
    market: Literal["CN", "HK", "US"]
    symbol: str = Field(min_length=1, max_length=16)
    name: str | None = Field(default=None, max_length=200)

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, value: str) -> str:
        return value.strip().upper()


class EvidenceSource(DomainModel):
    id: str = Field(min_length=1, max_length=128)
    title: str = Field(min_length=1, max_length=500)
    text: str = Field(default="", max_length=2_000_000)
    type: str = Field(min_length=1, max_length=80)
    official: bool = False
    verified: bool = False
    url: str | None = None
    published_at: datetime | None = Field(default=None, alias="publishedAt")
    document_blocks: list[dict[str, Any]] = Field(default_factory=list, alias="documentBlocks")
    financial_facts: list[dict[str, Any]] = Field(default_factory=list, alias="financialFacts")


class ResearchInput(DomainModel):
    question: str = Field(min_length=1, max_length=10_000)
    mode: str = "auto"
    depth: str
    history_years: int = Field(alias="historyYears", ge=1, le=30)
    securities: list[SecurityRef] = Field(default_factory=list, max_length=3)
    sources: list[EvidenceSource] = Field(default_factory=list, max_length=24)
    reference_materials: list[EvidenceSource] = Field(default_factory=list, alias="referenceMaterials", max_length=24)
    research_cutoff: datetime = Field(alias="researchCutoff")
    portfolio: str = ""
    portfolio_context: dict[str, Any] = Field(default_factory=dict, alias="portfolioContext")
    previous_research: str = Field(default="", alias="previousResearch")
    baseline_job_id: str | None = Field(default=None, alias="baselineJobId")


class KnowledgeReference(DomainModel):
    id: str
    version: str


class ResearchPlan(DomainModel):
    execution_compatibility_version: int = Field(alias="executionCompatibilityVersion", ge=1)
    contract_version: int = Field(alias="contractVersion", ge=1)
    mode: Literal["A", "B", "C", "D", "E", "F"]
    name: str
    depth: str
    history_years: int = Field(alias="historyYears", ge=1)
    stages: list[dict[str, Any]]
    knowledge_version: str = Field(alias="knowledgeVersion")
    knowledge_snapshot_id: str = Field(alias="knowledgeSnapshotId")
    knowledge_snapshot: KnowledgeReference | None = Field(default=None, alias="knowledgeSnapshot")


class SubmissionIdentity(DomainModel):
    fingerprint: str = Field(pattern=r"^[0-9a-f]{64}$")
    attempt_id: str | None = Field(default=None, alias="attemptId")


class ResearchCheckpoint(DomainModel):
    version: Literal[1] = 1
    scope: str
    phase: Literal["research", "review"]
    origin: Literal["checkpoint", "history"] = "checkpoint"
    turn: int = Field(default=0, ge=0)
    draft: str = ""
    tool_records: list[dict[str, Any]] = Field(default_factory=list, alias="toolRecords")
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    pipeline_state: dict[str, Any] | None = Field(default=None, alias="pipelineState")
    messages: list[dict[str, Any]] = Field(default_factory=list)


class ResearchJob(DomainModel):
    id: str = Field(min_length=1, max_length=128)
    input: ResearchInput
    mode: Literal["A", "B", "C", "D", "E", "F"]
    status: JobStatus
    created_at: datetime = Field(alias="createdAt")
    plan: ResearchPlan
    events: list[dict[str, Any]] = Field(default_factory=list)
    submission: SubmissionIdentity
    checkpoint: ResearchCheckpoint | None = None
    retry_count: int = Field(default=0, alias="retryCount", ge=0)
    revision: int = Field(default=0, ge=0)
    finished_at: datetime | None = Field(default=None, alias="finishedAt")
    result: dict[str, Any] | None = None
    error: str | None = None

    def to_record(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, exclude_none=True, mode="json")


def validate_job_record(value: dict[str, Any]) -> dict[str, Any]:
    """Validate owned job fields and preserve compatible extra fields."""

    return ResearchJob.model_validate(value).to_record()
