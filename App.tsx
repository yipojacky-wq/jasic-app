import 'react-native-url-polyfill/auto';

import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AppShell } from './src/AppShell';
import { useAuthSession } from './src/hooks/useAuthSession';
import { hasAcceptedCurrentTerms } from './src/lib/governance';
import { isLiveMode } from './src/lib/supabase';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { getUserProfile } from './src/services/api';
import { colors } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

function AppContent() {
  const { session, isLoading } = useAuthSession();
  const profile = useQuery({
    queryKey: ['user-profile', session?.user.id],
    queryFn: getUserProfile,
    enabled: isLiveMode && Boolean(session),
    retry: 1,
  });

  if (isLiveMode && (isLoading || (session && profile.isLoading))) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>正在載入 JASIC 安全設定…</Text>
      </View>
    );
  }

  if (isLiveMode && !session) {
    return <AuthScreen />;
  }

  if (isLiveMode && profile.error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorTitle}>無法讀取帳號設定</Text>
        <Text style={styles.errorMessage}>{profile.error.message}</Text>
        <Text style={styles.retry} onPress={() => void profile.refetch()}>
          重新連線
        </Text>
      </View>
    );
  }

  if (
    isLiveMode &&
    profile.data &&
    !hasAcceptedCurrentTerms(profile.data)
  ) {
    return <OnboardingScreen profile={profile.data} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.root}>
        <AppShell />
        <Text style={styles.disclaimer}>
          JASIC 為研究與風險檢核工具，不保證獲利，不提供自動交易。
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: colors.ink,
    gap: 10,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { color: colors.mutedOnDark, fontSize: 13 },
  errorTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  errorMessage: {
    color: colors.mutedOnDark,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
  },
  retry: { color: '#8DB7FF', fontSize: 13, fontWeight: '900', marginTop: 6 },
  safeArea: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  disclaimer: {
    backgroundColor: colors.ink,
    color: colors.mutedOnDark,
    fontSize: 11,
    paddingHorizontal: 16,
    paddingVertical: 7,
    textAlign: 'center',
  },
});
