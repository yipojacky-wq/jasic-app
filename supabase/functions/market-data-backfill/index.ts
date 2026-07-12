import { createServiceClient } from '../_shared/client.ts';
import {
  integerValue,
  isCommonStockSymbol,
  numberValue,
  requireCronSecret,
  upsertChunks,
} from '../_shared/data.ts';
import {
  envelope,
  errorEnvelope,
  jsonResponse,
  optionsResponse,
} from '../_shared/http.ts';

type StockMasterRow = {
  symbol: string;
  exchange: 'TWSE' | 'TPEx';
  name_zh: string;
  is_active: boolean;
};

type DailyPriceRow = {
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

type InstitutionalFlowRow = {
  stock_id: string;
  trade_date: string;
  foreign_net: number;
  investment_trust_net: number;
  dealer_net: number;
  total_net: number;
  source_code: string;
};

const USER_AGENT = 'JASIC-Historical-Backfill/1.0';
const DEFAULT_TARGET_TRADING_DAYS = 25;
const MAX_TARGET_TRADING_DAYS = 60;
const DEFAULT_BATCH_CALENDAR_DAYS = 7;
const MAX_BATCH_CALENDAR_DAYS = 10;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  const forbidden = requireCronSecret(request);
  if (forbidden) return forbidden;
  if (request.method !== 'POST') {
    return jsonResponse(errorEnvelope('METHOD_NOT_ALLOWED', 'POST required'), 405);
  }

  const supabase = createServiceClient();

  try {
    const payload = await request.json().catch(() => ({}));
    const targetTradingDays = clampInteger(
      payload.targetTradingDays,
      DEFAULT_TARGET_TRADING_DAYS,
      20,
      MAX_TARGET_TRADING_DAYS,
    );
    const batchCalendarDays = clampInteger(
      payload.batchCalendarDays,
      DEFAULT_BATCH_CALENDAR_DAYS,
      1,
      MAX_BATCH_CALENDAR_DAYS,
    );
    const cursorDate = isIsoDate(payload.cursorDate)
      ? payload.cursorDate
      : previousIsoDate(todayTaipeiIso());

    const existingBefore = await countDistinctTradeDates(supabase);
    const datesToTry = recentIsoDates(cursorDate, batchCalendarDays);
    const dayResults = [];
    let stockRowsTotal = 0;
    let priceRowsTotal = 0;
    let flowRowsTotal = 0;
    let tradingDaysImported = 0;

    for (const tradeDate of datesToTry) {
      const result = await ingestOneDate(supabase, tradeDate);
      dayResults.push(result);
      stockRowsTotal += result.stocks;
      priceRowsTotal += result.prices;
      flowRowsTotal += result.institutionalFlows;
      if (result.status === 'completed') tradingDaysImported += 1;
    }

    const existingAfter = await countDistinctTradeDates(supabase);
    const nextCursorDate = previousIsoDate(datesToTry[datesToTry.length - 1]);

    return jsonResponse(
      envelope({
        targetTradingDays,
        batchCalendarDays,
        cursorDate,
        nextCursorDate,
        tradingDaysBefore: existingBefore,
        tradingDaysAfter: existingAfter,
        tradingDaysImported,
        done: existingAfter >= targetTradingDays,
        stocks: stockRowsTotal,
        prices: priceRowsTotal,
        institutionalFlows: flowRowsTotal,
        days: dayResults,
      }),
    );
  } catch (error) {
    console.error(error);
    return jsonResponse(
      errorEnvelope(
        'BACKFILL_FAILED',
        error instanceof Error ? error.message : 'Unknown backfill error',
      ),
      500,
    );
  }
});

