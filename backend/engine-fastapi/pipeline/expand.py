from typing import Dict, List
from core.utils import normalize_whitespace
import re

STOPWORDS = {
    "can", "i", "take", "should", "is", "it", "safe",
    "to", "for", "a", "the", "with", "about", "of",
    "in", "on", "at", "and", "or", "latest", "new"
}

def _clean_query(query: str) -> str:
    query = normalize_whitespace(query.lower())
    query = re.sub(r"[^\w\s\-]", "", query)
    tokens = [t for t in query.split() if t not in STOPWORDS]
    return " ".join(tokens) if tokens else query


def expand_queries(condition: str, query: str) -> Dict[str, List[str]]:
    condition = normalize_whitespace(condition)
    query_clean = _clean_query(query)

    base = f"{condition} {query_clean}".strip()

    pubmed = [
        f"{condition} AND ({query_clean})",
        f"{condition} AND ({query_clean}) AND (trial OR randomized OR meta-analysis OR systematic review)",
        base,
    ]

    openalex = [
        base,
        f"{condition} {query_clean} systematic review",
        f"{condition} {query_clean} clinical trial",
    ]

    trials_term = query_clean

    return {
        "pubmed": pubmed,
        "openalex": openalex,
        "trials_term": [trials_term],
    }
