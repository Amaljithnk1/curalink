// Citation ID System (Namespaced)
export type PaperId = `P${number}`;
export type TrialId = `T${number}`;
export type CitationId = PaperId | TrialId;

// App States
export type AppState = 'idle' | 'context_set' | 'running' | 'complete' | 'no_results';
export type ViewMode = 'brief' | 'papers' | 'trials';
export type ConfidenceLevel = 'strong' | 'moderate' | 'emerging';
export type TrialStatus = 'RECRUITING' | 'COMPLETED' | 'ACTIVE' | 'SUSPENDED';
export type LocationMatch = 'city' | 'country' | 'none';
export type SourceType = 'pubmed' | 'openalex';

// Data Structures
export interface PatientContext {
  condition: string;
  location?: string;
  medications?: string[];
}

export interface RetrievalStats {
  pubmedCount: number;
  openalexCount: number;
  trialsCount: number;
  poolTotal: number;
  shownPapers: number;
  shownTrials: number;
  timeSeconds: number;
}

export interface BriefSection {
  title: string;
  content: string;
  citations: CitationId[];
  confidence: ConfidenceLevel;
}

export interface Brief {
  conditionOverview: BriefSection;
  researchInsights: BriefSection;
  clinicalTrialsSummary: BriefSection;
  sourceAttribution?: BriefSection;
}

export interface Paper {
  citationId: PaperId;
  source: SourceType;
  title: string;
  authors: string;
  year: number;
  journal: string;
  url: string;
  snippet: string;
  relevanceScore?: number;
  recencyBoost?: number;
  credibilityBoost?: number;
}

export interface Trial {
  citationId: TrialId;
  title: string;
  nctId: string;
  status: TrialStatus;
  locations: string[];
  locationMatch: LocationMatch;
  eligibility: string[];
  contact?: {
    name: string;
    email: string;
  };
  url: string;
  snippet?: string;
}

export interface Revision {
  id: string;
  query: string;
  context: PatientContext;
  retrieval: RetrievalStats;
  brief: Brief;
  papers: Paper[];
  trials: Trial[];
  timestamp: number;
}

export interface ResearchState {
  appState: AppState;
  viewMode: ViewMode;
  context: PatientContext | null;
  revisions: Revision[];
  activeRevisionId: string | null;
  drawerOpen: boolean;
  drawerCitationId: CitationId | null;
  highlightedCitationId: CitationId | null;
  sessionId: string | null;
  drawerSupportsClaim: string | null;

  // Actions
  setContext: (context: PatientContext) => void;
  setViewMode: (mode: ViewMode) => void;
  setAppState: (state: AppState) => void;
  addRevision: (revision: Revision) => void;
  setActiveRevision: (id: string) => void;
  setRevisions: (revs: Revision[]) => void;
  clearRevisions: () => void;
  openDrawer: (citationId: CitationId, supportsClaim?: string) => void;
  closeDrawer: () => void;
  setHighlightedCitation: (id: CitationId | null) => void;
  setSessionId: (id: string | null) => void;
  clearSession?: () => void;
}