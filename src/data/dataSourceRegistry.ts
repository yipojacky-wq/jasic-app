export type ClientDataSourceStatus = 'connected' | 'pending_review';

export type ClientDataSourceRegistryItem = {
  code: string;
  provider: string;
  datasetName: string;
  domain: string;
  frequency: string;
  status: ClientDataSourceStatus;
  note: string;
};

export const clientDataSourceRegistry: ClientDataSourceRegistryItem[] = [
  {
    code: 'TWSE_STOCK_DAY_ALL',
    provider: 'Taiwan Stock Exchange',
    datasetName: 'Listed stock daily quotes',
    domain: 'Daily Price',
    frequency: 'Trading-day EOD',
    status: 'connected',
    note: 'Used by stock master and daily price ingestion adapters.',
  },
  {
    code: 'TWSE_T86',
    provider: 'Taiwan Stock Exchange',
    datasetName: 'Listed stock institutional trading',
    domain: 'Institutional Flow',
    frequency: 'Trading-day EOD',
    status: 'connected',
    note: 'Used by foreign, investment trust, dealer, and total-net flow logic.',
  },
  {
    code: 'TPEX_DAILY_QUOTES',
    provider: 'Taipei Exchange',
    datasetName: 'TPEx daily close quotes',
    domain: 'Daily Price',
    frequency: 'Trading-day EOD',
    status: 'connected',
    note: 'Used by TPEx stock master and daily price ingestion adapters.',
  },
  {
    code: 'TPEX_3INSTI',
    provider: 'Taipei Exchange',
    datasetName: 'TPEx institutional trading',
    domain: 'Institutional Flow',
    frequency: 'Trading-day EOD',
    status: 'connected',
    note: 'Used by TPEx institutional flow ingestion adapters.',
  },
  {
    code: 'TAIWAN_MARGIN_TRADING',
    provider: 'Pending official or licensed provider',
    datasetName: 'Margin trading balances',
    domain: 'Margin Trading',
    frequency: 'Trading-day EOD',
    status: 'pending_review',
    note: 'Required before leverage pressure and some risk alerts become production-grade.',
  },
  {
    code: 'TAIWAN_OPEN_INTEREST',
    provider: 'Pending official or licensed provider',
    datasetName: 'Stock-related open interest',
    domain: 'Open Interest',
    frequency: 'Trading-day EOD',
    status: 'pending_review',
    note: 'Required before OI confirmation can move beyond provisional scoring.',
  },
  {
    code: 'JASIC_MACRO_FIVE',
    provider: 'Pending official macro providers',
    datasetName: 'Five macro indicators',
    domain: 'Macro Indicator',
    frequency: 'Monthly / derived',
    status: 'pending_review',
    note: 'Required before Market Score can be fully backed by live macro feeds.',
  },
];
