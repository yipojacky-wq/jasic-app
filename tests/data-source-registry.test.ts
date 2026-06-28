import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dataSourceReadinessRegistry,
  dataSourceReadinessSummary,
} from '../supabase/functions/_shared/dataSourceRegistry.ts';

test('data source readiness registry separates connected and pending sources', () => {
  const registry = dataSourceReadinessRegistry();
  const summary = dataSourceReadinessSummary(registry);

  assert.equal(summary.connected, 4);
  assert.equal(summary.pendingReview, 3);
  assert.equal(summary.total, 7);
  assert.equal(summary.productionReady, false);
  assert.deepEqual(
    registry
      .filter((source) => source.status === 'connected')
      .map((source) => source.code)
      .sort(),
    ['TPEX_3INSTI', 'TPEX_DAILY_QUOTES', 'TWSE_STOCK_DAY_ALL', 'TWSE_T86'],
  );
  assert.deepEqual(
    registry
      .filter((source) => source.status === 'pending_review')
      .map((source) => source.code)
      .sort(),
    ['JASIC_MACRO_FIVE', 'TAIWAN_MARGIN_TRADING', 'TAIWAN_OPEN_INTEREST'],
  );
});

test('data source readiness registry exposes governance notes', () => {
  const registry = dataSourceReadinessRegistry();
  for (const source of registry) {
    assert.ok(source.code);
    assert.ok(source.provider);
    assert.ok(source.datasetName);
    assert.ok(source.commercialUseNote);
    assert.ok(source.note);
  }
});
