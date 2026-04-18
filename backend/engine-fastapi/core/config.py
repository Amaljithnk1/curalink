import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass(frozen=True)
class Settings:
    # Server
    ENGINE_PORT: int = int(os.getenv("ENGINE_PORT", "8000"))

    # PubMed politeness
    PUBMED_TOOL: str = os.getenv("PUBMED_TOOL", "curalink")
    PUBMED_EMAIL: str = os.getenv("PUBMED_EMAIL", "")

    # OpenAlex politeness
    OPENALEX_MAILTO: str = os.getenv("OPENALEX_MAILTO", "")

    # Retrieval sizes
    PUBMED_RETMAX: int = int(os.getenv("PUBMED_RETMAX", "200"))
    OPENALEX_PER_PAGE: int = int(os.getenv("OPENALEX_PER_PAGE", "200"))
    TRIALS_PAGE_SIZE: int = int(os.getenv("TRIALS_PAGE_SIZE", "100"))

    # Ranking output sizes
    TOP_PAPERS: int = int(os.getenv("TOP_PAPERS", "8"))
    TOP_TRIALS: int = int(os.getenv("TOP_TRIALS", "6"))

    # Optional LLM
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama3-8b-8192")  # fast + common on Groq
    USE_GROQ: bool = os.getenv("USE_GROQ", "false").lower() == "true"

settings = Settings()