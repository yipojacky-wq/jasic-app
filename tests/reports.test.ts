import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dailyMarketSections,
  isoWeek,
  reportDisclaimer,
  riskLabel,
} from '../supabase/functions/_shared/reports.ts';

test('ISO week remains stable for Taiwan market date', () => {
  assert.equal(isoWeek('2026-06-20'), '2026-W25');
});

test('risk label thresholds are deterministic', () => {
  assert.equal(riskLabel(39.99), '低');
  assert.equal(riskLabel(40), '中');
  assert.equal(riskLabel(70), '高');
});

test('daily report always contains conclusion, focus and risk sections', () => {
  const sections = dailyMarketSections({
    summary: '中性輪動',
    regime: 'neutral_rotation',
    score: 58,
    risk: 45,
    topIndustries: ['SEMICONDUCTOR'],
  });
  assert.deepEqual(sections.map((section) => section.title), [
    '市場結論',
    '今日焦點',
    '風險控制',
  ]);
  assert.match(reportDisclaimer(), /不構成投資建議/);
});
