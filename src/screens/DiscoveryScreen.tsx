import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, ErrorState, ProgressBar, SectionHeader, SignalDot } from '../components/ui';
import { getCandidates } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';

export function DiscoveryScreen() {
  const openStock = useAppStore((state) => state.openStock);
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['candidates'],
    queryFn: getCandidates,
  });

  if (isLoading) {
    return <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />;
  }
  if (error || !data) {
    return <ErrorState message={error?.message} onRetry={() => void refetch()} />;
  }

  return (
    <View style={styles.page}>
      <View style={styles.titleBlock}>
        <Badge tone="info">三層漏斗 · 每日盤後更新</Badge>
        <Text style={styles.title}>Discovery Pool</Text>
        <Text style={styles.subtitle}>
          先確認市場允許承擔風險，再追蹤法人與主力，最後用技術和風險條件篩出候選股。
        </Text>
      </View>

      <View style={styles.funnel}>
        {[
          ['01', '市場環境', '1,842 → 624', 74],
          ['02', '法人 / 主力 / OI', '624 → 86', 58],
          ['03', '技術 / 風險', '86 → Top 20', 82],
        ].map(([step, name, count, value]) => (
          <Card key={String(step)} style={styles.funnelCard}>
            <Text style={styles.step}>{step}</Text>
            <Text style={styles.funnelName}>{name}</Text>
            <Text style={styles.funnelCount}>{count}</Text>
            <ProgressBar value={Number(value)} />
          </Card>
        ))}
      </View>

      <SectionHeader eyebrow="Opportunity Ranking" title="今日 Top 候選" />
      <View style={styles.table}>
        {data.map((stock, index) => (
          <Pressable
            key={stock.symbol}
            onPress={() => openStock(stock.symbol)}
            style={({ pressed }) => [styles.stockCard, pressed && styles.pressed]}
          >
            <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.identity}>
              <View style={styles.nameRow}>
                <SignalDot signal={stock.signal} />
                <Text style={styles.name}>{stock.name}</Text>
                <Text style={styles.symbol}>{stock.symbol}</Text>
              </View>
              <Text style={styles.meta}>{stock.industry} · {stock.category}</Text>
            </View>
            <View style={styles.scoreBlock}>
              <Text style={styles.score}>{stock.score}</Text>
              <Text style={styles.change}>
                {stock.change > 0 ? '+' : ''}{stock.change.toFixed(1)}
              </Text>
            </View>
            <Badge
              tone={stock.risk === '低' ? 'positive' : stock.risk === '中' ? 'warning' : 'danger'}
            >
              {stock.risk}風險
            </Badge>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 22 },
  loader: { marginTop: 120 },
  titleBlock: { maxWidth: 720 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 12 },
  subtitle: { color: colors.textSoft, fontSize: 14, lineHeight: 22, marginTop: 8 },
  funnel: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  funnelCard: { flex: 1, minWidth: 190 },
  step: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  funnelName: { color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 10 },
  funnelCount: { color: colors.textSoft, fontSize: 12, marginBottom: 14, marginTop: 5 },
  table: { gap: 10 },
  stockCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  pressed: { opacity: 0.7 },
  rank: { color: '#A2ADBC', fontSize: 16, fontWeight: '900', width: 26 },
  identity: { flex: 1 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  name: { color: colors.text, fontSize: 15, fontWeight: '900' },
  symbol: { color: colors.textSoft, fontSize: 11 },
  meta: { color: colors.textSoft, fontSize: 11, marginLeft: 18, marginTop: 5 },
  scoreBlock: { alignItems: 'flex-end' },
  score: { color: colors.text, fontSize: 22, fontWeight: '900' },
  change: { color: colors.green, fontSize: 10, fontWeight: '700' },
});
