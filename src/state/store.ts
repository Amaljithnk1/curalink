import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ResearchState,
  PatientContext,
  ViewMode,
  AppState,
  Revision,
  CitationId,
} from "./types";

export const useResearchStore = create<ResearchState>()(
  persist(
    (set) => ({
      // Initial state
      appState: "idle",
      viewMode: "brief",
      context: null,
      revisions: [],
      activeRevisionId: null,

      // NEW: session persistence for Node/Mongo
      sessionId: null,
      drawerSupportsClaim: null,

      // Drawer / hover
      drawerOpen: false,
      drawerCitationId: null,
      highlightedCitationId: null,

      // Actions
      setContext: (context: PatientContext) => set({ context, appState: "context_set" }),

      setViewMode: (viewMode: ViewMode) => set({ viewMode }),

      setAppState: (appState: AppState) => set({ appState }),

      // NEW
      setSessionId: (id: string | null) => set({ sessionId: id }),

      setRevisions: (revs: Revision[]) => set({ revisions: revs }),

      clearRevisions: () => set({ revisions: [], activeRevisionId: null }),

      addRevision: (revision: Revision) =>
        set((state) => ({
          revisions: [...state.revisions, revision],
          activeRevisionId: revision.id,
          appState: "complete",
        })),

      setActiveRevision: (id: string) => set({ activeRevisionId: id }),

      openDrawer: (citationId: CitationId, supportsClaim?: string) => set({ drawerOpen: true, drawerCitationId: citationId, drawerSupportsClaim: supportsClaim ?? null }),

      closeDrawer: () => set({ drawerOpen: false, drawerCitationId: null, drawerSupportsClaim: null }),

      setHighlightedCitation: (id: CitationId | null) => set({ highlightedCitationId: id }),

      // Optional convenience (use when you add “New Session” button)
      clearSession: () =>
        set({
          appState: "idle",
          viewMode: "brief",
          context: null,
          revisions: [],
          activeRevisionId: null,
          sessionId: null,
          drawerOpen: false,
          drawerCitationId: null,
          highlightedCitationId: null,
        }),
    }),
    {
      name: "curalink-store-v2",
      partialize: (state) => ({
        // Only persist session identity and context — revisions come from the server
        sessionId: state.sessionId,
        context: state.context,
      }),
    }
  )
);