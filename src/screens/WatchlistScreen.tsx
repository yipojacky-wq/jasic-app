import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Badge,
  Card,
  ErrorState,
  ProgressBar,
  SectionHeader,
  SignalDot,
} from '../components/ui';
import { PositionManager } from '../components/PositionManager';
import { PortfolioRiskSummary } from '../components/PortfolioRiskSummary';
import { getAlerts, getWatchlistSummary, markAlertRead } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';

export function WatchlistScreen() {
  const queryClient = useQueryClient();
  const demoWatchlist = useAppStore((state) => state.watchlist);
  const openStock = useAppStore((state) => state.openStock);
  const query = useQuery({
    queryKey: ['watchlist', demoWatchlist],
    queryFn: () => getWatchlistSummary(demoWatchlist),
  });
  const alerts = useQuery({ queryKey: ['alerts'], queryFn: getAlerts });
  const readAlert = useMutation({
    mutationFn: markAlertRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
      ]);
    },
  });

  if (query.isLoading) {
    return <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />;
  }
  if (query.error || !query.data) {
    return <ErrorState message={query.error?.message} onRetry={() => void query.refetch()} />;
  }

  const summary = query.data;
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Badge tone="info">Personalized Analysis</Badge>
        <Text style={styles.title}>我的觀察清單</Text>
        <Text style={styles.subtitle}>集中查看分數變化、風險警示與最新個股摘要。</Text>
      </View>

      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>追蹤標的</Text>
          <Text style={styles.statValue}>{summary.items.length}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>分數上升</Text>
          <Text style={[styles.statValue, styles.green]}>{summary.risingCount}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>未讀風險警示</Text>
          <Text style={[styles.statValue, styles.amber]}>{summary.alertCount}</Text>
        </Card>
      </View>

      <SectionHeader eyebrow="Portfolio Context" title="我的研究持倉" />
      <PortfolioRiskSummary />
      <PositionManager />

      <SectionHeader eyebrow="Score Change" title="追蹤標的" />
      {summary.items.length ? (
        <View style={styles.grid}>
          {summary.items.map((stock) => (
            <Pressable
              key={stock.symbol}
              onPress={() => openStock(stock.symbol)}
              style={styles.cardPressable}
            >
              <Card style={styles.stockCard}>
                <View style={styles.stockTop}>
                  <View>
                    <View style={styles.nameRow}>
                      <SignalDot signal={stock.signal} />
                      <Text style={styles.name}>{stock.name}</Text>
                    </View>
                    <Text style={styles.meta}>{stock.symbol} · {stock.industry}</Text>
                  </View>
                  <Badge tone={stock.risk === '低' ? 'positive' : stock.risk === '中' ? 'warning' : 'danger'}>
                    {stock.risk}風險
                  </Badge>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={styles.score}>{stock.score.toFixed(1)}</Text>
                  <Text style={[styles.change, stock.scoreChange < 0 && styles.red]}>
                    {stock.scoreChange > 0 ? '+' : ''}
                    {stock.scoreChange.toFixed(1)} 分
                  </Text>
                </View>
                <ProgressBar
                  value={stock.score}
                  color={
                    stock.signal === 'green'
                      ? colors.green
                      : stock.signal === 'red'
                        ? colors.red
                        : colors.amber
                  }
                />
                <Text style={styles.summary}>{stock.summary}</Text>
                {stock.dataAsOf ? (
                  <Text style={styles.timestamp}>
                    資料時間 {new Date(stock.dataAsOf).toLocaleDateString('zh-TW')}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>尚未加入觀察標的</Text>
          <Text style={styles.emptyText}>
            從 Discovery Pool 或 Stock War Room 加入股票後，會在這裡追蹤分數與風險變化。
          </Text>
        </Card>
      )}

      <SectionHeader eyebrow="Risk Center" title="最新警示" />
      {alerts.isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : alerts.error ? (
        <Text style={styles.alertError}>{alerts.error.message}</Text>
      ) : alerts.data?.length ? (
        <View style={styles.alertList}>
          {alerts.data.map((alert) => (
            <Pressable
              key={alert.id}
              disabled={Boolean(alert.readAt) || readAlert.isPending}
              onPress={() => readAlert.mutate(alert.id)}
            >
              <Card style={[styles.alertCard, !alert.readAt && styles.alertUnread]}>
                <Badge
                  tone={
                    alert.severity === 'critical'
                      ? 'danger'
                      : alert.severity === 'warning'
                        ? 'warning'
                        : 'info'
                  }
                >
                  {alert.severity === 'critical'
                    ? '重大'
                    : alert.severity === 'warning'
                      ? '警示'
                      : '資訊'}
                </Badge>
                <View style={styles.alertCopy}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                  <Text style={styles.timestamp}>
                    {new Date(alert.triggeredAt).toLocaleString('zh-TW')}
                    {alert.readAt ? ' · 已讀' : ' · 點擊標記已讀'}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.noAlerts}>目前沒有新的風險警示。</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 22 },
  loader: { marginTop: 120 },
  header: { maxWidth: 720 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 12 },
  subtitle: { color: colors.textSoft, fontSize: 14, marginTop: 8 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: 140 },
  statLabel: { color: colors.textSoft, fontSize: 11, fontWeight: '800' },
  statValue: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 7 },
  green: { color: colors.green },
  amber: { color: colors.amber },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cardPressable: { flexBasis: 280, flexGrow: 1 },
  stockCard: { gap: 14 },
  stockTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  name: { color: colors.text, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.textSoft, fontSize: 11, marginLeft: 18, marginTop: 4 },
  scoreRow: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  score: { color: colors.text, fontSize: 32, fontWeight: '900' },
  change: { color: colors.green, fontSize: 12, fontWeight: '800' },
  red: { color: colors.red },
  summary: { color: colors.textSoft, fontSize: 12, lineHeight: 18 },
  timestamp: { color: '#98A2B1', fontSize: 10 },
  empty: { alignItems: 'center', gap: 8, padding: 34 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  emptyText: { color: colors.textSoft, fontSize: 12, lineHeight: 19, maxWidth: 440, textAlign: 'center' },
  alertList: { gap: 10 },
  alertCard: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  alertUnread: { borderLeftColor: colors.amber, borderLeftWidth: 4 },
  alertCopy: { flex: 1 },
  alertTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  alertMessage: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 },
  alertError: { color: colors.red, fontSize: 12 },
  noAlerts: { color: colors.textSoft, fontSize: 12 },
});
