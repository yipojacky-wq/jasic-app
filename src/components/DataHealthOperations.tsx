import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  dataHealthAction,
  dataHealthSummary,
  filterDataHealth,
  formatQualityRate,
  type DataHealthFilter,
} from '../lib/dataHealth';
import { colors } from '../theme';
import type { DataHealthItem } from '../types';
import { Badge, Card } from './ui';

const filters: Array<{ key: DataHealthFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'attention', label: '需要處理' },
  { key: 'healthy', label: '正常' },
];

export function DataHealthOperations({ items }: { items: DataHealthItem[] }) {
  const [filter, setFilter] = useState<DataHealthFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const summary = dataHealthSummary(items);
  const visibleItems = filterDataHealth(items, filter);

  return (
    <View style={styles.container}>
      <Card
        style={[
          styles.readinessCard,
          summary.researchReady ? styles.readyCard : styles.blockedCard,
        ]}
      >
        <View style={styles.readinessCopy}>
          <Text style={styles.readinessEyebrow}>RESEARCH READINESS</Text>
          <Text style={styles.readinessTitle}>
            {summary.researchReady ? '資料可供研究使用' : '研究輸出需要降級'}
          </Text>
          <Text style={styles.readinessNote}>
            {summary.researchReady
              ? '必要來源目前沒有過期或缺漏項目，仍須依各資料時間點解讀。'
              : `目前有 ${summary.blocking} 個阻斷項目；修復前不應產生積極 AI 結論。`}
          </Text>
        </View>
        <View style={styles.summaryGrid}>
          <SummaryMetric label="正常" value={summary.healthy} tone="positive" />
          <SummaryMetric label="注意" value={summary.warning} tone="warning" />
          <SummaryMetric label="阻斷" value={summary.blocking} tone="danger" />
        </View>
      </Card>

      <View style={styles.filterRow}>
        {filters.map((option) => (
          <Pressable
            accessibilityLabel={`資料健康篩選 ${option.label}`}
            key={option.key}
            onPress={() => setFilter(option.key)}
            style={[
              styles.filterButton,
              filter === option.key && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === option.key && styles.filterTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.healthGrid}>
        {visibleItems.map((item) => {
          const isExpanded = expanded === item.code;
          return (
            <Pressable
              accessibilityLabel={`${isExpanded ? '收合' : '展開'} ${item.label} 資料健康詳情`}
              key={item.code}
              onPress={() => setExpanded(isExpanded ? null : item.code)}
              style={styles.cardPressable}
            >
              <Card style={[styles.healthCard, isExpanded && styles.healthCardActive]}>
                <View style={styles.healthTop}>
                  <View style={styles.healthHeading}>
                    <Text style={styles.healthLabel}>{item.label}</Text>
                    <Text style={styles.healthCode}>{item.code}</Text>
                  </View>
                  <Badge tone={statusTone(item.status)}>
                    {statusLabel(item.status)}
                  </Badge>
                </View>
                <Text style={styles.healthMessage}>{item.message}</Text>
                <View style={styles.quickMetrics}>
                  <Metric label="資料時間" value={formatDate(item.dataAsOf)} />
                  <Metric
                    label="有效筆數"
                    value={(item.records ?? 0).toLocaleString()}
                  />
                  <Metric label="品質率" value={formatQualityRate(item)} />
                </View>
                {isExpanded ? (
                  <View style={styles.detail}>
                    <DetailRow label="資料提供者" value={item.provider ?? '內部衍生資料'} />
                    <DetailRow label="更新頻率" value={frequencyLabel(item.frequency)} />
                    <DetailRow label="最近執行" value={formatDateTime(item.lastRunAt)} />
                    <DetailRow label="執行狀態" value={runStatusLabel(item.runStatus)} />
                    <DetailRow
                      label="收到 / 拒絕"
                      value={`${(item.recordsReceived ?? 0).toLocaleString()} / ${(item.recordsRejected ?? 0).toLocaleString()}`}
                    />
                    {item.errorSummary ? (
                      <View style={styles.errorBox}>
                        <Text style={styles.errorLabel}>錯誤摘要</Text>
                        <Text style={styles.errorText}>{item.errorSummary}</Text>
                      </View>
                    ) : null}
                    <View style={styles.actionBox}>
                      <Text style={styles.actionLabel}>建議動作</Text>
                      <Text style={styles.actionText}>{dataHealthAction(item)}</Text>
                    </View>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'positive' | 'warning' | 'danger';
}) {
  const color = {
    positive: colors.green,
    warning: colors.amber,
    danger: colors.red,
  }[tone];
  return (
    <View style={styles.summaryMetric}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function statusTone(status: DataHealthItem['status']) {
  return status === 'healthy'
    ? 'positive'
    : status === 'warning'
      ? 'warning'
      : status === 'missing'
        ? 'neutral'
        : 'danger';
}

function statusLabel(status: DataHealthItem['status']) {
  return {
    healthy: '正常',
    warning: '注意',
    stale: '過期',
    missing: '缺資料',
  }[status];
}

function runStatusLabel(status: DataHealthItem['runStatus']) {
  if (!status) return '不適用';
  return {
    running: '執行中',
    completed: '已完成',
    failed: '失敗',
    partial: '部分完成',
  }[status];
}

function frequencyLabel(value?: string) {
  if (!value) return '依上游資料';
  return {
    trading_day_eod: '交易日收盤後',
    daily: '每日',
    weekly: '每週',
    monthly: '每月',
    derived: '資料更新後衍生',
  }[value] ?? value;
}

function formatDate(value?: string | null) {
  if (!value) return '未提供';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
}

function formatDateTime(value?: string | null) {
  if (!value) return '未執行';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  readinessCard: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    justifyContent: 'space-between',
  },
  readyCard: { borderColor: '#A7E5CE' },
  blockedCard: { borderColor: '#FFB8C0' },
  readinessCopy: { flex: 1, minWidth: 240 },
  readinessEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  readinessTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 5 },
  readinessNote: { color: colors.textSoft, fontSize: 11, lineHeight: 18, marginTop: 6 },
  summaryGrid: { flexDirection: 'row', gap: 9 },
  summaryMetric: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: 12,
    minWidth: 68,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  summaryValue: { fontSize: 21, fontWeight: '900' },
  summaryLabel: { color: colors.textSoft, fontSize: 9, fontWeight: '800', marginTop: 2 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterButtonActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.textSoft, fontSize: 10, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardPressable: { flexBasis: 300, flexGrow: 1 },
  healthCard: { gap: 12, minHeight: 176 },
  healthCardActive: { borderColor: colors.primary, borderWidth: 2 },
  healthTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  healthHeading: { flex: 1 },
  healthLabel: { color: colors.text, fontSize: 14, fontWeight: '900' },
  healthCode: { color: '#909BAC', fontSize: 8, marginTop: 3 },
  healthMessage: { color: colors.textSoft, fontSize: 11, lineHeight: 17 },
  quickMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { backgroundColor: colors.canvas, borderRadius: 10, flex: 1, minWidth: 76, padding: 9 },
  metricLabel: { color: colors.textSoft, fontSize: 8 },
  metricValue: { color: colors.text, fontSize: 11, fontWeight: '900', marginTop: 4 },
  detail: { borderTopColor: colors.border, borderTopWidth: 1, gap: 8, paddingTop: 12 },
  detailRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  detailLabel: { color: colors.textSoft, fontSize: 9 },
  detailValue: { color: colors.text, flex: 1, fontSize: 9, fontWeight: '800', textAlign: 'right' },
  actionBox: { backgroundColor: colors.primarySoft, borderRadius: 11, gap: 4, padding: 11 },
  actionLabel: { color: colors.primary, fontSize: 8, fontWeight: '900' },
  actionText: { color: colors.text, fontSize: 10, lineHeight: 16 },
  errorBox: { backgroundColor: colors.redSoft, borderRadius: 11, gap: 4, padding: 11 },
  errorLabel: { color: colors.red, fontSize: 8, fontWeight: '900' },
  errorText: { color: colors.text, fontSize: 10, lineHeight: 16 },
});
