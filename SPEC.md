WHAT IS CURALINK?
An AI-powered medical research assistant that presents research findings as a research manuscript/dossier, not a chatbot. Users provide their medical condition and location, the system fetches real publications from PubMed, OpenAlex, and clinical trials from ClinicalTrials.gov, then delivers structured, citation-backed research briefs.
Core metaphor: This is a research instrument that produces verifiable documents, not a chat assistant that produces conversation.

TECH STACK
Technology Purpose Version
Vite Build tool / dev server Latest
React UI framework 18+
TypeScript Type safety 5+
Tailwind CSS Styling (v3 classic setup) 3.x
shadcn/ui Accessible UI primitives (Sheet, Dialog, Tabs, Accordion, Tooltip) Latest
Framer Motion Animations (ink reveal, stagger, drawer transitions) Latest
React Router DOM Client-side routing (2 routes only) 6+
Zustand State management Latest
Google Fonts Typography (Playfair Display, Inter, JetBrains Mono) —
DESIGN IDENTITY
Color System
Token Hex Usage
parchment-50 #FFFDF7 Primary background
parchment-100 #FFF9EC Card backgrounds
parchment-200 #FFF3D6 Subtle highlights
burgundy #6B1D2A Primary accent, headings, CTA buttons
burgundy-light #8B2E3D Hover states
burgundy-dark #4A0E1B Active states
sage #5B7A5E Success states, recruiting badges
sage-light #7A9E7D Subtle success indicators
amber #B8860B Moderate confidence, location match
muted-gray #9CA3AF Secondary text, emerging confidence
blue-600 #2563EB Completed trial badge
Typography (3-Font Hierarchy)
Font CSS Class Usage
Playfair Display (serif) font-serif Brief headings, section titles, taglines, editorial text
Inter (sans-serif) font-sans UI elements, buttons, labels, navigation, body text in UI
JetBrains Mono (monospace) font-mono Retrieval ribbon numbers, scores, metadata, citation IDs
Visual Rules
Light/warm palette ONLY — no dark mode, no dark backgrounds
NO chat bubbles — ever, anywhere, for any reason
Manuscript aesthetic — feels like a medical research document
Premium feel — subtle shadows, rounded corners, generous whitespace
NOT a dashboard — no heavy grids, no chart widgets, no metric cards
THE 3 INVIOLABLE LAWS
Every developer working on this must follow these at all times:
Law 1: Subtle, Not Cinematic
Every animation is state-driven and functional
Nothing loops endlessly
Nothing plays longer than 1.8 seconds
Ink reveal is the ONLY content animation
Everything else is transitions (opacity, transform)
If it feels like "a loading screen trying to be cool" → wrong
If it feels like "a crafted moment" → right
Law 2: Every Visual Element Is Verifiable
Constellation nodes map to real citations in the brief
Confidence bars map to real source counts per section
Retrieval ribbon numbers map to real API responses
If data isn't available, the element hides entirely
Never show fake/placeholder data in metadata elements
Nothing decorative. Everything earned.
Law 3: Reading Experience Is Sacred
Comfortable line length in brief (max ~70 characters per line)
Compact gutter (never competes with main content)
Generous whitespace throughout
Minimum 32px gap between sections
When in doubt, remove, don't add
The brief must feel like reading a well-typeset medical document
5. UI FAILURE MODES (MUST AVOID)
Failure Why It's Bad
❌ Over-animated / gimmicky Destroys trust, feels like a toy
❌ Constellation looks decorative If nodes don't map to real citations, hide it entirely
❌ Reading experience cramped Brief column must stay 70%, never squeeze
❌ Broken interruptibility New query during animation must not crash UI
❌ Generic AI feel No chat bubbles, no "typing...", no robot avatars
❌ Fake metadata Never show retrieval numbers or scores that aren't real
❌ Long typewriter animation Use ink reveal (blur-to-sharp), not character-by-character
❌ Landing/marketing page Waste of time, lead with the product
❌ Heavy charts/dashboards This is a research document, not an analytics tool
6. APPLICATION STATES
text
idle → context_set → running → complete
State Description What's Visible
idle No context set, first visit First-run page with context card
context_set User has set disease/location Research workspace, query bar focused
running Query submitted, fetching data Retrieval ribbon animating, brief rendering
complete All data loaded Full brief, gutter, constellation, everything interactive
Critical rule: Submitting a new query during running must gracefully create a new revision without breaking the UI.

