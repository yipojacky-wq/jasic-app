import type { AiCheckResult, StockWarRoomData } from '../types';

const disclaimer =
  'JASIC 僅提供研究與風險檢核，不保證獲利，不提供自動下單或代客交易服務。';

export function stockResearchUrl(symbol: string, webOrigin?: string) {
  return webOrigin
    ? `${trimTrailingSlash(webOrigin)}/?stock=${encodeURIComponent(symbol)}`
    : `jasic://stock/${encodeURIComponent(symbol)}`;
}

export function aiCheckResearchUrl(symbol: string, webOrigin?: string) {
  return webOrigin
    ? `${trimTrailingSlash(webOrigin)}/?tab=ai-check&symbol=${encodeURIComponent(symbol)}`
    : `jasic://ai-check/${encodeURIComponent(symbol)}`;
}

export function warRoomShareText(
  stock: StockWarRoomData,
  url: string,
) {
  return [
    `JASIC Stock War Room：${stock.name} ${stock.symbol}`,
    `結論：${stock.conclusion.action}`,
    `JASIC Score：${stock.score.toFixed(1)}，信心度 ${stock.confidence.toFixed(0)}%`,
    `摘要：${stock.conclusion.summary}`,
    listLine('主要風險', stock.evidence.risk),
    `資料時間：${stock.dataAsOf}`,
    `規則版本：${stock.ruleVersion}`,
    `研究連結：${url}`,
    disclaimer,
  ].join('\n');
}

export function aiCheckShareText(
  symbol: string,
  result: AiCheckResult,
  url: string,
) {
  return [
    `JASIC AI Check：${symbol}`,
    `結論：${actionLabel(result.action)}，信心度 ${result.confidence.toFixed(0)}%`,
    result.conclusion,
    listLine('原因', result.reasons),
    listLine('風險', result.risks),
    listLine('建議', result.suggestions),
    result.dataAsOf ? `資料時間：${result.dataAsOf}` : null,
    result.ruleVersion ? `規則版本：${result.ruleVersion}` : null,
    result.modelIdentifier ? `模型：${result.modelIdentifier}` : null,
    result.promptVersion ? `Prompt 版本：${result.promptVersion}` : null,
    result.responseSchemaVersion
      ? `Schema 版本：${result.responseSchemaVersion}`
      : null,
    result.allowedActions?.length
      ? `允許動作：${result.allowedActions.join(', ')}`
      : null,
    `重新檢視：${url}`,
    disclaimer,
  ]
    .filter(Boolean)
    .join('\n');
}

function listLine(label: string, items: string[]) {
  return `${label}：${items.slice(0, 3).join('、')}`;
}

function actionLabel(action: AiCheckResult['action']) {
  return {
    ADD: '加碼',
    HOLD: '續抱',
    WAIT: '觀望',
    REDUCE: '減碼',
    STOP_LOSS: '停損',
  }[action];
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}
