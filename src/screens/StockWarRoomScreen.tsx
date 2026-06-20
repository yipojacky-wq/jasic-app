import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  Badge,
  Card,
  ErrorState,
  PrimaryButton,
  ProgressBar,
  SectionHeader,
} from '../components/ui';
import {
  getStockWarRoom,
  getWatchlistSummary,
  setWatchlistMembership,
} from '../services/api';
import { isLiveMode } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';
import type { ScoreDimension } from '../types';

export function StockWarRoomScreen({ symbol }: { symbol: string }) {
  const { width } = useWindowDimensions();
  const mobile = width < 640;
  const queryClient = useQueryClient();
  const closeStock = useAppStore((state) => state.closeStock);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const demoWatchlist = useAppStore((state) => state.watchlist);
  const toggleDemoWatchlist = useAppStore((state) => state.toggleWatchlist);

  const warRoom = useQuery({
    queryKey: ['stock-war-room', symbol],
    queryFn: () => getStockWarRoom(symbol),
  });
  const watchlist = useQuery({
    queryKey: ['watchlist', demoWatchlist],
    queryFn: () => getWatchlistSummary(demoWatchlist),
  });
  const watched = isLiveMode
    ? Boolean(watchlist.data?.items.some((item) => item.symbol === symbol))
    : demoWatchlist.includes(symbol);

  const membership = useMutation({
    mutationFn: async () => {
      if (isLiveMode) {
        await setWatchlistMembership(symbol, !watched);
      } else {
        toggleDemoWatchlist(symbol);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  if (warRoom.isLoading) {
    return <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />;
  }
  if (warRoom.error || !warRoom.data) {
    return (
      <View style={styles.page}>
        <Pressable onPress={closeStock}>
          <Text style={styles.back}>← 返回上一頁</Text>
        </Pressable>
        <ErrorState
          message={warRoom.error?.message}
          onRetry={() => void warRoom.refetch()}
        />
      </View>
    );
  }

  const stock = warRoom.data;
  return (
    <View style={styles.page}>
      <Pressable onPress={closeStock}>
        <Text style={styles.back}>← 返回上一頁</Text>
      </Pressable>

      <View style={[styles.hero, mobile && styles.heroMobile]}>
        <View style={styles.identity}>
          <Badge tone={signalTone(stock.signal)}>
            {stock.signal === 'green' ? '市場允許研究' : stock.signal === 'red' ? '風險優先' : '等待確認'}
          </Badge>
          <Text style={styles.name}>{stock.name}</Text>
          <Text style={styles.meta}>
            {stock.symbol} · {stock.industry} · {stock.exchange}
          </Text>
        </View>
        <View style={[styles.totalScore, mobile && styles.totalScoreMobile]}>
          <Text style={styles.totalLabel}>JASIC SCORE</Text>
          <Text style={styles.totalValue}>{stock.score.toFixed(1)}</Text>
          <Text style={styles.grade}>
            {stock.grade} · {stock.riskLabel}風險 · {stock.scoreChange >= 0 ? '+' : ''}
            {stock.scoreChange.toFixed(1)}
          </Text>
        </View>
      </View>

      <Card style={styles.conclusionCard}>
        <View style={styles.conclusionTop}>
          <View style={styles.conclusionCopy}>
            <Text style={styles.conclusionEyebrow}>RULE-BASED CONCLUSION</Text>
            <Text style={styles.conclusionAction}>{stock.conclusion.action}</Text>
          </View>
          <Badge tone={stock.confidence >= 70 ? 'positive' : 'warning'}>
            信心 {stock.confidence.toFixed(0)}%
          </Badge>
        </View>
        <Text style={styles.conclusionText}>{stock.conclusion.summary}</Text>
        <Text style={styles.timestamp}>
          資料時間 {formatDateTime(stock.dataAsOf)} · {stock.ruleVersion}
        </Text>
      </Card>

      <SectionHeader eyebrow="Score Center" title="五大構面" />
      <View style={styles.scoreGrid}>
        {stock.dimensions.map((dimension) => (
          <DimensionCard key={dimension.label} dimension={dimension} />
        ))}
      </View>

      <View style={styles.detailGrid}>
        <DetailCard title="法人與籌碼" items={stock.evidence.institutional} />
        <DetailCard title="OI 戰況" items={stock.evidence.oi} />
        <DetailCard title="技術狀態" items={stock.evidence.technical} />
        <DetailCard
          title="風險與價位"
          items={[
            ...stock.evidence.risk,
            `支撐：${formatLevels(stock.levels.support)}`,
            `壓力：${formatLevels(stock.levels.resistance)}`,
          ]}
        />
      </View>

      {membership.isError ? (
        <Text style={styles.actionError}>{membership.error.message}</Text>
      ) : null}
      <View style={styles.actions}>
        <PrimaryButton
          disabled={membership.isPending}
          label={
            membership.isPending
              ? '正在更新…'
              : watched
                ? '移出觀察清單'
                : '加入觀察清單'
          }
          onPress={() => membership.mutate()}
          secondary
        />
        <PrimaryButton
          label="使用此股票執行 AI Check"
          onPress={() => setActiveTab('ai-check')}
        />
      </View>
    </View>
  );
}

function DimensionCard({ dimension }: { dimension: ScoreDimension }) {
  const color =
    dimension.status === 'unavailable'
      ? colors.textSoft
      : dimension.value >= 70
        ? colors.green
        : dimension.value >= 50
          ? colors.amber
          : colors.red;
  return (
    <Card style={styles.scoreCard}>
      <View style={styles.dimensionTop}>
        <Text style={styles.dimension}>{dimension.label}</Text>
        <Badge
          tone={
            dimension.status === 'verified'
              ? 'positive'
              : dimension.status === 'provisional'
                ? 'warning'
                : 'neutral'
          }
        >
          {dimension.status === 'verified'
            ? '已驗證'
            : dimension.status === 'provisional'
              ? '暫定'
              : '缺資料'}
        </Badge>
      </View>
      <Text style={styles.dimensionValue}>{dimension.value.toFixed(1)}</Text>
      <ProgressBar color={color} value={dimension.value} />
    </Card>
  );
}

function DetailCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card style={styles.detailCard}>
      <Text style={styles.detailTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.detailRow}>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.detailText}>{item}</Text>
        </View>
      ))}
    </Card>
  );
}

