import { createServiceClient } from '../_shared/client.ts';
import {
  chunks,
  requireCronSecret,
  upsertChunks,
} from '../_shared/data.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';
import { ingestionRunFromBatch } from '../_shared/marketDataContracts.ts';
import {
  tpexDailyPriceBatch,
  tpexInstitutionalFlowBatch,
  tpexStockRows,
  twseDailyPriceBatch,
  twseInstitutionalFlowBatch,
  twseStockRows,
} from '../_shared/taiwanMarketAdapters.ts';

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

    const twseDate = twseDailyPriceBatch(twseQuotes, new Map()).datasetDate;
    const twseInstitution = await fetchTwseInstitution(twseDate);

    const stockRows = [
      ...twseStockRows(twseQuotes),
      ...tpexStockRows(tpexQuotes),
    ];
    await upsertChunks(supabase, 'stocks', stockRows, 'exchange,symbol');
    const stockMap = await loadStockMap(supabase, stockRows);

    const twsePriceBatch = twseDailyPriceBatch(twseQuotes, stockMap);
    const tpexPriceBatch = tpexDailyPriceBatch(tpexQuotes, stockMap);
    const priceRows = [...twsePriceBatch.records, ...tpexPriceBatch.records];
    await upsertChunks(supabase, 'stock_daily_prices', priceRows, 'stock_id,trade_date');

    const twseFlowBatch = twseInstitutionalFlowBatch(
      twseInstitution.data,
      twseDate,
      stockMap,
    );
    const tpexFlowBatch = tpexInstitutionalFlowBatch(tpexInstitution, stockMap);
    const flowRows = [...twseFlowBatch.records, ...tpexFlowBatch.records];
    await upsertChunks(
      supabase,
      'institutional_flows_daily',
      flowRows,
      'stock_id,trade_date',
    );

    const completedAt = new Date().toISOString();
    const runRows = [
      twsePriceBatch,
      twseFlowBatch,
      tpexPriceBatch,
      tpexFlowBatch,
    ].map((batch) => ingestionRunFromBatch(batch, { startedAt, completedAt }));
    await supabase.from('ingestion_runs').insert(runRows);

    return jsonResponse(
      envelope({
        twseDate: twsePriceBatch.datasetDate,
        tpexDate: tpexPriceBatch.datasetDate,
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
