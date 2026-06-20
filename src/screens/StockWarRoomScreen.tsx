import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, PrimaryButton, ProgressBar, SectionHeader } from '../components/ui';
import { candidates } from '../data/mockData';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';

const dimensions = [
  ['Market', 76, colors.green],
  ['Institution', 84, colors.green],
  ['Chip', 81, colors.green],
  ['OI', 68, colors.amber],
  ['Technical', 86, colors.primary],
] as const;

export function StockWarRoomScreen({ symbol }: { symbol: string }) {
  const closeStock = useAppStore((state) => state.closeStock);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const watchlist = useAppStore((state) => state.watchlist);
  const toggleWatchlist = useAppStore((state) => state.toggleWatchlist);
  const stock = candidates.find((item) => item.symbol === symbol) ?? candidates[0];
  const watched = watchlist.includes(stock.symbol);

  return (
    <View style={styles.page}>
      <Pressable onPress={closeStock}>
        <Text style={styles.back}>← 返回上一頁</Text>
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.identity}>
          <Badge tone={stock.signal === 'green' ? 'positive' : 'warning'}>市場允許研究</Badge>
          <Text style={styles.name}>{stock.name}</Text>
          <Text style={styles.meta}>{stock.symbol} · {stock.industry} · TWSE</Text>
        </View>
        <View style={styles.totalScore}>
          <Text style={styles.totalLabel}>JASIC SCORE</Text>
          <Text style={styles.totalValue}>{stock.score}</Text>
          <Text style={styles.grade}>A · 中風險</Text>
        </View>
      </View>

      <Card style={styles.conclusionCard}>
        <View style={styles.conclusionTop}>
          <View>
            <Text style={styles.conclusionEyebrow}>AI CONCLUSION</Text>
            <Text style={styles.conclusionAction}>續抱 · 不追價</Text>
          </View>
          <Badge tone="positive">信心 82%</Badge>
        </View>
        <Text style={styles.conclusionText}>
          趨勢與法人籌碼維持正向，但短線已接近壓力區。既有部位可續抱並以支撐位管理風險；新部位等待拉回或突破確認。
        </Text>
      </Card>

      <SectionHeader eyebrow="Score Center" title="五大構面" />
      <View style={styles.scoreGrid}>
        {dimensions.map(([label, value, color]) => (
          <Card key={label} style={styles.scoreCard}>
            <Text style={styles.dimension}>{label}</Text>
            <Text style={styles.dimensionValue}>{value}</Text>
            <ProgressBar color={color} value={value} />
          </Card>
        ))}
      </View>

      <View style={styles.detailGrid}>
        <DetailCard
          title="法人與籌碼"
          items={['外資近 5 日偏多', '投信連續買超 3 日', '籌碼集中度改善']}
        />
        <DetailCard
          title="OI 戰況"
          items={['多方增倉但速度放緩', '個股期貨基差中性', '訊號完整度 74%']}
        />
        <DetailCard
          title="技術狀態"
          items={['價格位於 MA20 / MA60 之上', 'MACD 維持正值', 'RSI 接近短線過熱區']}
        />
        <DetailCard
          title="風險與價位"
          items={['支撐：960 / 932', '壓力：1,050 / 1,080', '跌破主要支撐需重新檢核']}
        />
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={watched ? '移出觀察清單' : '加入觀察清單'}
          onPress={() => toggleWatchlist(stock.symbol)}
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

const styles = StyleSheet.create({
  page: { gap: 20 },
  back: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
  },
  identity: { flex: 1 },
  name: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: 12 },
  meta: { color: colors.mutedOnDark, fontSize: 12, marginTop: 5 },
  totalScore: { alignItems: 'flex-end' },
  totalLabel: { color: colors.mutedOnDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  totalValue: { color: '#FFFFFF', fontSize: 52, fontWeight: '900' },
  grade: { color: '#85E2BD', fontSize: 12, fontWeight: '800' },
  conclusionCard: { borderLeftColor: colors.green, borderLeftWidth: 5, gap: 14 },
  conclusionTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  conclusionEyebrow: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  conclusionAction: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 5 },
  conclusionText: { color: colors.textSoft, fontSize: 13, lineHeight: 21 },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  scoreCard: { flex: 1, minWidth: 140, gap: 9 },
  dimension: { color: colors.textSoft, fontSize: 11, fontWeight: '800' },
  dimensionValue: { color: colors.text, fontSize: 26, fontWeight: '900' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailCard: { flexBasis: 280, flexGrow: 1, gap: 10 },
  detailTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 2 },
  detailRow: { flexDirection: 'row', gap: 9 },
  check: { color: colors.green, fontSize: 12, fontWeight: '900' },
  detailText: { color: colors.textSoft, flex: 1, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
});
