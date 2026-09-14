"""Disposable display assets from public Wikimedia data; never research evidence."""
from __future__ import annotations

import asyncio
import json
import re
import time
from collections import OrderedDict
from dataclasses import dataclass
from urllib.parse import quote, unquote, urlsplit, urlunsplit

import httpx

# Exchange identifiers describe the provider protocol, not individual companies.
EXCHANGES = {
    "CN": ("Q739514", "Q517750", "Q108393997"),  # Shanghai, Shenzhen, Beijing
    "HK": ("Q496672",),
    "US": ("Q82059", "Q13677"),  # Nasdaq, NYSE; other venues may have no logo
}
MAX_BYTES = 256 * 1024
MAX_ENTRIES = 256
MAX_PENDING = 16
USER_AGENT = "ZhiHeng-Agent/5.3 (company-logo display; https://github.com/smh961206/ZhiHeng-Agent)"


def listing_identity(market: str, symbol: str) -> tuple[str, str] | None:
    symbol = symbol.strip().upper()
    if market == "HK" and re.fullmatch(r"[0-9]{1,5}", symbol) and int(symbol):
        return market, symbol.zfill(5)
    if market == "CN" and re.fullmatch(r"[0-9]{6}", symbol) and int(symbol):
        return market, symbol
    if market == "US" and len(symbol) <= 16 and re.fullmatch(r"[A-Z][A-Z0-9]*(?:[.-][A-Z0-9]+)*", symbol):
        return market, symbol
    return None


def listing_query(identity: tuple[str, str]) -> str:
    market, symbol = identity
    tickers = {symbol}
    if market == "HK":
        tickers.update({str(int(symbol)), str(int(symbol)).zfill(4)})
    # Share-class punctuation is meaningful; do not guess a different ticker.
    values = " ".join(json.dumps(value) for value in sorted(tickers))
    exchanges = " ".join(f"wd:{value}" for value in EXCHANGES[market])
    return f"""PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/>
PREFIX wikibase: <http://wikiba.se/ontology#>
SELECT DISTINCT ?item ?logo WHERE {{
 VALUES ?ticker {{ {values} }} VALUES ?exchange {{ {exchanges} }}
 ?listing pq:P249 ?ticker; ps:P414 ?exchange.
 ?item p:P414 ?listing.
 FILTER NOT EXISTS {{ ?listing wikibase:rank wikibase:DeprecatedRank }}
 FILTER NOT EXISTS {{ ?listing pq:P582 ?end. FILTER(?end <= NOW()) }}
 FILTER NOT EXISTS {{ ?listing pq:P580 ?start. FILTER(?start > NOW()) }}
 OPTIONAL {{ ?item wdt:P154 ?logo }}
}} LIMIT 21"""


def logo_files(data: dict) -> list[str]:
    rows = data["results"]["bindings"]
    # Never select the first company from ambiguous or truncated results.
    if not rows or len(rows) > 20:
        return []
    issuers = {row["item"]["value"] for row in rows}
    if len(issuers) != 1 or not re.fullmatch(r"https?://www\.wikidata\.org/entity/Q[0-9]+", next(iter(issuers))):
        return []
    names = set()
    for row in rows:
        value = row.get("logo", {}).get("value", "")
        match = re.fullmatch(r"https?://commons\.wikimedia\.org/wiki/Special:FilePath/([^?#]+)", value)
        if match:
            name = unquote(match[1])
            if len(name) <= 240 and not any(c in name for c in "|\r\n\x00"):
                names.add(name)
    return sorted(names)


def thumbnail(info: dict) -> str | None:
    metadata = info.get("extmetadata", {})
    # Only assets explicitly marked as public domain/CC0 without attribution
    # obligations are embedded. Unknown or other licenses remain missing.
    license_name = metadata.get("LicenseShortName", {}).get("value", "").lower()
    attribution = str(metadata.get("AttributionRequired", {}).get("value", "")).lower()
    if license_name not in {"public domain", "cc0"} or attribution != "false":
        return None
    url = urlsplit(info.get("thumburl", ""))
    if url.scheme != "https" or url.netloc not in {"upload.wikimedia.org", "thumb.wikimedia.org"} or not url.path.startswith("/wikipedia/commons/"):
        return None
    return urlunsplit((url.scheme, url.netloc, url.path, "", ""))


