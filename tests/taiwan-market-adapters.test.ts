import assert from 'node:assert/strict';
import test from 'node:test';

import {
  tpexDailyPriceBatch,
  tpexInstitutionalFlowBatch,
  tpexStockRows,
  twseDailyPriceBatch,
  twseInstitutionalFlowBatch,
  twseStockRows,
} from '../supabase/functions/_shared/taiwanMarketAdapters.ts';

test('TWSE adapter parses stock masters and daily prices', () => {
  const rows = [
    {
      Date: '1150618',
      Code: '2330',
      Name: '台積電',
      ClosingPrice: '1,040.00',
      OpeningPrice: '1,020.00',
      HighestPrice: '1,045.00',
      LowestPrice: '1,015.00',
      Change: '+20.00',
      TradeVolume: '45,000,000',
      TradeValue: '46,800,000,000',
      Transaction: '32,100',
    },
    {
      Date: '1150618',
      Code: '00679B',
      Name: 'ETF',
      ClosingPrice: '30.00',
    },
  ];

  assert.deepEqual(twseStockRows(rows), [
    {
      symbol: '2330',
      exchange: 'TWSE',
      name_zh: '台積電',
      is_active: true,
    },
  ]);

  const batch = twseDailyPriceBatch(rows, new Map([['TWSE:2330', 'stock-2330']]));
  assert.equal(batch.source.code, 'TWSE_STOCK_DAY_ALL');
  assert.equal(batch.datasetDate, '2026-06-18');
  assert.equal(batch.received, 2);
  assert.equal(batch.valid, 1);
  assert.equal(batch.rejected, 1);
  assert.equal(batch.status, 'partial');
  assert.deepEqual(batch.records[0], {
    stock_id: 'stock-2330',
    trade_date: '2026-06-18',
    open: 1020,
    high: 1045,
    low: 1015,
    close: 1040,
    change: 20,
    volume: 45000000,
    turnover: 46800000000,
    trades: 32100,
    source_code: 'TWSE_STOCK_DAY_ALL',
  });
});

test('TPEx adapter parses stock masters and daily prices', () => {
  const rows = [
    {
      Date: '1150618',
      SecuritiesCompanyCode: '6488',
      CompanyName: '環球晶',
      Close: '486.50',
      Open: '480.00',
      High: '490.00',
      Low: '478.00',
      Change: '+6.50',
      TradingShares: '2,100,000',
      TransactionAmount: '1,021,650,000',
      TransactionNumber: '4,321',
    },
  ];

  assert.deepEqual(tpexStockRows(rows), [
    {
      symbol: '6488',
      exchange: 'TPEx',
      name_zh: '環球晶',
      is_active: true,
    },
  ]);

  const batch = tpexDailyPriceBatch(rows, new Map([['TPEx:6488', 'stock-6488']]));
  assert.equal(batch.source.code, 'TPEX_DAILY_QUOTES');
  assert.equal(batch.datasetDate, '2026-06-18');
  assert.equal(batch.status, 'completed');
  assert.deepEqual(batch.records[0], {
    stock_id: 'stock-6488',
    trade_date: '2026-06-18',
    open: 480,
    high: 490,
    low: 478,
    close: 486.5,
    change: 6.5,
    volume: 2100000,
    turnover: 1021650000,
    trades: 4321,
    source_code: 'TPEX_DAILY_QUOTES',
  });
});

test('institutional flow adapters normalize official rows', () => {
  const stockMap = new Map([
    ['TWSE:2330', 'stock-2330'],
    ['TPEx:6488', 'stock-6488'],
  ]);

  const twseBatch = twseInstitutionalFlowBatch(
    [
      [
        '2330',
        '',
        '',
        '',
        '1,200,000',
        '',
        '',
        '',
        '',
        '',
        '300,000',
        '-50,000',
        '',
        '',
        '',
        '',
        '',
        '',
        '1,450,000',
      ],
    ],
    '2026-06-18',
    stockMap,
  );
  assert.equal(twseBatch.source.code, 'TWSE_T86');
  assert.deepEqual(twseBatch.records[0], {
    stock_id: 'stock-2330',
    trade_date: '2026-06-18',
    foreign_net: 1200000,
    investment_trust_net: 300000,
    dealer_net: -50000,
    total_net: 1450000,
    source_code: 'TWSE_T86',
  });

  const tpexBatch = tpexInstitutionalFlowBatch(
    [
      {
        Date: '1150618',
        SecuritiesCompanyCode: '6488',
        'ForeignInvestorsInclude MainlandAreaInvestors-Difference': '100,000',
        'SecuritiesInvestmentTrustCompanies-Difference': '20,000',
        'Dealers-Difference': '-5,000',
        TotalDifference: '115,000',
      },
    ],
    stockMap,
  );
  assert.equal(tpexBatch.source.code, 'TPEX_3INSTI');
  assert.deepEqual(tpexBatch.records[0], {
    stock_id: 'stock-6488',
    trade_date: '2026-06-18',
    foreign_net: 100000,
    investment_trust_net: 20000,
    dealer_net: -5000,
    total_net: 115000,
    source_code: 'TPEX_3INSTI',
  });
});
