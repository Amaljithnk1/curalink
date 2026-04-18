from typing import Any, Dict, List
from urllib.parse import quote_plus
import httpx

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

    r = await client.get(OPENALEX_WORKS, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
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
        authors_str = ", ".join(author_names) if author_names else "Unknown"

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