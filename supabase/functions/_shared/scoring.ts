export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function computeMarketMetrics(
  aboveMa20Count: number,
  stockCount: number,
  averageVolatility: number,
) {
  const breadth = stockCount > 0 ? aboveMa20Count / stockCount : 0;
  const score = clamp(30 + breadth * 60, 0, 100);
  const risk = clamp(averageVolatility * 1500, 10, 95);
  const signal = score >= 65 ? 'green' : score >= 45 ? 'yellow' : 'red';
  const regime =
    risk >= 65
      ? 'high_volatility'
      : score >= 65
        ? 'risk_on'
        : score >= 45
          ? 'neutral_rotation'
          : 'risk_off';
  return { breadth, score, risk, signal, regime };
}

export function computeStockScore(input: {
  marketScore: number;
  close: number;
  ma20: number;
  return5d: number;
  institutionNet5d: number;
  averageVolume20: number;
  volatility20d: number;
}) {
  const technical = clamp(
    50 + ((input.close / input.ma20) - 1) * 400 + input.return5d * 200,
    0,
    100,
  );
  const institution = clamp(
    50 +
      (input.institutionNet5d / Math.max(input.averageVolume20 * 5, 1)) * 50,
    0,
    100,
  );
  const chip = 50;
  const oi = 50;
  const total =
    input.marketScore * 0.25 +
    institution * 0.25 +
    technical * 0.35 +
    chip * 0.1 +
    oi * 0.05;
  const risk = clamp(input.volatility20d * 1800, 10, 95);
  const signal = total >= 72 ? 'green' : total >= 52 ? 'yellow' : 'red';
  return {
    market: round(input.marketScore),
    institution: round(institution),
    technical: round(technical),
    chip,
    oi,
    total: round(total),
    risk: round(risk),
    signal,
  };
}

export function categoryFor(score: {
  technical: number;
  institution: number;
}) {
  if (score.technical >= 75 && score.institution >= 60) return 'trend';
  if (score.institution >= 70) return 'accumulation';
  if (score.technical >= 70) return 'breakout';
  return 'reversal';
}
