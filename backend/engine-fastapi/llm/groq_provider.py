import json
import re
from typing import Any, Dict, List
from groq import Groq

SYSTEM = """You are CuraLink, a medical research synthesis engine answering a patient's specific question.
You must ONLY use the provided evidence items for citations.
You MUST cite using provided citationIds exactly (e.g., P1, P2, T1).
Return STRICT JSON with keys: conditionOverview, researchInsights, clinicalTrialsSummary.
Each section must include: title, content, citations (array), confidence (strong|moderate|emerging).

CRITICAL RULES:
- The patient asked a SPECIFIC question. Answer THAT question directly in every section.
- conditionOverview: Explain what is known about the specific topic (e.g. sunlight, vitamin D) in relation to the condition.
- researchInsights: Give specific findings about the topic as it relates to the condition. Be direct and useful.
- clinicalTrialsSummary: Mention any relevant trials or say what is known about clinical evidence for this topic.
- If papers don't directly cover the topic, use related evidence to give the best possible answer and note the limitation.
- Do NOT just summarize the condition generally. The patient already knows they have the condition.
- Do NOT invent citations. Do NOT cite anything not provided.
"""

class GroqProvider:
    def __init__(self, api_key: str, model: str = "llama-3.1-8b-instant"):
        self.client = Groq(api_key=api_key)
        self.model = model

    def generate_brief(self, condition: str, query: str, location: str | None, papers: List[Dict[str, Any]], trials: List[Dict[str, Any]], previous_queries: List[str] | None = None) -> Dict[str, Any] | None:
        try:
            evidence = {
                "condition": condition,
                "query": query,
                "location": location,
                "papers": [{k: p.get(k) for k in ["citationId","title","year","authors","journal","snippet","url"]} for p in papers],
                "trials": [{k: t.get(k) for k in ["citationId","title","nctId","status","locations","eligibility","contact","url"]} for t in trials],
            }

            # Build conversation context for follow-up questions
            prior_context = ""
            if previous_queries:
                prior_context = f"""
Prior questions in this session:
{chr(10).join(f'- "{q}"' for q in previous_queries)}
"""

            user = f"""Patient condition: {condition}
Current question: "{query}"
Location: {location or 'not specified'}
{prior_context}
YOUR JOB: Answer "{query}" specifically for a {condition} patient.

Rules:
- Every section title must reference "{query}" and "{condition}" together (e.g. "Sunlight Exposure and Parkinson's Disease")
- conditionOverview: What do we know about {query} in the context of {condition}? Benefits, risks, mechanisms.
- researchInsights: Specific research findings about {query} for {condition} patients. If papers don't directly cover it, use the closest related evidence and say so.
- clinicalTrialsSummary: Any trials or clinical evidence about {query} for {condition}.
- Be specific and useful. The patient wants to know if/how "{query}" affects their {condition}.
- Do NOT write a generic overview of {condition}. Focus on "{query}".

Evidence (cite only these):
{json.dumps(evidence, indent=2)}

Return ONLY valid JSON matching the schema. No markdown, no explanation."""

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