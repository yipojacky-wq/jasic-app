import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
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
import {
  categoryLabel,
  discoveryCandidatesToCsv,
  filterDiscoveryCandidates,
  type DiscoveryFilters,
  type DiscoverySort,
} from '../lib/discovery';
import { getCandidates } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';
import type { Signal, StockCandidate } from '../types';

export function DiscoveryScreen() {
  const openStock = useAppStore((state) => state.openStock);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [filters, setFilters] = useState<DiscoveryFilters>({
    search: '',
    signal: 'all',
    risk: 'all',
    category: 'all',
    sort: 'rank',
  });
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['candidates'],
    queryFn: getCandidates,
  });
  const filtered = useMemo(
    () => filterDiscoveryCandidates(data ?? [], filters),
    [data, filters],
  );

  if (isLoading) {
    return <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />;
  }
  if (error || !data) {
    return <ErrorState message={error?.message} onRetry={() => void refetch()} />;
  }

  const categories = [...new Set(data.map((candidate) => candidate.category))];

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
          ['01', '市場環境', '大盤趨勢與波動先行', 76],
          ['02', '法人 / 主力 / OI', '資金方向與缺失構面揭露', 64],
          ['03', '技術 / 風險', '趨勢確認並排除過高風險', 82],
        ].map(([step, name, count, value]) => (
          <Card key={String(step)} style={styles.funnelCard}>
            <Text style={styles.step}>{step}</Text>
            <Text style={styles.funnelName}>{name}</Text>
            <Text style={styles.funnelCount}>{count}</Text>
            <ProgressBar value={Number(value)} />
          </Card>
        ))}
      </View>

      <Card style={styles.controls}>
        <TextInput
          accessibilityLabel="搜尋候選股票"
          onChangeText={(search) => setFilters((current) => ({ ...current, search }))}
          placeholder="搜尋代號、名稱、產業或候選類型"
          placeholderTextColor="#98A2B1"
          style={styles.searchInput}
          value={filters.search}
        />

        <FilterGroup label="燈號">
          {(['all', 'green', 'yellow', 'red'] as Array<'all' | Signal>).map((value) => (
            <FilterPill
              active={filters.signal === value}
              key={value}
              label={{ all: '全部', green: '綠燈', yellow: '黃燈', red: '紅燈' }[value]}
              onPress={() => setFilters((current) => ({ ...current, signal: value }))}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="風險">
          {(['all', '低', '中', '高'] as Array<'all' | StockCandidate['risk']>).map((value) => (
            <FilterPill
              active={filters.risk === value}
              key={value}
              label={value === 'all' ? '全部' : `${value}風險`}
              onPress={() => setFilters((current) => ({ ...current, risk: value }))}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="類型">
          <FilterPill
            active={filters.category === 'all'}
            label="全部"
            onPress={() => setFilters((current) => ({ ...current, category: 'all' }))}
          />
          {categories.map((category) => (
            <FilterPill
              active={filters.category === category}
              key={category}
              label={categoryLabel(category)}
              onPress={() => setFilters((current) => ({ ...current, category }))}
            />
          ))}
        </FilterGroup>

        <View style={styles.controlFooter}>
          <FilterGroup label="排序">
            {([
              ['rank', '原始排名'],
              ['score_desc', '分數高→低'],
              ['risk_asc', '低風險優先'],
              ['confidence_desc', '可信度優先'],
            ] as Array<[DiscoverySort, string]>).map(([value, label]) => (
              <FilterPill
                active={filters.sort === value}
                key={value}
                label={label}
                onPress={() => setFilters((current) => ({ ...current, sort: value }))}
              />
            ))}
          </FilterGroup>
          <PrimaryButton
            disabled={!filtered.length}
            label={Platform.OS === 'web' ? '下載候選 CSV' : '分享候選清單'}
            onPress={() => void exportCandidates(filtered)}
            secondary
          />
        </View>
        <Text style={styles.resultCount}>
          顯示 {filtered.length} / {data.length} 檔候選
        </Text>
      </Card>

      <SectionHeader eyebrow="Opportunity Ranking" title="今日 Top 候選" />
      <View style={styles.table}>
        {filtered.map((stock) => {
          const expanded = expandedSymbol === stock.symbol;
          return (
            <Card key={stock.symbol} style={styles.candidateCard}>
              <Pressable
                accessibilityLabel={`展開 ${stock.symbol} 候選證據`}
                onPress={() => setExpandedSymbol(expanded ? null : stock.symbol)}
                style={styles.stockCard}
              >
                <Text style={styles.rank}>
                  {String(stock.rank ?? data.indexOf(stock) + 1).padStart(2, '0')}
                </Text>
                <View style={styles.identity}>
                  <View style={styles.nameRow}>
                    <SignalDot signal={stock.signal} />
                    <Text style={styles.name}>{stock.name}</Text>
                    <Text style={styles.symbol}>{stock.symbol}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {stock.industry} · {categoryLabel(stock.category)}
                  </Text>
                </View>
                <View style={styles.scoreBlock}>
                  <Text style={styles.score}>{stock.score.toFixed(1)}</Text>
                  <Text style={[styles.change, stock.change < 0 && styles.negative]}>
                    {stock.change > 0 ? '+' : ''}
                    {stock.change.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.badges}>
                  <Badge tone={stock.risk === '低' ? 'positive' : stock.risk === '中' ? 'warning' : 'danger'}>
                    {stock.risk}風險
                  </Badge>
                  <Badge tone={(stock.confidence ?? 0) >= 70 ? 'positive' : 'warning'}>
                    信心 {stock.confidence ?? 0}%
                  </Badge>
                </View>
              </Pressable>

              {expanded ? (
                <View style={styles.evidencePanel}>
                  <View style={styles.layers}>
                    <LayerCard
                      label="第一層 · 市場"
                      score={stock.layerResults?.market.score}
                      status={stock.layerResults?.market.status ?? 'caution'}
                    />
                    <LayerCard
                      label="第二層 · 法人"
                      score={stock.layerResults?.institution.score}
                      status={stock.layerResults?.institution.status ?? 'caution'}
                    />
                    <LayerCard
                      label="第三層 · 技術風險"
                      score={stock.layerResults?.technicalRisk.technicalScore}
                      status={stock.layerResults?.technicalRisk.status ?? 'caution'}
                    />
                  </View>
                  <View style={styles.reasonList}>
                    {(stock.rankReasons ?? []).map((reason) => (
                      <View key={reason} style={styles.reasonRow}>
                        <Text style={styles.reasonBullet}>•</Text>
                        <Text style={styles.reasonText}>{reason}</Text>
                      </View>
                    ))}
                  </View>
                  {stock.riskFlags?.length ? (
                    <Text style={styles.riskFlags}>
                      風險標記：{stock.riskFlags.join('、')}
                    </Text>
                  ) : null}
                  <View style={styles.evidenceFooter}>
                    <Text style={styles.auditText}>
                      資料 {formatDate(stock.dataAsOf)} · {stock.ruleVersion ?? '規則版本未提供'}
                    </Text>
                    <PrimaryButton
                      label="開啟 Stock War Room"
                      onPress={() => openStock(stock.symbol)}
                    />
                  </View>
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>

      {!filtered.length ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>沒有符合條件的候選股</Text>
          <Text style={styles.emptyText}>調整搜尋、燈號、風險或類型篩選後再試一次。</Text>
        </Card>
      ) : null}

      <Card style={styles.methodology}>
        <Text style={styles.methodologyTitle}>漏斗方法論揭露</Text>
        <Text style={styles.methodologyText}>
          目前 Chip 與個股 OI 仍屬未完整驗證構面，因此可信度會下調。Top 20 是研究候選清單，不是買進建議；排序變化也不代表未來績效。
        </Text>
      </Card>
    </View>
  );
}

function FilterGroup({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.filterRow}>{children}</View>
    </View>
  );
}

function FilterPill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.filterPill, active && styles.filterPillActive]}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function LayerCard({
  label,
  score,
  status,
}: {
  label: string;
  score?: number;
  status: 'pass' | 'caution' | 'reject';
}) {
  return (
    <View
      style={[
        styles.layerCard,
        status === 'pass'
          ? styles.layerPass
          : status === 'reject'
            ? styles.layerReject
            : styles.layerCaution,
      ]}
    >
      <Text style={styles.layerLabel}>{label}</Text>
      <Text style={styles.layerValue}>
        {status === 'pass' ? '通過' : status === 'reject' ? '排除' : '注意'}
        {Number.isFinite(score) ? ` · ${Number(score).toFixed(1)}` : ''}
      </Text>
    </View>
  );
}

async function exportCandidates(candidates: StockCandidate[]) {
  const csv = `\uFEFF${discoveryCandidatesToCsv(candidates)}`;
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `JASIC-Discovery-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: 'JASIC Discovery 候選清單', message: csv });
}

function formatDate(value?: string) {
  if (!value) return '時間未提供';
  return new Date(value).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
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
  funnelCount: { color: colors.textSoft, fontSize: 11, lineHeight: 17, marginBottom: 14, marginTop: 5 },
  controls: { gap: 13 },
  searchInput: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  filterGroup: { gap: 6 },
  filterLabel: { color: colors.textSoft, fontSize: 10, fontWeight: '900' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filterPill: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textSoft, fontSize: 10, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  controlFooter: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  resultCount: { color: colors.textSoft, fontSize: 9 },
  table: { gap: 10 },
  candidateCard: { padding: 0, overflow: 'hidden' },
  stockCard: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    padding: 16,
  },
  rank: { color: '#A2ADBC', fontSize: 16, fontWeight: '900', width: 26 },
  identity: { flex: 1, minWidth: 160 },
  nameRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  name: { color: colors.text, fontSize: 15, fontWeight: '900' },
  symbol: { color: colors.textSoft, fontSize: 11 },
  meta: { color: colors.textSoft, fontSize: 11, marginLeft: 18, marginTop: 5 },
  scoreBlock: { alignItems: 'flex-end' },
  score: { color: colors.text, fontSize: 22, fontWeight: '900' },
  change: { color: colors.green, fontSize: 10, fontWeight: '700' },
  negative: { color: colors.red },
  badges: { alignItems: 'flex-end', gap: 5 },
  evidencePanel: {
    backgroundColor: colors.canvas,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 13,
    padding: 16,
  },
  layers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  layerCard: { borderRadius: 10, flexBasis: 150, flexGrow: 1, padding: 11 },
  layerPass: { backgroundColor: colors.greenSoft },
  layerCaution: { backgroundColor: colors.amberSoft },
  layerReject: { backgroundColor: colors.redSoft },
  layerLabel: { color: colors.textSoft, fontSize: 9, fontWeight: '800' },
  layerValue: { color: colors.text, fontSize: 12, fontWeight: '900', marginTop: 4 },
  reasonList: { gap: 5 },
  reasonRow: { flexDirection: 'row', gap: 7 },
  reasonBullet: { color: colors.primary },
  reasonText: { color: colors.textSoft, flex: 1, fontSize: 11, lineHeight: 17 },
  riskFlags: { color: colors.red, fontSize: 10, fontWeight: '800' },
  evidenceFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  auditText: { color: colors.textSoft, fontSize: 9 },
  empty: { alignItems: 'center', gap: 6, padding: 28 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  emptyText: { color: colors.textSoft, fontSize: 10, textAlign: 'center' },
  methodology: { backgroundColor: colors.surfaceAlt, gap: 6 },
  methodologyTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  methodologyText: { color: colors.textSoft, fontSize: 10, lineHeight: 17 },
});
