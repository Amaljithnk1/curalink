apiuimport json
import os
from typing import Any, Dict, List
from groq import Groq

class GroqProvider:
    def __init__(self, api_key: str, model: str = "llama3-8b-8192"):
        self.client = Groq(api_key=api_key)
        self.model = model

    def generate_brief(self, condition: str, query: str, location: str | None, papers: List[Dict[str, Any]], trials: List[Dict[str, Any]], previous_queries: List[str] | None = None) -> Dict[str, Any] | None:
        try:
            # Prepare evidence context
            evidence = []
            for p in papers:
                evidence.append({
                    "citationId": p.get("citationId"),
                    "title": p.get("title"),
                    "snippet": p.get("snippet"),
                    "authors": p.get("authors"),
                    "year": p.get("year")
                })
            for t in trials:
                evidence.append({
                    "citationId": t.get("citationId"),
                    "title": t.get("title"),
                    "snippet": t.get("snippet"),
                    "status": t.get("status"),
                    "nctId": t.get("nctId")
                })

            cleaned_previous = [q.strip() for q in (previous_queries or []) if q and q.strip()]
            primary_query = cleaned_previous[0] if cleaned_previous else query

            SYSTEM = """You are CuraLink, a medical research synthesis engine answering a patient's specific question.
You must ONLY use the provided evidence items for the "citations" array in each section.
Return STRICT JSON with keys: conditionOverview, researchInsights, clinicalTrialsSummary.
Each section must include: title, content, citations (array of citationIds like P1, T1), confidence (strong|moderate|emerging).

CRITICAL RULES:
        - Every section title MUST be unique, descriptive, and professional. NEVER use generic headers like "Condition Overview" or "Research Insights". Titles should include the condition or query topic.
        - The patient asked a SPECIFIC question. Answer THAT question directly in every section.
        - If this is a follow-up query, anchor your entire answer to the primary session question.
        - NO CITATION LABELS: You are FORBIDDEN from writing citation labels like (P1), [P1], (T1), or [T1] in the text.
        - NO PIPES: Do not use the pipe character "|" to separate citations in the text.
        - CLEAN PROSE ONLY: You must write clean, professional prose. The UI will automatically insert the citations based on your "citations" array. If you include labels in the text, it will break the UI and look unprofessional.
        - The "citations" array MUST have exactly one citationId for every sentence in the "content" (split by period).
        - Each section's "citations" array should list the IDs (e.g., ["P1", "P3", "T2"]) corresponding to each sentence in the content.
- If a sentence has no specific source, use the most relevant one from the list.
- conditionOverview: Explain what is known about the specific topic (e.g. sunlight, vitamin D) in relation to the condition.
- researchInsights: Give specific findings about the topic as it relates to the condition. Be direct and useful.
- clinicalTrialsSummary: Mention any relevant trials or say what is known about clinical evidence for this topic.
- If papers don't directly cover the topic, use related evidence to give the best possible answer and note the limitation.
- Do NOT just summarize the condition generally. The patient already knows they have the condition.
- Do NOT invent citations. Do NOT cite anything not provided.
"""

            user = f"""Patient condition: {condition}
Current question: "{query}"
Primary session question (anchor this answer to this): "{primary_query}"

Evidence:
{json.dumps(evidence, indent=2)}

Synthesize the brief now. Ensure unique descriptive titles and accurate citation mapping in the JSON.
"""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM},
                    {"role": "user", "content": user}
                ],
                temperature=0.2,
                max_tokens=2048,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)
            
            # Validation
            required = ["conditionOverview", "researchInsights", "clinicalTrialsSummary"]
            if all(k in result for k in required):
                return result
            
            return None

        except Exception as e:
            import traceback
            print(f"Groq error: {e}")
            traceback.print_exc()
            return None
