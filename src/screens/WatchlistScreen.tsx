import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Badge,
  Card,
  ErrorState,
  PrimaryButton,
  ProgressBar,
  SectionHeader,
  SignalDot,
} from '../components/ui';
import { PositionManager } from '../components/PositionManager';
import { PortfolioRiskSummary } from '../components/PortfolioRiskSummary';
import { AlertPreferences } from '../components/AlertPreferences';
import {
  getAlerts,
  getWatchlistSummary,
  markAlertRead,
  searchStocks,
  setWatchlistMembership,
} from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';

export function WatchlistScreen() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const queryClient = useQueryClient();
  const demoWatchlist = useAppStore((state) => state.watchlist);
  const toggleDemoWatchlist = useAppStore((state) => state.toggleWatchlist);
  const openStock = useAppStore((state) => state.openStock);
  const normalizedKeyword = searchKeyword.trim();
  const query = useQuery({
    queryKey: ['watchlist', demoWatchlist],
    queryFn: () => getWatchlistSummary(demoWatchlist),
  });
  const stockSearch = useQuery({
    queryKey: ['stock-search', normalizedKeyword],
    queryFn: () => searchStocks(normalizedKeyword),
    enabled: normalizedKeyword.length > 0,
    staleTime: 60_000,
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
  const addWatchlist = useMutation({
    mutationFn: async (symbol: string) => {
      if (!demoWatchlist.includes(symbol)) {
        toggleDemoWatchlist(symbol);
      }
      await setWatchlistMembership(symbol, true);
    },
    onSuccess: async () => {
      setSearchKeyword('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
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
        <Badge tone="info">個人化分析</Badge>
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

      <Card style={styles.searchCard}>
        <View style={styles.searchHeader}>
          <View>
            <Text style={styles.searchTitle}>新增股票觀察</Text>
            <Text style={styles.searchHint}>可輸入股票代號、中文公司名稱或常用英文簡稱。</Text>
          </View>
        </View>
        <TextInput
          autoCapitalize="characters"
          autoCorrect={false}
          inputMode="search"
          onChangeText={setSearchKeyword}
          placeholder="例如：2330、台積電、TSMC"
          placeholderTextColor="#9AA5B5"
          style={styles.searchInput}
          value={searchKeyword}
        />
        {normalizedKeyword.length ? (
          <View style={styles.searchResults}>
            {stockSearch.isFetching ? (
              <ActivityIndicator color={colors.primary} />
            ) : stockSearch.error ? (
              <Text style={styles.searchMessage}>{stockSearch.error.message}</Text>
            ) : stockSearch.data?.length ? (
              stockSearch.data.map((stock) => {
                const isWatched = summary.items.some((item) => item.symbol === stock.symbol);
                return (
                  <View key={`${stock.exchange}-${stock.symbol}`} style={styles.searchResultRow}>
                    <Pressable
                      onPress={() => openStock(stock.symbol)}
                      style={styles.searchResultInfo}
                    >
                      <Text style={styles.searchResultName}>{stock.name}</Text>
                      <Text style={styles.searchResultMeta}>
                        {stock.symbol} · {stock.exchange}
                        {stock.industry ? ` · ${stock.industry}` : ''}
                      </Text>
                    </Pressable>
                    <PrimaryButton
                      label={
                        isWatched
                          ? '已加入'
                          : addWatchlist.isPending
                            ? '加入中'
                            : '加入'
                      }
                      onPress={() => addWatchlist.mutate(stock.symbol)}
                      secondary={isWatched}
                      disabled={isWatched || addWatchlist.isPending}
                    />
                  </View>
                );
              })
            ) : (
              <Text style={styles.searchMessage}>
                找不到符合的股票，請改用股票代號或完整公司名稱。
              </Text>
            )}
          </View>
        ) : null}
        {addWatchlist.error ? (
          <Text style={styles.searchError}>{addWatchlist.error.message}</Text>
        ) : null}
      </Card>

      <SectionHeader eyebrow="持倉脈絡" title="我的研究持倉" />
      <PortfolioRiskSummary />
      <PositionManager />

      <SectionHeader eyebrow="分數變化" title="追蹤標的" />
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
            從三層漏斗或個股作戰室加入股票後，會在這裡追蹤分數與風險變化。
          </Text>
        </Card>
      )}

      <SectionHeader eyebrow="警示偏好" title="個人化警示規則" />
      <AlertPreferences />

      <SectionHeader eyebrow="風險中心" title="最新警示" />
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
  searchCard: { gap: 12 },
  searchHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  searchTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  searchHint: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 },
  searchInput: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchResults: { gap: 10 },
  searchResultRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  searchResultInfo: { flex: 1 },
  searchResultName: { color: colors.text, fontSize: 15, fontWeight: '900' },
  searchResultMeta: { color: colors.textSoft, fontSize: 12, marginTop: 4 },
  searchMessage: { color: colors.textSoft, fontSize: 12, lineHeight: 18 },
  searchError: { color: colors.red, fontSize: 12, lineHeight: 18 },
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
