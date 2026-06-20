import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Badge, Card, PrimaryButton } from '../components/ui';
import { currentTermsVersion } from '../lib/governance';
import { supabase } from '../lib/supabase';
import { updateUserProfile } from '../services/api';
import { colors } from '../theme';
import type { UserProfile } from '../types';

const riskProfiles: Array<{
  key: UserProfile['riskProfile'];
  label: string;
  note: string;
}> = [
  { key: 'conservative', label: '保守', note: '優先控制回撤與損失' },
  { key: 'balanced', label: '穩健', note: '平衡風險與機會' },
  { key: 'aggressive', label: '積極', note: '可承受較高波動' },
  { key: 'growth', label: '成長', note: '偏好中長期成長' },
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

export function OnboardingScreen({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [riskProfile, setRiskProfile] = useState(profile.riskProfile);
  const [defaultHorizon, setDefaultHorizon] = useState(profile.defaultHorizon);
  const [acceptResearchTerms, setAcceptResearchTerms] = useState(false);
  const [acceptDataTerms, setAcceptDataTerms] = useState(false);

  const complete = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: async (updatedProfile) => {
      queryClient.setQueryData(
        ['user-profile', updatedProfile.id],
        updatedProfile,
      );
      await queryClient.invalidateQueries({ queryKey: ['settings-overview'] });
    },
  });

  const canContinue =
    displayName.trim().length > 0 &&
    acceptResearchTerms &&
    acceptDataTerms &&
    !complete.isPending;

  return (
    <View style={styles.page}>
      <View style={styles.panel}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandLetter}>J</Text>
          </View>
          <View>
            <Text style={styles.brand}>JASIC</Text>
            <Text style={styles.tagline}>Alpha Research Onboarding</Text>
          </View>
        </View>

        <Badge tone="info">首次使用設定 · {currentTermsVersion}</Badge>
        <Text style={styles.title}>先建立你的研究邊界</Text>
        <Text style={styles.subtitle}>
          JASIC 會依風險偏好與投資期間調整提示語氣，但不會替你下單，也不會保證任何投資結果。
        </Text>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>基本資料</Text>
          <TextInput
            accessibilityLabel="Onboarding 顯示名稱"
            onChangeText={setDisplayName}
            placeholder="你的顯示名稱"
            placeholderTextColor="#909BAD"
            style={styles.input}
            value={displayName}
          />
          <Text style={styles.account}>{profile.email}</Text>

          <Text style={styles.label}>風險偏好</Text>
          <View style={styles.optionGrid}>
            {riskProfiles.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.key}
                onPress={() => setRiskProfile(item.key)}
                style={[
                  styles.option,
                  riskProfile === item.key && styles.optionActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionTitle,
                    riskProfile === item.key && styles.optionTitleActive,
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.optionNote,
                    riskProfile === item.key && styles.optionNoteActive,
                  ]}
                >
                  {item.note}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>主要投資期間</Text>
          <View style={styles.horizonRow}>
            {horizons.map((item) => (
              <Pressable
                accessibilityRole="button"
                key={item.key}
                onPress={() => setDefaultHorizon(item.key)}
                style={[
                  styles.horizon,
                  defaultHorizon === item.key && styles.horizonActive,
                ]}
              >
                <Text
                  style={[
                    styles.horizonText,
                    defaultHorizon === item.key && styles.horizonTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <ConsentRow
            checked={acceptResearchTerms}
            label="我了解 JASIC 僅供研究與風險檢核，不構成投資建議、不保證獲利，也不會執行自動交易。"
            onPress={() => setAcceptResearchTerms((value) => !value)}
          />
          <ConsentRow
            checked={acceptDataTerms}
            label="我同意系統保存個人設定、Watchlist 與 AI Check 紀錄；我可在 Privacy Center 匯出資料或永久刪除帳號。"
            onPress={() => setAcceptDataTerms((value) => !value)}
          />

          {complete.isError ? (
            <Text style={styles.error}>{complete.error.message}</Text>
          ) : null}
          {complete.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <PrimaryButton
              disabled={!canContinue}
              label="接受並進入 JASIC"
              onPress={() =>
                complete.mutate({
                  displayName,
                  riskProfile,
                  defaultHorizon,
                  acceptTerms: true,
                })
              }
            />
          )}
          <PrimaryButton
            label="登出"
            onPress={() => void supabase?.auth.signOut()}
            secondary
          />
        </Card>
      </View>
    </View>
  );
}

function ConsentRow({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.consentRow}
    >
      <View style={[styles.checkbox, checked && styles.checkboxActive]}>
        <Text style={styles.checkmark}>{checked ? '✓' : ''}</Text>
      </View>
      <Text style={styles.consentText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    flex: 1,
    padding: 20,
  },
  panel: { gap: 14, maxWidth: 760, paddingVertical: 28, width: '100%' },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  brandLetter: { color: '#FFFFFF', fontSize: 27, fontWeight: '900' },
  brand: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', letterSpacing: 2 },
  tagline: { color: colors.mutedOnDark, fontSize: 10, marginTop: 2 },
  title: { color: '#FFFFFF', fontSize: 31, fontWeight: '900' },
  subtitle: { color: colors.mutedOnDark, fontSize: 13, lineHeight: 21 },
  card: { gap: 15, padding: 22 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
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
  account: { color: colors.textSoft, fontSize: 11 },
  label: { color: colors.textSoft, fontSize: 12, fontWeight: '800' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 140,
    padding: 12,
  },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  optionTitleActive: { color: '#FFFFFF' },
  optionNote: { color: colors.textSoft, fontSize: 9, marginTop: 3 },
  optionNoteActive: { color: '#D9E8FF' },
  horizonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  horizon: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  horizonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  horizonText: { color: colors.textSoft, fontSize: 12, fontWeight: '800' },
  horizonTextActive: { color: '#FFFFFF' },
  consentRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 5,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    marginTop: 1,
    width: 22,
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  consentText: { color: colors.textSoft, flex: 1, fontSize: 11, lineHeight: 18 },
  error: { color: colors.red, fontSize: 11, lineHeight: 17 },
});
