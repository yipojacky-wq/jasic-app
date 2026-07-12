import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { horizonLabel, sharesToLots } from '../lib/positions';
import { getAiCheckHistory } from '../services/api';
import { colors } from '../theme';
import type { AiAction } from '../types';
import { Badge, Card, ProgressBar } from './ui';

export function AiCheckHistory() {
  const history = useQuery({
    queryKey: ['ai-check-history'],
    queryFn: getAiCheckHistory,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!history.data?.length) return;
    if (!history.data.some((item) => item.id === selectedId)) {
      setSelectedId(history.data[0].id);
    }
  }, [history.data, selectedId]);

  if (history.isLoading) {
    return <ActivityIndicator color={colors.primary} />;
  }
  if (history.error) {
    return <Text style={styles.error}>{history.error.message}</Text>;
  }
  if (!history.data?.length) {
    return (
      <Card style={styles.empty}>
        <Text style={styles.emptyTitle}>尚無 AI Check 紀錄</Text>
        <Text style={styles.emptyText}>
          完成一次 AI Check 後，這裡會顯示歷史建議、風險說明與治理稽核資訊。
        </Text>
      </Card>
    );
  }

  const selected =
    history.data.find((item) => item.id === selectedId) ?? history.data[0];

  return (
    <View style={styles.layout}>
      <View style={styles.list}>
        {history.data.map((item) => (
          <Pressable
            accessibilityLabel={`檢視 ${item.symbol} AI Check 紀錄`}
            key={item.id}
            onPress={() => setSelectedId(item.id)}
          >
            <Card
              style={[
                styles.historyCard,
                selected.id === item.id && styles.historyCardActive,
              ]}
            >
              <View style={styles.historyTop}>
                <View>
                  <Text style={styles.stockName}>{item.name}</Text>
                  <Text style={styles.stockMeta}>
                    {item.symbol} · {formatDate(item.requestedAt)}
                  </Text>
                </View>
                <Badge tone={actionTone(item.action)}>
                  {actionLabel(item.action)}
                </Badge>
              </View>
              <Text style={styles.historyConclusion} numberOfLines={2}>
                {item.conclusion}
              </Text>
              <Text style={styles.confidence}>信心度 {item.confidence}%</Text>
            </Card>
          </Pressable>
        ))}
      </View>

      <Card style={styles.detailCard}>
        <View style={styles.detailTop}>
          <View>
            <Text style={styles.detailEyebrow}>歷史決策紀錄</Text>
            <Text style={styles.detailTitle}>
              {selected.name} · {actionLabel(selected.action)}
            </Text>
          </View>
          <Badge tone={actionTone(selected.action)}>
            信心度 {selected.confidence}%
          </Badge>
        </View>
        <ProgressBar value={selected.confidence} />
        <Text style={styles.conclusion}>{selected.conclusion}</Text>

        <View style={styles.positionGrid}>
          <Metric label="成本" value={formatNumber(selected.cost)} />
          <Metric
            label="張數"
            value={formatNumber(sharesToLots(selected.quantityShares))}
          />
          <Metric
            label="期間"
            value={displayHorizon(selected.investmentHorizon)}
          />
          <Metric label="風險偏好" value={riskProfileLabel(selected.riskProfile)} />
        </View>

        <HistoryList title="原因" items={selected.reasons} tone="info" />
        <HistoryList title="風險" items={selected.risks} tone="danger" />
        <HistoryList title="建議" items={selected.suggestions} tone="positive" />

        <View style={styles.audit}>
          <Text style={styles.auditTitle}>AI 治理稽核</Text>
          <AuditLine label="模型" value={selected.modelIdentifier} />
          <AuditLine label="提示版本" value={selected.promptVersion} />
          <AuditLine label="格式版本" value={selected.responseSchemaVersion} />
          <AuditLine label="規則版本" value={selected.ruleVersion} />
          <AuditLine
            label="允許動作"
            value={selected.allowedActions.map(actionLabel).join('、')}
          />
          <AuditLine label="產生時間" value={formatDateTime(selected.createdAt)} />
        </View>

        <Text style={styles.disclaimer}>
          本工具僅提供研究與風險檢核，不保證獲利，不提供自動下單或代客交易服務。
        </Text>
      </Card>
    </View>
  );
}

function displayHorizon(value: string) {
  if (['short', 'swing', 'medium', 'long'].includes(value)) {
    return horizonLabel(value as 'short' | 'swing' | 'medium' | 'long');
  }
  return value;
}

function HistoryList({
  items,
  title,
  tone,
}: {
  items: string[];
  title: string;
  tone: 'info' | 'danger' | 'positive';
}) {
  return (
    <View style={styles.resultList}>
      <Badge tone={tone}>{title}</Badge>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function AuditLine({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.auditText}>
      {label}：{value || '未提供'}
    </Text>
  );
}

function actionLabel(action: AiAction) {
  return {
    ADD: '加碼',
    HOLD: '續抱',
    WAIT: '觀望',
    REDUCE: '減碼',
    STOP_LOSS: '停損',
  }[action];
}

function actionTone(action: AiAction) {
  if (action === 'ADD' || action === 'HOLD') return 'positive' as const;
  if (action === 'WAIT') return 'warning' as const;
  return 'danger' as const;
}

function riskProfileLabel(value: string) {
  return {
    conservative: '保守',
    balanced: '穩健',
    aggressive: '積極',
    growth: '成長',
  }[value] ?? value;
}

function formatNumber(value: number) {
  return value.toLocaleString('zh-TW', { maximumFractionDigits: 4 });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
  });
}

const styles = StyleSheet.create({
  layout: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  list: { flexBasis: 285, flexGrow: 0.7, gap: 9 },
  historyCard: { gap: 9, padding: 14 },
  historyCardActive: { borderColor: colors.primary, borderWidth: 2 },
  historyTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  stockName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  stockMeta: { color: colors.textSoft, fontSize: 9, marginTop: 3 },
  historyConclusion: { color: colors.textSoft, fontSize: 10, lineHeight: 16 },
  confidence: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  detailCard: { flexBasis: 480, flexGrow: 1.3, gap: 16 },
  detailTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  detailEyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  detailTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 },
  conclusion: { color: colors.text, fontSize: 13, fontWeight: '700', lineHeight: 21 },
  positionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: {
    backgroundColor: colors.canvas,
    borderRadius: 10,
    flexBasis: 110,
    flexGrow: 1,
    padding: 10,
  },
  metricLabel: { color: colors.textSoft, fontSize: 9 },
  metricValue: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 3 },
  resultList: { gap: 7 },
  bulletRow: { flexDirection: 'row', gap: 7 },
  bullet: { color: colors.primary },
  bulletText: { color: colors.textSoft, flex: 1, fontSize: 11, lineHeight: 17 },
  audit: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    gap: 4,
    padding: 12,
  },
  auditTitle: { color: colors.text, fontSize: 11, fontWeight: '900' },
  auditText: { color: colors.textSoft, fontSize: 9 },
  disclaimer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    color: colors.textSoft,
    fontSize: 9,
    lineHeight: 15,
    paddingTop: 10,
  },
  empty: { alignItems: 'center', gap: 7, padding: 28 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  emptyText: { color: colors.textSoft, fontSize: 10, textAlign: 'center' },
  error: { color: colors.red, fontSize: 11 },
});
