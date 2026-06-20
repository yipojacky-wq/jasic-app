import { create } from 'zustand';

import type { TabKey } from '../types';

interface AppState {
  activeTab: TabKey;
  selectedSymbol: string | null;
  watchlist: string[];
  setActiveTab: (tab: TabKey) => void;
  openStock: (symbol: string) => void;
  closeStock: () => void;
  toggleWatchlist: (symbol: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  selectedSymbol: null,
  watchlist: ['2330', '2454', '2308'],
  setActiveTab: (activeTab) => set({ activeTab, selectedSymbol: null }),
  openStock: (selectedSymbol) => set({ selectedSymbol }),
  closeStock: () => set({ selectedSymbol: null }),
  toggleWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.includes(symbol)
        ? state.watchlist.filter((item) => item !== symbol)
        : [...state.watchlist, symbol],
    })),
}));
