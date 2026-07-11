import assert from 'node:assert/strict';
import test from 'node:test';

import { reportFilename, reportToMarkdown } from '../src/lib/reportExport';
import type { ReportDetail } from '../src/types';

const report: ReportDetail = {
  id: 'report-1',
  type: 'Daily',
  reportType: 'daily_market',
  title: 'Daily Market Risk Check',
  date: '2026-06-21',
  summary: 'Market remains constructive, but position sizing should stay disciplined.',
  asOf: '2026-06-21T08:00:00+08:00',
  ruleVersion: 'rule-1',
  governanceAudit: {
    modelIdentifier: 'demo-model',
    promptVersion: 'ai-check-1.1.0',
    responseSchemaVersion: 'ai-check-response-1.0.0',
    allowedActions: ['HOLD', 'WAIT', 'REDUCE'],
  },
  metrics: [{ label: 'Market Score', value: '76', note: 'constructive' }],
  sections: [{ title: 'Risk', items: ['Short-term volatility remains possible.'], tone: 'warning' }],
  disclaimer: 'Research only. No profit guarantee. No automatic trading.',
};

test('report markdown preserves audit, governance and disclaimer fields', () => {
  const markdown = reportToMarkdown(report);
  assert.match(markdown, /## Audit/);
  assert.match(markdown, /Rule version: rule-1/);
  assert.match(markdown, /AI model: demo-model/);
  assert.match(markdown, /AI prompt version: ai-check-1.1.0/);
  assert.match(markdown, /AI response schema version: ai-check-response-1.0.0/);
  assert.match(markdown, /AI allowed actions: HOLD, WAIT, REDUCE/);
  assert.match(markdown, /Market Score/);
  assert.match(markdown, /Short-term volatility remains possible/);
  assert.match(markdown, /No profit guarantee/);
});

test('report filename removes filesystem-unsafe characters', () => {
  const filename = reportFilename({
    ...report,
    title: 'Risk/Check: 2330 <daily>',
  });
  assert.equal(filename.includes('/'), false);
  assert.equal(filename.includes('<'), false);
  assert.match(filename, /\.md$/);
});