function signalTone(signal: string): 'positive' | 'warning' | 'danger' {
  return signal === 'green' ? 'positive' : signal === 'red' ? 'danger' : 'warning';
}

function formatLevels(levels: number[]) {
  return levels.length ? levels.map((level) => level.toFixed(2)).join(' / ') : '資料不足';
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
}

const styles = StyleSheet.create({
  page: { gap: 20 },
  loader: { marginTop: 120 },
  back: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
  },
  heroMobile: { alignItems: 'stretch', flexDirection: 'column', gap: 20 },
  identity: { flex: 1 },
  name: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: 12 },
  meta: { color: colors.mutedOnDark, fontSize: 12, marginTop: 5 },
  totalScore: { alignItems: 'flex-end' },
  totalScoreMobile: { alignItems: 'flex-start' },
  totalLabel: { color: colors.mutedOnDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  totalValue: { color: '#FFFFFF', fontSize: 52, fontWeight: '900' },
  grade: { color: '#85E2BD', fontSize: 12, fontWeight: '800' },
  conclusionCard: { borderLeftColor: colors.green, borderLeftWidth: 5, gap: 14 },
  conclusionTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  conclusionCopy: { flex: 1 },
  conclusionEyebrow: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  conclusionAction: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 5 },
  conclusionText: { color: colors.textSoft, fontSize: 13, lineHeight: 21 },
  timestamp: { color: '#919CAD', fontSize: 10 },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  scoreCard: { flex: 1, minWidth: 150, gap: 9 },
  dimensionTop: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'space-between' },
  dimension: { color: colors.textSoft, fontSize: 11, fontWeight: '800' },
  dimensionValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailCard: { flexBasis: 280, flexGrow: 1, gap: 10 },
  detailTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 2 },
  detailRow: { flexDirection: 'row', gap: 9 },
  check: { color: colors.green, fontSize: 12, fontWeight: '900' },
  detailText: { color: colors.textSoft, flex: 1, fontSize: 12, lineHeight: 18 },
  actionError: { color: colors.red, fontSize: 11, textAlign: 'right' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
});
