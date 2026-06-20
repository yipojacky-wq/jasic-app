import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizePersistedResearchState,
  normalizeResearchSymbol,
  parseResearchLocation,
  serializeResearchLocation,
} from '../src/lib/researchNavigation';

test('research navigation parses web tabs and stock deep links', () => {
  assert.deepEqual(
    parseResearchLocation('https://app.jasic.tw/?tab=settings'),
    { activeTab: 'settings', selectedSymbol: null },
  );
  assert.deepEqual(
    parseResearchLocation('https://app.jasic.tw/?stock=2330'),
    { activeTab: 'discovery', selectedSymbol: '2330' },
  );
});

test('research navigation parses native scheme routes', () => {
  assert.deepEqual(parseResearchLocation('jasic://stock/2454'), {
    activeTab: 'discovery',
    selectedSymbol: '2454',
  });
  assert.deepEqual(parseResearchLocation('jasic://ai-check/2308'), {
    activeTab: 'ai-check',
    selectedSymbol: null,
    aiCheckSymbol: '2308',
  });
});

test('research navigation rejects malformed symbols and unknown routes', () => {
  assert.equal(normalizeResearchSymbol(' 2330 '), '2330');
  assert.equal(normalizeResearchSymbol('DROP TABLE'), null);
  assert.equal(parseResearchLocation('https://app.jasic.tw/?stock=abc'), null);
});

test('research location serializes without leaking unrelated state', () => {
  assert.equal(
    serializeResearchLocation({
      activeTab: 'ai-check',
      selectedSymbol: null,
      aiCheckSymbol: '2330',
    }),
    '?tab=ai-check&symbol=2330',
  );
  assert.equal(
    serializeResearchLocation({
      activeTab: 'reports',
      selectedSymbol: '2454',
      aiCheckSymbol: '2330',
    }),
    '?stock=2454',
  );
});

test('persisted research state rejects corrupt tabs and symbols', () => {
  assert.deepEqual(
    normalizePersistedResearchState({
      activeTab: 'admin',
      selectedSymbol: '<script>',
      aiCheckSymbol: '2454',
      watchlist: ['2330', '2330', 'bad', 1234, '2308'],
      accessToken: 'must-not-survive',
    }),
    {
      activeTab: 'dashboard',
      selectedSymbol: null,
      aiCheckSymbol: '2454',
      watchlist: ['2330', '2308'],
    },
  );
});
