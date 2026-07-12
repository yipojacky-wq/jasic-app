import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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

import { Badge, Card, ErrorState, PrimaryButton } from '../components/ui';
import { reportFilename, reportToMarkdown } from '../lib/reportExport';
import {
  getReportBookmarks,
  getReportDetail,
  getReports,
  setReportBookmark,
} from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';
import type { ReportDetail, ReportSection } from '../types';

type ReportFilter = 'All' | 'Daily' | 'Weekly' | 'War Room' | 'Risk' | 'Saved';

export function ReportsScreen() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ReportFilter>('All');
  const openStock = useAppStore((state) => state.openStock);
  const list = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
  });
  const detail = useQuery({
    queryKey: ['report-detail', selectedId],
    queryFn: () => getReportDetail(selectedId!),
    enabled: Boolean(selectedId),
  });
  const bookmarks = useQuery({
    queryKey: ['report-bookmarks'],
    queryFn: getReportBookmarks,
  });
  const bookmarkIds = new Set(
    (bookmarks.data ?? []).map((bookmark) => bookmark.reportId),
  );
  const bookmark = useMutation({
    mutationFn: ({
      reportId,
      shouldBookmark,
    }: {
      reportId: string;
      shouldBookmark: boolean;
    }) => setReportBookmark(reportId, shouldBookmark),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['report-bookmarks'] });
    },
  });

  if (selectedId) {
    if (detail.isLoading) {
      return <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />;
    }
    if (detail.error || !detail.data) {
      return (
        <View style={styles.page}>
          <Pressable onPress={() => setSelectedId(null)}>
            <Text style={styles.back}>← 返回報告列表</Text>
          </Pressable>
          <ErrorState
            message={detail.error?.message}
            onRetry={() => void detail.refetch()}
          />
        </View>
      );
    }
    const report = detail.data;
    const isSaved = bookmarkIds.has(report.id);
    return (
      <View style={styles.page}>
        <View style={styles.detailToolbar}>
          <Pressable onPress={() => setSelectedId(null)}>
            <Text style={styles.back}>← 返回報告列表</Text>
          </Pressable>
          <View style={styles.detailToolbarActions}>
            <PrimaryButton
              disabled={bookmark.isPending}
              label={isSaved ? '★ 已收藏' : '☆ 收藏報告'}
              onPress={() =>
                bookmark.mutate({
                  reportId: report.id,
                  shouldBookmark: !isSaved,
                })
              }
              secondary
            />
            <PrimaryButton
              label={Platform.OS === 'web' ? '下載 Markdown' : '分享報告'}
              onPress={() => void exportReport(report)}
            />
          </View>
        </View>
        <View style={styles.detailHero}>
          <Badge tone={report.reportType === 'risk_alert' ? 'danger' : 'info'}>
            {reportTypeLabel(report.type)}
          </Badge>
          <Text style={styles.detailTitle}>{report.title}</Text>
          <Text style={styles.detailSummary}>{report.summary}</Text>
          <Text style={styles.metadata}>
            資料時間 {formatDateTime(report.asOf)} · {report.ruleVersion}
          </Text>
        </View>

        <View style={styles.metrics}>
          {report.metrics.map((metric) => (
            <Card key={metric.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              {metric.note ? <Text style={styles.metricNote}>{metric.note}</Text> : null}
            </Card>
          ))}
        </View>

        <View style={styles.sections}>
          {report.sections.map((section) => (
            <ReportSectionCard key={section.title} section={section} />
          ))}
        </View>

        {report.stockSymbol ? (
          <View style={styles.detailAction}>
            <PrimaryButton
              label={`開啟 ${report.stockSymbol} 個股作戰室`}
              onPress={() => openStock(report.stockSymbol!)}
            />
          </View>
        ) : null}
        <Card style={styles.disclaimerCard}>
          <Text style={styles.disclaimer}>{report.disclaimer}</Text>
        </Card>
      </View>
    );
  }

  if (list.isLoading) {
    return <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />;
  }
  if (list.error || !list.data) {
    return <ErrorState message={list.error?.message} onRetry={() => void list.refetch()} />;
  }

  const normalizedSearch = search.trim().toLocaleLowerCase('zh-TW');
  const filteredReports = list.data.filter((report) => {
    const matchesSearch =
      !normalizedSearch ||
      `${report.title} ${report.summary} ${report.type}`
        .toLocaleLowerCase('zh-TW')
        .includes(normalizedSearch);
    const matchesFilter =
      filter === 'All'
        ? true
        : filter === 'Saved'
          ? bookmarkIds.has(report.id)
          : report.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Badge tone="info">趨勢情報</Badge>
        <Text style={styles.title}>趨勢報告</Text>
        <Text style={styles.subtitle}>用一致格式追蹤環境、核心池、個股戰情與風險變化。</Text>
      </View>
      <Card style={styles.controls}>
        <TextInput
          accessibilityLabel="搜尋趨勢報告"
          onChangeText={setSearch}
          placeholder="搜尋標題、摘要或報告類型"
          placeholderTextColor="#98A2B1"
          style={styles.searchInput}
          value={search}
        />
        <View style={styles.filterRow}>
          {(['All', 'Daily', 'Weekly', 'War Room', 'Risk', 'Saved'] as ReportFilter[]).map(
            (item) => (
              <Pressable
                accessibilityRole="button"
                key={item}
                onPress={() => setFilter(item)}
                style={[
                  styles.filterPill,
                  filter === item && styles.filterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === item && styles.filterTextActive,
                  ]}
                >
                  {filterLabel(item)}
                </Text>
              </Pressable>
            ),
          )}
        </View>
        <Text style={styles.resultCount}>
          顯示 {filteredReports.length} / {list.data.length} 份報告
        </Text>
      </Card>
      <View style={styles.grid}>
        {filteredReports.map((report, index) => {
          const isSaved = bookmarkIds.has(report.id);
          return (
            <Card key={report.id} style={styles.reportCard}>
              <View style={styles.cardTop}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>{['M', 'W', 'S', 'R'][index] ?? 'J'}</Text>
              </View>
                <Pressable
                  accessibilityLabel={`${isSaved ? '取消收藏' : '收藏'} ${report.title}`}
                  disabled={bookmark.isPending}
                  onPress={() =>
                    bookmark.mutate({
                      reportId: report.id,
                      shouldBookmark: !isSaved,
                    })
                  }
                  style={[styles.bookmark, isSaved && styles.bookmarkActive]}
                >
                  <Text style={[styles.bookmarkText, isSaved && styles.bookmarkTextActive]}>
                    {isSaved ? '★' : '☆'}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityLabel={`開啟報告 ${report.title}`}
                onPress={() => setSelectedId(report.id)}
                style={styles.reportBody}
              >
                <Badge tone={report.type === 'Risk' ? 'danger' : report.type === 'Weekly' ? 'positive' : 'info'}>
                  {reportTypeLabel(report.type)}
                </Badge>
                <Text style={styles.reportTitle}>{report.title}</Text>
                <Text style={styles.date}>{report.date}</Text>
                <Text style={styles.summary}>{report.summary}</Text>
                <Text style={styles.open}>開啟報告 →</Text>
              </Pressable>
            </Card>
          );
        })}
      </View>
      {!filteredReports.length ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>沒有符合條件的報告</Text>
          <Text style={styles.emptyText}>調整搜尋文字或分類後再試一次。</Text>
        </Card>
      ) : null}
    </View>
  );
}

