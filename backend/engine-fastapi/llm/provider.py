from typing import Any, Dict, List, Protocol

class LLMProvider(Protocol):
    async def generate_brief(self, context: Dict[str, Any], papers: List[Dict[str, Any]], trials: List[Dict[str, Any]]) -> Dict[str, Any]:
        ...