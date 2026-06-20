import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dataHealthAction,
  dataHealthSummary,
  filterDataHealth,
  formatQualityRate,
} from '../src/lib/dataHealth';
import type { DataHealthItem } from '../src/types';

const items: DataHealthItem[] = [
  {
    code: 'A',
    label: 'A',
    status: 'healthy',
    qualityRate: 99.5,
    message: 'ok',
  },
  {
    code: 'B',
    label: 'B',
    status: 'warning',
    runStatus: 'partial',
    message: 'partial',
  },
  {
    code: 'C',
    label: 'C',
    status: 'stale',
    runStatus: 'failed',
    message: 'failed',
  },
  {
    code: 'D',
    label: 'D',
    status: 'missing',
    message: 'missing',
  },
];

test('data health summary separates warnings from blocking failures', () => {
  assert.deepEqual(dataHealthSummary(items), {
    total: 4,
    healthy: 1,
    warning: 1,
    blocking: 2,
    researchReady: false,
  });
});

test('data health filters preserve the intended operational groups', () => {
  assert.deepEqual(
    filterDataHealth(items, 'attention').map((item) => item.code),
    ['B', 'C', 'D'],
  );
  assert.deepEqual(
    filterDataHealth(items, 'healthy').map((item) => item.code),
    ['A'],
  );
});

test('data health action prioritizes failed and partial ingestion runs', () => {
  assert.match(dataHealthAction(items[1]), /拒絕資料/);
  assert.match(dataHealthAction(items[2]), /來源端點/);
  assert.match(dataHealthAction(items[3]), /首次資料匯入/);
});

test('quality rate is formatted without inventing missing quality', () => {
  assert.equal(formatQualityRate(items[0]), '99.5%');
  assert.equal(formatQualityRate(items[1]), '—');
});
