export function deriveLevels(
  prices: Array<{ low: number | string; high: number | string }>,
) {
  if (!prices.length) return { support: [], resistance: [] };
  const lows = prices
    .map((price) => Number(price.low))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const highs = prices
    .map((price) => Number(price.high))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return {
    support: uniqueRounded([percentile(lows, 0.25), percentile(lows, 0.1)]),
    resistance: uniqueRounded([percentile(highs, 0.75), percentile(highs, 0.9)]),
  };
}

export function warRoomConclusion(
  score: number,
  risk: number,
  confidence: number,
) {
  if (confidence < 55) {
    return {
      action: '觀望 · 資料不足',
      summary: '部分核心資料尚未達可信門檻，暫不提供積極方向。請等待資料更新後重新檢核。',
    };
  }
  if (risk >= 75 || score < 50) {
    return {
      action: '減碼／停損檢核',
      summary: '風險或綜合分數已進入防守區，應優先依個人風險預算檢查減碼與停損條件。',
    };
  }
  if (score >= 75 && risk < 65) {
    return {
      action: '續抱 · 不追價',
      summary: '目前綜合條件偏正向，既有部位可依支撐管理風險；新部位等待拉回或突破確認。',
    };
  }
  return {
    action: '觀望 · 等待確認',
    summary: '市場、法人或技術訊號尚未完全一致，建議等待下一次分數與燈號確認。',
  };
}

function percentile(values: number[], ratio: number) {
  if (!values.length) return 0;
  return values[Math.min(Math.floor((values.length - 1) * ratio), values.length - 1)];
}

function uniqueRounded(values: number[]) {
  return [
    ...new Set(
      values
        .filter((value) => value > 0)
        .map((value) => Math.round(value * 100) / 100),
    ),
  ];
}
