import type { TabKey } from '../types';

export interface ResearchLocation {
  activeTab: TabKey;
  selectedSymbol: string | null;
  aiCheckSymbol?: string;
}

const tabKeys: TabKey[] = [
  'dashboard',
  'discovery',
  'ai-check',
  'watchlist',
  'reports',
  'settings',
];

export function normalizeResearchSymbol(value?: string | null) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return /^\d{4}$/.test(normalized) ? normalized : null;
}

export function parseResearchLocation(
  rawUrl: string | null | undefined,
): Partial<ResearchLocation> | null {
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const pathParts = url.pathname.split('/').filter(Boolean);
  const host = url.protocol === 'jasic:' ? url.host : '';
  const route = host || pathParts[0] || '';
  const pathSymbol = host ? pathParts[0] : pathParts[1];
  const queryTab = url.searchParams.get('tab');
  const stock = normalizeResearchSymbol(
    url.searchParams.get('stock') ?? (route === 'stock' ? pathSymbol : null),
  );
  const aiSymbol = normalizeResearchSymbol(
    url.searchParams.get('symbol') ??
      (route === 'ai-check' ? pathSymbol : null),
  );
  const tabCandidate = queryTab ?? route;
  const activeTab = isTabKey(tabCandidate)
    ? tabCandidate
    : stock
      ? 'discovery'
      : undefined;

  if (!activeTab && !stock && !aiSymbol) return null;
  return {
    ...(activeTab ? { activeTab } : {}),
    ...(stock
      ? { selectedSymbol: stock }
      : activeTab
        ? { selectedSymbol: null }
        : {}),
    ...(aiSymbol ? { activeTab: 'ai-check', aiCheckSymbol: aiSymbol } : {}),
  };
}

export function serializeResearchLocation(location: ResearchLocation) {
  const params = new URLSearchParams();
  if (location.selectedSymbol) {
    params.set('stock', location.selectedSymbol);
  } else if (location.activeTab !== 'dashboard') {
    params.set('tab', location.activeTab);
    if (location.activeTab === 'ai-check' && location.aiCheckSymbol) {
      params.set('symbol', location.aiCheckSymbol);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '/';
}

export function isTabKey(value: string | null | undefined): value is TabKey {
  return Boolean(value && tabKeys.includes(value as TabKey));
}

export function normalizePersistedResearchState(value: unknown) {
  const record =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  const tabCandidate =
    typeof record.activeTab === 'string' ? record.activeTab : null;
  const activeTab: TabKey = isTabKey(tabCandidate)
    ? tabCandidate
    : 'dashboard';
  const selectedSymbol = normalizeResearchSymbol(
    typeof record.selectedSymbol === 'string' ? record.selectedSymbol : null,
  );
  const aiCheckSymbol =
    normalizeResearchSymbol(
      typeof record.aiCheckSymbol === 'string' ? record.aiCheckSymbol : null,
    ) ?? '2330';
  const watchlist = Array.isArray(record.watchlist)
    ? Array.from(
        new Set(
          record.watchlist
            .map((item) =>
              normalizeResearchSymbol(
                typeof item === 'string' ? item : null,
              ),
            )
            .filter((item): item is string => Boolean(item)),
        ),
      ).slice(0, 50)
    : ['2330', '2454', '2308'];

  return {
    activeTab,
    selectedSymbol,
    aiCheckSymbol,
    watchlist,
  };
}