@dataclass(frozen=True)
class Logo:
    content: bytes
    media_type: str
    source: str


class CompanyLogos:
    def __init__(self, *, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self.client = httpx.AsyncClient(
            transport=transport, timeout=httpx.Timeout(5, connect=3), follow_redirects=False,
            headers={"User-Agent": USER_AGENT}, limits=httpx.Limits(max_connections=3),
        )
        self.cache: OrderedDict[tuple[str, str], tuple[float, Logo | None]] = OrderedDict()
        self.pending: dict[tuple[str, str], asyncio.Task[Logo | None]] = {}
        self.slots = asyncio.Semaphore(3)
        self.cooldown_until = 0.0

    async def close(self) -> None:
        tasks = tuple(self.pending.values())
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        await self.client.aclose()

    async def get(self, market: str, symbol: str) -> Logo | None:
        identity = listing_identity(market, symbol)
        if identity is None:
            return None
        cached = self.cache.get(identity)
        if cached and cached[0] > time.monotonic():
            self.cache.move_to_end(identity)
            return cached[1]
        if identity in self.pending:
            return await asyncio.shield(self.pending[identity])
        if len(self.pending) >= MAX_PENDING or time.monotonic() < self.cooldown_until:
            return None
        task = asyncio.create_task(self._load(identity))
        self.pending[identity] = task
        return await asyncio.shield(task)

    async def _load(self, identity: tuple[str, str]) -> Logo | None:
        result = None
        ttl = 3600
        try:
            result = await asyncio.wait_for(self._lookup(identity), timeout=12)
            if result:
                ttl = 86400
        except (httpx.HTTPError, TimeoutError, ValueError, KeyError, TypeError, AttributeError):
            ttl = 60
        finally:
            self.pending.pop(identity, None)
        self.cache[identity] = (time.monotonic() + ttl, result)
        self.cache.move_to_end(identity)
        while len(self.cache) > MAX_ENTRIES:
            self.cache.popitem(last=False)
        return result

    async def _read(self, url: str, params: dict | None = None) -> tuple[bytes, str]:
        async with self.client.stream("GET", url, params=params) as response:
            if response.status_code in {429, 503}:
                self.cooldown_until = time.monotonic() + 60
            response.raise_for_status()
            body = bytearray()
            async for chunk in response.aiter_bytes():
                body.extend(chunk)
                if len(body) > MAX_BYTES:
                    raise ValueError("Logo response too large")
            return bytes(body), response.headers.get("content-type", "").split(";", 1)[0].lower()

    async def _lookup(self, identity: tuple[str, str]) -> Logo | None:
        async with self.slots:
            if time.monotonic() < self.cooldown_until:
                return None
            body, _ = await self._read("https://query.wikidata.org/sparql", {"query": listing_query(identity), "format": "json"})
            files = logo_files(json.loads(body))
            if not files:
                return None
            # Variants of the same issuer are sorted deterministically, with a
            # bounded second choice if the first is unavailable or unsuitable.
            for name in files[:2]:
                body, _ = await self._read("https://commons.wikimedia.org/w/api.php", {
                    "action": "query", "format": "json", "formatversion": "2", "prop": "imageinfo",
                    "titles": f"File:{name}", "iiprop": "url|mime|extmetadata", "iiurlwidth": "96",
                })
                pages = json.loads(body).get("query", {}).get("pages", [])
                if len(pages) != 1 or not pages[0].get("imageinfo"):
                    continue
                url = thumbnail(pages[0]["imageinfo"][0])
                if not url:
                    continue
                content, media_type = await self._read(url)
                if (media_type == "image/png" and content.startswith(b"\x89PNG\r\n\x1a\n")) or (media_type == "image/jpeg" and content.startswith(b"\xff\xd8\xff")):
                    return Logo(content, media_type, f"https://commons.wikimedia.org/wiki/File:{quote(name, safe='')}")
            return None
