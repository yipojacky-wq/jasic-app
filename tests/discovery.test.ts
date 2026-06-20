import assert from 'node:assert/strict';
import test from 'node:test';

import {
  categoryLabel,
  discoveryCandidatesToCsv,
  filterDiscoveryCandidates,
} from '../src/lib/discovery';
import { candidates } from '../src/data/mockData';

test('Discovery filters combine search, signal and risk', () => {
  const result = filterDiscoveryCandidates(candidates, {
    search: '半導體',
    signal: 'green',
    risk: '中',
    category: 'all',
    sort: 'rank',
  });
  assert.deepEqual(result.map((item) => item.symbol), ['2330']);
});

test('Discovery sorting supports confidence and low risk', () => {
  const confidence = filterDiscoveryCandidates(candidates, {
    search: '',
    signal: 'all',
    risk: 'all',
    category: 'all',
    sort: 'confidence_desc',
  });
  assert.equal(confidence[0].symbol, '2330');

  const lowRisk = filterDiscoveryCandidates(candidates, {
    search: '',
    signal: 'all',
    risk: 'all',
    category: 'all',
    sort: 'risk_asc',
  });
  assert.equal(lowRisk[0].risk, '低');
});

test('Discovery CSV includes reasons and safe quoted values', () => {
  const csv = discoveryCandidatesToCsv(candidates.slice(0, 1));
  assert.match(csv, /"2330"/);
  assert.match(csv, /"綜合分數 88/);
  assert.equal(categoryLabel('trend'), '趨勢延續');
});
