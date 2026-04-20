from groq import Groq
from core.config import settings
from core.utils import normalize_whitespace


def rewrite_as_search_query(condition: str, query: str) -> str:
    prompt = f"""
You are converting a medical question into a structured search query.

Condition: {condition}
User question: "{query}"

Rewrite this as a concise medical search query. Keep important medical terms.
Remove conversational filler. Keep modifiers like safety, risk, effectiveness.

Examples:
- "Can I take vitamin D?" → vitamin D supplementation safety
- "How about vitamin B?" → vitamin B supplementation
- "Is alcohol safe during chemo?" → alcohol chemotherapy safety
- "Does immunotherapy improve survival?" → immunotherapy survival benefit
- "Should I avoid dairy?" → dairy consumption risk

Return only the rewritten search query. No explanation.
"""

    client = Groq(api_key=settings.GROQ_API_KEY)
    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    return normalize_whitespace(resp.choices[0].message.content.strip())
