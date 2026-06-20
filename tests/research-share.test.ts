import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aiCheckResearchUrl,
  aiCheckShareText,
  stockResearchUrl,
  warRoomShareText,
} from '../src/lib/researchShare';
import type { AiCheckResult, StockWarRoomData } from '../src/types';

const stock: StockWarRoomData = {
  symbol: '2454',
  name: '聯發科',
  industry: 'IC 設計',
  exchange: 'TWSE',
  score: 84,
  scoreChange: 1.8,
  signal: 'green',
  riskScore: 52,
  riskLabel: '中',
  confidence: 65,
  grade: 'A',
  dataAsOf: '2026-06-20T16:30:00+08:00',
  ruleVersion: 'demo-1.0.0',
  conclusion: { action: '續抱', summary: '等待壓力區確認。' },
  dimensions: [],
  evidence: {
    institutional: [],
    oi: [],
    technical: [],
    risk: ['短線接近壓力區'],
  },
  levels: { support: [960], resistance: [1050] },
};

const aiResult: AiCheckResult = {
  action: 'WAIT',
  conclusion: '訊號尚未一致。',
  reasons: ['市場與個股訊號分歧'],
  risks: ['資料仍有缺口'],
  suggestions: ['等待下一次更新'],
  confidence: 68,
  dataAsOf: '2026-06-20T16:30:00+08:00',
  ruleVersion: 'demo-1.0.0',
};

test('research URLs support web and native sharing', () => {
  assert.equal(
    stockResearchUrl('2454', 'https://app.jasic.tw/'),
    'https://app.jasic.tw/?stock=2454',
  );
  assert.equal(aiCheckResearchUrl('2330'), 'jasic://ai-check/2330');
});

test('war room share includes audit fields and disclaimer', () => {
  const text = warRoomShareText(stock, stockResearchUrl('2454'));
  assert.match(text, /資料時間：2026-06-20/);
  assert.match(text, /規則版本：demo-1.0.0/);
  assert.match(text, /不保證獲利/);
});

test('AI Check share excludes private position inputs', () => {
  const text = aiCheckShareText('2330', aiResult, aiCheckResearchUrl('2330'));
  assert.match(text, /觀望/);
  assert.match(text, /規則版本：demo-1.0.0/);
  assert.doesNotMatch(text, /成本|張數|980|1000/);
});
