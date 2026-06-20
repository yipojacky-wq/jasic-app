import type { MarketIndicator, StockCandidate } from '../types';

export const marketIndicators: MarketIndicator[] = [
  { label: '全球趨勢', value: '偏多', trend: 'Nasdaq 站上季線', state: 'positive' },
  { label: '市場波動', value: '18.6', trend: 'VIX 低檔回升', state: 'neutral' },
  { label: '美元資金', value: '中性', trend: 'USD/TWD 32.41', state: 'neutral' },
  { label: '資金成本', value: '4.31%', trend: '美債 10Y +4bp', state: 'negative' },
  { label: '台灣景氣', value: '綠燈', trend: '出口年增 +8.2%', state: 'positive' },
];

export const candidates: StockCandidate[] = [
  { symbol: '2330', name: '台積電', industry: '半導體', score: 88, change: 3.2, signal: 'green', category: '趨勢延續', risk: '中' },
  { symbol: '2454', name: '聯發科', industry: 'IC 設計', score: 84, change: 1.8, signal: 'green', category: '法人累積', risk: '中' },
  { symbol: '2382', name: '廣達', industry: 'AI 伺服器', score: 81, change: 4.1, signal: 'green', category: '突破', risk: '中' },
  { symbol: '2308', name: '台達電', industry: '電源管理', score: 78, change: -0.6, signal: 'yellow', category: '趨勢整理', risk: '低' },
  { symbol: '2881', name: '富邦金', industry: '金融', score: 75, change: 1.1, signal: 'yellow', category: '價值輪動', risk: '低' },
  { symbol: '3017', name: '奇鋐', industry: '散熱', score: 73, change: 5.4, signal: 'yellow', category: '高動能', risk: '高' },
];

export const reports = [
  { id: 'demo-daily', type: 'Daily', title: '每日市場戰情', date: '2026.06.20', summary: '風險偏好中性偏多，留意美債殖利率回升。' },
  { id: 'demo-weekly', type: 'Weekly', title: '核心池週報', date: '2026 W25', summary: '半導體與 AI 伺服器維持相對強勢。' },
  { id: 'demo-stock', type: 'War Room', title: '台積電個股戰情室', date: '2026.06.20', summary: '趨勢完整，籌碼偏多，追價風險中等。' },
  { id: 'demo-risk', type: 'Risk', title: '風險警示報告', date: '2026.06.20', summary: 'VIX 轉折與匯率波動列為本週主要風險。' },
];
