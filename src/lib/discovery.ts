import type { Signal, StockCandidate } from '../types';

export type DiscoverySort = 'rank' | 'score_desc' | 'risk_asc' | 'confidence_desc';

export interface DiscoveryFilters {
  search: string;
  signal: 'all' | Signal;
  risk: 'all' | StockCandidate['risk'];
  category: 'all' | string;
  sort: DiscoverySort;
}

export function filterDiscoveryCandidates(
  candidates: StockCandidate[],
  filters: DiscoveryFilters,
) {
  const search = filters.search.trim().toLocaleLowerCase('zh-TW');
  const filtered = candidates.filter((candidate) => {
    const matchesSearch =
      !search ||
      `${candidate.symbol} ${candidate.name} ${candidate.industry} ${candidate.category}`
        .toLocaleLowerCase('zh-TW')
        .includes(search);
    return (
      matchesSearch &&
      (filters.signal === 'all' || candidate.signal === filters.signal) &&
      (filters.risk === 'all' || candidate.risk === filters.risk) &&
      (filters.category === 'all' || candidate.category === filters.category)
    );
  });

  return [...filtered].sort((a, b) => {
    if (filters.sort === 'score_desc') return b.score - a.score;
    if (filters.sort === 'risk_asc') {
      return riskOrder(a.risk) - riskOrder(b.risk) || b.score - a.score;
    }
    if (filters.sort === 'confidence_desc') {
      return (b.confidence ?? 0) - (a.confidence ?? 0) || b.score - a.score;
    }
    return (a.rank ?? 999) - (b.rank ?? 999);
  });
}

export function discoveryCandidatesToCsv(candidates: StockCandidate[]) {
  const header = [
    '排名',
    '股票代號',
    '股票名稱',
    '產業',
    '候選類型',
    '分數',
    '燈號',
    '風險',
    '信心度',
    '入選原因',
  ];
  const rows = candidates.map((candidate) => [
    candidate.rank ?? '',
    candidate.symbol,
    candidate.name,
    candidate.industry,
    categoryLabel(candidate.category),
    candidate.score,
    signalLabel(candidate.signal),
    candidate.risk,
    candidate.confidence ?? '',
    (candidate.rankReasons ?? []).join('；'),
  ]);
  return [header, ...rows]
    .map((row) => row.map(csvCell).join(','))
    .join('\n');
}

export function categoryLabel(value: string) {
  return {
    trend: '趨勢延續',
    accumulation: '法人累積',
    breakout: '突破',
    reversal: '反轉觀察',
    'Core Leader': '核心領先股',
    'Momentum Watch': '動能觀察股',
    'Trend Candidate': '趨勢候選股',
  }[value] ?? value;
}

export function signalLabel(value: Signal) {
  return {
    green: '綠燈',
    yellow: '黃燈',
    red: '紅燈',
  }[value];
}

function riskOrder(risk: StockCandidate['risk']) {
  return { 低: 0, 中: 1, 高: 2 }[risk];
}

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}