ROUTES
Only 2 routes in the entire application:
Route Page Purpose
/ FirstRunPage Context setup + first query
/research ResearchWorkspace Main workspace where everything happens
8. SCREEN 1: FIRST-RUN PAGE (Route: /)
Purpose: Capture clinical context and/or accept a natural language query on a single screen.

Layout
text
┌──────────────────────────────────────────────────────────┐
│ │
│ CuraLink │
│ (Playfair Display, burgundy, wordmark) │
│ │
│ "Research-grade evidence, curated for your condition." │
│ (Inter, muted gray, small) │
│ │
│ ┌────────────────────────────────────────────────┐ │
│ │ │ │
│ │ Condition * [ text input ] │ │
│ │ Location [ text input ] │ │
│ │ Medications [ tag input: + Add ] │ │
│ │ │ │
│ │ [ Start Research → ] │ │
│ │ (burgundy button, full width) │ │
│ │ │ │
│ └────────────────────────────────────────────────┘ │
│ │
│ ──────── or ask directly ──────── │
│ │
│ [🔍 "Latest treatment for lung cancer" ] │
│ (spotlight-style input, warm glow on focus) │
│ │
│ Powered by PubMed · OpenAlex · ClinicalTrials.gov │
│ (JetBrains Mono, muted, very small) │
│ │
│ Quick starts: │
│ [ Latest treatment for lung cancer ] │
│ [ Clinical trials for diabetes ] │
│ [ Top researchers in Alzheimer's ] │
│ (clickable chips, subtle border) │
│ │
└──────────────────────────────────────────────────────────┘
Behavior
Condition is required, everything else optional
"Start Research" validates condition → stores context in Zustand → navigates to /research
Typing in spotlight bar + Enter → stores as query + navigates to /research
Quick start chips fill the spotlight bar text and auto-submit
If user enters via spotlight without structured input, system extracts disease from query text (backend handles this)
Centered on page, max-width ~500px for the card
Cream background (parchment-50), card has parchment-100 background with subtle shadow
9. SCREEN 2: RESEARCH WORKSPACE (Route: /research)
This is where all research happens. Single page with multiple view modes.

Overall Layout
text
┌─────────────────────────────────────────────────────────────┐
│ TOP BAR (fixed) │
│ CuraLink [Parkinson's ×] [Toronto ×] [Edit] [⚙] │
├─────────────────────────────────────────────────────────────┤
│ QUERY BAR │
│ [🔍 Ask anything about your condition... ] │
├─────────────────────────────────────────────────────────────┤
│ RETRIEVAL RIBBON (only visible after a query runs) │
│ PubMed 47 · OpenAlex 180 · Trials 23 │ Pool 250 → │
│ Shown 8 papers · 6 trials │ 2.3s │
├─────────────────────────────────────────────────────────────┤
│ CONSTELLATION (mini-map, only visible when data exists) │
├────────────────────────────────────┬────────────────────────┤
│ │ │
│ MAIN CONTENT (70%) │ GUTTER (30%) │
│ │ │
│ Changes based on view mode: │ Citation callouts │
│ - Brief (default) │ aligned to brief │
│ - Papers ledger │ paragraphs │
│ - Trials ledger │ │
│ │ │
│ │ │
├────────────────────────────────────┴────────────────────────┤
│ BOTTOM BAR (sticky to viewport bottom) │
│ [R1] [R2] [R3] [Brief] [Papers (8)] [Trials (6)]│
└─────────────────────────────────────────────────────────────┘

TRACE DRAWER (right overlay, hidden by default)
Opens over content from right side when citation clicked
9A. Component: Top Bar (Context Ribbon)
Left: CuraLink wordmark (Playfair Display, burgundy)
Center: Context chips showing current disease, location, medications
Each chip: pill-shaped, parchment-200 background, burgundy text
Each chip has × button to remove
[Edit] button opens a Dialog (shadcn) to modify context
Right: Settings gear icon
Background: parchment-100 with subtle bottom border
Position: Fixed to top of viewport
9B. Component: Query Bar (Spotlight)
Full-width text input below top bar
Left: magnifying glass icon (muted gray)
Focus effect: warm burgundy glow (box-shadow), NOT default blue ring
Submit on Enter key
/ keyboard shortcut focuses this bar from anywhere
Placeholder text: "Ask anything about your condition..."
Font: Inter (sans)
Background: white with subtle border
Submitting creates a new revision and triggers the running state
9C. Component: Retrieval Ribbon
Only visible when at least one query has been run
Single horizontal line
Font: JetBrains Mono, small size, muted color
Content format: PubMed [n] · OpenAlex [n] · Trials [n] │ Pool [total] → Shown [x] papers · [y] trials │ [time]s
Numbers animate/roll-up when data loads (counter animation, under 1.5 seconds, then stop)
Background: transparent or very subtle parchment-100
This proves "depth first, then precision" to judges
9D. Component: Citation Constellation (Mini-Map)
Only visible when real citation data exists (hide entirely otherwise)
Small widget: approximately 200px tall, full width
SVG-based (not Canvas)
Nodes:
Query entity nodes (disease, key terms): burgundy dots, slightly larger
Source nodes (P1, P2, T1, T2...): smaller dots colored by type
PubMed: blue-tinted
OpenAlex: green-tinted
Trials: amber-tinted
Edges:
Thin lines connecting source nodes to query entity nodes
Edges exist ONLY when the brief actually cites that source for that topic
Never decorative lines
Interactions:
Clicking a source node → highlights corresponding gutter annotation + opens trace drawer
Hovering a node → subtle pulse
Subtle gentle floating animation (very slow, not distracting)
Critical Rule:
If backend hasn't provided real citation mapping data, hide the entire constellation. Never show with fake nodes.

9E. Component: Main Content Area (70% width)
Switches between three view modes based on the active toggle in the bottom bar.

View Mode 1: BRIEF (Default)
The research synthesis document. Hero of the entire application.

Sections (rendered in order):

Condition Overview
text
┃ ████████░░ Strong Evidence
┃
┃ Condition Overview
┃
┃ Parkinson's disease is a neurodegenerative disorder
┃ characterized by motor symptoms such as tremors¹,
┃ rigidity², and bradykinesia...
2. Research Insights

text
┃ ██████░░░░ Moderate Evidence
┃
┃ Research Insights
┃
┃ Deep Brain Stimulation has shown³ significant efficacy
┃ in reducing motor symptoms. Recent studies⁴⁵ suggest
┃ combination approaches with...
3. Clinical Trials Summary

text
┃ ████░░░░░░ Emerging
┃
┃ Clinical Trials
┃
┃ Several active trials⁹¹⁰ are currently investigating
┃ next-generation DBS protocols...
4. Source Attribution

text
Summary of all sources used in this brief.
Evidence Confidence Bars:
Thin left-border on each section (4px wide)
Mini progress bar below section title
Computed from citation count in that section:
Strong (6+ citations): burgundy, bar ~80-100% filled
Moderate (3-5 citations): amber, bar ~50-70% filled
Emerging (1-2 citations): muted gray, bar ~20-40% filled
Ink Reveal Effect (Framer Motion):
When brief first loads after a query:
Section titles: blur-to-sharp (filter: blur(8px) → blur(0px))
First 1-2 lines: blur-to-sharp with slight delay
Remaining content: opacity fade (0 → 1), fast
Sections stagger by 120-200ms between each
Gutter notes slide in from right synced with their paragraph
Total reveal time: under 2 seconds for all sections
Uses prefers-reduced-motion — if reduced motion preferred, everything appears instantly
Superscript Citations:
Rendered as superscript numbers: ¹ ² ³ ⁴ ⁵
Internally mapped to namespaced IDs (P1, P2, T1, T2)
Display mapping: P1 → ¹, P2 → ², T1 → ⁹, etc. (sequential)
Clickable → opens trace drawer for that citation
Hoverable → simultaneously highlights:
The sentence containing the superscript (subtle background color)
The corresponding gutter callout (same background color)
This creates a visual "connection" without drawing lines
Typography:
Section titles: Playfair Display, 1.5rem, burgundy
Body text: Playfair Display, 1.05rem, dark gray (#1a1a1a)
Line height: 1.7 (generous for readability)
Max line width: ~70 characters
View Mode 2: PAPERS LEDGER
Numbered scholarly reference list. NOT cards. NOT a table.

text
────────────────────────────────────────────────────────────
[1] PUBMED · 2024
Targeted Therapies in NSCLC: A Systematic Review of
Post-IO Resistance
Chen et al. · Nature Medicine
▸ Expand snippet
────────────────────────────────────────────────────────────
[2] OPENALEX · 2023
Genomic Profiling in Advanced Lung Cancer: Identifying
Escape Mutations
Wang et al. · The Lancet
▸ Expand snippet
────────────────────────────────────────────────────────────
Each entry separated by subtle divider line
Number: bold, mono font
Source pill: colored badge (PUBMED = blue-ish, OPENALEX = green-ish)
Year: mono font, right-aligned or next to source
Title: serif font (Playfair), bold
Authors · Journal: sans font (Inter), muted
▸ Expand snippet: click to expand and show abstract excerpt + URL link
Click anywhere on the row → opens trace drawer
Shows 6-8 papers maximum
Gutter can hide or show compact summary in this mode
View Mode 3: TRIALS LEDGER
Numbered list of clinical trials. Same format philosophy as papers.

text
────────────────────────────────────────────────────────────
[1] 🟢 RECRUITING · Toronto, CA
🟠 MATCH: CITY
Phase III DBS Optimization for Advanced Parkinson's
NCT04821479
▸ Eligibility · Contact
────────────────────────────────────────────────────────────
[2] 🔵 COMPLETED · Boston, US
Levodopa Combination Therapy Study
NCT03998721
▸ Eligibility · Contact
────────────────────────────────────────────────────────────
Status pills with micro press-in animation (100-180ms, first render only):
🟢 RECRUITING — green outline pill
🔵 COMPLETED — blue outline pill
⚪ ACTIVE / other — gray outline pill
Location match badges (only if user provided location):
🟠 MATCH: CITY — amber pill with pin icon
🟡 MATCH: COUNTRY — lighter amber pill
No badge if no match
NCT ID: mono font, muted
▸ Eligibility · Contact: expand to show:
Eligibility criteria as bullet points
Contact name + email
Direct link to ClinicalTrials.gov
Shows 6-8 trials maximum
9F. Component: Gutter (30% width, right side)
Purpose:
Annotation column aligned to the brief. Each callout sits beside the paragraph that cites it.

Each Gutter Callout:
text
┌─────────────────────┐
│ [1] Chen et al. 2024│
│ PubMed │
│ Nature Medicine │
│ "Key finding..." │
└─────────────────────┘
Compact cards with minimal styling
Source type in muted text
Short snippet (1-2 lines max)
Vertically aligned so [1] sits beside the paragraph containing ¹
Hover-sync: hovering a callout highlights the corresponding sentence in the brief AND vice versa
Click → opens trace drawer
Subtle left border colored by source type
Responsive Behavior:
Desktop (1024px+): Always visible, 30% width
Tablet (768-1023px): Collapses to inline expandable sections below each cited paragraph
Mobile (<768px): Hidden; superscript tap opens a bottom sheet with citation info
In Papers/Trials View Modes:
Gutter can show a compact summary/filter panel or hide entirely (developer's choice based on what looks cleaner)
9G. Component: Bottom Bar (Sticky)
Position: Fixed to bottom of viewport
Background: parchment-100 with subtle top border
Left side: Revision tabs
[R1] [R2] [R3]
Active revision: burgundy background, white text
Inactive: transparent background, muted text
Click to switch between revisions
Right side: View mode toggles
[Brief] [Papers (8)] [Trials (6)]
Numbers in parentheses show actual count
Active mode: burgundy underline or background
Inactive: muted text
Brief is default
Use shadcn Tabs component for both sections, styled to match brand
9H. Component: Trace Drawer (Right Overlay)
Opens from right side of screen (shadcn Sheet component, side="right")
Triggered by clicking any citation (superscript, gutter callout, or constellation node)
Closes with × button or Esc key
Width: approximately 400px
Background: white or parchment-50
Subtle shadow on left edge
Single View — No Tabs
The drawer adapts its content based on citation type.

For Papers (PubMed / OpenAlex):
text
┌─────────────────────────────────┐
│ × (close button, top right) │
│ │
│ [PUBMED] (blue pill) │
│ │
│ Title of the Publication │
│ (Playfair, bold, 1.2rem) │
│ │
│ Chen et al. · 2024 │
│ Nature Medicine │
│ (Inter, muted) │
│ │
│ [🔗 View on PubMed] (button) │
│ │
│ ── Supporting Snippet ── │
│ "The study demonstrated that │
│ targeted therapies showed │
│ significant improvement..." │
│ (highlighted background) │
│ │
│ ── Supports Claim ── │
│ "DBS has shown significant │
│ efficacy in reducing motor │
│ symptoms" │
│ (the exact sentence from brief │
│ where user clicked citation) │
│ (italic, muted background) │
│ │
│ ── Ranking Scores ── ▾ │
│ (shadcn Accordion, collapsed) │
│ Relevance: 0.71 │
│ Recency: +0.12 │
│ Credibility: +0.08 │
│ │
│ (ONLY shown if real scores │
│ exist. Hidden entirely if not) │
│ │
└─────────────────────────────────┘
For Clinical Trials:
text
┌─────────────────────────────────┐
│ × (close button, top right) │
│ │
│ [TRIAL] (amber pill) │
│ 🟢 RECRUITING │
│ │
│ Title of the Trial │
│ (Playfair, bold, 1.2rem) │
│ │
│ NCT04821479 │
│ (JetBrains Mono, muted) │
│ │
│ [🔗 View on ClinicalTrials.gov] │
│ │
│ ── Location(s) ── │
│ 📍 Toronto, Canada │
│ 📍 Boston, USA │
│ │
│ ── Eligibility ── │
│ • Age: 18-65 │
│ • Diagnosed with Parkinson's │
│ • No prior DBS surgery │
│ │
│ ── Contact ── │
│ Dr. Smith │
│ smith@hospital.ca │
│ │
│ ── Supports Claim ── │
│ "Several active trials are │
│ currently investigating..." │
│ │
└─────────────────────────────────┘
10. REVISION SYSTEM
Every new query creates a new revision: R1, R2, R3...
NO chat bubbles. Each revision is a complete research document.
Previous revisions preserved and switchable via bottom bar
Context (disease, location, medications) carries forward across all revisions
New query during running state → gracefully creates new revision, stops current rendering
Each revision stores independently:
Query text
Retrieval stats
Brief content
Papers list
Trials list
11. INTERACTIONS & KEYBOARD SHORTCUTS
Interaction Behavior
/ key Focuses query bar from anywhere
Esc key Closes trace drawer
Tab key Navigates through interactive elements
Hover superscript in brief Highlights sentence + corresponding gutter callout
Hover gutter callout Highlights corresponding sentence in brief
Click superscript Opens trace drawer for that citation
Click gutter callout Opens trace drawer for that citation
Click constellation node Highlights gutter callout + opens trace drawer
Submit new query while running Creates new revision, gracefully transitions
Query bar focus Warm burgundy glow (custom box-shadow)
Section load Staggered ink reveal (120-200ms between sections)
Gutter notes load Slide in from right synced with paragraph reveal
Trial status pills load Micro press-in animation (100-180ms, first render only)
Retrieval ribbon numbers load Roll-up counter animation (under 1.5 seconds)
Click "Edit" on context chip Opens shadcn Dialog with context editing form
Click quick start chip Fills spotlight bar and auto-submits
12. RESPONSIVE STRATEGY
Breakpoint Layout Changes
Desktop (1024px+) Full layout: 70% main + 30% gutter, all components visible
Tablet (768-1023px) Gutter collapses to inline expandable sections below cited paragraphs. Everything else stays.
Mobile (<768px) Single column. Query bar + context chips at top. Bottom tabs: Brief / Evidence / Context. Superscript tap → bottom sheet with citation info.
13. TYPESCRIPT TYPES
typescript
// ============================================
// Citation ID System (Namespaced)
// ============================================
type PaperId = P${number};
type TrialId = T${number};
type CitationId = PaperId | TrialId;

// ============================================
// Enums / Union Types
// ============================================
type AppState = 'idle' | 'context_set' | 'running' | 'complete';
type ViewMode = 'brief' | 'papers' | 'trials';
type ConfidenceLevel = 'strong' | 'moderate' | 'emerging';
type TrialStatus = 'RECRUITING' | 'COMPLETED' | 'ACTIVE' | 'SUSPENDED';
type LocationMatch = 'city' | 'country' | 'none';
type SourceType = 'pubmed' | 'openalex';

// ============================================
// Data Structures
// ============================================
interface PatientContext {
condition: string;
location?: string;
medications?: string[];
}

interface RetrievalStats {
pubmedCount: number;
openalexCount: number;
trialsCount: number;
poolTotal: number;
shownPapers: number;
shownTrials: number;
timeSeconds: number;
}

interface BriefSection {
title: string;
content: string;
citations: CitationId[];
confidence: ConfidenceLevel;
}

interface Brief {
conditionOverview: BriefSection;
researchInsights: BriefSection;
clinicalTrialsSummary: BriefSection;
sourceAttribution?: BriefSection;
}

interface Paper {
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

interface Trial {
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

interface Revision {
id: string;
query: string;
context: PatientContext;
retrieval: RetrievalStats;
brief: Brief;
papers: Paper[];
trials: Trial[];
timestamp: number;
}

// ============================================
// Application State
// ============================================
interface ResearchState {
// App state
appState: AppState;
viewMode: ViewMode;

// Patient context
context: PatientContext | null;

// Revisions
revisions: Revision[];
activeRevisionId: string | null;

// Drawer
drawerOpen: boolean;
drawerCitationId: CitationId | null;

// Hover highlight
highlightedCitationId: CitationId | null;

// Actions
setContext: (context: PatientContext) => void;
setViewMode: (mode: ViewMode) => void;
setAppState: (state: AppState) => void;
addRevision: (revision: Revision) => void;
setActiveRevision: (id: string) => void;
openDrawer: (citationId: CitationId) => void;
closeDrawer: () => void;
setHighlightedCitation: (id: CitationId | null) => void;
}
14. EXPECTED DATA SHAPE FROM BACKEND
The frontend expects this JSON from the API:

json
{
"revision": "R1",
"query": "Deep Brain Stimulation for Parkinson's disease",
"context": {
"condition": "Parkinson's disease",
"location": "Toronto, Canada",
"medications": ["Levodopa"]
},
"retrieval": {
"pubmedCount": 47,
"openalexCount": 180,
"trialsCount": 23,
"poolTotal": 250,
"shownPapers": 8,
"shownTrials": 6,
"timeSeconds": 2.3
},
"brief": {
"conditionOverview": {
"title": "Condition Overview",
"content": "Parkinson's disease is a neurodegenerative disorder characterized by motor symptoms such as tremors¹, rigidity², and bradykinesia...",
"citations": ["P1", "P2"],
"confidence": "strong"
},
"researchInsights": {
"title": "Research Insights",
"content": "Deep Brain Stimulation has shown³ significant efficacy in reducing motor symptoms. Recent studies⁴⁵ suggest combination approaches...",
"citations": ["P1", "P3", "P4", "P5"],
"confidence": "strong"
},
"clinicalTrialsSummary": {
"title": "Clinical Trials",
"content": "Several active trials⁶⁷ are currently investigating next-generation DBS protocols in the Toronto area...",
"citations": ["T1", "T2"],
"confidence": "moderate"
}
},
"papers": [
{
"citationId": "P1",
"source": "pubmed",
"title": "Targeted Therapies in NSCLC: A Systematic Review of Post-IO Resistance",
"authors": "Chen et al.",
"year": 2024,
"journal": "Nature Medicine",
"url": "https://pubmed.ncbi.nlm.nih.gov/12345678",
"snippet": "The study demonstrated that targeted therapies showed significant improvement...",
"relevanceScore": 0.71,
"recencyBoost": 0.12,
"credibilityBoost": 0.08
}
],
"trials": [
{
"citationId": "T1",
"title": "Phase III DBS Optimization for Advanced Parkinson's",
"nctId": "NCT04821479",
"status": "RECRUITING",
"locations": ["Toronto, Canada"],
"locationMatch": "city",
"eligibility": [
"Age 18-65",
"Diagnosed with Parkinson's disease",
"No prior DBS surgery"
],
"contact": {
"name": "Dr. Smith",
"email": "smith@hospital.ca"
},
"url": "https://clinicaltrials.gov/study/NCT04821479"
}
]
}
15. FOLDER STRUCTURE
text
src/
├── app/
│ └── App.tsx (routes + providers)
│
├── pages/
│ ├── FirstRunPage.tsx (route: /)
│ └── ResearchWorkspace.tsx (route: /research)
│
├── components/
│ ├── ui/ (shadcn components — auto-generated)
│ │ ├── sheet.tsx
│ │ ├── dialog.tsx
│ │ ├── tabs.tsx
│ │ ├── accordion.tsx
│ │ └── tooltip.tsx
│ │
│ ├── shared/
│ │ ├── CuraLinkWordmark.tsx
│ │ ├── SourcePill.tsx (PUBMED / OPENALEX / TRIAL badges)
│ │ └── ConfidenceBar.tsx (evidence strength indicator)
│ │
│ ├── first-run/
│ │ ├── ContextSetupCard.tsx
│ │ ├── SpotlightBar.tsx
│ │ └── QuickStartChips.tsx
│ │
│ ├── workspace/
│ │ ├── TopBar.tsx
│ │ ├── QueryBar.tsx
│ │ ├── RetrievalRibbon.tsx
│ │ ├── CitationConstellation.tsx
│ │ ├── MainContent.tsx (switches between view modes)
│ │ ├── Gutter.tsx
│ │ ├── BottomBar.tsx
│ │ └── TraceDrawer.tsx
│ │
│ ├── brief/
│ │ ├── BriefView.tsx
│ │ ├── BriefSection.tsx (single section with confidence bar)
│ │ └── CitationSuperscript.tsx
│ │
│ ├── papers/
│ │ ├── PapersLedger.tsx
│ │ └── PaperRow.tsx
│ │
│ └── trials/
│ ├── TrialsLedger.tsx
│ └── TrialRow.tsx
│
├── state/
│ ├── store.ts (Zustand store)
│ └── types.ts (all TypeScript types from section 13)
│
├── hooks/
│ ├── useKeyboardShortcuts.ts (/ and Esc handlers)
│ └── useCitationHighlight.ts (hover sync logic)
│
├── data/
│ └── mockData.ts (mock revision for development)
│
├── lib/
│ └── utils.ts (shadcn cn() utility)
│
├── styles/
│ └── index.css (Tailwind directives + reduced-motion + body styles)
│
└── main.tsx (entry point, imports index.css)
16. BUILD PHASES (Exact Order)
Phase 1: Foundation (BUILD FIRST)
text

Project setup (Vite + Tailwind + shadcn + fonts)
App.tsx with React Router (/ and /research routes)
FirstRunPage.tsx (context card + spotlight bar + quick starts)
ResearchWorkspace.tsx (shell layout with all placeholder components)
TopBar (context ribbon)
QueryBar
RetrievalRibbon (hidden placeholder)
CitationConstellation (hidden placeholder)
MainContent area (70%)
Gutter area (30%)
BottomBar (revision tabs + view toggles)
Zustand store skeleton (state + actions, no API calls)
Mock data file
Phase 2: Core Interactions (BUILD SECOND)
text
BriefView with BriefSections rendering mock brief
Evidence Confidence Bars on each section
Superscript citations (clickable + hoverable)
Gutter with callouts aligned to sections
Hover-sync between superscripts ↔ gutter callouts
TraceDrawer (opens on citation click, paper + trial views)
PapersLedger view with expandable rows
TrialsLedger view with status pills + location badges
View mode switching (Brief / Papers / Trials)
Revision system (R1 → R2 on new query)
Phase 3: Wow Layer (BUILD THIRD)
text
Evidence Confidence Bars polished (color + animation)
Ink reveal effect (blur-to-sharp with Framer Motion)
Staggered section reveal (120-200ms delays)
Gutter slide-in animation
Retrieval ribbon counter roll-up
Citation Constellation mini-map
Trial status pill press-in animation
Keyboard shortcuts (/ and Esc)
Query bar warm glow on focus
Phase 4: Backend Wiring (BUILD LAST)
text
Connect to Node/Express backend
Replace mock data with real API responses
Real PubMed / OpenAlex / ClinicalTrials.gov data
Real LLM-generated briefs
MongoDB session persistence
Real retrieval stats in ribbon
Real citation mapping in constellation
WHAT NOT TO BUILD
❌ Landing page / marketing page
❌ Chat bubbles (ever, anywhere)
❌ Dark theme / dark mode
❌ Heavy charts or analytics dashboards
❌ Typewriter/character-by-character animation
❌ Big "LIVE PIPELINE" terminal panel
❌ Fake data in ranking scores (hide if no real scores)
❌ SVG connector lines in gutter (unless pixel-perfect and time allows)
❌ Server-side PDF generation
❌ User authentication / login
❌ Complex onboarding wizards (multi-step)
ASSESSMENT ALIGNMENT CHECKLIST
Hackathon Requirement How CuraLink Addresses It
Structured input (name, disease, location) Context setup card on first-run + persistent context ribbon
Natural language queries Spotlight query bar on first-run + workspace query bar
Both structured AND natural on same screen First-run page has both, separated by "or ask directly"
Query expansion (disease + intent) Backend handles; frontend shows expanded query in retrieval ribbon
Publications from PubMed + OpenAlex Papers ledger view, gutter callouts, trace drawer with source pills
Clinical trials from ClinicalTrials.gov Trials ledger view, trial-specific trace drawer
Deep retrieval (50-300 results) then filter to 6-8 Retrieval ribbon: Pool [total] → Shown [x] papers · [y] trials
Structured output sections Brief view: Condition Overview → Research Insights → Clinical Trials → Sources
Source attribution (title, authors, year, URL, snippet) Gutter callouts + trace drawer with all fields
Multi-turn context / follow-up Revision system (R1, R2, R3) with context carried forward
Personalization based on condition Context chips persistent, all responses disease-specific
Non-hallucinated responses Citation system: every claim has a superscript linking to a real source
Location-aware clinical trials Location match badges (MATCH: CITY / COUNTRY) in trials
ACCESSIBILITY MINIMUMS
All interactive elements keyboard-navigable
/ focuses query bar
Esc closes trace drawer
Tab navigates through citations
Sufficient color contrast (burgundy on cream passes WCAG AA)
Focus rings visible on keyboard navigation (styled burgundy, not default blue)
prefers-reduced-motion respected globally (all animations instant)
PERFORMANCE RULES
First paint under 1 second
No render-blocking resources
Images/icons: SVG or emoji only, no heavy image assets
Fonts: preloaded via <link rel="preconnect">
Framer Motion: only animate what's visible (whileInView)
Constellation: SVG-based, not Canvas
Lazy load trace drawer content (only fetch when opened)
SETUP COMMANDS (Exact, Run In Order)
bash
npm create vite@latest curalink -- --template react-ts
cd curalink
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

npm install framer-motion react-router-dom zustand
npx shadcn@latest init
npx shadcn@latest add sheet dialog tabs accordion tooltip

npm run dev
tailwind.config.js:
js
/** @type {import('tailwindcss').Config} /
export default {
content: ["./index.html", "./src/**/.{ts,tsx}"],
theme: {
extend: {
colors: {
parchment: {
50: '#FFFDF7',
100: '#FFF9EC',
200: '#FFF3D6',
},
burgundy: {
DEFAULT: '#6B1D2A',
light: '#8B2E3D',
dark: '#4A0E1B',
},
sage: {
DEFAULT: '#5B7A5E',
light: '#7A9E7D',
},
},
fontFamily: {
serif: ['Playfair Display', 'Georgia', 'serif'],
sans: ['Inter', 'system-ui', 'sans-serif'],
mono: ['JetBrains Mono', 'monospace'],
},
},
},
plugins: [],
}
index.html (inside <head>):
html

<link rel="preconnect" href="https://fonts.googleapis.com"> <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"> src/index.css: css @tailwind base; @tailwind components; @tailwind utilities;
@media (prefers-reduced-motion: reduce) {
*, *::before, *::after {
animation-duration: 0.01ms !important;
transition-duration: 0.01ms !important;
}
}

body {
background-color: #FFFDF7;
font-family: 'Inter', system-ui, sans-serif;
}

## ADDITIONAL RULES

### Data Rule
Use mock data for EVERYTHING. Show ALL elements:
- Constellation with mock nodes — SHOW IT
- Ranking scores with mock numbers — SHOW IT  
- Retrieval ribbon with mock counts — SHOW IT
- Confidence bars with mock levels — SHOW IT
- All animations running on mock data — SHOW IT

The goal is to see the COMPLETE frontend working with 
full visual impact. Mock data will be replaced with real 
backend data later. For now, everything must be visible 
and interactive so we can evaluate the full UI.


### Competitive Context
- Every other competitor uses dark theme dashboards with chat bubbles
- Our differentiator is light parchment manuscript aesthetic — NOBODY else does this
- The main threat is a dark gold-themed premium competitor
- We beat them with: citation verification system, gutter annotations, 
  trace drawer, manuscript layout, and overall premium feel
- The first page must make a judge go "wow" within 2 seconds of opening

This document is the single source of truth. Everything needed to build the CuraLink frontend is here. No ambiguity. No debates. Build it.