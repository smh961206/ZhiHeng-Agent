from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse


def within_cutoff(published_at: str | None, cutoff: str | None) -> bool:
    if not published_at or not cutoff:
        return False
    try:
        published = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        limit = datetime.fromisoformat(cutoff.replace("Z", "+00:00"))
    except ValueError:
        return False
    if published.tzinfo is None:
        published = published.replace(tzinfo=timezone.utc)
    if limit.tzinfo is None:
        limit = limit.replace(tzinfo=timezone.utc)
    return published <= limit


def normalize_web_evidence(item: dict[str, Any], *, cutoff: str, authority_verified: bool = False) -> dict[str, Any]:
    url, published = str(item.get("url", "")), item.get("publishedAt")
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or not str(item.get("text", "")).strip():
        raise ValueError("Web 证据必须有 HTTPS 来源与正文")
    return {
        "id": str(item.get("id", "")),
        "type": "web-evidence",
        "title": str(item.get("title", "")),
        "url": url,
        "publishedAt": published,
        "text": str(item["text"]),
        "authorityVerified": authority_verified,
        "pointInTimeEligible": within_cutoff(published, cutoff),
        "official": authority_verified,
    }
