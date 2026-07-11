export const aiCheckPromptVersion = 'ai-check-1.1.0' as const;
export const aiCheckResponseSchemaVersion = 'ai-check-response-1.0.0' as const;

export const aiCheckActions = [
  'ADD',
  'HOLD',
  'WAIT',
  'REDUCE',
  'STOP_LOSS',
] as const;

export type AiCheckAction = (typeof aiCheckActions)[number];

export interface AiCheckGovernanceContext {
  marketRegime?: string | null;
  stockRiskScore: number;
  stockTotalScore: number;
  stockConfidenceScore: number;
  riskProfile: string;
}

export interface AiCheckGovernanceAudit {
  promptVersion: string;
  responseSchemaVersion: string;
  ruleVersion: string;
  modelIdentifier: string;
  dataAsOf: string;
  allowedActions: AiCheckAction[];
}

export interface AiCheckStructuredResult {
  action: AiCheckAction;
  conclusion: string;
  reasons: string[];
  risks: string[];
  suggestions: string[];
  confidence: number;
}

export interface RuleBasedAiCheckInput {
  allowedActions: AiCheckAction[];
  marketRegime?: string | null;
  stockRiskScore: number;
  stockTotalScore: number;
  stockConfidenceScore: number;
  riskProfile: string;
  dataAsOf: string;
}

export const aiCheckResultSchema = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: aiCheckActions },
    conclusion: { type: 'string' },
    reasons: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 5 },
    risks: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
    suggestions: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
    confidence: { type: 'number', minimum: 0, maximum: 100 },
  },
  required: ['action', 'conclusion', 'reasons', 'risks', 'suggestions', 'confidence'],
  additionalProperties: false,
} as const;

const prohibitedProfitGuaranteePatterns = [
  /保證獲利/,
  /穩賺/,
  /必賺/,
  /一定會漲/,
  /guaranteed profit/i,
  /risk[-\s]?free/i,
];

const prohibitedTradingAutomationPatterns = [
  /自動下單/,
  /直接下單/,
  /代為交易/,
  /automatic trading/i,
  /place the order/i,
];

export function determineAllowedAiCheckActions(
  context: AiCheckGovernanceContext,
): AiCheckAction[] {
  if (
    context.marketRegime === 'risk_off' ||
    context.stockRiskScore >= 75 ||
    context.stockConfidenceScore < 55
  ) {
    return ['WAIT', 'REDUCE', 'STOP_LOSS'];
  }
  if (
    context.riskProfile === 'conservative' ||
    context.stockTotalScore < 75
  ) {
    return ['HOLD', 'WAIT', 'REDUCE'];
  }
  return ['ADD', 'HOLD', 'WAIT', 'REDUCE'];
}

export function buildAiCheckSystemPrompt(allowedActions: AiCheckAction[]) {
  return [
    'You are JASIC AI Check, a Taiwan stock decision-support assistant.',
    'Return only the requested JSON schema.',
    `The action must be one of: ${allowedActions.join(', ')}.`,
    'Your output must include conclusion, reasons, risks, and suggestions.',
    'Do not guarantee profit.',
    'Do not imply risk-free returns.',
    'Do not place trades, automate trades, or tell the user that an order has been sent.',
    'Use conservative wording when data freshness, confidence, market regime, or risk score is unfavorable.',
  ].join('\n');
}

export function buildAiCheckGovernanceAudit(input: {
  allowedActions: AiCheckAction[];
  dataAsOf: string;
  modelIdentifier: string;
  ruleVersion: string;
}): AiCheckGovernanceAudit {
  return {
    promptVersion: aiCheckPromptVersion,
    responseSchemaVersion: aiCheckResponseSchemaVersion,
    ruleVersion: input.ruleVersion,
    modelIdentifier: input.modelIdentifier,
    dataAsOf: input.dataAsOf,
    allowedActions: input.allowedActions,
  };
}

