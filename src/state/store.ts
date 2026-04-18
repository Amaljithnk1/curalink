import { create } from 'zustand';
import { ResearchState, PatientContext, ViewMode, AppState, Revision, CitationId } from './types';

export const useResearchStore = create<ResearchState>((set) => ({
  // Initial state
  appState: 'idle',
  viewMode: 'brief',
  context: null,
  revisions: [],
  activeRevisionId: null,
  drawerOpen: false,
  drawerCitationId: null,
  highlightedCitationId: null,

  // Actions
  setContext: (context: PatientContext) =>
    set({ context, appState: 'context_set' }),

  setViewMode: (viewMode: ViewMode) =>
    set({ viewMode }),

  setAppState: (appState: AppState) =>
    set({ appState }),

  addRevision: (revision: Revision) =>
    set((state) => ({
      revisions: [...state.revisions, revision],
      activeRevisionId: revision.id,
      appState: 'complete',
    })),

  setActiveRevision: (id: string) =>
    set({ activeRevisionId: id }),

  openDrawer: (citationId: CitationId) =>
    set({ drawerOpen: true, drawerCitationId: citationId }),

  closeDrawer: () =>
    set({ drawerOpen: false, drawerCitationId: null }),

  setHighlightedCitation: (id: CitationId | null) =>
    set({ highlightedCitationId: id }),
}));