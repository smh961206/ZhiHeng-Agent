"""Official disclosure adapters with point-in-time filtering."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from io import BytesIO
from typing import Any
from urllib.parse import quote, urlencode, urljoin, urlsplit

import httpx
from pypdf import PdfReader

from ..domain.evidence import plain_blocks
from ..domain.research_budget import account as account_budget


async def _budgeted_get(client: httpx.AsyncClient, url: str, **kwargs: Any) -> httpx.Response:
    return await account_budget("webRequest", 1, lambda: client.get(url, **kwargs))


async def _budgeted_post(client: httpx.AsyncClient, url: str, **kwargs: Any) -> httpx.Response:
    return await account_budget("webRequest", 1, lambda: client.post(url, **kwargs))


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.hidden = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "noscript"}:
            self.hidden += 1
        elif tag in {"p", "div", "tr", "li", "br", "h1", "h2", "h3", "h4"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "noscript"} and self.hidden:
            self.hidden -= 1
        elif tag in {"p", "div", "tr", "li"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if not self.hidden:
            self.parts.append(data)

    def text(self) -> str:
        return re.sub(r"\n{3,}", "\n\n", "".join(self.parts)).strip()


def _date(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


class OfficialEvidenceCollector:
    def __init__(self, user_agent: str, *, client: httpx.AsyncClient | None = None, max_documents: int = 3) -> None:
        self.user_agent = user_agent
        self.client = client
        self.max_documents = max_documents

    async def collect(self, input_data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]:
        cutoff = _date(input_data["researchCutoff"])
        evidence: list[dict[str, Any]] = []
        gaps: list[str] = []
        for security in input_data.get("securities", []):
            if security.get("market") == "US":
                if not self.user_agent:
                    gaps.append(f"{security['symbol']}：未配置 SEC_USER_AGENT，无法读取 SEC 官方披露")
                    continue
                try:
                    evidence.extend(await self._sec_filings(security, cutoff))
                except Exception:
                    gaps.append(f"{security['symbol']}：SEC 官方披露暂不可用")
            elif security.get("market") == "HK":
                try:
                    found = await self._hkex_filings(security, cutoff)
                    evidence.extend(found)
                    if not found:
                        gaps.append(f"HK:{security['symbol']}：截止日以前未找到可读的港交所定期披露")
                except Exception:
                    gaps.append(f"HK:{security['symbol']}：港交所官方披露暂不可用")
            elif security.get("market") == "CN":
                try:
                    found = await self._cninfo_filings(security, cutoff)
                    evidence.extend(found)
                    if not found:
                        gaps.append(f"CN:{security['symbol']}：截止日以前未找到可读的法定定期披露")
                except Exception:
                    gaps.append(f"CN:{security['symbol']}：法定披露查询暂不可用")
            else:
                gaps.append(f"{security['market']}:{security['symbol']}：当前未取得可核验的交易所/法定披露原文")
        return evidence, gaps

    async def _sec_filings(self, security: dict[str, Any], cutoff: datetime) -> list[dict[str, Any]]:
        owned = self.client is None
        client = self.client or httpx.AsyncClient(timeout=httpx.Timeout(20, connect=8), headers={"User-Agent": self.user_agent}, follow_redirects=False)
        try:
            directory_response = await _budgeted_get(client, "https://www.sec.gov/files/company_tickers.json")
            directory_response.raise_for_status()
            rows = directory_response.json().values()
            symbol = security["symbol"].replace(".", "-").upper()
            matches = [row for row in rows if str(row.get("ticker", "")).upper() == symbol]
            if len(matches) != 1:
                return []
            cik = str(matches[0]["cik_str"]).zfill(10)
            submissions_response = await _budgeted_get(client, f"https://data.sec.gov/submissions/CIK{cik}.json")
            submissions_response.raise_for_status()
            recent = submissions_response.json()["filings"]["recent"]
            filings = []
            for index, form in enumerate(recent["form"]):
                filed = str(recent["filingDate"][index])
                if form not in {"10-K", "10-Q", "20-F", "40-F", "6-K"} or _date(filed) > cutoff:
                    continue
                filings.append((filed, recent["accessionNumber"][index], recent["primaryDocument"][index], form))
            result = []
            facts_response = await _budgeted_get(client, f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json")
            if facts_response.status_code == 200:
                xbrl_source = self._company_facts(security, cik, facts_response.json(), cutoff)
                if xbrl_source:
                    result.append(xbrl_source)
            for filed, accession, document, form in filings[: self.max_documents]:
                accession_path = accession.replace("-", "")
                url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accession_path}/{quote(document)}"
                response = await _budgeted_get(client, url)
                response.raise_for_status()
                if len(response.content) > 20 * 1024 * 1024:
                    continue
                parser = _TextExtractor()
                parser.feed(response.text)
                text = parser.text()[:2_000_000]
                if not text:
                    continue
                source_id = f"SEC-{accession}"
                result.append(
                    {
                        "id": source_id,
                        "title": f"{security['symbol']} {form} filed {filed}",
                        "type": "official-report",
                        "official": True,
                        "verified": True,
                        "url": url,
                        "publishedAt": filed + "T00:00:00Z",
                        "text": text,
                        "documentBlocks": plain_blocks(text, source_id),
                        "provider": "SEC EDGAR",
                        "security": f"US:{security['symbol']}",
                    }
                )
            return result
        finally:
            if owned:
                await client.aclose()

    async def _client(self) -> tuple[httpx.AsyncClient, bool]:
        if self.client:
            return self.client, False
        return httpx.AsyncClient(timeout=httpx.Timeout(25, connect=8), headers={"User-Agent": self.user_agent or "ZhiHeng research"}, follow_redirects=False), True

    @staticmethod
    def _pdf_text(data: bytes) -> str:
        if len(data) > 32 * 1024 * 1024:
            return ""
        reader = PdfReader(BytesIO(data), strict=True)
        if len(reader.pages) > 800:
            return ""
        return "\n\n".join(page.extract_text() or "" for page in reader.pages).strip()[:2_000_000]

    @classmethod
    def _pdf_source(cls, *, source_id: str, title: str, url: str, published: str, provider: str, security: str, data: bytes) -> dict[str, Any] | None:
        text = cls._pdf_text(data)
        if not text:
            return None
        return {
            "id": source_id,
            "title": title,
            "type": "official-report",
            "official": True,
            "verified": True,
            "url": url,
            "publishedAt": published,
            "text": text,
            "documentBlocks": plain_blocks(text, source_id),
            "provider": provider,
            "security": security,
        }

    async def _hkex_filings(self, security: dict[str, Any], cutoff: datetime) -> list[dict[str, Any]]:
        if not re.fullmatch(r"\d{5}", str(security.get("symbol", ""))):
            return []
        client, owned = await self._client()
        try:
            symbol = security["symbol"]
            prefix_url = "https://www1.hkexnews.hk/search/prefix.do?" + urlencode(
                {"lang": "EN", "type": "A", "name": symbol, "market": "SEHK", "callback": "callback"}
            )
            directory = (await _budgeted_get(client, prefix_url)).text.strip()
            match = re.fullmatch(r"callback\((.*)\);?", directory, re.DOTALL)
            if not match:
                return []
            companies = json.loads(match.group(1)).get("stockInfo", [])
            matches = [item for item in companies if str(item.get("code")) == symbol and str(item.get("stockId", "")).isdigit()]
            if len(matches) != 1:
                return []
            start = cutoff.replace(year=max(1970, cutoff.year - 5)).strftime("%Y%m%d")
            params = {
                "lang": "EN",
                "category": "0",
                "market": "SEHK",
                "stockId": str(matches[0]["stockId"]),
                "from": start,
                "to": cutoff.strftime("%Y%m%d"),
                "searchType": "1",
                "t1code": "40000",
                "t2Gcode": "-2",
                "t2code": "-2",
                "title": "",
            }
            response = await _budgeted_get(client, "https://www1.hkexnews.hk/search/titlesearch.xhtml?" + urlencode(params))
            response.raise_for_status()
            records: list[tuple[str, str, str]] = []
            pattern = re.compile(r"(?P<date>\d{2}/\d{2}/\d{4})[\s\S]{0,1800}?(?P<code>\d{5})[\s\S]{0,3000}?<a[^>]+href=[\"'](?P<url>[^\"']+\.pdf)[\"'][^>]*>(?P<title>[\s\S]*?)</a>", re.I)
            for item in pattern.finditer(response.text):
                if item.group("code") != symbol:
                    continue
                day, month, year = item.group("date").split("/")
                published = f"{year}-{month}-{day}T00:00:00Z"
                if _date(published) > cutoff:
                    continue
                url = urljoin("https://www1.hkexnews.hk", item.group("url"))
                parsed = urlsplit(url)
                if parsed.hostname != "www1.hkexnews.hk" or not re.fullmatch(r"/listedco/listconews/sehk/\d{4}/\d{4}/[\w.-]+\.pdf", parsed.path, re.I):
                    continue
                title = re.sub(r"<[^>]+>", " ", item.group("title"))
                records.append((published, url, re.sub(r"\s+", " ", title).strip()))
            result = []
            for published, url, title in sorted(records, reverse=True)[: self.max_documents]:
                document = await _budgeted_get(client, url)
                document.raise_for_status()
                source = self._pdf_source(
                    source_id="HKEX-" + re.sub(r"\W", "", url.rsplit("/", 1)[-1]),
                    title=title,
                    url=url,
                    published=published,
                    provider="HKEXnews",
                    security=f"HK:{symbol}",
                    data=document.content,
                )
                if source:
                    result.append(source)
            return result
        finally:
            if owned:
                await client.aclose()

    async def _cninfo_filings(self, security: dict[str, Any], cutoff: datetime) -> list[dict[str, Any]]:
        symbol = str(security.get("symbol", ""))
        if not re.fullmatch(r"\d{6}", symbol):
            return []
        client, owned = await self._client()
        try:
            is_shanghai = symbol.startswith(("5", "6", "9"))
            start = cutoff.replace(year=max(1970, cutoff.year - 5)).strftime("%Y-%m-%d")
            form = {
                "pageNum": "1",
                "pageSize": "30",
                "column": "sse" if is_shanghai else "szse",
                "tabName": "fulltext",
                "plate": "sh" if is_shanghai else "sz",
                "stock": symbol,
                "searchkey": "",
                "secid": "",
                "category": "category_ndbg_szsh;category_bndbg_szsh;category_yjdbg_szsh;category_sjdbg_szsh",
                "trade": "",
                "seDate": f"{start}~{cutoff:%Y-%m-%d}",
                "sortName": "",
                "sortType": "",
                "isHLtitle": "true",
            }
            response = await _budgeted_post(
                client,
                "https://www.cninfo.com.cn/new/hisAnnouncement/query",
                data=form,
                headers={"Origin": "https://www.cninfo.com.cn", "Referer": "https://www.cninfo.com.cn/"},
            )
            response.raise_for_status()
            announcements = response.json().get("announcements", [])
            candidates = []
            for item in announcements if isinstance(announcements, list) else []:
                if item.get("secCode") not in {None, symbol} or not isinstance(item.get("announcementTime"), (int, float)):
                    continue
                published_dt = datetime.fromtimestamp(item["announcementTime"] / 1000, tz=timezone.utc)
                if published_dt > cutoff:
                    continue
                url = urljoin("https://static.cninfo.com.cn/", str(item.get("adjunctUrl", "")))
                if urlsplit(url).hostname != "static.cninfo.com.cn" or not urlsplit(url).path.lower().endswith(".pdf"):
                    continue
                candidates.append((published_dt, url, re.sub(r"<[^>]+>", "", str(item.get("announcementTitle", "法定披露")))))
            result = []
            for published_dt, url, title in sorted(candidates, reverse=True)[: self.max_documents]:
                document = await _budgeted_get(client, url)
                document.raise_for_status()
                source = self._pdf_source(
                    source_id="CNINFO-" + re.sub(r"\W", "", url.rsplit("/", 1)[-1]),
                    title=title,
                    url=url,
                    published=published_dt.isoformat().replace("+00:00", "Z"),
                    provider="巨潮资讯网",
                    security=f"CN:{symbol}",
                    data=document.content,
                )
                if source:
                    result.append(source)
            return result
        finally:
            if owned:
                await client.aclose()

    @staticmethod
    def _company_facts(security: dict[str, Any], cik: str, payload: dict[str, Any], cutoff: datetime) -> dict[str, Any] | None:
        """Project SEC Company Facts without changing periods, units, or filing identity."""
        concepts = {
            "RevenueFromContractWithCustomerExcludingAssessedTax": "revenue",
            "Revenues": "revenue",
            "SalesRevenueNet": "revenue",
            "NetIncomeLoss": "netIncome",
            "ProfitLoss": "netIncome",
            "StockholdersEquity": "equity",
            "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest": "equity",
            "NetCashProvidedByUsedInOperatingActivities": "ocf",
            "PaymentsToAcquirePropertyPlantAndEquipment": "capex",
        }
        facts: list[dict[str, Any]] = []
        entity_cik = str(payload.get("cik", "")).zfill(10)
        if entity_cik != cik:
            return None
        for concept, body in payload.get("facts", {}).get("us-gaap", {}).items():
            metric = concepts.get(concept)
            if not metric or not isinstance(body, dict):
                continue
            for unit, rows in body.get("units", {}).items():
                if not isinstance(rows, list):
                    continue
                for row in rows:
                    if not isinstance(row, dict) or row.get("form") not in {"10-K", "10-Q", "20-F", "40-F", "6-K"}:
                        continue
                    filed = str(row.get("filed", ""))
                    try:
                        if _date(filed) > cutoff:
                            continue
                    except (TypeError, ValueError):
                        continue
                    value = row.get("val")
                    if not isinstance(value, (int, float)) or isinstance(value, bool):
                        continue
                    fact = {
                        "metric": metric,
                        "taxonomy": "us-gaap",
                        "concept": concept,
                        "label": body.get("label"),
                        "value": value,
                        "unit": unit,
                        "start": row.get("start"),
                        "end": row.get("end"),
                        "filed": filed,
                        "form": row.get("form"),
                        "fiscalYear": row.get("fy"),
                        "fiscalPeriod": row.get("fp"),
                        "frame": row.get("frame"),
                        "accession": row.get("accn"),
                        "origin": "sec-companyfacts-api",
                        "needsReview": False,
                    }
                    facts.append({key: value for key, value in fact.items() if value is not None})
        if not facts:
            return None
        facts.sort(key=lambda row: (str(row.get("end", "")), str(row.get("filed", "")), row["metric"], row["concept"]), reverse=True)
        source_id = f"SEC-XBRL-{cik}"
        return {
            "id": source_id,
            "title": f"{security['symbol']} SEC Company Facts",
            "type": "official-xbrl",
            "official": True,
            "verified": True,
            "url": f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json",
            "publishedAt": max(row["filed"] for row in facts) + "T00:00:00Z",
            "provider": "SEC EDGAR",
            "security": f"US:{security['symbol']}",
            "entityCik": cik,
            "financialFacts": facts,
            "text": "SEC Company Facts 原始结构化事实；期间、单位、表单与 accession 保持原样。",
        }
