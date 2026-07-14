import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { AiCheckHistory } from '../components/AiCheckHistory';
import { sharesToLots } from '../lib/positions';
import {
  aiCheckResearchUrl,
  aiCheckShareText,
} from '../lib/researchShare';
import { currentWebOrigin, shareResearch } from '../lib/shareResearch';
import { getUserPositions, getUserProfile, runAiCheck, searchStocks } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme';
import type { InvestmentHorizon, UserProfile } from '../types';
import { validateAiCheckInput } from '../../supabase/functions/_shared/aiInput.ts';

const horizons: Array<{ key: InvestmentHorizon; label: string }> = [
  { key: 'short', label: '短線' },
  { key: 'swing', label: '波段' },
  { key: 'medium', label: '中期' },
  { key: 'long', label: '長期' },
];
const profiles: UserProfile['riskProfile'][] = [
  'conservative',
  'balanced',
  'aggressive',
  'growth',
];
const profileLabels: Record<string, string> = {
  conservative: '保守',
  balanced: '穩健',
  aggressive: '積極',
  growth: '成長',
};

export function AiCheckScreen() {
  const queryClient = useQueryClient();
  const aiCheckSymbol = useAppStore((state) => state.aiCheckSymbol);
  const [symbol, setSymbol] = useState(aiCheckSymbol);
  const [cost, setCost] = useState('980');
  const [lots, setLots] = useState('1');
  const [horizon, setHorizon] = useState<InvestmentHorizon>('medium');
  const [riskProfile, setRiskProfile] =
    useState<UserProfile['riskProfile']>('balanced');
  const [submitted, setSubmitted] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const normalizedSymbolKeyword = symbol.trim();
  const profile = useQuery({
    queryKey: ['user-profile'],
    queryFn: getUserProfile,
  });
  const positions = useQuery({
    queryKey: ['user-positions'],
    queryFn: getUserPositions,
  });
  const stockSearch = useQuery({
    queryKey: ['ai-check-stock-search', normalizedSymbolKeyword],
    queryFn: () => searchStocks(normalizedSymbolKeyword),
    enabled: normalizedSymbolKeyword.length > 0,
    staleTime: 60_000,
  });
  const mutation = useMutation({
    mutationFn: runAiCheck,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-check-history'] });
    },
  });

  useEffect(() => {
    if (!profile.data) return;
    setRiskProfile(profile.data.riskProfile);
    setHorizon(profile.data.defaultHorizon);
  }, [profile.data]);

  useEffect(() => {
    const position = positions.data?.find(
      (item) => item.symbol === symbol.trim(),
    );
    if (!position) return;
    setCost(String(position.averageCost));
    setLots(String(sharesToLots(position.quantityShares)));
    setHorizon(position.investmentHorizon);
  }, [positions.data, symbol]);

  const validation = validateAiCheckInput({
    symbol,
    cost,
    lots,
    horizon,
    riskProfile,
  });

  const submit = () => {
    setSubmitted(true);
    setShareStatus(null);
    if (!validation.ok) return;
    mutation.mutate(validation.value);
  };

  const shareResult = async () => {
    if (!mutation.data) return;
    setShareStatus(null);
    try {
      const normalizedSymbol = symbol.trim();
      const url = aiCheckResearchUrl(normalizedSymbol, currentWebOrigin());
      const outcome = await shareResearch(
        `JASIC AI Check｜${normalizedSymbol}`,
        aiCheckShareText(normalizedSymbol, mutation.data, url),
      );
      setShareStatus(
        outcome === 'copied'
          ? 'AI Check 摘要與連結已複製。'
          : 'AI Check 摘要已開啟分享。',
      );
    } catch (error) {
      setShareStatus(
        error instanceof Error ? error.message : 'AI Check 分享失敗，請稍後再試。',
      );
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Badge tone="info">決策輔助</Badge>
        <Text style={styles.title}>AI 投資檢核</Text>
        <Text style={styles.subtitle}>
          輸入你的持股背景，JASIC 會先檢查市場、個股與部位風險，再提供可解釋的研究建議。
        </Text>
      </View>

      <View style={styles.columns}>
        <Card style={styles.formCard}>
          <SectionHeader eyebrow="持股輸入" title="持股資訊" />
          {positions.data?.some((item) => item.symbol === symbol.trim()) ? (
            <View style={styles.prefillNotice}>
              <Badge tone="positive">已帶入研究持倉</Badge>
              <Text style={styles.prefillText}>
                成本、張數與投資期間來自「個人追蹤」，仍可在此調整後再檢核。
              </Text>
            </View>
          ) : null}
          <Field label="股票代號">
            <TextInput
              accessibilityLabel="股票代號"
              autoCapitalize="characters"
              autoCorrect={false}
              inputMode="search"
              onChangeText={(value) => setSymbol(value.toUpperCase())}
              placeholder="例如：2330、台積電、TSMC"
              placeholderTextColor="#9AA5B5"
              style={styles.input}
              value={symbol}
            />
            {normalizedSymbolKeyword.length ? (
              <View style={styles.stockSearchResults}>
                {stockSearch.isFetching ? (
                  <ActivityIndicator color={colors.primary} />
                ) : stockSearch.error ? (
                  <Text style={styles.stockSearchMessage}>{stockSearch.error.message}</Text>
                ) : stockSearch.data?.length ? (
                  stockSearch.data.slice(0, 5).map((stock) => (
                    <Pressable
                      key={`${stock.exchange}-${stock.symbol}`}
                      onPress={() => {
                        setSymbol(stock.symbol);
                        setSubmitted(false);
                      }}
                      style={styles.stockSearchRow}
                    >
                      <View>
                        <Text style={styles.stockSearchName}>{stock.name}</Text>
                        <Text style={styles.stockSearchMeta}>
                          {stock.symbol} · {stock.exchange}
                          {stock.industry ? ` · ${stock.industry}` : ''}
                        </Text>
                      </View>
                      <Badge tone="info">選取</Badge>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.stockSearchMessage}>
                    找不到符合的股票，請改用股票代號或完整公司名稱。
                  </Text>
                )}
              </View>
            ) : null}
            {submitted && validation.errors.symbol ? (
              <Text style={styles.fieldError}>{validation.errors.symbol}</Text>
            ) : null}
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
              {submitted && validation.errors.cost ? (
                <Text style={styles.fieldError}>{validation.errors.cost}</Text>
              ) : null}
            </Field>
            <Field label="張數" style={styles.flex}>
              <TextInput
                accessibilityLabel="張數"
                keyboardType="decimal-pad"
                onChangeText={setLots}
                style={styles.input}
                value={lots}
              />
              {submitted && validation.errors.lots ? (
                <Text style={styles.fieldError}>{validation.errors.lots}</Text>
              ) : null}
            </Field>
          </View>

          <Text style={styles.label}>投資期間</Text>
          <View style={styles.optionRow}>
            {horizons.map((item) => (
              <Option
                key={item.key}
                active={horizon === item.key}
                label={item.label}
                onPress={() => setHorizon(item.key)}
              />
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

          <PositionExposure validation={validation} />
          {submitted && validation.errors.costBasis ? (
            <Text style={styles.formError}>{validation.errors.costBasis}</Text>
          ) : null}
          <PrimaryButton
            disabled={mutation.isPending}
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
                  <Text style={styles.resultEyebrow}>JASIC 檢核結論</Text>
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
              <View style={styles.resultActions}>
                <PrimaryButton
                  label="分享 AI Check"
                  onPress={() => void shareResult()}
                  secondary
                />
              </View>
              {shareStatus ? (
                <Text style={styles.shareStatus}>{shareStatus}</Text>
              ) : null}
              <Text style={styles.timestamp}>
                檢核完成；正式模式會保存資料時間、模型與規則版本。
              </Text>
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

      <SectionHeader eyebrow="決策紀錄" title="AI Check 歷史紀錄" />
      <AiCheckHistory />
    </View>
  );
}

function PositionExposure({
  validation,
}: {
  validation: ReturnType<typeof validateAiCheckInput>;
}) {
  if (!validation.ok) {
    return (
      <View style={styles.exposureCard}>
        <Text style={styles.exposureLabel}>部位曝險預覽</Text>
        <Text style={styles.exposureMuted}>完成有效輸入後顯示股數與投入成本估算。</Text>
      </View>
    );
  }
  return (
    <View style={styles.exposureCard}>
      <View style={styles.exposureMetric}>
        <Text style={styles.exposureLabel}>換算股數</Text>
        <Text style={styles.exposureValue}>
          {validation.value.quantityShares.toLocaleString()} 股
        </Text>
      </View>
      <View style={styles.exposureMetric}>
        <Text style={styles.exposureLabel}>投入成本估算</Text>
        <Text style={styles.exposureValue}>
          NT$ {validation.value.costBasis.toLocaleString()}
        </Text>
      </View>
      <Text style={styles.exposureMuted}>
        此為輸入成本 × 股數，不是即時市值或券商餘額。
      </Text>
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
  prefillNotice: {
    backgroundColor: colors.greenSoft,
    borderRadius: 12,
    gap: 7,
    padding: 11,
  },
  prefillText: { color: colors.textSoft, fontSize: 10, lineHeight: 16 },
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
  stockSearchResults: { gap: 8 },
  stockSearchRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    padding: 10,
  },
  stockSearchName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  stockSearchMeta: { color: colors.textSoft, fontSize: 10, marginTop: 3 },
  stockSearchMessage: { color: colors.textSoft, fontSize: 11, lineHeight: 17 },
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
  fieldError: { color: colors.red, fontSize: 9 },
  formError: { color: colors.red, fontSize: 10, fontWeight: '800' },
  exposureCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 13,
  },
  exposureMetric: { flex: 1, minWidth: 120 },
  exposureLabel: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  exposureValue: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 4 },
  exposureMuted: { color: colors.textSoft, fontSize: 9, lineHeight: 14, width: '100%' },
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
  resultActions: { alignItems: 'flex-start' },
  shareStatus: { color: colors.textSoft, fontSize: 10 },
});
