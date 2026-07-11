import { useState } from 'react';
import * as Linking from 'expo-linking';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card, PrimaryButton } from '../components/ui';
import { supabase } from '../lib/supabase';
import { colors } from '../theme';

const publicWebRedirectUrl = 'https://yipojacky-wq.github.io/jasic-app/';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const signIn = async () => {
    if (!supabase || !email.trim()) return;
    setIsSubmitting(true);
    setMessage('');
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.hostname.endsWith('github.io')
          ? publicWebRedirectUrl
          : `${window.location.origin}${window.location.pathname}`
        : Linking.createURL('auth/callback');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setMessage(
      error
        ? `登入信寄送失敗：${error.message}`
        : '登入連結已寄出，請至信箱完成驗證。',
    );
    setIsSubmitting(false);
  };

  return (
    <View style={styles.page}>
      <View style={styles.brandMark}>
        <Text style={styles.brandLetter}>J</Text>
      </View>
      <Text style={styles.brand}>JASIC</Text>
      <Text style={styles.tagline}>Stock Intelligence Companion</Text>
      <Card style={styles.card}>
        <Text style={styles.title}>登入研究中心</Text>
        <Text style={styles.description}>
          使用 Email 安全連結登入，不需要設定密碼。
        </Text>
        <TextInput
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="name@example.com"
          placeholderTextColor="#909BAD"
          style={styles.input}
          value={email}
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {isSubmitting ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <PrimaryButton
            disabled={!email.includes('@')}
            label="寄送登入連結"
            onPress={signIn}
          />
        )}
        <Text style={styles.disclaimer}>
          本工具僅供研究與風險檢核，不提供自動下單或獲利保證。
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  brandLetter: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  brand: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: 2, marginTop: 12 },
  tagline: { color: colors.mutedOnDark, fontSize: 11, marginBottom: 24, marginTop: 3 },
  card: { gap: 14, maxWidth: 420, padding: 26, width: '100%' },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  description: { color: colors.textSoft, fontSize: 13, lineHeight: 20 },
  input: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  message: { color: colors.primary, fontSize: 12, lineHeight: 18 },
  disclaimer: { color: colors.textSoft, fontSize: 10, lineHeight: 16, textAlign: 'center' },
});
