export const aiCheckLimits = {
  minimumCost: 0.01,
  maximumCost: 1_000_000,
  minimumLots: 0.001,
  maximumLots: 10_000,
  maximumCostBasis: 10_000_000_000,
} as const;

export type AiCheckHorizon = 'short' | 'swing' | 'medium' | 'long';
export type AiCheckRiskProfile =
  | 'conservative'
  | 'balanced'
  | 'aggressive'
  | 'growth';

export interface NormalizedAiCheckInput {
  symbol: string;
  cost: number;
  lots: number;
  quantityShares: number;
  costBasis: number;
  horizon: AiCheckHorizon;
  riskProfile: AiCheckRiskProfile;
}

export type AiCheckInputErrors = Partial<
  Record<
    'symbol' | 'cost' | 'lots' | 'horizon' | 'riskProfile' | 'costBasis',
    string
  >
>;

export function validateAiCheckInput(input: unknown):
  | { ok: true; value: NormalizedAiCheckInput; errors: AiCheckInputErrors }
  | { ok: false; value: null; errors: AiCheckInputErrors } {
  const record =
    input && typeof input === 'object'
      ? (input as Record<string, unknown>)
      : {};
  const errors: AiCheckInputErrors = {};
  const symbol = String(record.symbol ?? '').trim();
  const cost = toFiniteNumber(record.cost);
  const lots = toFiniteNumber(record.lots);
  const horizon = normalizeHorizon(record.horizon);
  const riskProfile = normalizeRiskProfile(record.riskProfile);

  if (!/^\d{4}$/.test(symbol)) {
    errors.symbol = '請輸入四碼台股普通股代號。';
  }
  if (
    cost === null ||
    cost < aiCheckLimits.minimumCost ||
    cost > aiCheckLimits.maximumCost
  ) {
    errors.cost = `成本須介於 ${aiCheckLimits.minimumCost} 至 ${aiCheckLimits.maximumCost.toLocaleString()} 元。`;
  }
  if (
    lots === null ||
    lots < aiCheckLimits.minimumLots ||
    lots > aiCheckLimits.maximumLots
  ) {
    errors.lots = `張數須介於 ${aiCheckLimits.minimumLots} 至 ${aiCheckLimits.maximumLots.toLocaleString()} 張。`;
  }
  if (!horizon) errors.horizon = '請選擇有效投資期間。';
  if (!riskProfile) errors.riskProfile = '請選擇有效風險偏好。';

  const quantityShares = lots === null ? 0 : Math.round(lots * 1000);
  const costBasis =
    cost === null ? 0 : Math.round(cost * quantityShares * 100) / 100;
  if (costBasis > aiCheckLimits.maximumCostBasis) {
    errors.costBasis = '投入成本估算超過系統風險上限，請確認成本與張數。';
  }

  if (Object.keys(errors).length || cost === null || lots === null || !horizon || !riskProfile) {
    return { ok: false, value: null, errors };
  }
  return {
    ok: true,
    errors: {},
    value: {
      symbol,
      cost,
      lots,
      quantityShares,
      costBasis,
      horizon,
      riskProfile,
    },
  };
}

function toFiniteNumber(value: unknown) {
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeHorizon(value: unknown): AiCheckHorizon | null {
  const map: Record<string, AiCheckHorizon> = {
    short: 'short',
    swing: 'swing',
    medium: 'medium',
    long: 'long',
    短線: 'short',
    波段: 'swing',
    中期: 'medium',
    長期: 'long',
  };
  return typeof value === 'string' ? map[value] ?? null : null;
}

function normalizeRiskProfile(value: unknown): AiCheckRiskProfile | null {
  return ['conservative', 'balanced', 'aggressive', 'growth'].includes(
    String(value),
  )
    ? (value as AiCheckRiskProfile)
    : null;
}
