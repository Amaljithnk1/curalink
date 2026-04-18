from typing import Any, Dict, List, Tuple
from core.utils import tokenize
from rapidfuzz import fuzz

def _overlap_score(query_tokens: List[str], doc_tokens: List[str]) -> float:
    if not query_tokens:
        return 0.0
    q = set(query_tokens)
    d = set(doc_tokens)
    return len(q & d) / max(1, len(q))

def rank_publications(candidates: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
    q = (query or "").lower()
    qtok = tokenize(q)
    ranked = []
    for it in candidates:
        title = (it.get("title") or "")
        snip = (it.get("snippet") or "")
        text = f"{title} {snip}"
        dtok = tokenize(text)

        overlap = _overlap_score(qtok, dtok)
        fuzz_title = fuzz.token_set_ratio(q, title.lower()) / 100.0 if title else 0.0
        fuzz_snip = fuzz.partial_ratio(q, snip.lower()) / 100.0 if snip else 0.0
        phrase_bonus = 0.08 if q and q in title.lower() else 0.0

        rel = max(0.0, min(1.0, 0.55*fuzz_title + 0.25*fuzz_snip + 0.20*overlap + phrase_bonus))

        year = int(it.get("year") or 0)
        recency = 0.0
        if year:
            recency = max(0.0, min(0.15, (year - 2016) / 10 * 0.15))
        cred = 0.08 if it.get("source") == "pubmed" else 0.03

        total = 0.75 * rel + recency + cred

        it["relevanceScore"] = round(rel, 4)
        it["recencyBoost"] = round(recency, 4)
        it["credibilityBoost"] = round(cred, 4)
        it["_score"] = total
        ranked.append(it)

    ranked.sort(key=lambda x: x.get("_score", 0), reverse=True)
    return ranked

def rank_trials(candidates: List[Dict[str, Any]], query: str, user_location: str | None) -> List[Dict[str, Any]]:
    qtok = tokenize(query)
    ranked = []
    for it in candidates:
        text = f"{it.get('title','')} {' '.join(it.get('locations',[]))}"
        dtok = tokenize(text)
        rel = _overlap_score(qtok, dtok)

        status = (it.get("status") or "ACTIVE").upper()
        status_boost = 0.15 if status == "RECRUITING" else 0.08 if status == "ACTIVE" else 0.03

        match = it.get("locationMatch") or "none"
        loc_boost = 0.15 if match == "city" else 0.08 if match == "country" else 0.0

        total = 0.7 * rel + status_boost + loc_boost
        it["_score"] = total
        it["relevanceScore"] = round(rel, 4)
        it["statusBoost"] = round(status_boost, 4)
        it["locationBoost"] = round(loc_boost, 4)
        ranked.append(it)
    ranked.sort(key=lambda x: x.get("_score", 0), reverse=True)
    return ranked