async function ingestOneDate(supabase: any, tradeDate: string) {
  const startedAt = new Date().toISOString();
  const compactDate = tradeDate.replace(/-/g, '');
  const slashDate = tradeDate.replace(/-/g, '/');

  try {
    const [twseQuotesResult, tpexQuotesResult, twseInstitutionResult, tpexInstitutionResult] =
      await Promise.allSettled([
        fetchTwseHistoricalQuotes(compactDate),
        fetchTpexHistoricalQuotes(slashDate),
        fetchTwseInstitution(compactDate),
        fetchTpexInstitution(slashDate),
      ]);

    const twseQuotes = fulfilledOrEmpty(twseQuotesResult);
    const tpexQuotes = fulfilledOrEmpty(tpexQuotesResult);
    const twseInstitution = fulfilledOrEmpty(twseInstitutionResult);
    const tpexInstitution = fulfilledOrEmpty(tpexInstitutionResult);

    if (!twseQuotes.rows.length && !tpexQuotes.rows.length) {
      const quoteErrors = [twseQuotesResult, tpexQuotesResult]
        .filter((result) => result.status === 'rejected')
        .map((result: PromiseRejectedResult) => result.reason?.message ?? String(result.reason))
        .join(' | ');
      return emptyDay(tradeDate, 'skipped', quoteErrors || 'No official quote rows');
    }

    const stockRows = [
      ...twseHistoricalStockRows(twseQuotes.rows),
      ...tpexHistoricalStockRows(tpexQuotes.rows),
    ];
    if (!stockRows.length) {
      return emptyDay(tradeDate, 'skipped', 'No common-stock rows');
    }

    await upsertChunks(supabase, 'stocks', stockRows, 'exchange,symbol');
    const stockMap = await loadStockMap(supabase, stockRows);

    const priceRows = [
      ...twseHistoricalPriceRows(tradeDate, twseQuotes.rows, stockMap),
      ...tpexHistoricalPriceRows(tradeDate, tpexQuotes.rows, stockMap),
    ];
    const flowRows = [
      ...twseHistoricalInstitutionRows(tradeDate, twseInstitution.rows, stockMap),
      ...tpexHistoricalInstitutionRows(tradeDate, tpexInstitution.rows, stockMap),
    ];

    if (!priceRows.length) {
      return emptyDay(tradeDate, 'skipped', 'No valid price rows');
    }

    await upsertChunks(supabase, 'stock_daily_prices', priceRows, 'stock_id,trade_date');
    if (flowRows.length) {
      await upsertChunks(
        supabase,
        'institutional_flows_daily',
        flowRows,
        'stock_id,trade_date',
      );
    }

    const completedAt = new Date().toISOString();
    await supabase.from('ingestion_runs').insert([
      ingestionRun('TWSE_STOCK_DAY_ALL', tradeDate, twseQuotes.received, twseHistoricalPriceRows(tradeDate, twseQuotes.rows, stockMap).length, startedAt, completedAt),
      ingestionRun('TPEX_DAILY_QUOTES', tradeDate, tpexQuotes.received, tpexHistoricalPriceRows(tradeDate, tpexQuotes.rows, stockMap).length, startedAt, completedAt),
      ingestionRun('TWSE_T86', tradeDate, twseInstitution.received, twseHistoricalInstitutionRows(tradeDate, twseInstitution.rows, stockMap).length, startedAt, completedAt),
      ingestionRun('TPEX_3INSTI', tradeDate, tpexInstitution.received, tpexHistoricalInstitutionRows(tradeDate, tpexInstitution.rows, stockMap).length, startedAt, completedAt),
    ]);

    return {
      tradeDate,
      status: 'completed',
      stocks: stockRows.length,
      prices: priceRows.length,
      institutionalFlows: flowRows.length,
      warnings: [
        rejectedReason(twseQuotesResult, 'TWSE quotes'),
        rejectedReason(tpexQuotesResult, 'TPEx quotes'),
        rejectedReason(twseInstitutionResult, 'TWSE institution'),
        rejectedReason(tpexInstitutionResult, 'TPEx institution'),
      ].filter(Boolean),
    };
  } catch (error) {
    return emptyDay(
      tradeDate,
      'skipped',
      error instanceof Error ? error.message : 'Unknown date ingestion error',
    );
  }
}

function fulfilledOrEmpty<T extends { rows: string[][]; received: number }>(
  result: PromiseSettledResult<T>,
): T {
  if (result.status === 'fulfilled') return result.value;
  return { rows: [], received: 0 } as unknown as T;
}

function rejectedReason(result: PromiseSettledResult<unknown>, label: string) {
  if (result.status === 'fulfilled') return null;
  const message = result.reason?.message ?? String(result.reason);
  return `${label}: ${message}`;
}

