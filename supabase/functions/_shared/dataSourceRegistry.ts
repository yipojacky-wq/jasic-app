import {
  officialTaiwanMarketSources,
  pendingProductionSources,
  type MarketDataSourceContract,
} from './marketDataContracts.ts';

export type DataSourceReadinessStatus = 'connected' | 'pending_review';

export type DataSourceReadinessItem = {
  code: string;
  provider: string;
  datasetName: string;
  domain: string;
  frequency: string;
  attribution?: string | null;
  endpoint?: string;
  status: DataSourceReadinessStatus;
  commercialUseNote: string;
  note: string;
};

export type DataSourceReadinessSummary = {
  connected: number;
  pendingReview: number;
  total: number;
  productionReady: boolean;
};

function sourceToReadiness(
  source: MarketDataSourceContract,
): DataSourceReadinessItem {
  const status: DataSourceReadinessStatus =
    source.licenseStatus === 'pending_review' ? 'pending_review' : 'connected';

  return {
    code: source.code,
    provider: source.provider,
    datasetName: source.datasetName,
    domain: source.domain,
    frequency: source.frequency,
    attribution: source.attribution,
    endpoint: source.endpoint,
    status,
    commercialUseNote: source.commercialUseNote,
    note:
      status === 'connected'
        ? 'Official adapter is wired into the MVP ingestion governance layer.'
        : 'Blocked from production ingestion until provider, licensing, endpoint, and redistribution rules are approved.',
  };
}

export function dataSourceReadinessRegistry(): DataSourceReadinessItem[] {
  return [
    ...officialTaiwanMarketSources.map(sourceToReadiness),
    ...pendingProductionSources.map(sourceToReadiness),
  ];
}

export function dataSourceReadinessSummary(
  items = dataSourceReadinessRegistry(),
): DataSourceReadinessSummary {
  const connected = items.filter((source) => source.status === 'connected').length;
  const pendingReview = items.filter(
    (source) => source.status === 'pending_review',
  ).length;

  return {
    connected,
    pendingReview,
    total: items.length,
    productionReady: pendingReview === 0,
  };
}
