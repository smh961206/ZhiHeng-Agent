from __future__ import annotations

import asyncio
import hashlib
import ipaddress
import json
import re
import socket
from datetime import datetime, timezone
from html.parser import HTMLParser
from io import BytesIO
from typing import Any
from urllib.parse import urlsplit

import httpx
from pypdf import PdfReader

from ..domain.evidence import plain_blocks
from ..domain.research_budget import account as account_budget
from .data_archive import DataArchive

PRIMARY_DOMAINS = (
    "sec.gov",
    "cninfo.com.cn",
    "hkexnews.hk",
    "sse.com.cn",
    "szse.cn",
    "bse.cn",
    "stats.gov.cn",
    "pbc.gov.cn",
    "csrc.gov.cn",
    "nfra.gov.cn",
    "census.gov",
    "bls.gov",
    "bea.gov",
)


class _HTMLText(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.hidden = 0
        self.title_parts: list[str] = []
        self.in_title = False
        self.dates: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag in {"script", "style", "noscript"}:
            self.hidden += 1
        if tag == "title":
            self.in_title = True
        if tag == "meta" and (values.get("name") or values.get("property") or "").lower() in {
            "article:published_time", "datepublished", "pubdate", "publishdate", "publication_date"
        }:
            self.dates.append(values.get("content") or "")
        if tag in {"p", "div", "tr", "li", "br", "h1", "h2", "h3"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"} and self.hidden:
            self.hidden -= 1
        if tag == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)
        if not self.hidden:
            self.parts.append(data)


class WebResearchCollector:
    """Search public candidates, then admit only read bodies from configured authoritative domains."""

    def __init__(
        self,
        *,
        enabled: bool,
        tavily_key: str,
        brave_key: str,
        issuer_domains: dict[str, tuple[str, ...]],
        client: httpx.AsyncClient | None = None,
        archive: DataArchive | None = None,
        max_documents: int = 2,
    ) -> None:
        self.enabled = enabled
        self.tavily_key = tavily_key
        self.brave_key = brave_key
        self.issuer_domains = issuer_domains
        self._owned = client is None
        self.client = client or httpx.AsyncClient(timeout=httpx.Timeout(18, connect=8), follow_redirects=False)
        self.archive = archive
        self.max_documents = max_documents

    @property
    def configured(self) -> bool:
        return self.enabled and bool(self.tavily_key or self.brave_key)

    async def close(self) -> None:
        if self._owned:
            await self.client.aclose()

    @staticmethod
    def _host_matches(host: str, domain: str) -> bool:
        return host == domain or host.endswith("." + domain)

    def _authority(self, url: str, security: str) -> tuple[bool, str]:
        parsed = urlsplit(url)
        if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port not in {None, 443} or not parsed.hostname:
            return False, ""
        host = parsed.hostname.lower().rstrip(".")
        if any(self._host_matches(host, item) for item in PRIMARY_DOMAINS):
            return True, "regulator-or-disclosure"
        if any(self._host_matches(host, item) for item in self.issuer_domains.get(security, ())):
            return True, "issuer"
        return False, ""

    @staticmethod
    async def _public_host(host: str) -> bool:
        try:
            rows = await asyncio.to_thread(socket.getaddrinfo, host, 443, type=socket.SOCK_STREAM)
        except OSError:
            return False
        addresses = {row[4][0] for row in rows}
        return bool(addresses) and all(ipaddress.ip_address(value).is_global for value in addresses)

    async def _search(self, query: str) -> tuple[list[dict[str, str]], list[str]]:
        warnings: list[str] = []
        providers = (("Tavily", self.tavily_key), ("Brave", self.brave_key))
        for provider, key in providers:
            if not key:
                continue
            try:
                if provider == "Tavily":
                    response = await self._bounded_json(
                        "POST",
                        "https://api.tavily.com/search",
                        headers={"Authorization": f"Bearer {key}"},
                        json={"query": query, "topic": "general", "search_depth": "basic", "max_results": 6, "include_answer": False, "include_raw_content": False},
                    )
                    rows = response.get("results", [])
                else:
                    response = await self._bounded_json(
                        "GET",
                        "https://api.search.brave.com/res/v1/web/search",
                        headers={"X-Subscription-Token": key, "Accept": "application/json"},
                        params={"q": query, "count": 6, "safesearch": "moderate"},
                    )
                    rows = response.get("web", {}).get("results", [])
                candidates = [
                    {"url": row["url"], "title": str(row["title"])[:300], "provider": provider}
                    for row in rows[:6]
                    if isinstance(row, dict) and isinstance(row.get("url"), str) and isinstance(row.get("title"), str)
                ]
                if candidates:
                    return candidates, warnings
            except Exception as error:
                warnings.append(f"{provider} 搜索失败：{type(error).__name__}")
        return [], warnings

    async def _bounded_json(self, method: str, url: str, **kwargs: Any) -> dict[str, Any]:
        async def request() -> dict[str, Any]:
            async with self.client.stream(method, url, **kwargs) as response:
                response.raise_for_status()
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > 2_000_000:
                        raise RuntimeError("搜索响应超过大小上限")
            value = json.loads(body)
            if not isinstance(value, dict):
                raise RuntimeError("搜索响应格式无效")
            return value

        return await account_budget("webRequest", 1, request)

    @staticmethod
    def _publication_date(values: list[str], body: str, cutoff: datetime) -> str | None:
        candidates = list(values)
        candidates.extend(match.group(1) for match in re.finditer(r"(?:发布日期|发布时间|Published(?:\s+on)?)\s*[:：]?\s*(\d{4}[-年/]\d{1,2}[-月/]\d{1,2})", body[:20_000], re.I))
        valid: set[str] = set()
        for value in candidates:
            match = re.search(r"(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})", value)
            if not match:
                continue
            try:
                date = datetime(int(match[1]), int(match[2]), int(match[3]), tzinfo=timezone.utc)
            except ValueError:
                continue
            if date <= cutoff:
                valid.add(date.date().isoformat() + "T00:00:00Z")
        return next(iter(valid)) if len(valid) == 1 else None

    async def _read(self, candidate: dict[str, str], security: str, cutoff: datetime, role: str) -> dict[str, Any] | None:
        parsed = urlsplit(candidate["url"])
        if not parsed.hostname or not await self._public_host(parsed.hostname):
            return None
        archive_key = f"web-document:v1:{security}:{candidate['url']}"
        if self.archive:
            cached = await self.archive.get(archive_key, max_age_seconds=30 * 86400)
            if isinstance(cached, dict):
                return cached
        async def read_body() -> tuple[str, bytes] | None:
            async with self.client.stream("GET", candidate["url"]) as response:
                response.raise_for_status()
                media_type = response.headers.get("content-type", "").lower()
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > 20 * 1024 * 1024:
                        return None
            return media_type, bytes(body)

        fetched = await account_budget("webRequest", 1, read_body)
        if fetched is None:
            return None
        media, content = fetched
        if "pdf" in media or parsed.path.lower().endswith(".pdf"):
            reader = PdfReader(BytesIO(content), strict=True)
            if len(reader.pages) > 800:
                return None
            body = "\n\n".join(page.extract_text() or "" for page in reader.pages).strip()[:2_000_000]
            title, published = candidate["title"], None
        elif media.startswith(("text/html", "text/plain")):
            charset = "utf-8"
            match = re.search(r"charset\s*=\s*([\w-]+)", media)
            if match:
                charset = match.group(1)
            try:
                html = content.decode(charset)
            except (LookupError, UnicodeDecodeError):
                html = content.decode("utf-8", errors="replace")
            parser = _HTMLText()
            parser.feed(html)
            body = re.sub(r"\n{3,}", "\n\n", "".join(parser.parts)).strip()[:2_000_000]
            title = re.sub(r"\s+", " ", "".join(parser.title_parts)).strip()[:300] or candidate["title"]
            published = self._publication_date(parser.dates, body, cutoff)
        else:
            return None
        if len(re.sub(r"\s", "", body)) < 200:
            return None
        source_id = "WEB-" + hashlib.sha256((security + candidate["url"]).encode()).hexdigest()[:16].upper()
        warnings = [] if published else ["原文未识别唯一且不晚于研究截止日的发布日期"]
        source = {
            "id": source_id,
            "title": title,
            "type": "web-evidence",
            "official": role in {"issuer", "regulator-or-disclosure"},
            "verified": False,
            "authorityVerified": True,
            "sourceRole": role,
            "documentRead": True,
            "url": candidate["url"],
            "publishedAt": published,
            "text": body,
            "documentBlocks": plain_blocks(body, source_id),
            "provider": urlsplit(candidate["url"]).hostname,
            "discoveredBy": candidate["provider"],
            "security": security,
            "metadataWarnings": warnings,
            "fetchedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        }
        if self.archive:
            await self.archive.put(archive_key, source)
        return source

    async def collect(self, input_data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]:
        if not self.enabled:
            return [], ["主动网页搜索已关闭"]
        if not self.configured:
            return [], ["未配置 TAVILY_API_KEY 或 BRAVE_SEARCH_API_KEY，主动网页补充不可用"]
        cutoff = datetime.fromisoformat(input_data["researchCutoff"].replace("Z", "+00:00"))
        sources: list[dict[str, Any]] = []
        warnings: list[str] = []
        for item in input_data.get("securities", []):
            security = f"{item['market']}:{item['symbol']}"
            query = f"{item['symbol']} investor relations annual report official filing"
            candidates, issues = await self._search(query)
            warnings.extend(issues)
            accepted = 0
            for candidate in candidates:
                authoritative, role = self._authority(candidate["url"], security)
                if not authoritative:
                    continue
                try:
                    source = await self._read(candidate, security, cutoff, role)
                except Exception as error:
                    warnings.append(f"{security} 网页正文读取失败：{type(error).__name__}")
                    continue
                if source:
                    sources.append(source)
                    accepted += 1
                if accepted >= self.max_documents:
                    break
            if not accepted:
                warnings.append(f"{security}：搜索未取得可读取且身份已绑定的官方/发行人正文")
        return sources, warnings
