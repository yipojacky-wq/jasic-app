import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { isLiveMode } from './lib/supabase';
import { AiCheckScreen } from './screens/AiCheckScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { DiscoveryScreen } from './screens/DiscoveryScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { StockWarRoomScreen } from './screens/StockWarRoomScreen';
import { WatchlistScreen } from './screens/WatchlistScreen';
import { useAppStore } from './store/useAppStore';
import { colors } from './theme';
import type { TabKey } from './types';

const tabs: { key: TabKey; label: string; short: string }[] = [
  { key: 'dashboard', label: '總經儀表板', short: '總經' },
  { key: 'discovery', label: '三層漏斗', short: '選股' },
  { key: 'ai-check', label: 'AI 檢核', short: 'AI' },
  { key: 'watchlist', label: '個人追蹤', short: '追蹤' },
  { key: 'reports', label: '趨勢報告', short: '報告' },
  { key: 'settings', label: '設定與方法論', short: '設定' },
];

export function AppShell() {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const activeTab = useAppStore((state) => state.activeTab);
  const selectedSymbol = useAppStore((state) => state.selectedSymbol);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  return (
    <View style={styles.shell}>
      <Header mobile={mobile} onSettings={() => setActiveTab('settings')} />
      <View style={styles.body}>
        {!mobile ? <Sidebar activeTab={activeTab} onChange={setActiveTab} /> : null}
        <ScrollView
          contentContainerStyle={[styles.content, mobile && styles.contentMobile]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentInner}>
            {selectedSymbol ? (
              <StockWarRoomScreen symbol={selectedSymbol} />
            ) : (
              <Screen activeTab={activeTab} />
            )}
          </View>
        </ScrollView>
      </View>
      {mobile ? <MobileNav activeTab={activeTab} onChange={setActiveTab} /> : null}
    </View>
  );
}

function Header({
  mobile,
  onSettings,
}: {
  mobile: boolean;
  onSettings: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>J</Text>
        </View>
        <View>
          <Text style={styles.brandName}>JASIC</Text>
          {!mobile ? <Text style={styles.brandTagline}>Stock Intelligence Companion</Text> : null}
        </View>
      </View>
      <View style={styles.headerRight}>
        {!mobile ? (
          <View style={[styles.connection, isLiveMode && styles.connectionLive]}>
            <View style={[styles.connectionDot, isLiveMode && styles.connectionDotLive]} />
            <Text style={styles.connectionText}>
              {isLiveMode ? 'Live data mode' : 'Demo data mode'}
            </Text>
          </View>
        ) : null}
        <Pressable
          accessibilityLabel="開啟設定"
          onPress={onSettings}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>JA</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Sidebar({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <View style={styles.sidebar}>
      <Text style={styles.sidebarLabel}>DECISION CENTER</Text>
      {tabs.map((tab, index) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={[styles.navItem, activeTab === tab.key && styles.navItemActive]}
        >
          <Text style={[styles.navIndex, activeTab === tab.key && styles.navTextActive]}>
            0{index + 1}
          </Text>
          <Text style={[styles.navText, activeTab === tab.key && styles.navTextActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
      <View style={styles.sidebarNote}>
        <Text style={styles.sidebarNoteTitle}>研究模式</Text>
        <Text style={styles.sidebarNoteText}>
          {isLiveMode
            ? '正式資料模式。請至設定頁確認每項資料的新鮮度。'
            : '目前使用展示資料。設定 Supabase 後即可切換正式資料層。'}
        </Text>
      </View>
    </View>
  );
}

function MobileNav({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <View style={styles.mobileNav}>
      {tabs.filter((tab) => tab.key !== 'settings').map((tab, index) => (
        <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={styles.mobileNavItem}>
          <Text style={[styles.mobileIcon, activeTab === tab.key && styles.mobileActive]}>
            {index + 1}
          </Text>
          <Text style={[styles.mobileLabel, activeTab === tab.key && styles.mobileActive]}>
            {tab.short}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Screen({ activeTab }: { activeTab: TabKey }) {
  switch (activeTab) {
    case 'discovery':
      return <DiscoveryScreen />;
    case 'ai-check':
      return <AiCheckScreen />;
    case 'watchlist':
      return <WatchlistScreen />;
    case 'reports':
      return <ReportsScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <DashboardScreen />;
  }
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderBottomColor: '#263249',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 68,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  logoMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  logoText: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  brandName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.4 },
  brandTagline: { color: colors.mutedOnDark, fontSize: 9, marginTop: 1 },
  headerRight: { alignItems: 'center', flexDirection: 'row', gap: 13 },
  connection: {
    alignItems: 'center',
    backgroundColor: '#222D41',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  connectionLive: { backgroundColor: '#12392E' },
  connectionDot: { backgroundColor: colors.amber, borderRadius: 999, height: 7, width: 7 },
  connectionDotLive: { backgroundColor: colors.green },
  connectionText: { color: '#C5CFDC', fontSize: 10, fontWeight: '700' },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E7ECF3',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  avatarText: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: {
    backgroundColor: colors.ink,
    borderRightColor: '#263249',
    borderRightWidth: 1,
    padding: 14,
    width: 218,
  },
  sidebarLabel: { color: '#6F7E93', fontSize: 9, fontWeight: '900', letterSpacing: 1.3, margin: 10 },
  navItem: {
    alignItems: 'center',
    borderRadius: 11,
    flexDirection: 'row',
    gap: 11,
    marginBottom: 5,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  navItemActive: { backgroundColor: '#1E2B42' },
  navIndex: { color: '#66748A', fontSize: 9, fontWeight: '900' },
  navText: { color: '#9EABBD', fontSize: 12, fontWeight: '800' },
  navTextActive: { color: '#FFFFFF' },
  sidebarNote: {
    backgroundColor: '#141E30',
    borderColor: '#263249',
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 'auto',
    padding: 13,
  },
  sidebarNoteTitle: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  sidebarNoteText: { color: '#8492A6', fontSize: 10, lineHeight: 15, marginTop: 5 },
  content: { flexGrow: 1, padding: 28 },
  contentMobile: { padding: 14, paddingBottom: 28 },
  contentInner: {
    alignSelf: 'center',
    maxWidth: 1180,
    width: '100%',
  },
  mobileNav: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    paddingTop: 5,
  },
  mobileNavItem: { alignItems: 'center', flex: 1, gap: 2, paddingVertical: 5 },
  mobileIcon: { color: '#95A0B0', fontSize: 11, fontWeight: '900' },
  mobileLabel: { color: '#95A0B0', fontSize: 9, fontWeight: '800' },
  mobileActive: { color: colors.primary },
});
