import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Badge, Card, ErrorState, PrimaryButton } from '../components/ui';
import { getReportDetail, getReports } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';
import type { ReportSection } from '../types';

export function ReportsScreen() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    return (
      <View style={styles.page}>
        <Pressable onPress={() => setSelectedId(null)}>
          <Text style={styles.back}>← 返回報告列表</Text>
        </Pressable>
        <View style={styles.detailHero}>
          <Badge tone={report.reportType === 'risk_alert' ? 'danger' : 'info'}>
            {report.type}
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
              label={`開啟 ${report.stockSymbol} Stock War Room`}
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

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Badge tone="info">Trend Intelligence</Badge>
        <Text style={styles.title}>趨勢報告</Text>
        <Text style={styles.subtitle}>用一致格式追蹤環境、核心池、個股戰情與風險變化。</Text>
      </View>
      <View style={styles.grid}>
        {list.data.map((report, index) => (
          <Pressable
            key={report.id}
            onPress={() => setSelectedId(report.id)}
            style={styles.reportPressable}
          >
            <Card style={styles.reportCard}>
              <View style={styles.icon}>
                <Text style={styles.iconText}>{['M', 'W', 'S', 'R'][index] ?? 'J'}</Text>
              </View>
              <Badge tone={report.type === 'Risk' ? 'danger' : report.type === 'Weekly' ? 'positive' : 'info'}>
                {report.type}
              </Badge>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.date}>{report.date}</Text>
              <Text style={styles.summary}>{report.summary}</Text>
              <Text style={styles.open}>開啟報告 →</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </View>
  );
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
  header: { maxWidth: 720 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 12 },
  subtitle: { color: colors.textSoft, fontSize: 14, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  reportPressable: { flexBasis: 260, flexGrow: 1 },
  reportCard: { gap: 12, minHeight: 250 },
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
});
