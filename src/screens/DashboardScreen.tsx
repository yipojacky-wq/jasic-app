import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
import type { MarketIndicator } from '../types';
import { Badge, Card, ErrorState, ProgressBar, SectionHeader, SignalDot } from '../components/ui';

export function DashboardScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);
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
          <Badge tone={data.signal === 'green' ? 'positive' : data.signal === 'yellow' ? 'warning' : 'danger'}>
            市場{signalLabel(data.signal)} · 資料截至 {formatDateTime(data.dataAsOf)}
          </Badge>
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
          <Text style={styles.ruleMeta}>
            信心 {data.confidence.toFixed(0)}% · {data.ruleVersion}
          </Text>
        </View>
      </View>

      <SectionHeader eyebrow="分數拆解" title="市場分數拆解" />
      <View style={styles.componentGrid}>
        {data.components.map((component) => (
          <Card key={component.code} style={styles.componentCard}>
            <View style={styles.componentTop}>
              <Text style={styles.componentLabel}>{component.label}</Text>
              <Text style={styles.componentValue}>{component.value.toFixed(1)}</Text>
            </View>
            <ProgressBar
              value={Math.min(100, Math.max(0, component.value))}
              color={component.code === 'volatility' ? colors.amber : colors.primary}
            />
            <Text style={styles.componentNote}>{component.note}</Text>
          </Card>
        ))}
      </View>

      <SectionHeader eyebrow="總經觀察" title="五大總經指標" />
      <View style={styles.indicatorGrid}>
        {data.indicators.map((indicator) => {
          const expanded = expandedIndicator === indicator.code;
          return (
          <Pressable
            key={indicator.label}
            accessibilityLabel={`${expanded ? '收合' : '展開'} ${indicator.label} 詳情`}
            onPress={() => setExpandedIndicator(expanded ? null : indicator.code)}
            style={[styles.indicatorPressable, compact && styles.indicatorCardCompact]}
          >
            <Card style={[styles.indicatorCard, expanded && styles.indicatorCardExpanded]}>
              <View style={styles.indicatorTop}>
                <Text style={styles.indicatorLabel}>{indicator.label}</Text>
                <Badge tone={freshnessTone(indicator.freshness)}>
                  {freshnessLabel(indicator.freshness)}
                </Badge>
              </View>
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
              <Text style={styles.impact}>{indicator.impact}</Text>
              <MiniHistory indicator={indicator} />
              {expanded ? (
                <View style={styles.indicatorDetail}>
                  <DetailRow label="資料來源" value={indicator.sourceName} />
                  <DetailRow label="更新頻率" value={frequencyLabel(indicator.frequency)} />
                  <DetailRow label="觀察日期" value={formatDate(indicator.observationDate)} />
                  <DetailRow
                    label="發布時間"
                    value={formatDateTime(indicator.releasedAt)}
                  />
                  <DetailRow
                    label="資料年齡"
                    value={indicator.ageDays === null || indicator.ageDays === undefined ? '未知' : `${indicator.ageDays} 天`}
                  />
                </View>
              ) : null}
            </Card>
          </Pressable>
          );
        })}
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
          <SectionHeader eyebrow="風險中心" title="今日風險雷達" />
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

function MiniHistory({ indicator }: { indicator: MarketIndicator }) {
  if (!indicator.history.length) {
    return <Text style={styles.noHistory}>尚無歷史序列</Text>;
  }
  const values = indicator.history.map((item) => item.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  return (
    <View style={styles.history}>
      {indicator.history.map((item) => (
        <View key={item.date} style={styles.historyColumn}>
          <View
            style={[
              styles.historyBar,
              {
                height: 8 + ((item.value - minimum) / range) * 28,
                backgroundColor:
                  indicator.state === 'positive'
                    ? colors.green
                    : indicator.state === 'negative'
                      ? colors.red
                      : colors.primary,
              },
            ]}
          />
        </View>
      ))}
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

function signalLabel(signal: 'green' | 'yellow' | 'red') {
  return { green: '綠燈', yellow: '黃燈', red: '紅燈' }[signal];
}

function freshnessTone(status: MarketIndicator['freshness']) {
  return status === 'fresh'
    ? 'positive'
    : status === 'warning'
      ? 'warning'
      : status === 'stale'
        ? 'danger'
        : 'neutral';
}

function freshnessLabel(status: MarketIndicator['freshness']) {
  return {
    fresh: '資料正常',
    warning: '稍有延遲',
    stale: '資料過期',
    missing: '缺資料',
  }[status];
}

function frequencyLabel(value: string) {
  return { daily: '每日', weekly: '每週', monthly: '每月' }[value] ?? value;
}

function formatDate(value?: string | null) {
  if (!value) return '未提供';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
}

function formatDateTime(value?: string | null) {
  if (!value) return '未提供';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
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
  ruleMeta: { color: colors.mutedOnDark, fontSize: 9, marginTop: 9 },
  componentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  componentCard: { flexBasis: 220, flexGrow: 1, gap: 10 },
  componentTop: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  componentLabel: { color: colors.textSoft, fontSize: 11, fontWeight: '800' },
  componentValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  componentNote: { color: colors.textSoft, fontSize: 9 },
  indicatorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  indicatorPressable: { flexBasis: 205, flexGrow: 1, minWidth: 180 },
  indicatorCard: { gap: 6, minHeight: 180 },
  indicatorCardExpanded: { borderColor: colors.primary, borderWidth: 2 },
  indicatorCardCompact: { flexBasis: '100%' },
  indicatorTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  indicatorLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '700' },
  indicatorValue: { color: colors.text, fontSize: 24, fontWeight: '900', marginVertical: 6 },
  indicatorTrend: { color: colors.textSoft, fontSize: 11 },
  impact: { color: colors.text, fontSize: 10, fontWeight: '800' },
  history: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    height: 40,
    marginTop: 4,
  },
  historyColumn: { flex: 1, justifyContent: 'flex-end' },
  historyBar: { borderRadius: 3, minHeight: 8, width: '100%' },
  noHistory: { color: colors.textSoft, fontSize: 9 },
  indicatorDetail: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 6,
    marginTop: 5,
    paddingTop: 10,
  },
  detailRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  detailLabel: { color: colors.textSoft, fontSize: 9 },
  detailValue: {
    color: colors.text,
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'right',
  },
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
