# retrievers/clinicaltrials.py
from typing import Any, Dict, List, Optional
import httpx

from core.utils import (
    location_match,
    normalize_whitespace,
    first_sentences,
    split_location,          # ← already exists
)

CT_BASE = "https://clinicaltrials.gov/api/v2/studies"


# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------
def _bulletize_eligibility(text: str, max_items: int = 8) -> List[str]:
    text = normalize_whitespace(text)
    if not text:
        return []
    parts: List[str] = []
    for chunk in text.replace(";", "\n").split("\n"):
        c = chunk.strip(" -•\t")
        if len(c) >= 6:
            parts.append(c)
    seen, bullets = set(), []
    for p in parts:
        if p.lower() in seen:
            continue
        seen.add(p.lower())
        bullets.append(p)
        if len(bullets) >= max_items:
            break
    return bullets


# ------------------------------------------------------------
# Main fetcher (location-aware)
# ------------------------------------------------------------
async def fetch_trials_candidates(
    client: httpx.AsyncClient,
    condition: str,
    term: str,
    page_size: int,
    user_location: Optional[str],
) -> List[Dict[str, Any]]:
    """
    • condition → disease (query.cond)
    • term      → intervention keywords (query.term)
    • user_location → city / country string; we append it to query.term
    """
    # ----------- build query params ---------------------------------
    params: Dict[str, str] = {
        "format": "json",
        "pageSize": str(page_size),
        "query.cond": condition,
    }

    # intervention term from user query
    if term:
        params["query.term"] = term

    # inject geo term (city preferred over country)
    city, country = split_location(user_location)
    geo = city or country
    if geo:
        extra = params.get("query.term", "")
        params["query.term"] = f"{extra} {geo}".strip()

    # ----------- API call ------------------------------------------
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Referer": "https://clinicaltrials.gov/",
        "Origin": "https://clinicaltrials.gov",
    }
    r = await client.get(CT_BASE, params=params, timeout=20, headers=headers)
    r.raise_for_status()
    data = r.json()
    studies = data.get("studies", []) or []

    # ----------- parse ---------------------------------------------
    out: List[Dict[str, Any]] = []
    for s in studies:
        prot = s.get("protocolSection") or {}
        ident = prot.get("identificationModule") or {}
        status_mod = prot.get("statusModule") or {}
        elig_mod = prot.get("eligibilityModule") or {}
        contacts_mod = prot.get("contactsLocationsModule") or {}

        title = normalize_whitespace(
            ident.get("briefTitle") or ident.get("officialTitle") or ""
        )
        nct = (ident.get("nctId") or "").strip()
        status = (status_mod.get("overallStatus") or "ACTIVE").upper()

        # locations list
        locs: List[str] = []
        for loc in contacts_mod.get("locations") or []:
            city_ = (loc.get("city") or "").strip()
            country_ = (loc.get("country") or "").strip()
            facility = loc.get("facility") or ""
            name = (
                facility
                if isinstance(facility, str)
                else (facility.get("name") or "")
            ).strip()
            parts = [p for p in [name, city_, country_] if p]
            if parts:
                locs.append(", ".join(parts[:3]))
        locs = locs[:10]

        # central contact
        contact_obj = None
        central = contacts_mod.get("centralContacts") or []
        if central:
            c0 = central[0] or {}
            nm = (c0.get("name") or "").strip() or "Study Contact"
            email = (c0.get("email") or "").strip() or None
            phone = (c0.get("phone") or "").strip() or None
            contact_obj = {"name": nm, "email": email, "phone": phone}

        elig_text = elig_mod.get("eligibilityCriteria") or ""
        eligibility = _bulletize_eligibility(elig_text)

        url = f"https://clinicaltrials.gov/study/{nct}" if nct else "https://clinicaltrials.gov/"
        match = location_match(user_location, locs)

        out.append(
            {
                "nctId": nct,
                "title": title or f"Clinical trial {nct}",
                "status": status
                if status in {"RECRUITING", "COMPLETED", "ACTIVE", "SUSPENDED"}
                else "ACTIVE",
                "locations": locs,
                "locationMatch": match,
                "eligibility": eligibility,
                "contact": contact_obj,
                "url": url,
                "snippet": first_sentences(elig_text, 1) if elig_text else "",
                "source": "clinicaltrials",
            }
        )

    return out