import { useMutation, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Badge, Card, PrimaryButton, ProgressBar, SectionHeader } from '../components/ui';
import { getUserProfile, runAiCheck } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';

const horizons = ['短線', '波段', '中期', '長期'];
const profiles = ['conservative', 'balanced', 'aggressive', 'growth'];
const profileLabels: Record<string, string> = {
  conservative: '保守',
  balanced: '穩健',
  aggressive: '積極',
  growth: '成長',
};

export function AiCheckScreen() {
  const aiCheckSymbol = useAppStore((state) => state.aiCheckSymbol);
  const [symbol, setSymbol] = useState(aiCheckSymbol);
  const [cost, setCost] = useState('980');
  const [lots, setLots] = useState('1');
  const [horizon, setHorizon] = useState('中期');
  const [riskProfile, setRiskProfile] = useState('balanced');
  const profile = useQuery({
    queryKey: ['user-profile'],
    queryFn: getUserProfile,
  });
  const mutation = useMutation({ mutationFn: runAiCheck });

  useEffect(() => {
    if (!profile.data) return;
    setRiskProfile(profile.data.riskProfile);
    setHorizon(
      {
        short: '短線',
        swing: '波段',
        medium: '中期',
        long: '長期',
      }[profile.data.defaultHorizon],
    );
  }, [profile.data]);

  const submit = () => {
    mutation.mutate({
      symbol: symbol.trim(),
      cost: Number(cost),
      lots: Number(lots),
      horizon,
      riskProfile,
    });
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Badge tone="info">Decision Assistant</Badge>
        <Text style={styles.title}>AI 投資檢核</Text>
        <Text style={styles.subtitle}>
          輸入你的持股背景，JASIC 會先檢查市場、個股與部位風險，再提供可解釋的研究建議。
        </Text>
      </View>

      <View style={styles.columns}>
        <Card style={styles.formCard}>
          <SectionHeader eyebrow="Position Input" title="持股資訊" />
          <Field label="股票代號">
            <TextInput
              accessibilityLabel="股票代號"
              onChangeText={setSymbol}
              placeholder="例如 2330"
              placeholderTextColor="#9AA5B5"
              style={styles.input}
              value={symbol}
            />
          </Field>
          <View style={styles.formRow}>
            <Field label="平均成本" style={styles.flex}>
              <TextInput
                accessibilityLabel="平均成本"
                keyboardType="decimal-pad"
                onChangeText={setCost}
                style={styles.input}
                value={cost}
              />
            </Field>
            <Field label="張數" style={styles.flex}>
              <TextInput
                accessibilityLabel="張數"
                keyboardType="decimal-pad"
                onChangeText={setLots}
                style={styles.input}
                value={lots}
              />
            </Field>
          </View>

          <Text style={styles.label}>投資期間</Text>
          <View style={styles.optionRow}>
            {horizons.map((item) => (
              <Option key={item} active={horizon === item} label={item} onPress={() => setHorizon(item)} />
            ))}
          </View>

          <Text style={styles.label}>風險偏好</Text>
          <View style={styles.optionRow}>
            {profiles.map((item) => (
              <Option
                key={item}
                active={riskProfile === item}
                label={profileLabels[item]}
                onPress={() => setRiskProfile(item)}
              />
            ))}
          </View>

          <PrimaryButton
            disabled={!symbol || !Number(cost) || mutation.isPending}
            label={mutation.isPending ? '正在檢核資料…' : '開始 AI Check'}
            onPress={submit}
          />
          <Text style={styles.helper}>不連接券商、不自動下單、不保證獲利。</Text>
        </Card>

        <View style={styles.resultColumn}>
          {mutation.isPending ? (
            <Card style={styles.loadingCard}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.loadingTitle}>正在組合市場與個股證據</Text>
              <Text style={styles.helper}>規則引擎先行，AI 只負責結構化解釋。</Text>
            </Card>
          ) : mutation.isError ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>!</Text>
              <Text style={styles.emptyTitle}>AI Check 暫時無法完成</Text>
              <Text style={styles.emptyText}>{mutation.error.message}</Text>
              <PrimaryButton label="重新檢核" onPress={submit} secondary />
            </Card>
          ) : mutation.data ? (
            <Card style={styles.resultCard}>
              <View style={styles.resultTop}>
                <View>
                  <Text style={styles.resultEyebrow}>JASIC CONCLUSION</Text>
                  <Text style={styles.action}>{actionLabel(mutation.data.action)}</Text>
                </View>
                <Badge tone={mutation.data.action === 'WAIT' ? 'warning' : 'positive'}>
                  信心 {mutation.data.confidence}%
                </Badge>
              </View>
              <Text style={styles.conclusion}>{mutation.data.conclusion}</Text>
              <ProgressBar value={mutation.data.confidence} />
              <ResultList title="原因" items={mutation.data.reasons} tone="info" />
              <ResultList title="風險" items={mutation.data.risks} tone="danger" />
              <ResultList title="建議" items={mutation.data.suggestions} tone="positive" />
              <Text style={styles.timestamp}>資料時間：2026-06-20 16:30 Asia/Taipei</Text>
            </Card>
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>◎</Text>
              <Text style={styles.emptyTitle}>等待你的檢核條件</Text>
              <Text style={styles.emptyText}>
                結果將固定包含結論、原因、風險與建議，資料不足時只會建議觀望。
              </Text>
            </Card>
          )}
        </View>
      </View>
    </View>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Option({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.option, active && styles.optionActive]}>
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ResultList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
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

function actionLabel(action: string) {
  return {
    ADD: '加碼',
    HOLD: '續抱',
    WAIT: '觀望',
    REDUCE: '減碼',
    STOP_LOSS: '停損',
  }[action] ?? action;
}

const styles = StyleSheet.create({
  page: { gap: 22 },
  header: { maxWidth: 720 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 12 },
  subtitle: { color: colors.textSoft, fontSize: 14, lineHeight: 22, marginTop: 8 },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  formCard: { flex: 1, gap: 16, minWidth: 300 },
  resultColumn: { flex: 1.25, minWidth: 300 },
  field: { gap: 7 },
  flex: { flex: 1 },
  formRow: { flexDirection: 'row', gap: 12 },
  label: { color: colors.textSoft, fontSize: 12, fontWeight: '800' },
  input: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.textSoft, fontSize: 12, fontWeight: '800' },
  optionTextActive: { color: '#FFFFFF' },
  helper: { color: colors.textSoft, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  loadingCard: { alignItems: 'center', gap: 12, justifyContent: 'center', minHeight: 390 },
  loadingTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  emptyCard: { alignItems: 'center', justifyContent: 'center', minHeight: 390, padding: 34 },
  emptyIcon: { color: colors.primary, fontSize: 46, fontWeight: '300' },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 10 },
  emptyText: { color: colors.textSoft, fontSize: 13, lineHeight: 21, marginTop: 8, maxWidth: 360, textAlign: 'center' },
  resultCard: { gap: 18 },
  resultTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  resultEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  action: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 3 },
  conclusion: { color: colors.text, fontSize: 15, fontWeight: '700', lineHeight: 24 },
  resultList: { gap: 8 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bullet: { color: colors.primary, fontSize: 14 },
  bulletText: { color: colors.textSoft, flex: 1, fontSize: 12, lineHeight: 18 },
  timestamp: { color: '#96A1B1', fontSize: 10, marginTop: 4 },
});
