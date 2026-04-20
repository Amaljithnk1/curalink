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
            cleaned_previous = [q.strip() for q in (previous_queries or []) if q and q.strip()]
            primary_query = cleaned_previous[0] if cleaned_previous else query
            evidence = {
                "condition": condition,
                "query": query,
                "primary_query": primary_query,
                "session_questions": cleaned_previous + ([query] if query not in cleaned_previous else []),
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
Primary session question (anchor this answer to this): "{primary_query}"
Location: {location or 'not specified'}
{prior_context}
YOUR JOB: Answer "{query}" specifically for a {condition} patient, while grounding it in the primary session question "{primary_query}".

Rules:
- Every section title must reference "{condition}" and should connect "{query}" back to "{primary_query}".
- Treat "{primary_query}" as the main context and "{query}" as the latest follow-up intent.
- conditionOverview: What do we know about {query} in the context of {condition}, connected to {primary_query}? Benefits, risks, mechanisms.
- researchInsights: Specific research findings about {query} for {condition} patients. If evidence is weak for {query}, bridge from the primary topic "{primary_query}" and state the limitation.
- clinicalTrialsSummary: Any trials or clinical evidence about {query} for {condition}; if sparse, report evidence around "{primary_query}" and explain relevance.
- Be specific and useful. The patient wants to know if/how "{query}" affects their {condition}.
- Do NOT write a generic overview of {condition}. Focus on "{query}".
- For short/vague follow-ups (e.g. "is it good?", "sunlight"), infer intent from the primary session question first.
- If the follow-up has little direct evidence (e.g. "moonlight"), state that clearly but still provide condition-relevant guidance anchored to "{primary_query}".

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