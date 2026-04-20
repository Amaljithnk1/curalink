from groq import Groq
import os

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def extract_intervention(condition: str, query: str) -> str:
    prompt = f"""
You are extracting the core medical intervention or topic.

Condition: {condition}
User question: "{query}"

Return ONLY the key medical term or intervention.
Examples:
- "Can I take vitamin D?" → vitamin D
- "How about turmeric?" → turmeric
- "Is immunotherapy effective?" → immunotherapy
- "Latest treatment options" → treatment options
- "Does alcohol increase risk?" → alcohol

Return only the phrase. No explanation.
"""

    resp = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )

    return resp.choices[0].message.content.strip()
