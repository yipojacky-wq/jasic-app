import 'react-native-url-polyfill/auto';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { AppShell } from './src/AppShell';
import { useAuthSession } from './src/hooks/useAuthSession';
import { isLiveMode } from './src/lib/supabase';
import { AuthScreen } from './src/screens/AuthScreen';
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

  if (isLiveMode && isLoading) {
    return <View style={styles.loading} />;
  }

  if (isLiveMode && !session) {
    return <AuthScreen />;
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
    flex: 1,
    backgroundColor: colors.ink,
  },
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