async function fetchTwseHistoricalQuotes(compactDate: string) {
  const data = await fetchJson(
    `https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?date=${compactDate}&type=ALLBUT0999&response=json`,
  );
  if (data.stat !== 'OK' || !Array.isArray(data.tables)) {
    throw new Error(`TWSE MI_INDEX unavailable for ${compactDate}`);
  }
  const table = data.tables.find((item: any) =>
    Array.isArray(item?.fields) && item.fields.includes('證券代號') && item.fields.includes('收盤價')
  );
  if (!table?.data?.length) throw new Error(`TWSE MI_INDEX has no stock table for ${compactDate}`);
  return { rows: table.data as string[][], received: table.data.length };
}

async function fetchTpexHistoricalQuotes(slashDate: string) {
  const data = await fetchJson(
    `https://www.tpex.org.tw/www/zh-tw/afterTrading/dailyQuotes?date=${slashDate}&type=EW&response=json`,
  );
  if (String(data.stat).toLowerCase() !== 'ok' || !Array.isArray(data.tables)) {
    throw new Error(`TPEx dailyQuotes unavailable for ${slashDate}`);
  }
  const table = data.tables.find((item: any) =>
    Array.isArray(item?.fields) && item.fields.includes('代號') && item.fields.includes('收盤')
  );
  if (!table?.data?.length) throw new Error(`TPEx dailyQuotes has no stock table for ${slashDate}`);
  return { rows: table.data as string[][], received: table.data.length };
}

async function fetchTwseInstitution(compactDate: string) {
  const data = await fetchJson(
    `https://www.twse.com.tw/rwd/zh/fund/T86?date=${compactDate}&selectType=ALL&response=json`,
  );
  if (data.stat !== 'OK' || !Array.isArray(data.data)) {
    throw new Error(`TWSE T86 unavailable for ${compactDate}`);
  }
  return { rows: data.data as string[][], received: data.data.length };
}

async function fetchTpexInstitution(slashDate: string) {
  const data = await fetchJson(
    `https://www.tpex.org.tw/www/zh-tw/insti/dailyTrade?date=${slashDate}&type=Daily&response=json`,
  );
  if (String(data.stat).toLowerCase() !== 'ok' || !Array.isArray(data.tables)) {
    throw new Error(`TPEx dailyTrade unavailable for ${slashDate}`);
  }
  const table = data.tables.find((item: any) =>
    Array.isArray(item?.fields) && item.fields.includes('代號')
  );
  if (!table?.data?.length) throw new Error(`TPEx dailyTrade has no table for ${slashDate}`);
  return { rows: table.data as string[][], received: table.data.length };
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return await response.json();
}

function twseHistoricalStockRows(rows: string[][]): StockMasterRow[] {
  return rows
    .filter((row) => isCommonStockSymbol(String(row[0] ?? '').trim()))
    .map((row) => ({
      symbol: String(row[0]).trim(),
      exchange: 'TWSE',
      name_zh: String(row[1] ?? '').trim(),
      is_active: true,
    }));
}

function tpexHistoricalStockRows(rows: string[][]): StockMasterRow[] {
  return rows
    .filter((row) => isCommonStockSymbol(String(row[0] ?? '').trim()))
    .map((row) => ({
      symbol: String(row[0]).trim(),
      exchange: 'TPEx',
      name_zh: String(row[1] ?? '').trim(),
      is_active: true,
    }));
}

function twseHistoricalPriceRows(
  tradeDate: string,
  rows: string[][],
  stockMap: Map<string, string>,
): DailyPriceRow[] {
  return rows.flatMap((row) => {
    const symbol = String(row[0] ?? '').trim();
    const stockId = stockMap.get(`TWSE:${symbol}`);
    const close = numberValue(row[8]);
    if (!stockId || close === null || !isCommonStockSymbol(symbol)) return [];
    return [{
      stock_id: stockId,
      trade_date: tradeDate,
      open: numberValue(row[5]),
      high: numberValue(row[6]),
      low: numberValue(row[7]),
      close,
      change: numberValue(row[10]),
      volume: integerValue(row[2]),
      turnover: numberValue(row[4]),
      trades: integerValue(row[3]),
      source_code: 'TWSE_STOCK_DAY_ALL',
    }];
  });
}

