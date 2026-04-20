from typing import Dict, List, Optional
from core.utils import normalize_whitespace


def expand_queries(
    condition: str,
    query: str,
    previous_queries: Optional[List[str]] = None,
) -> Dict[str, List[str]]:
    """
    Always anchors the query to the condition so retrieval is topic-specific.
    """
    condition = normalize_whitespace(condition)
    query = normalize_whitespace(query)

    # Always search condition + specific query together
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

    return {
        "pubmed": pubmed,
        "openalex": openalex,
        "trials_term": [query],
    }
