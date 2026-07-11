import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('JASIC UI boundary caught an error', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>JASIC RECOVERY MODE</Text>
          <Text style={styles.title}>畫面暫時無法載入</Text>
          <Text style={styles.message}>
            JASIC 已攔截這次畫面錯誤，避免整個 App 白屏。你可以先重新載入畫面；
            若問題持續，請回到 Dashboard 或稍後再試。
          </Text>
          <Text style={styles.detail} numberOfLines={3}>
            {this.state.error.message}
          </Text>
          <Pressable
            accessibilityLabel="重新載入 JASIC 畫面"
            onPress={this.reset}
            style={styles.button}
          >
            <Text style={styles.buttonText}>重新載入畫面</Text>
          </Pressable>
          <Text style={styles.disclaimer}>
            本工具僅供研究與風險檢核，不保證獲利，也不提供自動下單。
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    maxWidth: 520,
    padding: 24,
    width: '100%',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  message: { color: colors.textSoft, fontSize: 13, lineHeight: 21 },
  detail: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 17,
    padding: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  disclaimer: { color: colors.textSoft, fontSize: 10, lineHeight: 16 },
});
