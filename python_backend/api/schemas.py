from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

Symbol = Annotated[str, StringConstraints(strip_whitespace=True, to_upper=True, pattern=r"^[A-Za-z0-9.-]{1,16}$")]
ExchangeSymbol = Annotated[str, StringConstraints(strip_whitespace=True, to_upper=True, pattern=r"^[A-Za-z][A-Za-z0-9.-]{0,11}$")]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class QuestionRequest(StrictModel):
    question: str = Field(min_length=1, max_length=10_000)

    @field_validator("question")
    @classmethod
    def strip_question(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("研究问题不能为空")
        return value.strip()


class SecurityInput(StrictModel):
    market: Literal["CN", "HK", "US"]
    symbol: Symbol
    name: str | None = Field(None, max_length=200)


class QuotesRequest(StrictModel):
    securities: list[SecurityInput] = Field(min_length=1, max_length=3)


class ExchangeRequest(StrictModel):
    symbols: list[ExchangeSymbol] = Field(max_length=100)


class RetryRequest(StrictModel):
    expectedRetryCount: int = Field(0, ge=0)


class SaveRequest(StrictModel):
    expectedRetryCount: int = Field(0, ge=0)


class ErrorResponse(StrictModel):
    error: str
