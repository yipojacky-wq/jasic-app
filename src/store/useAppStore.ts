import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ResearchLocation } from '../lib/researchNavigation';
import {
  isTabKey,
  normalizePersistedResearchState,
  normalizeResearchSymbol,
} from '../lib/researchNavigation';
import type { TabKey } from '../types';

interface AppState {
  activeTab: TabKey;
  selectedSymbol: string | null;
  aiCheckSymbol: string;
  watchlist: string[];
  hasHydrated: boolean;
  setActiveTab: (tab: TabKey) => void;
  openStock: (symbol: string) => void;
  closeStock: () => void;
  startAiCheck: (symbol: string) => void;
  toggleWatchlist: (symbol: string) => void;
  applyLocation: (location: Partial<ResearchLocation>) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: 'dashboard',
      selectedSymbol: null,
      aiCheckSymbol: '2330',
      watchlist: ['2330', '2454', '2308'],
      hasHydrated: false,
      setActiveTab: (activeTab) => set({ activeTab, selectedSymbol: null }),
      openStock: (symbol) => {
        const selectedSymbol = normalizeResearchSymbol(symbol);
        if (selectedSymbol) set({ selectedSymbol });
      },
      closeStock: () => set({ selectedSymbol: null }),
      startAiCheck: (symbol) => {
        const aiCheckSymbol = normalizeResearchSymbol(symbol);
        if (aiCheckSymbol) {
          set({ aiCheckSymbol, activeTab: 'ai-check', selectedSymbol: null });
        }
      },
      toggleWatchlist: (symbol) => {
        const normalized = normalizeResearchSymbol(symbol);
        if (!normalized) return;
        set((state) => ({
          watchlist: state.watchlist.includes(normalized)
            ? state.watchlist.filter((item) => item !== normalized)
            : [...state.watchlist, normalized],
        }));
      },
      applyLocation: (location) =>
        set((state) => ({
          activeTab: isTabKey(location.activeTab)
            ? location.activeTab
            : state.activeTab,
          selectedSymbol:
            location.selectedSymbol === null
              ? null
              : normalizeResearchSymbol(location.selectedSymbol) ??
                state.selectedSymbol,
          aiCheckSymbol:
            normalizeResearchSymbol(location.aiCheckSymbol) ??
            state.aiCheckSymbol,
        })),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'jasic-research-session-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeTab: state.activeTab,
        selectedSymbol: state.selectedSymbol,
        aiCheckSymbol: state.aiCheckSymbol,
        watchlist: state.watchlist,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...normalizePersistedResearchState(persistedState),
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
