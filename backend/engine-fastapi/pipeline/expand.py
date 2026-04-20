from typing import Dict, List, Optional
from core.utils import normalize_whitespace


def expand_queries(
    condition: str,
    query: str,
    previous_queries: Optional[List[str]] = None,
) -> Dict[str, List[str]]:
    """
    Returns per-source query strings.
    When previous_queries are provided, the current query is treated as a
    follow-up and anchored to the condition + prior context.
    """
    condition = normalize_whitespace(condition)
    query = normalize_whitespace(query)

    # Build an enriched query that always includes the condition
    if previous_queries:
        # Combine condition with the current follow-up query
        enriched = f"{condition} {query}".strip()
    else:
        enriched = query

    base = f"{condition} {enriched}".strip() if not previous_queries else enriched

    pubmed = [
        f"{condition} AND ({enriched})",
        f"{condition} AND ({enriched}) AND (trial OR randomized OR meta-analysis OR systematic review)",
        base,
    ]
    openalex = [
        base,
        f"{condition} {enriched} systematic review",
        f"{condition} {enriched} clinical trial",
    ]
    trials_term = enriched

    return {
        "pubmed": pubmed,
        "openalex": openalex,
        "trials_term": [trials_term],
    }
