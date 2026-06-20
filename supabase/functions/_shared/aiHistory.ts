export function normalizeStringList(value: unknown, limit = 5) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function normalizeAiHistoryResult(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== 'object') return null;
  const result = raw as Record<string, unknown>;
  return {
    action: String(result.action ?? 'WAIT'),
    conclusion: String(result.conclusion ?? ''),
    reasons: normalizeStringList(result.reasons),
    risks: normalizeStringList(result.risks),
    suggestions: normalizeStringList(result.suggestions),
    confidence: clamp(Number(result.confidence ?? 0), 0, 100),
    modelIdentifier: String(result.model_identifier ?? 'unknown'),
    promptVersion: String(result.prompt_version ?? 'unknown'),
    ruleVersion: String(result.rule_version ?? 'unknown'),
    createdAt: String(result.created_at ?? ''),
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
