export function rocDateToIso(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 7) throw new Error(`Invalid ROC date: ${value}`);
  const year = Number(digits.slice(0, 3)) + 1911;
  return `${year}-${digits.slice(3, 5)}-${digits.slice(5, 7)}`;
}

export function numberValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value)
    .replace(/,/g, '')
    .replace(/[＋+]/g, '')
    .trim();
  if (!normalized || normalized === '--' || normalized === '---') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function integerValue(value: unknown): number {
  return Math.trunc(numberValue(value) ?? 0);
}

export function isCommonStockSymbol(symbol: string): boolean {
  return /^\d{4}$/.test(symbol);
}

export function chunks<T>(items: T[], size = 500): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}
