from typing import Dict, List, Optional
from core.utils import normalize_whitespace


def _build_follow_up_context(
    query: str,
    previous_queries: Optional[List[str]] = None,
) -> Dict[str, str]:
    query = normalize_whitespace(query)
    previous = [normalize_whitespace(q) for q in (previous_queries or []) if normalize_whitespace(q)]

    if not previous:
        return {
            "primary_query": query,
            "context_query": query,
            "query": query,
        }

    primary_query = previous[0]
    # Keep the most recent turns while always preserving the primary question.
    recent_context = previous[-2:]
    combined_parts: List[str] = [primary_query]
    for q in recent_context:
        if q not in combined_parts:
            combined_parts.append(q)
    if query not in combined_parts:
        combined_parts.append(query)

    return {
        "primary_query": primary_query,
        "context_query": " ; ".join(combined_parts),
        "query": query,
    }


def expand_queries(
    condition: str,
    query: str,
    previous_queries: Optional[List[str]] = None,
) -> Dict[str, List[str]]:
    """
    Always anchors the query to the condition so retrieval is topic-specific.
    """
    condition = normalize_whitespace(condition)
    ctx = _build_follow_up_context(query, previous_queries)
    primary_query = ctx["primary_query"]
    context_query = ctx["context_query"]
    query = ctx["query"]

    # Always search condition + specific query together
    base = f"{condition} {context_query}".strip()

    pubmed = [
        f"{condition} AND ({primary_query}) AND ({query})",
        f"{condition} AND ({context_query}) AND (trial OR randomized OR meta-analysis OR systematic review)",
        base,
    ]
    openalex = [
        base,
        f"{condition} {primary_query} {query} systematic review",
        f"{condition} {primary_query} {query} clinical trial",
    ]

    return {
        "pubmed": pubmed,
        "openalex": openalex,
        "trials_term": [f"{primary_query} {query}".strip()],
    }
