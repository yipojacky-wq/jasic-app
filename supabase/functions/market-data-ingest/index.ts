import { createServiceClient } from '../_shared/client.ts';
import {
  chunks,
  integerValue,
  isCommonStockSymbol,
  numberValue,
  requireCronSecret,
  rocDateToIso,
  upsertChunks,
} from '../_shared/data.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';

const TWSE_QUOTES =
  'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
const TPEX_QUOTES =
  'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes';
const TPEX_INSTITUTION =
  'https://www.tpex.org.tw/openapi/v1/tpex_3insti_daily_trading';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  const forbidden = requireCronSecret(request);
  if (forbidden) return forbidden;
  if (request.method !== 'POST') {
    return jsonResponse(errorEnvelope('METHOD_NOT_ALLOWED', 'POST required'), 405);
  }

  const supabase = createServiceClient();
  const startedAt = new Date().toISOString();

  try {
    const [twseQuotes, tpexQuotes, tpexInstitution] = await Promise.all([
      fetchJson(TWSE_QUOTES),
      fetchJson(TPEX_QUOTES),
      fetchJson(TPEX_INSTITUTION),
    ]);

    const twseDate = rocDateToIso(twseQuotes[0]?.Date);
    const tpexDate = rocDateToIso(tpexQuotes[0]?.Date);
    const twseInstitution = await fetchTwseInstitution(twseDate);

    const stockRows = [
      ...twseQuotes
        .filter((row: any) => isCommonStockSymbol(row.Code))
        .map((row: any) => ({
          symbol: row.Code.trim(),
          exchange: 'TWSE',
          name_zh: row.Name.trim(),
          is_active: true,
        })),
      ...tpexQuotes
        .filter((row: any) => isCommonStockSymbol(row.SecuritiesCompanyCode))
        .map((row: any) => ({
          symbol: row.SecuritiesCompanyCode.trim(),
          exchange: 'TPEx',
          name_zh: row.CompanyName.trim(),
          is_active: true,
        })),
    ];
    await upsertChunks(supabase, 'stocks', stockRows, 'exchange,symbol');
    const stockMap = await loadStockMap(supabase, stockRows);

    const priceRows = [
      ...twseQuotes.flatMap((row: any) => {
        const stockId = stockMap.get(`TWSE:${row.Code.trim()}`);
        const close = numberValue(row.ClosingPrice);
        if (!stockId || close === null) return [];
        return [{
          stock_id: stockId,
          trade_date: rocDateToIso(row.Date),
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
      }),
      ...tpexQuotes.flatMap((row: any) => {
        const symbol = row.SecuritiesCompanyCode.trim();
        const stockId = stockMap.get(`TPEx:${symbol}`);
        const close = numberValue(row.Close);
        if (!stockId || close === null || !isCommonStockSymbol(symbol)) return [];
        return [{
          stock_id: stockId,
          trade_date: rocDateToIso(row.Date),
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
      }),
    ];
    await upsertChunks(supabase, 'stock_daily_prices', priceRows, 'stock_id,trade_date');

    const flowRows = [
      ...twseInstitution.data.flatMap((row: string[]) => {
        const symbol = String(row[0]).trim();
        const stockId = stockMap.get(`TWSE:${symbol}`);
        if (!stockId || !isCommonStockSymbol(symbol)) return [];
        return [{
          stock_id: stockId,
          trade_date: twseDate,
          foreign_net: integerValue(row[4]),
          investment_trust_net: integerValue(row[10]),
          dealer_net: integerValue(row[11]),
          total_net: integerValue(row[18]),
          source_code: 'TWSE_T86',
        }];
      }),
      ...tpexInstitution.flatMap((row: any) => {
        const symbol = row.SecuritiesCompanyCode.trim();
        const stockId = stockMap.get(`TPEx:${symbol}`);
        if (!stockId || !isCommonStockSymbol(symbol)) return [];
        return [{
          stock_id: stockId,
          trade_date: rocDateToIso(row.Date),
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
      }),
    ];
    await upsertChunks(
      supabase,
      'institutional_flows_daily',
      flowRows,
      'stock_id,trade_date',
    );

    const runRows = [
      ['TWSE_STOCK_DAY_ALL', twseDate, twseQuotes.length, priceRows.filter((r) => r.source_code === 'TWSE_STOCK_DAY_ALL').length],
      ['TWSE_T86', twseDate, twseInstitution.data.length, flowRows.filter((r) => r.source_code === 'TWSE_T86').length],
      ['TPEX_DAILY_QUOTES', tpexDate, tpexQuotes.length, priceRows.filter((r) => r.source_code === 'TPEX_DAILY_QUOTES').length],
      ['TPEX_3INSTI', tpexDate, tpexInstitution.length, flowRows.filter((r) => r.source_code === 'TPEX_3INSTI').length],
    ].map(([source, date, received, valid]) => ({
      source_code: source,
      dataset_date: date,
      status: Number(valid) > 0 ? 'completed' : 'partial',
      records_received: Number(received),
      records_valid: Number(valid),
      records_rejected: Number(received) - Number(valid),
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    }));
    await supabase.from('ingestion_runs').insert(runRows);

    return jsonResponse(
      envelope({
        twseDate,
        tpexDate,
        stocks: stockRows.length,
        prices: priceRows.length,
        institutionalFlows: flowRows.length,
      }),
    );
  } catch (error) {
    console.error(error);
    return jsonResponse(
      errorEnvelope(
        'INGESTION_FAILED',
        error instanceof Error ? error.message : 'Unknown ingestion error',
      ),
      500,
    );
  }
});

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'JASIC-Data-Ingestion/1.0' },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`${url} returned no records`);
  }
  return data;
}

async function fetchTwseInstitution(isoDate: string) {
  const compactDate = isoDate.replace(/-/g, '');
  const response = await fetch(
    `https://www.twse.com.tw/rwd/zh/fund/T86?date=${compactDate}&selectType=ALL&response=json`,
    { headers: { Accept: 'application/json', 'User-Agent': 'JASIC-Data-Ingestion/1.0' } },
  );
  if (!response.ok) throw new Error(`TWSE T86 returned ${response.status}`);
  const data = await response.json();
  if (data.stat !== 'OK' || !Array.isArray(data.data)) {
    throw new Error(`TWSE T86 unavailable for ${compactDate}`);
  }
  return data;
}

async function loadStockMap(supabase: any, stockRows: any[]) {
  const map = new Map<string, string>();
  for (const batch of chunks(stockRows, 300)) {
    const symbols = [...new Set(batch.map((row) => row.symbol))];
    const { data, error } = await supabase
      .from('stocks')
      .select('id, symbol, exchange')
      .in('symbol', symbols);
    if (error) throw error;
    for (const stock of data ?? []) {
      map.set(`${stock.exchange}:${stock.symbol}`, stock.id);
    }
  }
  return map;
}
