import { StyleSheet, Text, View } from 'react-native';

import { clientDataSourceRegistry } from '../data/dataSourceRegistry';
import { colors } from '../theme';
import { Badge, Card } from './ui';

export function SourceRegistryPanel() {
  const connected = clientDataSourceRegistry.filter(
    (source) => source.status === 'connected',
  );
  const pending = clientDataSourceRegistry.filter(
    (source) => source.status === 'pending_review',
  );

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryCopy}>
          <Text style={styles.eyebrow}>DATA SOURCE REGISTRY</Text>
          <Text style={styles.title}>Production data readiness</Text>
          <Text style={styles.note}>
            JASIC separates connected official adapters from sources that still
            need provider, license, and redistribution review before production use.
          </Text>
        </View>
        <View style={styles.metricRow}>
          <RegistryMetric label="Connected" value={connected.length} tone="positive" />
          <RegistryMetric label="Pending" value={pending.length} tone="warning" />
        </View>
      </Card>

      <View style={styles.grid}>
        {clientDataSourceRegistry.map((source) => (
          <Card key={source.code} style={styles.sourceCard}>
            <View style={styles.sourceTop}>
              <View style={styles.sourceHeading}>
                <Text style={styles.sourceName}>{source.datasetName}</Text>
                <Text style={styles.sourceCode}>{source.code}</Text>
              </View>
              <Badge
                tone={source.status === 'connected' ? 'positive' : 'warning'}
              >
                {source.status === 'connected' ? 'Connected' : 'Pending'}
              </Badge>
            </View>
            <Text style={styles.provider}>{source.provider}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{source.domain}</Text>
              <Text style={styles.meta}>{source.frequency}</Text>
            </View>
            <Text style={styles.sourceNote}>{source.note}</Text>
          </Card>
        ))}
      </View>
    </View>
  );
}

function RegistryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'positive' | 'warning';
}) {
  const color = tone === 'positive' ? colors.green : colors.amber;
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  summaryCard: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  summaryCopy: { flex: 1, minWidth: 240 },
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 5 },
  note: { color: colors.textSoft, fontSize: 11, lineHeight: 18, marginTop: 6 },
  metricRow: { flexDirection: 'row', gap: 9 },
  metric: {
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: 12,
    minWidth: 86,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  metricValue: { fontSize: 21, fontWeight: '900' },
  metricLabel: { color: colors.textSoft, fontSize: 9, fontWeight: '800', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sourceCard: { flexBasis: 300, flexGrow: 1, gap: 9 },
  sourceTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  sourceHeading: { flex: 1 },
  sourceName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  sourceCode: { color: '#909BAC', fontSize: 8, marginTop: 3 },
  provider: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  meta: {
    backgroundColor: colors.canvas,
    borderRadius: 999,
    color: colors.textSoft,
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  sourceNote: { color: colors.textSoft, fontSize: 11, lineHeight: 17 },
});
