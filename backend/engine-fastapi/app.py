import asyncio
import json
import time
from typing import Any, Dict, List

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.schemas import RunRequest, Revision
from core.utils import now_ts
from retrievers.pubmed import fetch_pubmed_candidates
from retrievers.openalex import fetch_openalex_candidates
from pipeline.expand import expand_queries
from pipeline.extract import rewrite_as_search_query
from pipeline.dedupe import dedupe_publications
from pipeline.rank import rank_publications, rank_trials
from pipeline.brief import build_deterministic_brief
from pipeline.validate import validate_brief_citations

app = FastAPI(title="CuraLink Research Engine", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

def _assign_paper_ids(top_pubs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for i, it in enumerate(top_pubs, start=1):
        it2 = dict(it)
        it2["citationId"] = f"P{i}"
        out.append(it2)
    return out

def _assign_trial_ids(top_trials: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for i, it in enumerate(top_trials, start=1):
        it2 = dict(it)
        it2["citationId"] = f"T{i}"
        out.append(it2)
    return out

@app.post("/run")
async def run(req: RunRequest):
    t0 = time.perf_counter()
    condition = req.context.condition.strip()
    location = (req.context.location or "").strip() or None
    query = req.query.strip()

    if settings.USE_GROQ and settings.GROQ_API_KEY:
        search_query = rewrite_as_search_query(condition, query)
    else:
        search_query = query
    expanded = expand_queries(condition, search_query)

    async with httpx.AsyncClient() as client:
        # Retrieve in parallel (depth-first)
        # --- BALANCED MULTI-QUERY RETRIEVAL (STABLE VERSION) ---
        pub_per_query = max(1, settings.PUBMED_RETMAX // len(expanded["pubmed"]))
        oa_per_query = max(1, settings.OPENALEX_PER_PAGE // len(expanded["openalex"]))

        # Create tasks separately
        pub_tasks = [
            fetch_pubmed_candidates(
                client,
                q,
                retmax=pub_per_query,
                tool=settings.PUBMED_TOOL,
                email=settings.PUBMED_EMAIL,
            )
            for q in expanded["pubmed"]
        ]

        oa_tasks = [
            fetch_openalex_candidates(
                client,
                q,
                per_page=oa_per_query,
                mailto=settings.OPENALEX_MAILTO,
            )
            for q in expanded["openalex"]
        ]

        # Run separately to avoid mixing
        pub_results = await asyncio.gather(*pub_tasks, return_exceptions=True)
        oa_results = await asyncio.gather(*oa_tasks, return_exceptions=True)

        # Flatten safely
        pubmed_candidates = [
            item
            for result in pub_results
            if isinstance(result, list)
            for item in result
        ]

        openalex_candidates = [
            item
            for result in oa_results
            if isinstance(result, list)
            for item in result
        ]

        trials_candidates: List[Dict[str, Any]] = []

    # Counts BEFORE dedupe
    pubmedCount = len(pubmed_candidates)
    openalexCount = len(openalex_candidates)
    trialsCount = 0

    # Merge publications and dedupe
    pub_candidates = pubmed_candidates + openalex_candidates
    deduped_pubs = dedupe_publications(pub_candidates)

    # Rank
    ranked_pubs = rank_publications(deduped_pubs, f"{condition} {query}")
    ranked_trials = rank_trials(trials_candidates, f"{condition} {query}", location)

    top_pubs = ranked_pubs[: settings.TOP_PAPERS]
    top_trs  = ranked_trials[: settings.TOP_TRIALS]

    # Assign IDs for UI
    top_pubs = _assign_paper_ids(top_pubs)
    top_trs  = _assign_trial_ids(top_trs)

    # poolTotal = deduped publications + trials (auditable “candidate pool”)
    poolTotal = len(deduped_pubs) + len(trials_candidates)

    # Build deterministic brief (LLM comes later)
    brief = build_deterministic_brief(condition, query, top_pubs, top_trs)

    valid_ids = set([p["citationId"] for p in top_pubs] + [t["citationId"] for t in top_trs])
    brief = validate_brief_citations(brief, valid_ids)

    if settings.USE_GROQ and settings.GROQ_API_KEY:
        from llm.groq_provider import GroqProvider
        provider = GroqProvider(api_key=settings.GROQ_API_KEY, model=settings.GROQ_MODEL)
        llm_brief = provider.generate_brief(condition, query, location, top_pubs, top_trs)
        print(f"GROQ RESULT: {llm_brief is not None}, model: {settings.GROQ_MODEL}")
        if llm_brief:
            brief = llm_brief
            brief = validate_brief_citations(brief, valid_ids)

    t1 = time.perf_counter()
    timeSeconds = round(t1 - t0, 3)
    revision_id = f"R{now_ts()}"

    revision = {
        "id": revision_id,
        "query": query,
        "context": req.context.model_dump(),
        "retrieval": {
            "pubmedCount": pubmedCount,
            "openalexCount": openalexCount,
            "trialsCount": trialsCount,
            "poolTotal": poolTotal,
            "shownPapers": len(top_pubs),
            "shownTrials": len(top_trs),
            "timeSeconds": timeSeconds,
        },
        "brief": brief,
        "papers": [
            {
                "citationId": p["citationId"],
                "source": p["source"],
                "title": p.get("title") or "",
                "authors": p.get("authors") or "Unknown",
                "year": int(p.get("year") or 0),
                "journal": p.get("journal") or "",
                "url": p.get("url") or "",
                "snippet": p.get("snippet") or "",
                "relevanceScore": p.get("relevanceScore"),
                "recencyBoost": p.get("recencyBoost"),
                "credibilityBoost": p.get("credibilityBoost"),
            }
            for p in top_pubs
        ],
        "trials": [
            {
                "citationId": t["citationId"],
                "title": t.get("title") or "",
                "nctId": t.get("nctId") or "",
                "status": t.get("status") or "ACTIVE",
                "locations": t.get("locations") or [],
                "locationMatch": t.get("locationMatch") or "none",
                "eligibility": t.get("eligibility") or [],
                "contact": t.get("contact"),
                "url": t.get("url") or "",
                "snippet": t.get("snippet") or None,
            }
            for t in top_trs
        ],
        "timestamp": now_ts(),
    }

    # Validate with Pydantic (ensures it matches your frontend contract)
    return Revision(**revision).model_dump()


@app.post("/rank-trials")
async def rank_trials_endpoint(req: dict):
    trials = req.get("trials", [])
    query = req.get("query", "")
    location = req.get("location", "")
    ranked = rank_trials(trials, query, location)
    return {"trials": ranked[:settings.TOP_TRIALS]}


@app.post("/merge-and-brief")
async def merge_and_brief(req: dict):
    """
    Browser already ranked the trials. Rebuild the brief so the
    Clinical-Trials section cites T1/T2 instead of 'No strong trials…'.
    """
    condition = req.get("condition", "")
    query     = req.get("query", "")
    papers    = req.get("papers", [])   # already have citationId P#
    trials    = req.get("trials", [])   # ranked trials with citationId T#

    new_brief = build_deterministic_brief(condition, query, papers, trials)

    valid_ids = {p["citationId"] for p in papers} | {t["citationId"] for t in trials}
    new_brief = validate_brief_citations(new_brief, valid_ids)

    return {"brief": new_brief}
