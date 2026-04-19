from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote_plus
import httpx
from lxml import etree

from core.utils import first_sentences, normalize_whitespace

PUBMED_ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_EFETCH  = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

def _parse_pubmed_xml(xml_text: str) -> List[Dict[str, Any]]:
    root = etree.fromstring(xml_text.encode("utf-8"))
    articles: List[Dict[str, Any]] = []

    for article in root.findall(".//PubmedArticle"):
        pmid = article.findtext(".//PMID") or ""

        title = article.findtext(".//ArticleTitle") or ""
        # Abstract may be multiple AbstractText nodes
        abs_nodes = article.findall(".//Abstract/AbstractText")
        abstract_parts = []
        for n in abs_nodes:
            txt = (n.text or "").strip()
            if txt:
                abstract_parts.append(txt)
        abstract = normalize_whitespace(" ".join(abstract_parts))

        journal = article.findtext(".//Journal/Title") or ""
        year = article.findtext(".//JournalIssue/PubDate/Year")
        if not year:
            medline_date = article.findtext(".//JournalIssue/PubDate/MedlineDate") or ""
            year = "".join([c for c in medline_date if c.isdigit()])[:4] if medline_date else "0"
        try:
            year_i = int(year)
        except:
            year_i = 0

        # Authors
        author_nodes = article.findall(".//AuthorList/Author")
        authors = []
        for a in author_nodes:
            last = a.findtext("LastName") or ""
            fore = a.findtext("ForeName") or ""
            name = (fore + " " + last).strip() or (a.findtext("CollectiveName") or "").strip()
            if name:
                authors.append(name)
        authors_str = ", ".join(authors[:6]) if authors else "Unknown"

        # DOI
        doi = ""
        for aid in article.findall(".//ArticleIdList/ArticleId"):
            if (aid.get("IdType") or "").lower() == "doi":
                doi = (aid.text or "").strip()
                break

        url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else ""

        articles.append({
            "pmid": pmid,
            "doi": doi,
            "title": normalize_whitespace(title),
            "abstract": abstract,
            "snippet": first_sentences(abstract, 2) or normalize_whitespace(title),
            "authors": authors_str,
            "journal": normalize_whitespace(journal) or "PubMed",
            "year": year_i or 0,
            "url": url,
            "source": "pubmed",
        })

    return articles

async def fetch_pubmed_candidates(
    client: httpx.AsyncClient,
    query: str,
    retmax: int = 200,
    tool: str = "curalink",
    email: str = "",
) -> List[Dict[str, Any]]:
    term = quote_plus(query)
    params = {
        "db": "pubmed",
        "term": term,
        "retmax": str(retmax),
        "sort": "pub+date",
        "retmode": "json",
        "tool": tool,
    }
    if email:
        params["email"] = email

    r = await client.get(PUBMED_ESEARCH, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    ids = data.get("esearchresult", {}).get("idlist", [])
    if not ids:
        return []

    import asyncio

    async def fetch_batch(batch_ids: List[str]) -> List[Dict[str, Any]]:
        params2 = {
            "db": "pubmed",
            "id": ",".join(batch_ids),
            "retmode": "xml",
            "tool": tool,
        }
        if email:
            params2["email"] = email
        r2 = await client.get(PUBMED_EFETCH, params=params2, timeout=60)
        r2.raise_for_status()
        return _parse_pubmed_xml(r2.text)

    BATCH = 50
    batches = [ids[i:i+BATCH] for i in range(0, len(ids), BATCH)]
    batch_results = await asyncio.gather(*[fetch_batch(b) for b in batches], return_exceptions=True)
    results = [item for r in batch_results if isinstance(r, list) for item in r]

    return results