async function exportReport(report: ReportDetail) {
  const markdown = reportToMarkdown(report);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([markdown], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = reportFilename(report);
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({
    title: report.title,
    message: markdown,
  });
}

function filterLabel(filter: ReportFilter) {
  return {
    All: '全部',
    Daily: '每日市場',
    Weekly: '核心池週報',
    'War Room': '個股戰情',
    Risk: '風險警示',
    Saved: '已收藏',
  }[filter];
}

function reportTypeLabel(value: string) {
  return {
    Daily: '每日市場',
    Weekly: '核心池週報',
    'War Room': '個股戰情',
    Risk: '風險警示',
    每日市場: '每日市場',
    核心池週報: '核心池週報',
    個股戰情: '個股戰情',
    風險警示: '風險警示',
  }[value] ?? value;
}

function ReportSectionCard({ section }: { section: ReportSection }) {
  const tone = section.tone ?? 'info';
  return (
    <Card
      style={[
        styles.sectionCard,
        tone === 'danger'
          ? styles.sectionDanger
          : tone === 'warning'
            ? styles.sectionWarning
            : tone === 'positive'
              ? styles.sectionPositive
              : styles.sectionInfo,
      ]}
    >
      <Badge tone={tone}>{section.title}</Badge>
      {section.items.map((item) => (
        <View key={item} style={styles.itemRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </Card>
  );
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
}

const styles = StyleSheet.create({
  page: { gap: 22 },
  loader: { marginTop: 120 },
  back: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  detailToolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  detailToolbarActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  header: { maxWidth: 720 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 12 },
  subtitle: { color: colors.textSoft, fontSize: 14, marginTop: 8 },
  controls: { gap: 12 },
  searchInput: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 45,
    paddingHorizontal: 13,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filterPill: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textSoft, fontSize: 10, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  resultCount: { color: colors.textSoft, fontSize: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  reportCard: { flexBasis: 260, flexGrow: 1, gap: 10, minHeight: 250 },
  cardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportBody: { flex: 1, gap: 12 },
  bookmark: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  bookmarkActive: { backgroundColor: colors.amberSoft },
  bookmarkText: { color: colors.textSoft, fontSize: 20 },
  bookmarkTextActive: { color: colors.amber },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  iconText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  reportTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  date: { color: colors.textSoft, fontSize: 11 },
  summary: { color: colors.textSoft, flex: 1, fontSize: 12, lineHeight: 19 },
  open: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  detailHero: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    gap: 10,
    padding: 25,
  },
  detailTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  detailSummary: { color: '#C0CAD8', fontSize: 14, lineHeight: 22, maxWidth: 780 },
  metadata: { color: colors.mutedOnDark, fontSize: 10 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { flex: 1, minWidth: 155 },
  metricLabel: { color: colors.textSoft, fontSize: 11, fontWeight: '800' },
  metricValue: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 7 },
  metricNote: { color: colors.textSoft, fontSize: 10, marginTop: 4 },
  sections: { gap: 12 },
  sectionCard: { borderLeftWidth: 4, gap: 10 },
  sectionInfo: { borderLeftColor: colors.primary },
  sectionPositive: { borderLeftColor: colors.green },
  sectionWarning: { borderLeftColor: colors.amber },
  sectionDanger: { borderLeftColor: colors.red },
  itemRow: { flexDirection: 'row', gap: 9 },
  bullet: { color: colors.primary, fontSize: 13 },
  itemText: { color: colors.textSoft, flex: 1, fontSize: 12, lineHeight: 19 },
  detailAction: { alignItems: 'flex-end' },
  disclaimerCard: { backgroundColor: colors.surfaceAlt },
  disclaimer: { color: colors.textSoft, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  empty: { alignItems: 'center', gap: 6, padding: 28 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  emptyText: { color: colors.textSoft, fontSize: 10 },
});
