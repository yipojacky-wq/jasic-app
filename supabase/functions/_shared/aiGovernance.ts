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
      `JASIC Score 為 ${Math.round(input.stockTotalScore)}，風險分數為 ${Math.round(input.stockRiskScore)}，系統依目前規則進行研究檢核。`,
      `市場狀態為「${marketRegimeLabel(input.marketRegime)}」，資料信心分數為 ${Math.round(input.stockConfidenceScore)}。`,
    ],
    risks: [
      '市場資料、分數規則與資料新鮮度可能在本次檢核後改變。',
      input.stockRiskScore >= 70
        ? '風險分數偏高，部位規模應維持保守。'
        : '風險分數未達極端，但仍需監控下行情境。',
    ],
    suggestions: [
      '請把本結果作為研究檢核清單，並與你的原始交易計畫交叉確認。',
      '若有新行情、財報或重大總經事件發布，請重新檢核。',
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
    ADD: '規則檢核允許保守評估加碼，但必須受風險控管約束。',
    HOLD: '規則檢核偏向續抱，同時持續觀察分數與風險變化。',
    WAIT: '規則檢核偏向觀望，等待資料品質、信心或市場條件改善。',
    REDUCE: '若目前部位已超過你的風險計畫，規則檢核偏向減碼。',
    STOP_LOSS: '規則檢核偏向尊重預先設定的停損與風險控制計畫。',
  };
  return labels[action];
}

function marketRegimeLabel(value?: string | null) {
  return {
    risk_on: '風險偏多',
    neutral_rotation: '中性輪動',
    high_volatility: '高波動',
    risk_off: '風險偏空',
  }[value ?? ''] ?? '未知';
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
