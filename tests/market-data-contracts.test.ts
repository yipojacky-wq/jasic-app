import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adapterStatus,
  createAdapterBatch,
  ingestionRunFromBatch,
  officialTaiwanMarketSources,
  pendingProductionSources,
  qualityRate,
  summarizeAdapterBatch,
} from '../supabase/functions/_shared/marketDataContracts.ts';

test('market data adapter batch summarizes quality and ingestion rows', () => {
  const source = officialTaiwanMarketSources.find(
    (item) => item.code === 'TWSE_STOCK_DAY_ALL',
  );
  assert.ok(source);

  const batch = createAdapterBatch({
    source,
    datasetDate: '2026-06-18',
    received: 3,
    records: [{ symbol: '2330' }, { symbol: '2454' }],
    warnings: ['one ETF excluded from MVP universe'],
  });

  assert.equal(batch.status, 'partial');
  assert.equal(batch.valid, 2);
  assert.equal(batch.rejected, 1);
  assert.deepEqual(summarizeAdapterBatch(batch), {
    sourceCode: 'TWSE_STOCK_DAY_ALL',
    provider: 'Taiwan Stock Exchange',
    datasetDate: '2026-06-18',
    status: 'partial',
    received: 3,
    valid: 2,
    rejected: 1,
    qualityRate: 66.67,
    warningCount: 1,
  });

  assert.deepEqual(
    ingestionRunFromBatch(batch, {
      startedAt: '2026-06-18T10:00:00.000Z',
      completedAt: '2026-06-18T10:00:05.000Z',
    }),
    {
      source_code: 'TWSE_STOCK_DAY_ALL',
      dataset_date: '2026-06-18',
      status: 'partial',
      records_received: 3,
      records_valid: 2,
      records_rejected: 1,
      error_summary: 'one ETF excluded from MVP universe',
      started_at: '2026-06-18T10:00:00.000Z',
      completed_at: '2026-06-18T10:00:05.000Z',
    },
  );
});

test('market data contracts block unreviewed production sources', () => {
  const pendingSource = pendingProductionSources[0];

  assert.throws(
    () =>
      createAdapterBatch({
        source: pendingSource,
        datasetDate: '2026-06-18',
        received: 1,
        records: [{ symbol: '2330' }],
      }),
    /license status is pending review/,
  );
});

test('adapter status is deterministic for failed and blocked data', () => {
  assert.equal(adapterStatus({ received: 0, valid: 0, rejected: 0 }), 'blocked');
  assert.equal(
    adapterStatus({
      received: 10,
      valid: 0,
      rejected: 10,
      upstreamError: 'provider unavailable',
    }),
    'failed',
  );
  assert.equal(adapterStatus({ received: 10, valid: 10, rejected: 0 }), 'completed');
  assert.equal(adapterStatus({ received: 10, valid: 9, rejected: 1 }), 'partial');
});

test('quality rate does not invent quality for empty upstream payloads', () => {
  assert.equal(qualityRate(0, 0), null);
  assert.equal(qualityRate(2, 3), 66.67);
});
