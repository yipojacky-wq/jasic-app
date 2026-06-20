export type AlertRuleType = 'score_change' | 'signal_change' | 'risk_level';

export function normalizeAlertThreshold(
  ruleType: AlertRuleType,
  value: unknown,
) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return ruleType === 'score_change' ? 5 : 70;
  }
  if (ruleType === 'score_change') {
    return clamp(Math.round(numeric * 10) / 10, 1, 25);
  }
  if (ruleType === 'risk_level') {
    return clamp(Math.round(numeric), 40, 95);
  }
  return null;
}

export function alertRuleLabel(ruleType: AlertRuleType) {
  return {
    score_change: '分數變化',
    signal_change: '燈號變化',
    risk_level: '風險升高',
  }[ruleType];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
