from typing import Any, Dict, List, Tuple
from rapidfuzz import fuzz
from core.utils import normalize_title

def dedupe_publications(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Dedupe across PubMed/OpenAlex candidates.
    Priority keys: DOI, PMID, title similarity.
    """
    by_doi = {}
    by_pmid = {}
    kept: List[Dict[str, Any]] = []
    seen_titles: List[Tuple[str, Dict[str, Any]]] = []

    for it in items:
        doi = (it.get("doi") or "").lower().strip()
        pmid = (it.get("pmid") or "").strip()
        title = it.get("title") or ""
        nt = normalize_title(title)

        if doi:
            if doi in by_doi:
                continue
            by_doi[doi] = it
            kept.append(it)
            seen_titles.append((nt, it))
            continue

        if pmid:
            if pmid in by_pmid:
                continue
            by_pmid[pmid] = it
            kept.append(it)
            seen_titles.append((nt, it))
            continue

        # Fuzzy title fallback
        is_dup = False
        for prev_nt, _prev in seen_titles[-200:]:
            if not prev_nt or not nt:
                continue
            if fuzz.ratio(prev_nt, nt) >= 96:
                is_dup = True
                break
        if is_dup:
            continue

        kept.append(it)
        seen_titles.append((nt, it))

    return kept