import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { candidates } from '../data/mockData';
import { getDashboard } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';
import { Badge, Card, ErrorState, ProgressBar, SectionHeader, SignalDot } from '../components/ui';

export function DashboardScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const openStock = useAppStore((state) => state.openStock);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  if (isLoading) {
    return <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />;
  }
  if (error || !data) {
    return <ErrorState message={error?.message} onRetry={() => void refetch()} />;
  }

  return (
    <View style={styles.page}>
      <View style={[styles.hero, compact && styles.heroCompact]}>
        <View style={styles.heroCopy}>
          <Badge tone="positive">市場綠燈 · 資料截至 06/20 16:30</Badge>
          <Text style={styles.heroTitle}>今天先看風險，再找機會。</Text>
          <Text style={styles.heroBody}>{data.summary}</Text>
        </View>
        <View style={styles.scorePanel}>
          <Text style={styles.scoreLabel}>MARKET SCORE</Text>
          <Text style={styles.scoreValue}>{data.marketScore}</Text>
          <Text style={styles.scoreUnit}>/ 100</Text>
          <ProgressBar value={data.marketScore} color={colors.green} />
          <View style={styles.regimeRow}>
            <SignalDot signal={data.signal} />
            <Text style={styles.regimeText}>{data.regime}</Text>
          </View>
        </View>
      </View>

      <SectionHeader eyebrow="Macro Lens" title="五大總經指標" />
      <View style={styles.indicatorGrid}>
        {data.indicators.map((indicator) => (
          <Card
            key={indicator.label}
            style={[styles.indicatorCard, compact && styles.indicatorCardCompact]}
          >
            <Text style={styles.indicatorLabel}>{indicator.label}</Text>
            <Text style={styles.indicatorValue}>{indicator.value}</Text>
            <Text
              style={[
                styles.indicatorTrend,
                indicator.state === 'positive'
                  ? styles.positive
                  : indicator.state === 'negative'
                    ? styles.negative
                    : undefined,
              ]}
            >
              {indicator.trend}
            </Text>
          </Card>
        ))}
      </View>

      <View style={[styles.twoColumn, compact && styles.oneColumn]}>
        <View style={styles.column}>
          <SectionHeader
            eyebrow="Discovery"
            title="今日核心候選"
            action={
              <Pressable onPress={() => setActiveTab('discovery')}>
                <Text style={styles.link}>查看 Top 20 →</Text>
              </Pressable>
            }
          />
          <Card style={styles.listCard}>
            {candidates.slice(0, 4).map((stock, index) => (
              <Pressable
                key={stock.symbol}
                onPress={() => openStock(stock.symbol)}
                style={[styles.stockRow, index > 0 && styles.rowBorder]}
              >
                <Text style={styles.rank}>{index + 1}</Text>
                <View style={styles.stockIdentity}>
                  <Text style={styles.stockName}>{stock.name}</Text>
                  <Text style={styles.stockMeta}>{stock.symbol} · {stock.industry}</Text>
                </View>
                <Badge tone={stock.signal === 'green' ? 'positive' : 'warning'}>
                  {stock.score}
                </Badge>
              </Pressable>
            ))}
          </Card>
        </View>

        <View style={styles.column}>
          <SectionHeader eyebrow="Risk Center" title="今日風險雷達" />
          <Card style={styles.riskCard}>
            <Text style={styles.riskTitle}>風險分數 {data.riskScore} / 100</Text>
            <ProgressBar value={data.riskScore} color={colors.amber} />
            <View style={styles.riskItem}>
              <Badge tone="warning">觀察</Badge>
              <Text style={styles.riskText}>美債殖利率回升，成長股評價承壓。</Text>
            </View>
            <View style={styles.riskItem}>
              <Badge tone="info">輪動</Badge>
              <Text style={styles.riskText}>資金向半導體與金融權值集中。</Text>
            </View>
            <View style={styles.riskItem}>
              <Badge tone="neutral">策略</Badge>
              <Text style={styles.riskText}>避免追高，保留 20–35% 研究用現金區間。</Text>
            </View>
          </Card>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 22 },
  loader: { marginTop: 120 },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 24,
  },
  heroCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  heroCopy: { flex: 1, justifyContent: 'center', maxWidth: 650 },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginTop: 14,
  },
  heroBody: {
    color: '#B8C3D4',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  scorePanel: {
    backgroundColor: colors.inkSoft,
    borderColor: '#2A3851',
    borderRadius: 18,
    borderWidth: 1,
    minWidth: 190,
    padding: 20,
  },
  scoreLabel: { color: colors.mutedOnDark, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  scoreValue: { color: '#FFFFFF', fontSize: 50, fontWeight: '900', marginTop: 6 },
  scoreUnit: { color: colors.mutedOnDark, fontSize: 12, marginBottom: 14 },
  regimeRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 13 },
  regimeText: { color: '#D9E3F0', fontSize: 12, fontWeight: '700' },
  indicatorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  indicatorCard: { flexBasis: 160, flexGrow: 1, minWidth: 150 },
  indicatorCardCompact: { flexBasis: '45%' },
  indicatorLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '700' },
  indicatorValue: { color: colors.text, fontSize: 24, fontWeight: '900', marginVertical: 6 },
  indicatorTrend: { color: colors.textSoft, fontSize: 11 },
  positive: { color: colors.green },
  negative: { color: colors.red },
  twoColumn: { flexDirection: 'row', gap: 18 },
  oneColumn: { flexDirection: 'column' },
  column: { flex: 1 },
  link: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  listCard: { paddingVertical: 4 },
  stockRow: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 14 },
  rowBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  rank: { color: colors.primary, fontSize: 14, fontWeight: '900', width: 20 },
  stockIdentity: { flex: 1 },
  stockName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  stockMeta: { color: colors.textSoft, fontSize: 11, marginTop: 3 },
  riskCard: { gap: 14 },
  riskTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  riskItem: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  riskText: { color: colors.textSoft, flex: 1, fontSize: 12, lineHeight: 18 },
});
