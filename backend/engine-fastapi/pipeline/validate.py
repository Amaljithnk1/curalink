from typing import Any, Dict, List, Set

def validate_brief_citations(brief: Dict[str, Any], valid_ids: Set[str]) -> Dict[str, Any]:
    for key in ["conditionOverview", "researchInsights", "clinicalTrialsSummary"]:
        sec = brief.get(key) or {}
        cits = sec.get("citations") or []
        cits2 = [c for c in cits if c in valid_ids]
        sec["citations"] = cits2
        # if no citations, keep emerging
        if not cits2:
            sec["confidence"] = "emerging"
            if isinstance(sec.get("content"), str) and "Evidence limited" not in sec["content"]:
                sec["content"] = sec["content"].strip() + " Evidence limited in retrieved sources."
        brief[key] = sec
    return brief