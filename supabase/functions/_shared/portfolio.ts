export interface PortfolioCalculationInput {
  id: string;
  symbol: string;
  name: string;
  averageCost: number;
  quantityShares: number;
  currentPrice?: number | null;
  priceAsOf?: string | null;
  score?: number | null;
  riskScore?: number | null;
  signal?: 'green' | 'yellow' | 'red' | null;
}

export function calculatePortfolioSummary(
  input: PortfolioCalculationInput[],
) {
  const positions = input.map((position) => {
    const costBasis = position.averageCost * position.quantityShares;
    const hasPrice =
      Number.isFinite(position.currentPrice) &&
      Number(position.currentPrice) > 0;
    const marketValue = hasPrice
      ? Number(position.currentPrice) * position.quantityShares
      : null;
    const unrealizedPnl =
      marketValue === null ? null : marketValue - costBasis;
    const returnPct =
      unrealizedPnl === null || costBasis <= 0
        ? null
        : (unrealizedPnl / costBasis) * 100;
    return {
      ...position,
      costBasis: round(costBasis),
      marketValue: marketValue === null ? null : round(marketValue),
      unrealizedPnl: unrealizedPnl === null ? null : round(unrealizedPnl),
      returnPct: returnPct === null ? null : round(returnPct),
      concentrationPct: 0,
      riskLabel: riskLabel(Number(position.riskScore ?? 50)),
    };
  });

  const priced = positions.filter(
    (position) => position.marketValue !== null,
  );
  const totalMarketValue = priced.reduce(
    (sum, position) => sum + Number(position.marketValue),
    0,
  );
  const totalCostBasis = priced.reduce(
    (sum, position) => sum + position.costBasis,
    0,
  );
  const totalUnrealizedPnl = totalMarketValue - totalCostBasis;

  for (const position of positions) {
    position.concentrationPct =
      position.marketValue === null || totalMarketValue <= 0
        ? 0
        : round((position.marketValue / totalMarketValue) * 100);
  }

  const largest = [...positions].sort(
    (a, b) => b.concentrationPct - a.concentrationPct,
  )[0];
  const weightedRiskScore =
    totalMarketValue <= 0
      ? 0
      : round(
          positions.reduce(
            (sum, position) =>
              sum +
              (position.marketValue ?? 0) *
                Number(position.riskScore ?? 50),
            0,
          ) / totalMarketValue,
        );
  const highRiskCount = positions.filter(
    (position) =>
      Number(position.riskScore ?? 50) >= 70 ||
      position.signal === 'red',
  ).length;
  const missingPriceCount = positions.length - priced.length;
  const alerts: string[] = [];

  if (largest?.concentrationPct >= 50) {
    alerts.push(
      `${largest.symbol} 佔可估值持倉 ${largest.concentrationPct.toFixed(1)}%，集中度偏高。`,
    );
  } else if (largest?.concentrationPct >= 35) {
    alerts.push(
      `${largest.symbol} 佔可估值持倉 ${largest.concentrationPct.toFixed(1)}%，請留意集中風險。`,
    );
  }
  if (highRiskCount > 0) {
    alerts.push(`${highRiskCount} 檔持倉目前為高風險或紅燈。`);
  }
  if (missingPriceCount > 0) {
    alerts.push(`${missingPriceCount} 檔持倉缺少有效收盤價，未納入估值。`);
  }
  if (!alerts.length && positions.length) {
    alerts.push('目前未偵測到高集中或紅燈持倉，仍需持續追蹤資料變化。');
  }

  return {
    totalCostBasis: round(totalCostBasis),
    totalMarketValue: round(totalMarketValue),
    totalUnrealizedPnl: round(totalUnrealizedPnl),
    totalReturnPct:
      totalCostBasis > 0
        ? round((totalUnrealizedPnl / totalCostBasis) * 100)
        : 0,
    weightedRiskScore,
    highRiskCount,
    missingPriceCount,
    largestPositionSymbol: largest?.symbol ?? null,
    largestConcentrationPct: largest?.concentrationPct ?? 0,
    alerts,
    positions,
  };
}

function riskLabel(score: number) {
  return score >= 70 ? '高' : score >= 40 ? '中' : '低';
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
