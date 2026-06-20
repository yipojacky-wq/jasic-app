import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { alertRuleLabel } from '../../supabase/functions/_shared/alertRules.ts';
import { getAlertRules, updateAlertRule } from '../services/api';
import { colors } from '../theme';
import type { AlertRule, AlertRuleType } from '../types';
import { Badge, Card, PrimaryButton } from './ui';

export function AlertPreferences() {
  const queryClient = useQueryClient();
  const rules = useQuery({
    queryKey: ['alert-rules'],
    queryFn: getAlertRules,
  });
  const [drafts, setDrafts] = useState<Record<string, AlertRule>>({});

  useEffect(() => {
    if (!rules.data) return;
    setDrafts(
      Object.fromEntries(rules.data.map((rule) => [rule.id, { ...rule }])),
    );
  }, [rules.data]);

  const save = useMutation({
    mutationFn: updateAlertRule,
    onSuccess: async (updated) => {
      setDrafts((current) => ({ ...current, [updated.id]: updated }));
      await queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
    },
  });

  if (rules.isLoading) {
    return <ActivityIndicator color={colors.primary} />;
  }
  if (rules.error) {
    return <Text style={styles.error}>{rules.error.message}</Text>;
  }

  const orderedTypes: AlertRuleType[] = [
    'score_change',
    'signal_change',
    'risk_level',
  ];
  const ordered = orderedTypes
    .map((type) =>
      Object.values(drafts).find((rule) => rule.ruleType === type),
    )
    .filter((rule): rule is AlertRule => Boolean(rule));

  return (
    <View style={styles.grid}>
      {ordered.map((rule) => (
        <Card key={rule.id} style={styles.ruleCard}>
          <View style={styles.topRow}>
            <View style={styles.copy}>
              <Text style={styles.title}>{alertRuleLabel(rule.ruleType)}</Text>
              <Text style={styles.description}>
                {ruleDescription(rule.ruleType)}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`${alertRuleLabel(rule.ruleType)}警示開關`}
              accessibilityRole="switch"
              accessibilityState={{ checked: rule.isEnabled }}
              onPress={() =>
                setDrafts((current) => ({
                  ...current,
                  [rule.id]: {
                    ...rule,
                    isEnabled: !rule.isEnabled,
                  },
                }))
              }
              style={[
                styles.switchTrack,
                rule.isEnabled && styles.switchTrackActive,
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  rule.isEnabled && styles.switchThumbActive,
                ]}
              />
            </Pressable>
          </View>
          <Text
            style={[
              styles.stateText,
              rule.isEnabled ? styles.stateEnabled : styles.stateDisabled,
            ]}
          >
            {rule.isEnabled ? '已啟用警示' : '已停用警示'}
          </Text>

          {rule.ruleType !== 'signal_change' ? (
            <View style={styles.thresholdRow}>
              <View style={styles.thresholdCopy}>
                <Text style={styles.label}>
                  {rule.ruleType === 'score_change'
                    ? '變化達到'
                    : '風險分數達到'}
                </Text>
                <Text style={styles.range}>
                  {rule.ruleType === 'score_change'
                    ? '允許範圍 1–25 分'
                    : '允許範圍 40–95'}
                </Text>
              </View>
              <TextInput
                accessibilityLabel={`${alertRuleLabel(rule.ruleType)}門檻`}
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  setDrafts((current) => ({
                    ...current,
                    [rule.id]: {
                      ...rule,
                      threshold: Number(value),
                    },
                  }))
                }
                style={styles.input}
                value={String(rule.threshold ?? '')}
              />
            </View>
          ) : (
            <Badge tone="info">任何燈號切換</Badge>
          )}

          <PrimaryButton
            disabled={save.isPending}
            label={
              save.isPending
                ? '儲存中…'
                : `儲存${alertRuleLabel(rule.ruleType)}規則`
            }
            onPress={() =>
              save.mutate({
                id: rule.id,
                ruleType: rule.ruleType,
                threshold: rule.threshold,
                isEnabled: rule.isEnabled,
              })
            }
            secondary
          />
          {save.isSuccess && save.data.id === rule.id ? (
            <Text style={styles.success}>規則已更新。</Text>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

function ruleDescription(type: AlertRuleType) {
  return {
    score_change: '當觀察標的 JASIC Score 上升或下降超過門檻時提醒。',
    signal_change: '當綠、黃、紅燈狀態改變時提醒，轉紅燈會標示為重大。',
    risk_level: '當風險分數由門檻下方穿越至上方時提醒。',
  }[type];
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  ruleCard: { flexBasis: 280, flexGrow: 1, gap: 14 },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  description: {
    color: colors.textSoft,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },
  switchTrack: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 25,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 44,
  },
  switchTrackActive: { backgroundColor: colors.green },
  switchThumb: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 19,
    width: 19,
  },
  switchThumbActive: { alignSelf: 'flex-end' },
  stateText: { fontSize: 10, fontWeight: '900' },
  stateEnabled: { color: colors.green },
  stateDisabled: { color: colors.textSoft },
  thresholdRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  thresholdCopy: { flex: 1 },
  label: { color: colors.textSoft, fontSize: 11, fontWeight: '800' },
  range: { color: '#98A2B1', fontSize: 9, marginTop: 3 },
  input: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    minHeight: 42,
    paddingHorizontal: 11,
    textAlign: 'center',
    width: 72,
  },
  success: { color: colors.green, fontSize: 10, fontWeight: '800' },
  error: { color: colors.red, fontSize: 11 },
});
