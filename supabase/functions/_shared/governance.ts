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

export function ingestionQualityRate(
  recordsReceived: number | null | undefined,
  recordsValid: number | null | undefined,
) {
  const received = Number(recordsReceived ?? 0);
  const valid = Number(recordsValid ?? 0);
  if (!Number.isFinite(received) || !Number.isFinite(valid) || received <= 0) {
    return null;
  }
  return Math.max(0, Math.min(100, (valid / received) * 100));
}

export function dataHealthAction(
  status: 'healthy' | 'warning' | 'stale' | 'missing',
  runStatus?: string | null,
) {
  if (runStatus === 'failed') {
    return '檢查來源端點、憑證與排程紀錄後重新匯入。';
  }
  if (runStatus === 'partial') {
    return '檢查拒絕資料與欄位格式，再補跑缺漏資料。';
  }
  if (status === 'missing') {
    return '完成首次資料匯入，確認後再啟用研究結論。';
  }
  if (status === 'stale') return '更新資料後重新計算分數與報告。';
  if (status === 'warning') return '確認下一次排程是否按預期完成。';
  return '目前無須處理，持續監測更新排程。';
}
