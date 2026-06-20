import type { PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, shadows } from '../theme';
import type { Signal } from '../types';

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: PropsWithChildren<{
  tone?: 'positive' | 'warning' | 'danger' | 'info' | 'neutral';
}>) {
  const toneStyle = {
    positive: styles.badgePositive,
    warning: styles.badgeWarning,
    danger: styles.badgeDanger,
    info: styles.badgeInfo,
    neutral: styles.badgeNeutral,
  }[tone];

  const textStyle = {
    positive: styles.badgePositiveText,
    warning: styles.badgeWarningText,
    danger: styles.badgeDangerText,
    info: styles.badgeInfoText,
    neutral: styles.badgeNeutralText,
  }[tone];

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={[styles.badgeText, textStyle]}>{children}</Text>
    </View>
  );
}

export function SignalDot({ signal }: { signal: Signal }) {
  return (
    <View
      style={[
        styles.signalDot,
        signal === 'green'
          ? styles.signalGreen
          : signal === 'yellow'
            ? styles.signalYellow
            : styles.signalRed,
      ]}
    />
  );
}

export function ProgressBar({
  value,
  color = colors.primary,
}: {
  value: number;
  color?: string;
}) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressValue, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{label}</Text>
    </Pressable>
  );
}

export function ErrorState({
  message = '資料暫時無法取得，請稍後再試。',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card style={styles.errorState}>
      <Text style={styles.errorTitle}>資料連線未完成</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      {onRetry ? <PrimaryButton label="重新整理" onPress={onRetry} secondary /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    ...shadows.card,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeaderText: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgePositive: { backgroundColor: colors.greenSoft },
  badgePositiveText: { color: colors.green },
  badgeWarning: { backgroundColor: colors.amberSoft },
  badgeWarningText: { color: colors.amber },
  badgeDanger: { backgroundColor: colors.redSoft },
  badgeDangerText: { color: colors.red },
  badgeInfo: { backgroundColor: colors.primarySoft },
  badgeInfoText: { color: colors.primary },
  badgeNeutral: { backgroundColor: colors.surfaceAlt },
  badgeNeutralText: { color: colors.textSoft },
  signalDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  signalGreen: { backgroundColor: colors.green },
  signalYellow: { backgroundColor: colors.amber },
  signalRed: { backgroundColor: colors.red },
  progressTrack: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    height: 7,
    overflow: 'hidden',
  },
  progressValue: {
    borderRadius: 999,
    height: '100%',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  buttonSecondary: {
    backgroundColor: colors.primarySoft,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  buttonSecondaryText: {
    color: colors.primary,
  },
  errorState: {
    alignItems: 'center',
    gap: 12,
    marginTop: 60,
    padding: 28,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  errorMessage: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
});