function tpexHistoricalPriceRows(
  tradeDate: string,
  rows: string[][],
  stockMap: Map<string, string>,
): DailyPriceRow[] {
  return rows.flatMap((row) => {
    const symbol = String(row[0] ?? '').trim();
    const stockId = stockMap.get(`TPEx:${symbol}`);
    const close = numberValue(row[2]);
    if (!stockId || close === null || !isCommonStockSymbol(symbol)) return [];
    return [{
      stock_id: stockId,
      trade_date: tradeDate,
      open: numberValue(row[4]),
      high: numberValue(row[5]),
      low: numberValue(row[6]),
      close,
      change: numberValue(row[3]),
      volume: integerValue(row[8]),
      turnover: numberValue(row[9]),
      trades: integerValue(row[10]),
      source_code: 'TPEX_DAILY_QUOTES',
    }];
  });
}

function twseHistoricalInstitutionRows(
  tradeDate: string,
  rows: string[][],
  stockMap: Map<string, string>,
): InstitutionalFlowRow[] {
  return rows.flatMap((row) => {
    const symbol = String(row[0] ?? '').trim();
    const stockId = stockMap.get(`TWSE:${symbol}`);
    if (!stockId || !isCommonStockSymbol(symbol)) return [];
    return [{
      stock_id: stockId,
      trade_date: tradeDate,
      foreign_net: integerValue(row[4]),
      investment_trust_net: integerValue(row[10]),
      dealer_net: integerValue(row[11]),
      total_net: integerValue(row[18]),
      source_code: 'TWSE_T86',
    }];
  });
}

function tpexHistoricalInstitutionRows(
  tradeDate: string,
  rows: string[][],
  stockMap: Map<string, string>,
): InstitutionalFlowRow[] {
  return rows.flatMap((row) => {
    const symbol = String(row[0] ?? '').trim();
    const stockId = stockMap.get(`TPEx:${symbol}`);
    if (!stockId || !isCommonStockSymbol(symbol)) return [];
    return [{
      stock_id: stockId,
      trade_date: tradeDate,
      foreign_net: integerValue(row[10]),
      investment_trust_net: integerValue(row[13]),
      dealer_net: integerValue(row[22]),
      total_net: integerValue(row[23]),
      source_code: 'TPEX_3INSTI',
    }];
  });
}

async function loadStockMap(supabase: any, stockRows: StockMasterRow[]) {
  const map = new Map<string, string>();
  const symbols = [...new Set(stockRows.map((row) => row.symbol))];
  for (let index = 0; index < symbols.length; index += 300) {
    const batch = symbols.slice(index, index + 300);
    const { data, error } = await supabase
      .from('stocks')
      .select('id, symbol, exchange')
      .in('symbol', batch);
    if (error) throw error;
    for (const stock of data ?? []) {
      map.set(`${stock.exchange}:${stock.symbol}`, stock.id);
    }
  }
  return map;
}

async function countDistinctTradeDates(supabase: any) {
  const { data, error } = await supabase
    .from('stock_daily_prices')
    .select('trade_date')
    .order('trade_date', { ascending: false })
    .limit(20000);
  if (error) throw error;
  return new Set((data ?? []).map((row: any) => row.trade_date)).size;
}

function ingestionRun(
  sourceCode: string,
  tradeDate: string,
  recordsReceived: number,
  recordsValid: number,
  startedAt: string,
  completedAt: string,
) {
  return {
    source_code: sourceCode,
    dataset_date: tradeDate,
    status: recordsValid > 0 ? 'completed' : 'partial',
    records_received: recordsReceived,
    records_valid: recordsValid,
    records_rejected: Math.max(recordsReceived - recordsValid, 0),
    started_at: startedAt,
    completed_at: completedAt,
  };
}

function emptyDay(tradeDate: string, status: 'skipped', reason: string) {
  return {
    tradeDate,
    status,
    reason,
    stocks: 0,
    prices: 0,
    institutionalFlows: 0,
  };
}

function recentIsoDates(cursorDate: string, count: number) {
  const dates: string[] = [];
  let current = cursorDate;
  for (let index = 0; index < count; index += 1) {
    dates.push(current);
    current = previousIsoDate(current);
  }
  return dates;
}

function previousIsoDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function todayTaipeiIso() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function clampInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(parsed)));
}
