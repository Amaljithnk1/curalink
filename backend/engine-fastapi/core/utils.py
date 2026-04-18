import re
import time
from typing import Any, Dict, Iterable, List, Optional, Tuple

_WORD_RE = re.compile(r"[a-zA-Z0-9]+")

def now_ts() -> int:
    return int(time.time())

def normalize_whitespace(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

def normalize_title(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def tokenize(text: str) -> List[str]:
    text = (text or "").lower()
    return _WORD_RE.findall(text)

def safe_get(d: Dict[str, Any], path: List[str], default=None):
    cur: Any = d
    for key in path:
        if not isinstance(cur, dict) or key not in cur:
            return default
        cur = cur[key]
    return cur

def split_location(location: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Very simple parser:
    "Toronto, Canada" -> ("toronto", "canada")
    "India" -> (None, "india")
    """
    if not location:
        return None, None
    parts = [p.strip().lower() for p in location.split(",") if p.strip()]
    if len(parts) == 1:
        return None, parts[0]
    return parts[0], parts[-1]

def location_match(user_location: Optional[str], trial_locations: Iterable[str]) -> str:
    """
    Returns: city|country|none based on simple substring matching.
    """
    city, country = split_location(user_location)
    loc_blob = " | ".join([str(x).lower() for x in trial_locations if x])

    if city and city in loc_blob:
        return "city"
    if country and country in loc_blob:
        return "country"
    return "none"

def first_sentences(text: str, n: int = 2) -> str:
    text = normalize_whitespace(text)
    if not text:
        return ""
    # naive sentence split good enough for snippets
    parts = re.split(r"(?<=[.!?])\s+", text)
    return " ".join(parts[:n]).strip()