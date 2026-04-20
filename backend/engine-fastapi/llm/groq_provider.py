import json
import re
from typing import Any, Dict, List
from groq import Groq

SYSTEM = """You are CuraLink, a medical research synthesis engine.
You must ONLY use the provided evidence items.
You MUST cite using provided citationIds exactly (e.g., P1, P2, T1).
Return STRICT JSON with keys: conditionOverview, researchInsights, clinicalTrialsSummary.
Each section must include: title, content, citations (array), confidence (strong|moderate|emerging).
Do NOT invent citations. Do NOT cite anything not provided.
"""

class GroqProvider:
    def __init__(self, api_key: str, model: str = "llama-3.1-8b-instant"):
        self.client = Groq(api_key=api_key)
        self.model = model

    def generate_brief(self, condition: str, query: str, location: str | None, papers: List[Dict[str, Any]], trials: List[Dict[str, Any]]) -> Dict[str, Any] | None:
        try:
            evidence = {
                "condition": condition,
                "query": query,
                "location": location,
                "papers": [{k: p.get(k) for k in ["citationId","title","year","authors","journal","snippet","url"]} for p in papers],
                "trials": [{k: t.get(k) for k in ["citationId","title","nctId","status","locations","eligibility","contact","url"]} for t in trials],
            }

            user = f"""The patient has condition: {condition}
Their specific question is: "{query}"
Location: {location or 'not specified'}

DIRECTLY answer their question "{query}" using ONLY the evidence below.
Do not just summarize papers. Answer what they actually asked.
If they ask about a supplement or drug, say whether it is safe or beneficial for {condition} patients based on the evidence.
If they ask about treatments, give specific treatment insights for {condition}.

Evidence:
{json.dumps(evidence, indent=2)}

Return ONLY valid JSON. No markdown."""

            resp = self.client.chat.completions.create(
                model=self.model,
                temperature=0.2,
                messages=[
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": user},
                ],
            )
            raw = resp.choices[0].message.content or ""
            raw = re.sub(r"^```(?:json)?", "", raw.strip()).strip()
            raw = re.sub(r"```$", "", raw).strip()
            return json.loads(raw)
        except Exception:
            return None