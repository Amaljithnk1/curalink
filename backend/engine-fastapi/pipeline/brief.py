from typing import Any, Dict, List, Tuple
from core.utils import normalize_whitespace, first_sentences

STRONG_MIN = 6
MODERATE_MIN = 3

def confidence_from_citations(cit_count: int) -> str:
    if cit_count >= STRONG_MIN:
        return "strong"
    if cit_count >= MODERATE_MIN:
        return "moderate"
    return "emerging"

def build_deterministic_brief(
    condition: str,
    query: str,
    top_papers: List[Dict[str, Any]],
    top_trials: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Produces a brief where each sentence maps 1:1 with citations list order.
    This matches your current frontend logic (sentence index -> citations[idx]).
    """

    # Pick citations per section
    ov_cits = [p["citationId"] for p in top_papers[:2] if p.get("citationId")]
    ins_cits = [p["citationId"] for p in top_papers[:4] if p.get("citationId")]
    tr_cits = [t["citationId"] for t in top_trials[:2] if t.get("citationId")]

    # Build content with same sentence count as citations count
    def sentence_for_paper(p: Dict[str, Any]) -> str:
        snip = p.get("snippet") or p.get("title") or ""
        snip = first_sentences(snip, 1) or snip
        return normalize_whitespace(snip).rstrip(".") + "."

    def sentence_for_trial(t: Dict[str, Any]) -> str:
        title = t.get("title") or "A clinical trial"
        status = (t.get("status") or "ACTIVE").title()
        loc = (t.get("locations") or [])
        loc_part = f" in {loc[0]}" if loc else ""
        return normalize_whitespace(f"{title} is {status}{loc_part}.").rstrip(".") + "."

    overview_sentences = []
    for pid in ov_cits:
        p = next((x for x in top_papers if x.get("citationId") == pid), None)
        if p:
            overview_sentences.append(sentence_for_paper(p))
    if not overview_sentences:
        overview_sentences = [f"{condition} evidence overview based on retrieved sources."]

    insights_sentences = []
    for pid in ins_cits:
        p = next((x for x in top_papers if x.get("citationId") == pid), None)
        if p:
            insights_sentences.append(sentence_for_paper(p))
    if not insights_sentences:
        insights_sentences = [f"Key insights for {condition} related to {query} are limited in retrieved sources."]

    trials_sentences = []
    for tid in tr_cits:
        t = next((x for x in top_trials if x.get("citationId") == tid), None)
        if t:
            trials_sentences.append(sentence_for_trial(t))
    if not trials_sentences:
        trials_sentences = [f"No strong trial matches were found for {condition} and {query}."]

    brief = {
        "conditionOverview": {
            "title": "Condition Overview",
            "content": " ".join(overview_sentences),
            "citations": ov_cits,
            "confidence": confidence_from_citations(len(set(ov_cits))),
        },
        "researchInsights": {
            "title": "Research Insights",
            "content": " ".join(insights_sentences),
            "citations": ins_cits,
            "confidence": confidence_from_citations(len(set(ins_cits))),
        },
        "clinicalTrialsSummary": {
            "title": "Clinical Trials",
            "content": " ".join(trials_sentences),
            "citations": tr_cits,
            "confidence": confidence_from_citations(len(set(tr_cits))),
        },
    }
    return brief