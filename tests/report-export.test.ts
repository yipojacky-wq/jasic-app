import assert from 'node:assert/strict';
import test from 'node:test';

import { reportFilename, reportToMarkdown } from '../src/lib/reportExport';
import type { ReportDetail } from '../src/types';

const report: ReportDetail = {
  id: 'report-1',
  type: 'Daily',
  reportType: 'daily_market',
  title: '每日市場：戰情/測試',
  date: '2026-06-21',
  summary: '市場中性偏多。',
  asOf: '2026-06-21T08:00:00+08:00',
  ruleVersion: 'rule-1',
  metrics: [{ label: 'Market Score', value: '76', note: '中性偏多' }],
  sections: [{ title: '風險', items: ['避免追高'], tone: 'warning' }],
  disclaimer: '不保證獲利。',
};

test('report markdown preserves audit and disclaimer fields', () => {
  const markdown = reportToMarkdown(report);
  assert.match(markdown, /規則版本：rule-1/);
  assert.match(markdown, /Market Score/);
  assert.match(markdown, /避免追高/);
  assert.match(markdown, /不保證獲利/);
});

test('report filename removes filesystem-unsafe characters', () => {
  const filename = reportFilename(report);
  assert.equal(filename.includes('：'), true);
  assert.equal(filename.includes('/'), false);
  assert.match(filename, /\.md$/);
});
