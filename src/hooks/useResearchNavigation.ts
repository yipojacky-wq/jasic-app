import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import {
  parseResearchLocation,
  serializeResearchLocation,
} from '../lib/researchNavigation';
import { useAppStore } from '../store/useAppStore';

export function useResearchNavigation() {
  const activeTab = useAppStore((state) => state.activeTab);
  const selectedSymbol = useAppStore((state) => state.selectedSymbol);
  const aiCheckSymbol = useAppStore((state) => state.aiCheckSymbol);
  const hasHydrated = useAppStore((state) => state.hasHydrated);
  const applyLocation = useAppStore((state) => state.applyLocation);
  const initialLocationApplied = useRef(false);
  const [readyToSync, setReadyToSync] = useState(false);

  useEffect(() => {
    if (!hasHydrated || initialLocationApplied.current) return;
    initialLocationApplied.current = true;

    const applyUrl = (url?: string | null) => {
      const location = parseResearchLocation(url);
      if (location) applyLocation(location);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      applyUrl(window.location.href);
      setReadyToSync(true);
      const onPopState = () => applyUrl(window.location.href);
      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }

    void Linking.getInitialURL().then((url) => {
      applyUrl(url);
      setReadyToSync(true);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => applyUrl(url));
    return () => subscription.remove();
  }, [applyLocation, hasHydrated]);

  useEffect(() => {
    if (
      !hasHydrated ||
      !readyToSync ||
      Platform.OS !== 'web' ||
      typeof window === 'undefined'
    ) {
      return;
    }
    const next = serializeResearchLocation({
      activeTab,
      selectedSymbol,
      aiCheckSymbol,
    });
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [activeTab, aiCheckSymbol, hasHydrated, readyToSync, selectedSymbol]);
}
