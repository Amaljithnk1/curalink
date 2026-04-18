from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus
import httpx

from core.utils import location_match, normalize_whitespace, safe_get, first_sentences

CT_BASE = "https://clinicaltrials.gov/api/v2/studies"

def _bulletize_eligibility(text: str, max_items: int = 8) -> List[str]:
    text = normalize_whitespace(text)
    if not text:
        return []
    # split on newlines or semicolons
    parts = []
    for chunk in text.replace(";", "\n").split("\n"):
        c = chunk.strip(" -•\t")
        if len(c) >= 6:
            parts.append(c)
    # dedupe preserve order
    seen = set()
    bullets = []
    for p in parts:
        if p.lower() in seen:
            continue
        seen.add(p.lower())
        bullets.append(p)
        if len(bullets) >= max_items:
            break
    return bullets

async def fetch_trials_candidates(
    client: httpx.AsyncClient,
    condition: str,
    term: str,
    page_size: int,
    user_location: Optional[str],
) -> List[Dict[str, Any]]:
    params = {
        "format": "json",
        "pageSize": str(page_size),
        "query.cond": condition,
    }
    # term helps bring intervention-specific trials
    if term:
        params["query.term"] = term

    r = await client.get(CT_BASE, params=params, timeout=20)
    r.raise_for_status()
    data = r.json()
    studies = data.get("studies", []) or []

    out: List[Dict[str, Any]] = []
    for s in studies:
        prot = s.get("protocolSection") or {}
        ident = prot.get("identificationModule") or {}
        status_mod = prot.get("statusModule") or {}
        elig_mod = prot.get("eligibilityModule") or {}
        contacts_mod = prot.get("contactsLocationsModule") or {}

        title = normalize_whitespace(ident.get("briefTitle") or ident.get("officialTitle") or "")
        nct = (ident.get("nctId") or "").strip()
        status = (status_mod.get("overallStatus") or "ACTIVE").upper()

        # Locations
        locs = []
        for loc in (contacts_mod.get("locations") or []):
            city = (loc.get("city") or "").strip()
            country = (loc.get("country") or "").strip()
            facility = loc.get("facility") or ""
            name = (facility if isinstance(facility, str) else (facility.get("name") or "")).strip()
            parts = [p for p in [name, city, country] if p]
            if parts:
                locs.append(", ".join(parts[:3]))
        locs = locs[:10]

        # Contacts (centralContacts often exists)
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

        out.append({
            "nctId": nct,
            "title": title or f"Clinical trial {nct}",
            "status": status if status in {"RECRUITING","COMPLETED","ACTIVE","SUSPENDED"} else "ACTIVE",
            "locations": locs,
            "locationMatch": match,
            "eligibility": eligibility,
            "contact": contact_obj,
            "url": url,
            "snippet": first_sentences(elig_text, 1) if elig_text else "",
            "source": "clinicaltrials",
        })

    return out