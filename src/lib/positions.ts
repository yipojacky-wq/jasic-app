import type { InvestmentHorizon } from '../types';

export const sharesPerTaiwanLot = 1000;

export function lotsToShares(lots: number) {
  return Math.round(lots * sharesPerTaiwanLot * 10000) / 10000;
}

export function sharesToLots(shares: number) {
  return Math.round((shares / sharesPerTaiwanLot) * 10000) / 10000;
}

export function horizonLabel(horizon: InvestmentHorizon) {
  return {
    short: '短線',
    swing: '波段',
    medium: '中期',
    long: '長期',
  }[horizon];
}

export function horizonFromLabel(label: string): InvestmentHorizon {
  return (
    {
      短線: 'short',
      波段: 'swing',
      中期: 'medium',
      長期: 'long',
    }[label] ?? 'medium'
  ) as InvestmentHorizon;
}
