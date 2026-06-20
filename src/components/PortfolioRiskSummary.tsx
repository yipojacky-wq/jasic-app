import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getPortfolioSummary } from '../services/api';
import { colors } from '../theme';
import { Badge, Card, ProgressBar } from './ui';

export function PortfolioRiskSummary() {
  const summary = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: getPortfolioSummary,
  });

  if (summary.isLoading) {
    return <ActivityIndicator color={colors.primary} />;
  }
  if (summary.error) {
    return <Text style={styles.error}>{summary.error.message}</Text>;
  }
  if (!summary.data?.positions.length) {
    return (
      <Card style={styles.empty}>
        <Text style={styles.emptyTitle}>建立持倉後顯示組合風險</Text>
        <Text style={styles.emptyText}>
          系統會依最新可用日收盤價估值，不代表即時成交價格。
        </Text>
      </Card>
    );
  }

  const data = summary.data;
  return (
    <View style={styles.section}>
      <View style={styles.metrics}>
        <MetricCard
          label="可估值市值"
          value={formatCurrency(data.totalMarketValue)}
          note={`成本 ${formatCurrency(data.totalCostBasis)}`}
        />
        <MetricCard
          label="未實現損益"
          value={formatSignedCurrency(data.totalUnrealizedPnl)}
          valueTone={data.totalUnrealizedPnl >= 0 ? 'positive' : 'negative'}
          note={`${data.totalReturnPct >= 0 ? '+' : ''}${data.totalReturnPct.toFixed(2)}%`}
        />
        <MetricCard
          label="加權風險"
          value={data.weightedRiskScore.toFixed(1)}
          note={`${data.highRiskCount} 檔高風險／紅燈`}
        />
        <MetricCard
          label="最大集中度"
          value={`${data.largestConcentrationPct.toFixed(1)}%`}
          note={data.largestPositionSymbol ?? '尚無資料'}
        />
      </View>

      <Card style={styles.riskCard}>
        <View style={styles.riskHeader}>
          <View>
            <Text style={styles.riskTitle}>組合風險雷達</Text>
            <Text style={styles.basis}>
              最新可用日收盤價估值 · 資料日期 {formatDate(data.dataAsOf)}
            </Text>
          </View>
          <Badge tone={data.weightedRiskScore >= 70 ? 'danger' : data.weightedRiskScore >= 40 ? 'warning' : 'positive'}>
            {data.weightedRiskScore >= 70
              ? '高風險'
              : data.weightedRiskScore >= 40
                ? '中風險'
                : '低風險'}
          </Badge>
        </View>
        <ProgressBar
          color={
            data.weightedRiskScore >= 70
              ? colors.red
              : data.weightedRiskScore >= 40
                ? colors.amber
                : colors.green
          }
          value={data.weightedRiskScore}
        />
        <View style={styles.alerts}>
          {data.alerts.map((alert) => (
            <View key={alert} style={styles.alertRow}>
              <Text style={styles.alertBullet}>•</Text>
              <Text style={styles.alertText}>{alert}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.disclaimer}>
          未實現損益未計入手續費、交易稅與盤中價格變化，僅供研究檢核。
        </Text>
      </Card>
    </View>
  );
}

function MetricCard({
  label,
  note,
  value,
  valueTone,
}: {
  label: string;
  note: string;
  value: string;
  valueTone?: 'positive' | 'negative';
}) {
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          valueTone === 'positive' && styles.positive,
          valueTone === 'negative' && styles.negative,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.metricNote}>{note}</Text>
    </Card>
  );
}

function formatCurrency(value: number) {
  return `NT$ ${Math.round(value).toLocaleString('zh-TW')}`;
}

function formatSignedCurrency(value: number) {
  return `${value >= 0 ? '+' : '-'}NT$ ${Math.abs(Math.round(value)).toLocaleString('zh-TW')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '缺資料';
  return new Date(value).toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
  });
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { flexGrow: 1, flexBasis: 180, gap: 4 },
  metricLabel: { color: colors.textSoft, fontSize: 10, fontWeight: '800' },
  metricValue: { color: colors.text, fontSize: 23, fontWeight: '900' },
  metricNote: { color: colors.textSoft, fontSize: 9 },
  positive: { color: colors.green },
  negative: { color: colors.red },
  riskCard: { gap: 13 },
  riskHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  riskTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  basis: { color: colors.textSoft, fontSize: 9, marginTop: 4 },
  alerts: { gap: 6 },
  alertRow: { flexDirection: 'row', gap: 7 },
  alertBullet: { color: colors.amber, fontSize: 13 },
  alertText: { color: colors.textSoft, flex: 1, fontSize: 11, lineHeight: 17 },
  disclaimer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    color: colors.textSoft,
    fontSize: 9,
    lineHeight: 15,
    paddingTop: 10,
  },
  empty: { alignItems: 'center', gap: 6, padding: 24 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  emptyText: { color: colors.textSoft, fontSize: 10, textAlign: 'center' },
  error: { color: colors.red, fontSize: 11 },
});
