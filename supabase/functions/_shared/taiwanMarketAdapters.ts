import {
  createAdapterBatch,
  officialTaiwanMarketSource,
  type MarketDataAdapterBatch,
} from './marketDataContracts.ts';
import {
  integerValue,
  isCommonStockSymbol,
  numberValue,
  rocDateToIso,
} from './normalize.ts';

export type StockMasterRow = {
  symbol: string;
  exchange: 'TWSE' | 'TPEx';
  name_zh: string;
  is_active: boolean;
};

export type DailyPriceRow = {
  stock_id: string;
  trade_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  change: number | null;
  volume: number;
  turnover: number | null;
  trades: number;
  source_code: string;
};

export type InstitutionalFlowRow = {
  stock_id: string;
  trade_date: string;
  foreign_net: number;
  investment_trust_net: number;
  dealer_net: number;
  total_net: number;
  source_code: string;
};

export function twseStockRows(rows: any[]): StockMasterRow[] {
  return rows
    .filter((row) => isCommonStockSymbol(String(row.Code ?? '').trim()))
    .map((row) => ({
      symbol: String(row.Code).trim(),
      exchange: 'TWSE',
      name_zh: String(row.Name ?? '').trim(),
      is_active: true,
    }));
}

export function tpexStockRows(rows: any[]): StockMasterRow[] {
  return rows
    .filter((row) =>
      isCommonStockSymbol(String(row.SecuritiesCompanyCode ?? '').trim())
    )
    .map((row) => ({
      symbol: String(row.SecuritiesCompanyCode).trim(),
      exchange: 'TPEx',
      name_zh: String(row.CompanyName ?? '').trim(),
      is_active: true,
    }));
}

export function twseDailyPriceBatch(
  rows: any[],
  stockMap: Map<string, string>,
): MarketDataAdapterBatch<DailyPriceRow> {
  const datasetDate = rocDateToIso(String(rows[0]?.Date ?? ''));
  const records = rows.flatMap((row) => {
    const symbol = String(row.Code ?? '').trim();
    const stockId = stockMap.get(`TWSE:${symbol}`);
    const close = numberValue(row.ClosingPrice);
    if (!stockId || close === null || !isCommonStockSymbol(symbol)) return [];
    return [{
      stock_id: stockId,
      trade_date: rocDateToIso(String(row.Date)),
      open: numberValue(row.OpeningPrice),
      high: numberValue(row.HighestPrice),
      low: numberValue(row.LowestPrice),
      close,
      change: numberValue(row.Change),
      volume: integerValue(row.TradeVolume),
      turnover: numberValue(row.TradeValue),
      trades: integerValue(row.Transaction),
      source_code: 'TWSE_STOCK_DAY_ALL',
    }];
  });

  return createAdapterBatch({
    source: officialTaiwanMarketSource('TWSE_STOCK_DAY_ALL'),
    datasetDate,
    received: rows.length,
    records,
  });
}

export function tpexDailyPriceBatch(
  rows: any[],
  stockMap: Map<string, string>,
): MarketDataAdapterBatch<DailyPriceRow> {
  const datasetDate = rocDateToIso(String(rows[0]?.Date ?? ''));
  const records = rows.flatMap((row) => {
    const symbol = String(row.SecuritiesCompanyCode ?? '').trim();
    const stockId = stockMap.get(`TPEx:${symbol}`);
    const close = numberValue(row.Close);
    if (!stockId || close === null || !isCommonStockSymbol(symbol)) return [];
    return [{
      stock_id: stockId,
      trade_date: rocDateToIso(String(row.Date)),
      open: numberValue(row.Open),
      high: numberValue(row.High),
      low: numberValue(row.Low),
      close,
      change: numberValue(row.Change),
      volume: integerValue(row.TradingShares),
      turnover: numberValue(row.TransactionAmount),
      trades: integerValue(row.TransactionNumber),
      source_code: 'TPEX_DAILY_QUOTES',
    }];
  });

  return createAdapterBatch({
    source: officialTaiwanMarketSource('TPEX_DAILY_QUOTES'),
    datasetDate,
    received: rows.length,
    records,
  });
}

export function twseInstitutionalFlowBatch(
  rows: string[][],
  datasetDate: string,
  stockMap: Map<string, string>,
): MarketDataAdapterBatch<InstitutionalFlowRow> {
  const records = rows.flatMap((row) => {
    const symbol = String(row[0] ?? '').trim();
    const stockId = stockMap.get(`TWSE:${symbol}`);
    if (!stockId || !isCommonStockSymbol(symbol)) return [];
    return [{
      stock_id: stockId,
      trade_date: datasetDate,
      foreign_net: integerValue(row[4]),
      investment_trust_net: integerValue(row[10]),
      dealer_net: integerValue(row[11]),
      total_net: integerValue(row[18]),
      source_code: 'TWSE_T86',
    }];
  });

  return createAdapterBatch({
    source: officialTaiwanMarketSource('TWSE_T86'),
    datasetDate,
    received: rows.length,
    records,
  });
}

export function tpexInstitutionalFlowBatch(
  rows: any[],
  stockMap: Map<string, string>,
): MarketDataAdapterBatch<InstitutionalFlowRow> {
  const datasetDate = rocDateToIso(String(rows[0]?.Date ?? ''));
  const records = rows.flatMap((row) => {
    const symbol = String(row.SecuritiesCompanyCode ?? '').trim();
    const stockId = stockMap.get(`TPEx:${symbol}`);
    if (!stockId || !isCommonStockSymbol(symbol)) return [];
    return [{
      stock_id: stockId,
      trade_date: rocDateToIso(String(row.Date)),
      foreign_net: integerValue(
        row['ForeignInvestorsInclude MainlandAreaInvestors-Difference'],
      ),
      investment_trust_net: integerValue(
        row['SecuritiesInvestmentTrustCompanies-Difference'],
      ),
      dealer_net: integerValue(row['Dealers-Difference']),
      total_net: integerValue(row.TotalDifference),
      source_code: 'TPEX_3INSTI',
    }];
  });

  return createAdapterBatch({
    source: officialTaiwanMarketSource('TPEX_3INSTI'),
    datasetDate,
    received: rows.length,
    records,
  });
}
