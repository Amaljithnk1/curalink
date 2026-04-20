from typing import Dict, List
from core.utils import normalize_whitespace


def expand_queries(condition: str, query: str) -> Dict[str, List[str]]:
    """
    Returns per-source query strings.
    Deterministic expansion to keep pipeline stable.
    """
    condition = normalize_whitespace(condition)
    query = normalize_whitespace(query)

    base = f"{condition} {query}".strip()
    pubmed = [
        f"{condition} AND ({query})",
        f"{condition} AND ({query}) AND (trial OR randomized OR meta-analysis OR systematic review)",
        base,
    ]
    openalex = [
        base,
        f"{condition} {query} systematic review",
        f"{condition} {query} clinical trial",
    ]
    # Trials: use condition + intervention-ish query term
    trials_term = query

    return {
        "pubmed": pubmed,
        "openalex": openalex,
        "trials_term": [trials_term],
    }
