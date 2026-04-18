from typing import List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field

PaperId = str
TrialId = str
CitationId = str

AppState = Literal["idle", "context_set", "running", "complete"]
ViewMode = Literal["brief", "papers", "trials"]
ConfidenceLevel = Literal["strong", "moderate", "emerging"]
TrialStatus = Literal["RECRUITING", "COMPLETED", "ACTIVE", "SUSPENDED"]
LocationMatch = Literal["city", "country", "none"]
SourceType = Literal["pubmed", "openalex"]

class PatientContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    condition: str
    location: Optional[str] = None
    medications: Optional[List[str]] = None

class RetrievalStats(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pubmedCount: int
    openalexCount: int
    trialsCount: int
    poolTotal: int
    shownPapers: int
    shownTrials: int
    timeSeconds: float

class BriefSection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    content: str
    citations: List[str]  # CitationId list e.g. ["P1","T1"]
    confidence: ConfidenceLevel

class Brief(BaseModel):
    model_config = ConfigDict(extra="forbid")
    conditionOverview: BriefSection
    researchInsights: BriefSection
    clinicalTrialsSummary: BriefSection
    sourceAttribution: Optional[BriefSection] = None

class Paper(BaseModel):
    model_config = ConfigDict(extra="forbid")
    citationId: str  # "P1"
    source: SourceType
    title: str
    authors: str
    year: int
    journal: str
    url: str
    snippet: str
    relevanceScore: Optional[float] = None
    recencyBoost: Optional[float] = None
    credibilityBoost: Optional[float] = None

class TrialContact(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class Trial(BaseModel):
    model_config = ConfigDict(extra="forbid")
    citationId: str  # "T1"
    title: str
    nctId: str
    status: TrialStatus
    locations: List[str]
    locationMatch: LocationMatch
    eligibility: List[str]
    contact: Optional[TrialContact] = None
    url: str
    snippet: Optional[str] = None

class Revision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    query: str
    context: PatientContext
    retrieval: RetrievalStats
    brief: Brief
    papers: List[Paper]
    trials: List[Trial]
    timestamp: int

class RunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str
    context: PatientContext