from typing import Any, Dict, List
from urllib.parse import quote_plus
import httpx
import asyncio

from core.utils import first_sentences, normalize_whitespace

OPENALEX_WORKS = "https://api.openalex.org/works"

def _abstract_from_inverted_index(inv) -> str:
    if not inv or not isinstance(inv, dict):
        return ""
    # inv: word -> [positions]
    # reconstruct approximate text by ordering words by min position
    pairs = []
    for w, pos in inv.items():
        if isinstance(pos, list) and pos:
            pairs.append((min(pos), w))
    pairs.sort(key=lambda x: x[0])
    return " ".join([w for _, w in pairs])

async def fetch_openalex_candidates(
    client: httpx.AsyncClient,
    query: str,
    per_page: int = 200,
    mailto: str = "",
) -> List[Dict[str, Any]]:
    params = {
        "search": query,
        "per-page": str(per_page),
        "page": "1",
        "sort": "relevance_score:desc",
    }
    if mailto:
        params["mailto"] = mailto

    data = None
    last_error: Exception | None = None
    # Transient OpenAlex failures (timeouts/429/5xx) can happen under repeated
    # follow-up queries. Retry a few times before giving up.
    for attempt in range(3):
        try:
            r = await client.get(OPENALEX_WORKS, params=params, timeout=25)
            r.raise_for_status()
            data = r.json()
            break
        except (httpx.TimeoutException, httpx.RequestError, httpx.HTTPStatusError) as exc:
            last_error = exc
            status = getattr(getattr(exc, "response", None), "status_code", None)
            retryable = isinstance(exc, (httpx.TimeoutException, httpx.RequestError)) or status in {429, 500, 502, 503, 504}
            if (not retryable) or attempt == 2:
                raise
            await asyncio.sleep(0.4 * (attempt + 1))

    if data is None:
        if last_error:
            raise last_error
        return []
    works = data.get("results", []) or []

    out: List[Dict[str, Any]] = []
    for w in works:
        title = normalize_whitespace(w.get("title") or "")
        year = int(w.get("publication_year") or 0)
        venue = (w.get("host_venue") or {}).get("display_name") or "OpenAlex"
        doi = (w.get("doi") or "").replace("https://doi.org/", "").strip()

        inv = w.get("abstract_inverted_index")
        abstract = normalize_whitespace(_abstract_from_inverted_index(inv))
        snippet = first_sentences(abstract, 2) or title

        authorships = w.get("authorships") or []
        author_names = []
        for a in authorships[:6]:
            nm = ((a.get("author") or {}).get("display_name") or "").strip()
            if nm:
                author_names.append(nm)
        
        if author_names:
            authors_str = ", ".join(author_names)
        elif venue and venue != "OpenAlex":
            authors_str = venue
        else:
            authors_str = "Various Authors"

        url = (w.get("primary_location") or {}).get("landing_page_url") or w.get("id") or ""
        out.append({
            "doi": doi,
            "title": title,
            "abstract": abstract,
            "snippet": snippet,
            "authors": authors_str,
            "journal": normalize_whitespace(venue),
            "year": year,
            "url": url,
            "source": "openalex",
        })

    return out