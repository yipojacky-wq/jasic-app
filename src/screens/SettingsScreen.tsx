import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
  SectionHeader,
} from '../components/ui';
import { isLiveMode, supabase } from '../lib/supabase';
import {
  deleteAccount,
  exportUserData,
  getSettingsOverview,
  updateUserProfile,
} from '../services/api';
import { colors } from '../theme';
import type { DataHealthItem, UserProfile } from '../types';

const riskProfiles: Array<{
  key: UserProfile['riskProfile'];
  label: string;
  note: string;
}> = [
  { key: 'conservative', label: '保守', note: '優先控制回撤與部位風險' },
  { key: 'balanced', label: '穩健', note: '平衡風險與機會' },
  { key: 'aggressive', label: '積極', note: '可承受較高波動' },
  { key: 'growth', label: '成長', note: '偏好中長期成長趨勢' },
];

const horizons: Array<{
  key: UserProfile['defaultHorizon'];
  label: string;
}> = [
  { key: 'short', label: '短線' },
  { key: 'swing', label: '波段' },
  { key: 'medium', label: '中期' },
  { key: 'long', label: '長期' },
];

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ['settings-overview'],
    queryFn: getSettingsOverview,
  });
  const [displayName, setDisplayName] = useState('');
  const [riskProfile, setRiskProfile] =
    useState<UserProfile['riskProfile']>('balanced');
  const [defaultHorizon, setDefaultHorizon] =
    useState<UserProfile['defaultHorizon']>('medium');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    if (!overview.data) return;
    setDisplayName(overview.data.profile.displayName);
    setRiskProfile(overview.data.profile.riskProfile);
    setDefaultHorizon(overview.data.profile.defaultHorizon);
    setAcceptTerms(Boolean(overview.data.profile.termsAcceptedAt));
  }, [overview.data]);

  const save = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settings-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['user-profile'] }),
      ]);
    },
  });
  const exportData = useMutation({
    mutationFn: exportUserData,
    onSuccess: async (exported) => {
      const json = JSON.stringify(exported, null, 2);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `jasic-user-data-${exported.exportedAt.slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          title: 'JASIC 使用者資料匯出',
          message: json,
        });
      }
    },
  });
  const accountDeletion = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      queryClient.clear();
      await supabase?.auth.signOut({ scope: 'local' });
    },
  });

  if (overview.isLoading) {
    return <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />;
  }
  if (overview.error || !overview.data) {
    return (
      <ErrorState
        message={overview.error?.message}
        onRetry={() => void overview.refetch()}
      />
    );
  }

  const data = overview.data;
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Badge tone="info">Governance & Preferences</Badge>
        <Text style={styles.title}>設定與方法論</Text>
        <Text style={styles.subtitle}>
          管理個人預設、確認資料新鮮度，並查看 JASIC 分數與資料來源的限制。
        </Text>
      </View>

      <SectionHeader eyebrow="Profile" title="個人化設定" />
      <Card style={styles.formCard}>
        <View style={styles.field}>
          <Text style={styles.label}>顯示名稱</Text>
          <TextInput
            accessibilityLabel="顯示名稱"
            onChangeText={setDisplayName}
            style={styles.input}
            value={displayName}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>帳號</Text>
          <Text style={styles.readonly}>{data.profile.email}</Text>
        </View>

        <Text style={styles.label}>預設風險偏好</Text>
        <View style={styles.optionGrid}>
          {riskProfiles.map((profile) => (
            <Pressable
              key={profile.key}
              onPress={() => setRiskProfile(profile.key)}
              style={[
                styles.optionCard,
                riskProfile === profile.key && styles.optionCardActive,
              ]}
            >
              <Text
                style={[
                  styles.optionTitle,
                  riskProfile === profile.key && styles.optionTitleActive,
                ]}
              >
                {profile.label}
              </Text>
              <Text
                style={[
                  styles.optionNote,
                  riskProfile === profile.key && styles.optionNoteActive,
                ]}
              >
                {profile.note}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>預設投資期間</Text>
        <View style={styles.inlineOptions}>
          {horizons.map((horizon) => (
            <Pressable
              key={horizon.key}
              onPress={() => setDefaultHorizon(horizon.key)}
              style={[
                styles.pill,
                defaultHorizon === horizon.key && styles.pillActive,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  defaultHorizon === horizon.key && styles.pillTextActive,
                ]}
              >
                {horizon.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => setAcceptTerms((value) => !value)}
          style={styles.termsRow}
        >
          <View style={[styles.checkbox, acceptTerms && styles.checkboxActive]}>
            <Text style={styles.checkmark}>{acceptTerms ? '✓' : ''}</Text>
          </View>
          <Text style={styles.termsText}>
            我了解本產品僅供研究與風險檢核，不保證獲利、不提供自動交易。
          </Text>
        </Pressable>

        {save.isError ? <Text style={styles.error}>{save.error.message}</Text> : null}
        {save.isSuccess ? <Text style={styles.success}>設定已更新。</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton
            disabled={!displayName.trim() || !acceptTerms || save.isPending}
            label={save.isPending ? '正在儲存…' : '儲存設定'}
            onPress={() =>
              save.mutate({
                displayName,
                riskProfile,
                defaultHorizon,
                acceptTerms,
              })
            }
          />
          {isLiveMode ? (
            <PrimaryButton
              label="登出"
              onPress={() => void supabase?.auth.signOut()}
              secondary
            />
          ) : null}
        </View>
      </Card>

      <SectionHeader eyebrow="Data Freshness" title="資料健康狀態" />
      <View style={styles.healthGrid}>
        {data.dataHealth.map((item) => (
          <DataHealthCard key={item.code} item={item} />
        ))}
      </View>

      <SectionHeader eyebrow="Methodology" title="JASIC 方法論揭露" />
      <Card style={styles.methodCard}>
        <View style={styles.methodTop}>
          <View>
            <Text style={styles.methodLabel}>目前 Score 規則版本</Text>
            <Text style={styles.methodVersion}>
              {data.methodology.scoreRuleVersion}
            </Text>
          </View>
          <Badge
            tone={
              data.methodology.scoreRuleStatus === 'production'
                ? 'positive'
                : 'warning'
            }
          >
            {data.methodology.scoreRuleStatus}
          </Badge>
        </View>
        <Text style={styles.methodNote}>{data.methodology.scoreRuleNote}</Text>
        <View style={styles.lawList}>
          {[
            'Rule before AI：分數與燈號由確定性規則計算。',
            'Point-in-time：所有結果保存資料時間與規則版本。',
            'Risk First：低信心或過期資料不得輸出積極建議。',
            'No Profit Promise：不得保證獲利或預測必然方向。',
            'No Auto Trading：不得連接或執行自動下單。',
          ].map((law) => (
            <View key={law} style={styles.lawRow}>
              <Text style={styles.lawBullet}>•</Text>
              <Text style={styles.lawText}>{law}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader eyebrow="Attribution" title="資料來源" />
      <View style={styles.sourceList}>
        {data.methodology.sources.map((source) => (
          <Card key={source.code} style={styles.sourceCard}>
            <Text style={styles.sourceName}>{source.datasetName}</Text>
            <Text style={styles.sourceProvider}>{source.provider}</Text>
            <Text style={styles.sourceMeta}>
              {source.frequency} · {source.code}
            </Text>
            {source.attribution ? (
              <Text style={styles.attribution}>{source.attribution}</Text>
            ) : null}
          </Card>
        ))}
      </View>

      <SectionHeader eyebrow="Privacy Center" title="資料與帳號管理" />
      <Card style={styles.privacyCard}>
        <View style={styles.privacyBlock}>
          <Text style={styles.privacyTitle}>匯出我的資料</Text>
          <Text style={styles.privacyText}>
            匯出 Profile、Watchlist、AI Check、警示規則與個人化報告。市場公共資料不會重複包含。
          </Text>
          {exportData.isError ? (
            <Text style={styles.error}>{exportData.error.message}</Text>
          ) : null}
          <View style={styles.privacyAction}>
            <PrimaryButton
              disabled={exportData.isPending}
              label={exportData.isPending ? '正在準備資料…' : '匯出 JSON'}
              onPress={() => exportData.mutate()}
              secondary
            />
          </View>
        </View>

        <View style={styles.dangerBlock}>
          <Text style={styles.dangerTitle}>永久刪除帳號</Text>
          <Text style={styles.privacyText}>
            正式模式會刪除登入帳號、Watchlist、AI Check、警示及所有個人化資料。此操作無法復原。
          </Text>
          <Text style={styles.confirmLabel}>
            請輸入：DELETE JASIC ACCOUNT
          </Text>
          <TextInput
            accessibilityLabel="刪除帳號確認文字"
            autoCapitalize="characters"
            onChangeText={setDeleteConfirmation}
            placeholder="DELETE JASIC ACCOUNT"
            placeholderTextColor="#A5ADB9"
            style={[styles.input, styles.dangerInput]}
            value={deleteConfirmation}
          />
          {accountDeletion.isError ? (
            <Text style={styles.error}>{accountDeletion.error.message}</Text>
          ) : null}
          <Pressable
            disabled={
              !isLiveMode ||
              deleteConfirmation !== 'DELETE JASIC ACCOUNT' ||
              accountDeletion.isPending
            }
            onPress={() => accountDeletion.mutate(deleteConfirmation)}
            style={({ pressed }) => [
              styles.deleteButton,
              (!isLiveMode ||
                deleteConfirmation !== 'DELETE JASIC ACCOUNT' ||
                accountDeletion.isPending) &&
                styles.deleteButtonDisabled,
              pressed && styles.deleteButtonPressed,
            ]}
          >
            <Text style={styles.deleteButtonText}>
              {accountDeletion.isPending ? '正在刪除…' : '永久刪除帳號'}
            </Text>
          </Pressable>
          {!isLiveMode ? (
            <Text style={styles.demoNote}>展示模式不會執行帳號刪除。</Text>
          ) : null}
        </View>

        <Text style={styles.retentionNote}>
          資料保留原則：個人化資料保留至帳號刪除；帳號刪除後僅保留不可識別的操作稽核紀錄。公共市場快照與匿名系統統計不屬於個人資料。
        </Text>
      </Card>
    </View>
  );
}

function DataHealthCard({ item }: { item: DataHealthItem }) {
  const tone =
    item.status === 'healthy'
      ? 'positive'
      : item.status === 'warning'
        ? 'warning'
        : item.status === 'missing'
          ? 'neutral'
          : 'danger';
  return (
    <Card style={styles.healthCard}>
      <View style={styles.healthTop}>
        <Text style={styles.healthLabel}>{item.label}</Text>
        <Badge tone={tone}>{statusLabel(item.status)}</Badge>
      </View>
      <Text style={styles.healthMessage}>{item.message}</Text>
      <Text style={styles.healthMeta}>
        資料日期：{formatDate(item.dataAsOf)}
        {item.records ? ` · ${item.records.toLocaleString()} 筆` : ''}
      </Text>
    </Card>
  );
}

function statusLabel(status: DataHealthItem['status']) {
  return {
    healthy: '正常',
    warning: '注意',
    stale: '過期',
    missing: '缺資料',
  }[status];
}

function formatDate(value?: string | null) {
  if (!value) return '尚無資料';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
}

const styles = StyleSheet.create({
  page: { gap: 22 },
  loader: { marginTop: 120 },
  header: { maxWidth: 760 },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 12 },
  subtitle: { color: colors.textSoft, fontSize: 14, lineHeight: 22, marginTop: 8 },
  formCard: { gap: 16 },
  field: { gap: 7 },
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
  readonly: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    color: colors.textSoft,
    fontSize: 13,
    padding: 14,
  },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  optionCard: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minWidth: 155,
    padding: 13,
  },
  optionCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  optionTitleActive: { color: '#FFFFFF' },
  optionNote: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 4 },
  optionNoteActive: { color: '#D9E8FF' },
  inlineOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textSoft, fontSize: 12, fontWeight: '800' },
  pillTextActive: { color: '#FFFFFF' },
  termsRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 5,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  termsText: { color: colors.textSoft, flex: 1, fontSize: 11, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  error: { color: colors.red, fontSize: 11 },
  success: { color: colors.green, fontSize: 11, fontWeight: '800' },
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  healthCard: { flexBasis: 260, flexGrow: 1, gap: 9 },
  healthTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  healthLabel: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '900' },
  healthMessage: { color: colors.textSoft, fontSize: 11, lineHeight: 17 },
  healthMeta: { color: '#909BAC', fontSize: 9 },
  methodCard: { gap: 16 },
  methodTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  methodLabel: { color: colors.textSoft, fontSize: 11, fontWeight: '800' },
  methodVersion: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 5 },
  methodNote: { color: colors.textSoft, fontSize: 12, lineHeight: 19 },
  lawList: { gap: 8 },
  lawRow: { flexDirection: 'row', gap: 8 },
  lawBullet: { color: colors.primary },
  lawText: { color: colors.textSoft, flex: 1, fontSize: 11, lineHeight: 17 },
  sourceList: { gap: 10 },
  sourceCard: { gap: 4 },
  sourceName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  sourceProvider: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  sourceMeta: { color: colors.textSoft, fontSize: 9 },
  attribution: { color: colors.textSoft, fontSize: 10, marginTop: 5 },
  privacyCard: { gap: 18 },
  privacyBlock: { gap: 9 },
  privacyTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  privacyText: { color: colors.textSoft, fontSize: 11, lineHeight: 18 },
  privacyAction: { alignItems: 'flex-start' },
  dangerBlock: {
    backgroundColor: colors.redSoft,
    borderColor: '#FFC4CB',
    borderRadius: 14,
    borderWidth: 1,
    gap: 9,
    padding: 16,
  },
  dangerTitle: { color: colors.red, fontSize: 16, fontWeight: '900' },
  confirmLabel: { color: colors.red, fontSize: 10, fontWeight: '900' },
  dangerInput: { backgroundColor: '#FFFFFF', borderColor: '#FFB5BF' },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.red,
    borderRadius: 11,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  deleteButtonDisabled: { opacity: 0.35 },
  deleteButtonPressed: { opacity: 0.75 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  demoNote: { color: colors.textSoft, fontSize: 10 },
  retentionNote: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    color: colors.textSoft,
    fontSize: 10,
    lineHeight: 16,
    paddingTop: 14,
  },
});
