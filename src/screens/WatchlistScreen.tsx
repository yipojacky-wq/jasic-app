import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, ProgressBar, SectionHeader, SignalDot } from '../components/ui';
import { candidates } from '../data/mockData';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';

export function WatchlistScreen() {
  const watchlist = useAppStore((state) => state.watchlist);
  const openStock = useAppStore((state) => state.openStock);
  const items = candidates.filter((item) => watchlist.includes(item.symbol));

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
          <Text style={styles.statValue}>{items.length}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>分數上升</Text>
          <Text style={[styles.statValue, styles.green]}>{items.filter((item) => item.change > 0).length}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>風險警示</Text>
          <Text style={[styles.statValue, styles.amber]}>1</Text>
        </Card>
      </View>

      <SectionHeader eyebrow="Score Change" title="追蹤標的" />
      <View style={styles.grid}>
        {items.map((stock) => (
          <Pressable key={stock.symbol} onPress={() => openStock(stock.symbol)} style={styles.cardPressable}>
            <Card style={styles.stockCard}>
              <View style={styles.stockTop}>
                <View>
                  <View style={styles.nameRow}>
                    <SignalDot signal={stock.signal} />
                    <Text style={styles.name}>{stock.name}</Text>
                  </View>
                  <Text style={styles.meta}>{stock.symbol} · {stock.industry}</Text>
                </View>
                <Badge tone={stock.risk === '低' ? 'positive' : 'warning'}>{stock.risk}風險</Badge>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.score}>{stock.score}</Text>
                <Text style={[styles.change, stock.change < 0 && styles.red]}>
                  {stock.change > 0 ? '+' : ''}{stock.change.toFixed(1)} 分
                </Text>
              </View>
              <ProgressBar value={stock.score} color={stock.signal === 'green' ? colors.green : colors.amber} />
              <Text style={styles.summary}>
                {stock.change > 0
                  ? '法人與技術分數同步改善，維持追蹤。'
                  : '短線動能降溫，等待支撐確認。'}
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 22 },
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
});
