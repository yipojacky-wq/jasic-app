export type MarketDataDomain =
  | 'stock_master'
  | 'daily_price'
  | 'institutional_flow'
  | 'margin_trading'
  | 'open_interest'
  | 'macro_indicator';

export type MarketDataFrequency =
  | 'trading_day_eod'
  | 'monthly'
  | 'weekly'
  | 'derived'
  | 'manual';

export type MarketDataLicenseStatus =
  | 'official_open_data'
  | 'licensed'
  | 'internal'
  | 'pending_review';

export type MarketDataAdapterStatus =
  | 'completed'
  | 'partial'
  | 'failed'
  | 'blocked';

export type MarketDataSourceContract = {
  code: string;
  provider: string;
  datasetName: string;
  domain: MarketDataDomain;
  frequency: MarketDataFrequency;
  licenseStatus: MarketDataLicenseStatus;
  attribution: string;
  endpoint?: string;
  commercialUseNote: string;
};

export type MarketDataAdapterBatch<TRecord> = {
  source: MarketDataSourceContract;
  datasetDate: string;
  received: number;
  valid: number;
  rejected: number;
  records: TRecord[];
  status: MarketDataAdapterStatus;
  warnings: string[];
};

export type MarketDataAdapterSummary = {
  sourceCode: string;
  provider: string;
  datasetDate: string;
  status: MarketDataAdapterStatus;
  received: number;
  valid: number;
  rejected: number;
  qualityRate: number | null;
  warningCount: number;
};

export function assertIsoDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid datasetDate: ${value}`);
  }
}

export function qualityRate(valid: number, received: number): number | null {
  if (!Number.isFinite(received) || received <= 0) return null;
  if (!Number.isFinite(valid) || valid < 0) return null;
  return Math.round((valid / received) * 10_000) / 100;
}

export function adapterStatus(input: {
  received: number;
  valid: number;
  rejected: number;
  warnings?: string[];
  upstreamError?: string | null;
}): MarketDataAdapterStatus {
  if (input.upstreamError) return 'failed';
  if (input.received <= 0 || input.valid <= 0) return 'blocked';
  if (input.rejected > 0 || (input.warnings?.length ?? 0) > 0) return 'partial';
  return 'completed';
}

export function createAdapterBatch<TRecord>(input: {
  source: MarketDataSourceContract;
  datasetDate: string;
  received: number;
  records: TRecord[];
  rejected?: number;
  warnings?: string[];
  upstreamError?: string | null;
}): MarketDataAdapterBatch<TRecord> {
  assertIsoDate(input.datasetDate);
  if (input.source.licenseStatus === 'pending_review') {
    throw new Error(`${input.source.code} license status is pending review`);
  }

  const rejected = input.rejected ?? Math.max(0, input.received - input.records.length);
  const valid = input.records.length;
  const warnings = input.warnings ?? [];

  return {
    source: input.source,
    datasetDate: input.datasetDate,
    received: input.received,
    valid,
    rejected,
    records: input.records,
    status: adapterStatus({
      received: input.received,
      valid,
      rejected,
      warnings,
      upstreamError: input.upstreamError,
    }),
    warnings,
  };
}

export function summarizeAdapterBatch<TRecord>(
  batch: MarketDataAdapterBatch<TRecord>,
): MarketDataAdapterSummary {
  return {
    sourceCode: batch.source.code,
    provider: batch.source.provider,
    datasetDate: batch.datasetDate,
    status: batch.status,
    received: batch.received,
    valid: batch.valid,
    rejected: batch.rejected,
    qualityRate: qualityRate(batch.valid, batch.received),
    warningCount: batch.warnings.length,
  };
}

export function ingestionRunFromBatch<TRecord>(
  batch: MarketDataAdapterBatch<TRecord>,
  timestamps: { startedAt: string; completedAt: string },
) {
  return {
    source_code: batch.source.code,
    dataset_date: batch.datasetDate,
    status: batch.status === 'blocked' ? 'failed' : batch.status,
    records_received: batch.received,
    records_valid: batch.valid,
    records_rejected: batch.rejected,
    error_summary: batch.warnings.length ? batch.warnings.join(' | ') : null,
    started_at: timestamps.startedAt,
    completed_at: timestamps.completedAt,
  };
}

export const officialTaiwanMarketSources: MarketDataSourceContract[] = [
  {
    code: 'TWSE_STOCK_DAY_ALL',
    provider: 'Taiwan Stock Exchange',
    datasetName: 'Listed stock daily quotes',
    domain: 'daily_price',
    frequency: 'trading_day_eod',
    licenseStatus: 'official_open_data',
    attribution: 'Taiwan Stock Exchange OpenAPI',
    endpoint: 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
    commercialUseNote:
      'Review TWSE open-data commercial-use, caching and redistribution terms before production launch.',
  },
  {
    code: 'TWSE_T86',
    provider: 'Taiwan Stock Exchange',
    datasetName: 'Listed stock institutional trading',
    domain: 'institutional_flow',
    frequency: 'trading_day_eod',
    licenseStatus: 'official_open_data',
    attribution: 'Taiwan Stock Exchange T86',
    endpoint: 'https://www.twse.com.tw/rwd/zh/fund/T86',
    commercialUseNote:
      'Review TWSE commercial-use and redistribution terms before production launch.',
  },
  {
    code: 'TPEX_DAILY_QUOTES',
    provider: 'Taipei Exchange',
    datasetName: 'TPEx daily close quotes',
    domain: 'daily_price',
    frequency: 'trading_day_eod',
    licenseStatus: 'official_open_data',
    attribution: 'Taipei Exchange OpenAPI',
    endpoint: 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes',
    commercialUseNote:
      'Review TPEx commercial-use, caching and redistribution terms before production launch.',
  },
  {
    code: 'TPEX_3INSTI',
    provider: 'Taipei Exchange',
    datasetName: 'TPEx institutional trading',
    domain: 'institutional_flow',
    frequency: 'trading_day_eod',
    licenseStatus: 'official_open_data',
    attribution: 'Taipei Exchange OpenAPI',
    endpoint: 'https://www.tpex.org.tw/openapi/v1/tpex_3insti_daily_trading',
    commercialUseNote:
      'Review TPEx commercial-use and redistribution terms before production launch.',
  },
];

export const pendingProductionSources: MarketDataSourceContract[] = [
  {
    code: 'TAIWAN_MARGIN_TRADING',
    provider: 'Pending licensed or official source',
    datasetName: 'Margin trading balances',
    domain: 'margin_trading',
    frequency: 'trading_day_eod',
    licenseStatus: 'pending_review',
    attribution: 'Pending',
    commercialUseNote: 'Choose and review an authorized source before implementation.',
  },
  {
    code: 'TAIWAN_OPEN_INTEREST',
    provider: 'Pending licensed or official source',
    datasetName: 'Stock-related open interest',
    domain: 'open_interest',
    frequency: 'trading_day_eod',
    licenseStatus: 'pending_review',
    attribution: 'Pending',
    commercialUseNote: 'Choose and review an authorized source before implementation.',
  },
  {
    code: 'JASIC_MACRO_FIVE',
    provider: 'Pending official macro providers',
    datasetName: 'Five macro indicators',
    domain: 'macro_indicator',
    frequency: 'monthly',
    licenseStatus: 'pending_review',
    attribution: 'Pending',
    commercialUseNote: 'Confirm caching and redistribution terms for every macro provider.',
  },
];