export function buildRuleBasedAiCheckResult(
  input: RuleBasedAiCheckInput,
): AiCheckStructuredResult {
  const defensive =
    input.marketRegime === 'risk_off' ||
    input.stockRiskScore >= 75 ||
    input.stockConfidenceScore < 55;
  const positive =
    input.stockTotalScore >= 80 &&
    input.stockRiskScore < 60 &&
    input.stockConfidenceScore >= 65 &&
    input.allowedActions.includes('ADD') &&
    input.riskProfile !== 'conservative';

  const action: AiCheckAction = defensive
    ? firstAllowed(input.allowedActions, ['WAIT', 'REDUCE', 'STOP_LOSS'])
    : positive
      ? firstAllowed(input.allowedActions, ['ADD', 'HOLD', 'WAIT'])
      : firstAllowed(input.allowedActions, ['HOLD', 'WAIT', 'REDUCE']);

  const confidence = Math.max(
    35,
    Math.min(88, Math.round((input.stockConfidenceScore + input.stockTotalScore) / 2)),
  );

  return {
    action,
    conclusion: ruleBasedConclusion(action),
    reasons: [
      `Stock score ${Math.round(input.stockTotalScore)} and risk score ${Math.round(input.stockRiskScore)} are evaluated by JASIC rule-based staging logic.`,
      `Market regime is ${input.marketRegime ?? 'unknown'} and confidence score is ${Math.round(input.stockConfidenceScore)}.`,
    ],
    risks: [
      'Market data, score rules, and source freshness can change after this check.',
      input.stockRiskScore >= 70
        ? 'Risk score is elevated, so position sizing should remain conservative.'
        : 'Risk score is not extreme, but downside scenarios still need monitoring.',
    ],
    suggestions: [
      'Use this result as a research checklist and compare it with your own plan.',
      'Re-check after new market data, earnings, or major macro events are released.',
    ],
    confidence,
  };
}

export function validateAiCheckStructuredResult(
  value: unknown,
  allowedActions: AiCheckAction[],
):
  | { ok: true; value: AiCheckStructuredResult }
  | { ok: false; reason: string } {
  if (!value || typeof value !== 'object') {
    return { ok: false, reason: 'AI output must be an object.' };
  }
  const record = value as Record<string, unknown>;
  if (!isAiCheckAction(record.action)) {
    return { ok: false, reason: 'AI action is not recognized.' };
  }
  if (!allowedActions.includes(record.action)) {
    return { ok: false, reason: 'AI action violated rule guardrail.' };
  }
  if (!isNonEmptyString(record.conclusion)) {
    return { ok: false, reason: 'AI conclusion is required.' };
  }
  const reasons = stringList(record.reasons, 2, 5);
  const risks = stringList(record.risks, 1, 5);
  const suggestions = stringList(record.suggestions, 1, 5);
  if (!reasons) return { ok: false, reason: 'AI reasons must contain 2 to 5 items.' };
  if (!risks) return { ok: false, reason: 'AI risks must contain 1 to 5 items.' };
  if (!suggestions) return { ok: false, reason: 'AI suggestions must contain 1 to 5 items.' };
  if (typeof record.confidence !== 'number' || record.confidence < 0 || record.confidence > 100) {
    return { ok: false, reason: 'AI confidence must be between 0 and 100.' };
  }

  const combinedText = [
    record.conclusion,
    ...reasons,
    ...risks,
    ...suggestions,
  ].join('\n');
  if (containsProhibitedAiCheckClaim(combinedText)) {
    return { ok: false, reason: 'AI output contains a prohibited claim.' };
  }

  return {
    ok: true,
    value: {
      action: record.action,
      conclusion: record.conclusion,
      reasons,
      risks,
      suggestions,
      confidence: record.confidence,
    },
  };
}

export function containsProhibitedAiCheckClaim(text: string) {
  return [...prohibitedProfitGuaranteePatterns, ...prohibitedTradingAutomationPatterns]
    .some((pattern) => pattern.test(text));
}

function isAiCheckAction(value: unknown): value is AiCheckAction {
  return aiCheckActions.includes(value as AiCheckAction);
}

function firstAllowed(
  allowedActions: AiCheckAction[],
  preferences: AiCheckAction[],
): AiCheckAction {
  return preferences.find((action) => allowedActions.includes(action)) ?? allowedActions[0] ?? 'WAIT';
}

function ruleBasedConclusion(action: AiCheckAction) {
  const labels: Record<AiCheckAction, string> = {
    ADD: 'Rule-based staging check allows a cautious add-on review, subject to risk controls.',
    HOLD: 'Rule-based staging check favors holding while monitoring score and risk changes.',
    WAIT: 'Rule-based staging check favors waiting until data quality, confidence, or market conditions improve.',
    REDUCE: 'Rule-based staging check favors reducing exposure if the position exceeds your risk plan.',
    STOP_LOSS: 'Rule-based staging check favors respecting the predefined loss-control plan.',
  };
  return labels[action];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringList(value: unknown, minItems: number, maxItems: number) {
  if (!Array.isArray(value)) return null;
  if (value.length < minItems || value.length > maxItems) return null;
  if (!value.every(isNonEmptyString)) return null;
  return value;
}
