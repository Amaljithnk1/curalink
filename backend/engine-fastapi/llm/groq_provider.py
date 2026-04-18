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
    def __init__(self, api_key: str, model: str = "llama3-8b-8192"):
        self.client = Groq(api_key=api_key)
        self.model = model

    async def generate_brief(self, context: Dict[str, Any], papers: List[Dict[str, Any]], trials: List[Dict[str, Any]]) -> Dict[str, Any]:
        # NOTE: groq python client is sync; keep it simple for hackathon.
        evidence = {
            "context": context,
            "papers": [{k: p.get(k) for k in ["citationId","title","year","authors","journal","snippet","url"]} for p in papers],
            "trials": [{k: t.get(k) for k in ["citationId","title","nctId","status","locations","eligibility","contact","url"]} for t in trials],
        }

        user = f"Create a structured brief for:\n{evidence}\nReturn JSON only."
        resp = self.client.chat.completions.create(
            model=self.model,
            temperature=0.2,
            messages=[
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": user},
            ],
        )
        content = resp.choices[0].message.content
        # Expect JSON; caller should handle json parsing errors gracefully.
        return {"raw": content}