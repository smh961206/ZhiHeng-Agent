"""Provider and network policy for official web evidence."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

import httpx

from ..domain.web_evidence import normalize_web_evidence

ALLOWED_OFFICIAL_HOSTS = {"www.sec.gov", "sec.gov", "www.hkexnews.hk", "hkexnews.hk", "static.cninfo.com.cn", "www.cninfo.com.cn"}


def normalize_official_web_evidence(item: dict[str, Any], *, cutoff: str) -> dict[str, Any]:
    hostname = urlparse(str(item.get("url", ""))).hostname
    return normalize_web_evidence(item, cutoff=cutoff, authority_verified=hostname in ALLOWED_OFFICIAL_HOSTS)


async def fetch_official_document(url: str, *, client: httpx.AsyncClient, max_bytes: int = 20 * 1024 * 1024) -> bytes:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in ALLOWED_OFFICIAL_HOSTS:
        raise ValueError("官方报告地址不在允许列表")
    response = await client.get(url, follow_redirects=False)
    response.raise_for_status()
    data = response.content
    if len(data) > max_bytes:
        raise ValueError("官方报告超过读取上限")
    return data
