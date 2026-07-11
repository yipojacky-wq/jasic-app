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
  conclusion: { action: '續抱', summary: '趨勢仍具支撐，但須留意波動。' },
  dimensions: [],
  evidence: {
    institutional: [],
    oi: [],
    technical: [],
    risk: ['短線波動升高'],
  },
  levels: { support: [960], resistance: [1050] },
};

const aiResult: AiCheckResult = {
  action: 'WAIT',
  conclusion: '目前訊號不完整，建議先觀望。',
  reasons: ['市場資料仍需確認'],
  risks: ['資料可能延遲'],
  suggestions: ['等待下一批資料更新'],
  confidence: 68,
  dataAsOf: '2026-06-20T16:30:00+08:00',
  ruleVersion: 'demo-1.0.0',
  modelIdentifier: 'demo-model',
  promptVersion: 'ai-check-1.1.0',
  responseSchemaVersion: 'ai-check-response-1.0.0',
  allowedActions: ['HOLD', 'WAIT', 'REDUCE'],
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

test('AI Check share includes governance audit but excludes private position inputs', () => {
  const text = aiCheckShareText('2330', aiResult, aiCheckResearchUrl('2330'));
  assert.match(text, /結論：觀望/);
  assert.match(text, /規則版本：demo-1.0.0/);
  assert.match(text, /Prompt 版本：ai-check-1.1.0/);
  assert.match(text, /Schema 版本：ai-check-response-1.0.0/);
  assert.match(text, /允許動作：HOLD, WAIT, REDUCE/);
  assert.doesNotMatch(text, /成本|張數|980|1000/);
});
