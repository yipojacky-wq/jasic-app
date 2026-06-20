import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  deleteUserPosition,
  getUserPositions,
  saveUserPosition,
} from '../services/api';
import { horizonLabel, sharesToLots } from '../lib/positions';
import { colors } from '../theme';
import type { InvestmentHorizon, UserPosition } from '../types';
import { Badge, Card, PrimaryButton } from './ui';

const horizons: Array<{ key: InvestmentHorizon; label: string }> = [
  { key: 'short', label: '短線' },
  { key: 'swing', label: '波段' },
  { key: 'medium', label: '中期' },
  { key: 'long', label: '長期' },
];

export function PositionManager() {
  const queryClient = useQueryClient();
  const positions = useQuery({
    queryKey: ['user-positions'],
    queryFn: getUserPositions,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('');
  const [averageCost, setAverageCost] = useState('');
  const [lots, setLots] = useState('');
  const [investmentHorizon, setInvestmentHorizon] =
    useState<InvestmentHorizon>('medium');
  const [note, setNote] = useState('');

  const save = useMutation({
    mutationFn: saveUserPosition,
    onSuccess: async () => {
      resetForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-positions'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] }),
      ]);
    },
  });
  const remove = useMutation({
    mutationFn: deleteUserPosition,
    onSuccess: async () => {
      resetForm();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-positions'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] }),
      ]);
    },
  });

  const edit = (position: UserPosition) => {
    setEditingId(position.id);
    setSymbol(position.symbol);
    setAverageCost(String(position.averageCost));
    setLots(String(sharesToLots(position.quantityShares)));
    setInvestmentHorizon(position.investmentHorizon);
    setNote(position.note ?? '');
  };

  const resetForm = () => {
    setEditingId(null);
    setDeleteConfirmId(null);
    setSymbol('');
    setAverageCost('');
    setLots('');
    setInvestmentHorizon('medium');
    setNote('');
  };

  const canSave =
    /^\d{4}$/.test(symbol.trim()) &&
    Number(averageCost) > 0 &&
    Number(lots) > 0 &&
    !save.isPending;

  return (
    <View style={styles.layout}>
      <Card style={styles.formCard}>
        <View style={styles.formHeader}>
          <View>
            <Text style={styles.formTitle}>
              {editingId ? '編輯研究持倉' : '新增研究持倉'}
            </Text>
            <Text style={styles.formHint}>僅供分析，不連接券商帳戶。</Text>
          </View>
          {editingId ? <Badge tone="warning">編輯中</Badge> : null}
        </View>

        <View style={styles.formRow}>
          <Field label="股票代號" style={styles.flex}>
            <TextInput
              accessibilityLabel="持倉股票代號"
              editable={!editingId}
              keyboardType="number-pad"
              maxLength={4}
              onChangeText={setSymbol}
              placeholder="2330"
              placeholderTextColor="#9AA5B5"
              style={[styles.input, editingId && styles.inputReadonly]}
              value={symbol}
            />
          </Field>
          <Field label="平均成本" style={styles.flex}>
            <TextInput
              accessibilityLabel="持倉平均成本"
              keyboardType="decimal-pad"
              onChangeText={setAverageCost}
              placeholder="980"
              placeholderTextColor="#9AA5B5"
              style={styles.input}
              value={averageCost}
            />
          </Field>
          <Field label="張數" style={styles.flex}>
            <TextInput
              accessibilityLabel="持倉張數"
              keyboardType="decimal-pad"
              onChangeText={setLots}
              placeholder="1"
              placeholderTextColor="#9AA5B5"
              style={styles.input}
              value={lots}
            />
          </Field>
        </View>

        <Text style={styles.label}>投資期間</Text>
        <View style={styles.horizonRow}>
          {horizons.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setInvestmentHorizon(item.key)}
              style={[
                styles.horizon,
                investmentHorizon === item.key && styles.horizonActive,
              ]}
            >
              <Text
                style={[
                  styles.horizonText,
                  investmentHorizon === item.key && styles.horizonTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field label="研究備註（選填）">
          <TextInput
            accessibilityLabel="持倉研究備註"
            maxLength={200}
            onChangeText={setNote}
            placeholder="例如：核心部位、等待法說後再檢核"
            placeholderTextColor="#9AA5B5"
            style={styles.input}
            value={note}
          />
        </Field>

        {save.isError ? <Text style={styles.error}>{save.error.message}</Text> : null}
        <View style={styles.actions}>
          <PrimaryButton
            disabled={!canSave}
            label={save.isPending ? '儲存中…' : editingId ? '更新持倉' : '儲存持倉'}
            onPress={() =>
              save.mutate({
                symbol,
                averageCost: Number(averageCost),
                lots: Number(lots),
                investmentHorizon,
                note,
              })
            }
          />
          {editingId ? (
            <PrimaryButton label="取消編輯" onPress={resetForm} secondary />
          ) : null}
        </View>
      </Card>

      <View style={styles.list}>
        {positions.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : positions.error ? (
          <Text style={styles.error}>{positions.error.message}</Text>
        ) : positions.data?.length ? (
          positions.data.map((position) => (
            <Card key={position.id} style={styles.positionCard}>
              <View style={styles.positionTop}>
                <View>
                  <Text style={styles.positionName}>{position.name}</Text>
                  <Text style={styles.positionMeta}>
                    {position.symbol} · {position.exchange}
                  </Text>
                </View>
                <Badge tone="info">
                  {horizonLabel(position.investmentHorizon)}
                </Badge>
              </View>
              <View style={styles.metrics}>
                <Metric label="平均成本" value={position.averageCost.toLocaleString()} />
                <Metric
                  label="張數"
                  value={sharesToLots(position.quantityShares).toLocaleString()}
                />
              </View>
              {position.note ? (
                <Text style={styles.note}>{position.note}</Text>
              ) : null}
              <View style={styles.cardActions}>
                <Pressable onPress={() => edit(position)}>
                  <Text style={styles.editAction}>編輯</Text>
                </Pressable>
                <Pressable
                  disabled={remove.isPending}
                  onPress={() => {
                    if (deleteConfirmId === position.id) {
                      remove.mutate(position.id);
                    } else {
                      setDeleteConfirmId(position.id);
                    }
                  }}
                >
                  <Text style={styles.deleteAction}>
                    {deleteConfirmId === position.id ? '再次確認刪除' : '刪除'}
                  </Text>
                </Pressable>
                {deleteConfirmId === position.id ? (
                  <Pressable onPress={() => setDeleteConfirmId(null)}>
                    <Text style={styles.cancelDeleteAction}>取消</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>尚未建立研究持倉</Text>
            <Text style={styles.emptyText}>
              儲存後，AI Check 輸入股票代號時會自動帶入成本、張數與投資期間。
            </Text>
          </Card>
        )}
      </View>
    </View>
  );
}

function Field({
  children,
  label,
  style,
}: {
  children: React.ReactNode;
  label: string;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
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

const styles = StyleSheet.create({
  layout: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  formCard: { flexGrow: 1, flexBasis: 480, gap: 14 },
  formHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  formHint: { color: colors.textSoft, fontSize: 10, marginTop: 4 },
  formRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { gap: 6 },
  flex: { flex: 1, minWidth: 125 },
  label: { color: colors.textSoft, fontSize: 11, fontWeight: '800' },
  input: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 11,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  inputReadonly: { color: colors.textSoft },
  horizonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  horizon: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  horizonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  horizonText: { color: colors.textSoft, fontSize: 11, fontWeight: '800' },
  horizonTextActive: { color: '#FFFFFF' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { flexGrow: 1, flexBasis: 300, gap: 10 },
  positionCard: { gap: 12 },
  positionTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  positionName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  positionMeta: { color: colors.textSoft, fontSize: 10, marginTop: 3 },
  metrics: { flexDirection: 'row', gap: 10 },
  metric: {
    backgroundColor: colors.canvas,
    borderRadius: 10,
    flex: 1,
    padding: 10,
  },
  metricLabel: { color: colors.textSoft, fontSize: 9 },
  metricValue: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 3 },
  note: { color: colors.textSoft, fontSize: 11, lineHeight: 17 },
  cardActions: { flexDirection: 'row', gap: 16 },
  editAction: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  deleteAction: { color: colors.red, fontSize: 11, fontWeight: '900' },
  cancelDeleteAction: { color: colors.textSoft, fontSize: 11, fontWeight: '900' },
  emptyCard: { alignItems: 'center', gap: 6, padding: 24 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  emptyText: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  error: { color: colors.red, fontSize: 11, lineHeight: 17 },
});
