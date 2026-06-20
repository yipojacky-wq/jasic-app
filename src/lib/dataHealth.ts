import type { DataHealthItem } from '../types';

export type DataHealthFilter = 'all' | 'attention' | 'healthy';

export function dataHealthSummary(items: DataHealthItem[]) {
  const healthy = items.filter((item) => item.status === 'healthy').length;
  const warning = items.filter((item) => item.status === 'warning').length;
  const blocking = items.filter(
    (item) => item.status === 'stale' || item.status === 'missing',
  ).length;
  return {
    total: items.length,
    healthy,
    warning,
    blocking,
    researchReady: items.length > 0 && blocking === 0,
  };
}

export function filterDataHealth(
  items: DataHealthItem[],
  filter: DataHealthFilter,
) {
  if (filter === 'healthy') {
    return items.filter((item) => item.status === 'healthy');
  }
  if (filter === 'attention') {
    return items.filter((item) => item.status !== 'healthy');
  }
  return items;
}

export function dataHealthAction(item: DataHealthItem) {
  if (item.action) return item.action;
  if (item.runStatus === 'failed') return '檢查來源端點、憑證與排程紀錄後重新匯入。';
  if (item.runStatus === 'partial') return '檢查拒絕資料與欄位格式，再補跑缺漏資料。';
  if (item.status === 'missing') return '完成首次資料匯入，確認後再啟用研究結論。';
  if (item.status === 'stale') return '更新資料後重新計算分數與報告。';
  if (item.status === 'warning') return '確認下一次排程是否按預期完成。';
  return '目前無須處理，持續監測更新排程。';
}

export function formatQualityRate(item: DataHealthItem) {
  if (item.qualityRate === null || item.qualityRate === undefined) return '—';
  return `${item.qualityRate.toFixed(1)}%`;
}
