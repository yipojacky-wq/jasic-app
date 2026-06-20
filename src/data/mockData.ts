import type { MarketIndicator, StockCandidate } from '../types';

export const marketIndicators: MarketIndicator[] = [
  { label: '全球趨勢', value: '偏多', trend: 'Nasdaq 站上季線', state: 'positive' },
  { label: '市場波動', value: '18.6', trend: 'VIX 低檔回升', state: 'neutral' },
  { label: '美元資金', value: '中性', trend: 'USD/TWD 32.41', state: 'neutral' },
  { label: '資金成本', value: '4.31%', trend: '美債 10Y +4bp', state: 'negative' },
  { label: '台灣景氣', value: '綠燈', trend: '出口年增 +8.2%', state: 'positive' },
];

export const candidates: StockCandidate[] = [
  demoCandidate(1, '2330', '台積電', '半導體', 88, 3.2, 'green', 'trend', '中', 78),
  demoCandidate(2, '2454', '聯發科', 'IC 設計', 84, 1.8, 'green', 'accumulation', '中', 74),
  demoCandidate(3, '2382', '廣達', 'AI 伺服器', 81, 4.1, 'green', 'breakout', '中', 71),
  demoCandidate(4, '2308', '台達電', '電源管理', 78, -0.6, 'yellow', 'reversal', '低', 76),
  demoCandidate(5, '2881', '富邦金', '金融', 75, 1.1, 'yellow', 'accumulation', '低', 72),
  demoCandidate(6, '3017', '奇鋐', '散熱', 73, 5.4, 'yellow', 'breakout', '高', 61),
];

function demoCandidate(
  rank: number,
  symbol: string,
  name: string,
  industry: string,
  score: number,
  change: number,
  signal: StockCandidate['signal'],
  category: string,
  risk: StockCandidate['risk'],
  confidence: number,
): StockCandidate {
  return {
    rank,
    symbol,
    name,
    industry,
    score,
    change,
    signal,
    category,
    risk,
    confidence,
    layerResults: {
      market: { status: 'pass', score: 76 },
      institution: {
        status: category === 'reversal' ? 'caution' : 'pass',
        score: category === 'accumulation' ? 82 : 64,
      },
      technicalRisk: {
        status: risk === '高' ? 'caution' : 'pass',
        technicalScore: category === 'breakout' ? 86 : 78,
        riskScore: risk === '高' ? 74 : risk === '中' ? 52 : 28,
      },
    },
    rankReasons: [
      `綜合分數 ${score}`,
      category === 'accumulation' ? '法人流向相對強' : '技術趨勢維持正向',
      risk === '高' ? '波動偏高需控制部位' : '風險仍在可研究區間',
    ],
    riskFlags: risk === '高' ? ['high_volatility'] : [],
    dataAsOf: '2026-06-20T16:30:00+08:00',
    ruleVersion: 'demo-1.0.0',
  };
}

export const reports = [
  { id: 'demo-daily', type: 'Daily', title: '每日市場戰情', date: '2026.06.20', summary: '風險偏好中性偏多，留意美債殖利率回升。' },
  { id: 'demo-weekly', type: 'Weekly', title: '核心池週報', date: '2026 W25', summary: '半導體與 AI 伺服器維持相對強勢。' },
  { id: 'demo-stock', type: 'War Room', title: '台積電個股戰情室', date: '2026.06.20', summary: '趨勢完整，籌碼偏多，追價風險中等。' },
  { id: 'demo-risk', type: 'Risk', title: '風險警示報告', date: '2026.06.20', summary: 'VIX 轉折與匯率波動列為本週主要風險。' },
];
