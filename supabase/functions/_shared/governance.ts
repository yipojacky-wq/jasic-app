export function dataHealthStatus(
  ageHours: number,
  runStatus?: string,
): 'healthy' | 'warning' | 'stale' | 'missing' {
  if (!Number.isFinite(ageHours)) return 'missing';
  if (runStatus === 'failed') return 'stale';
  if (runStatus === 'partial') return 'warning';
  if (ageHours <= 48) return 'healthy';
  if (ageHours <= 96) return 'warning';
  return 'stale';
}

export function dataHealthMessage(
  status: 'healthy' | 'warning' | 'stale' | 'missing',
) {
  if (status === 'healthy') return '資料在盤後研究時效內';
  if (status === 'warning') return '資料可能受週末、假日或延遲發布影響';
  if (status === 'stale') return '資料已超過研究時效，請勿產生積極結論';
  return '尚未取得資料';
}
