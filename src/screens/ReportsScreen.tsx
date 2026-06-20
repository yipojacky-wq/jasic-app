import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, ErrorState } from '../components/ui';
import { getReports } from '../services/api';
import { colors } from '../theme';

export function ReportsScreen() {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
  });

  if (isLoading) {
    return <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />;
  }
  if (error || !data) {
    return <ErrorState message={error?.message} onRetry={() => void refetch()} />;
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Badge tone="info">Trend Intelligence</Badge>
        <Text style={styles.title}>趨勢報告</Text>
        <Text style={styles.subtitle}>用一致格式追蹤環境、核心池、個股戰情與風險變化。</Text>
      </View>
      <View style={styles.grid}>
        {data.map((report, index) => (
          <Card key={report.title} style={styles.reportCard}>
            <View style={styles.icon}>
              <Text style={styles.iconText}>{['M', 'W', 'S', 'R'][index]}</Text>
            </View>
            <Badge tone={index === 3 ? 'danger' : index === 1 ? 'positive' : 'info'}>
              {report.type}
            </Badge>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.date}>{report.date}</Text>
            <Text style={styles.summary}>{report.summary}</Text>
            <Text style={styles.open}>開啟報告 →</Text>
          </Card>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 22 },
  loader: { marginTop: 120 },
  header: { maxWidth: 720 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 12 },
  subtitle: { color: colors.textSoft, fontSize: 14, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  reportCard: { flexBasis: 260, flexGrow: 1, gap: 12, minHeight: 250 },
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
});
