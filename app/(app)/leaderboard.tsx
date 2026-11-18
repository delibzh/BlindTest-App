import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  fetchCompositeLeaderboard,
  fetchInfiniLeaderboard,
  type CompositeEntry,
  type InfiniEntry,
} from '@/lib/tracks';
import { CATEGORIES } from '@/components/CategoryCard';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { BottomNav } from '@/components/ui/BottomNav';
import { usePremium } from '@/hooks/usePremium';
import { loadSounds, playClick, playPrevious } from '@/lib/sounds';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

type Tab = 'score' | 'infini' | 'streak' | 'accuracy';
type AnyEntry = CompositeEntry | InfiniEntry;

const FREE_TABS:    { id: Tab; label: string }[] = [
  { id: 'score',  label: 'Score global' },
];
const PREMIUM_TABS: { id: Tab; label: string }[] = [
  { id: 'score',    label: 'Score global'  },
  { id: 'infini',   label: 'Infini 🔥'     },
  { id: 'streak',   label: 'Streak'        },
  { id: 'accuracy', label: 'Précision'     },
];

function isComposite(e: AnyEntry): e is CompositeEntry { return 'score' in e; }

function displayValue(item: AnyEntry, tab: Tab): string {
  if (isComposite(item)) {
    if (tab === 'accuracy') return `${((item as any).accuracy_pct ?? 0).toFixed(1)} %`;
    if (tab === 'streak')   return `${(item as any).streak_best ?? 0} 🔥`;
    return item.score.toLocaleString('fr-FR') + ' pts';
  }
  return `${(item as InfiniEntry).best_streak} 🔥`;
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { premium, loading: premiumLoading } = usePremium();
  const [tab, setTab]           = useState<Tab>('score');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [data, setData]         = useState<AnyEntry[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { loadSounds(); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'infini') {
        setData(await fetchInfiniLeaderboard(category));
      } else {
        const rows = await fetchCompositeLeaderboard();
        if (tab === 'accuracy') {
          setData([...rows].sort((a, b) => ((b as any).accuracy_pct ?? 0) - ((a as any).accuracy_pct ?? 0)));
        } else if (tab === 'streak') {
          setData([...rows].sort((a, b) => ((b as any).streak_best ?? 0) - ((a as any).streak_best ?? 0)));
        } else {
          setData(rows);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [tab, category]);

  useEffect(() => { load(); }, [load]);

  const tabs = premium ? PREMIUM_TABS : FREE_TABS;
  const top3   = data.slice(0, 3);
  const rest   = data.slice(3);
  const podium = [top3[1], top3[0], top3[2]];

  function handleTabPress(t: Tab) {
    if ((t === 'infini' || t === 'streak' || t === 'accuracy') && !premium) {
      router.push('/(app)/paywall');
      return;
    }
    playClick();
    setTab(t);
  }

  if (premiumLoading) {
    return (
      <MeshBackground>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </MeshBackground>
    );
  }

  return (
    <MeshBackground>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { playPrevious(); router.replace('/(app)/home'); }}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Classement</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Onglets (tous visibles, premium locked tapable) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {PREMIUM_TABS.map((t) => {
          const locked  = !premium && t.id !== 'score';
          const active  = tab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabChip, active && styles.tabChipActive, locked && styles.tabChipLocked]}
              onPress={() => handleTabPress(t.id)}
              activeOpacity={0.75}
            >
              {locked && (
                <Image source={require('@/assets/Icon/UI/premium.png')} style={styles.tabLockIcon} resizeMode="contain" />
              )}
              <Text style={[styles.tabText, active && styles.tabTextActive, locked && styles.tabTextLocked]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filtre catégorie (onglet Infini uniquement) */}
      {tab === 'infini' && premium && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filters}
        >
          <TouchableOpacity
            style={[styles.filterChip, !category && styles.filterChipActive]}
            onPress={() => setCategory(undefined)}
          >
            <Text style={[styles.filterText, !category && styles.filterTextActive]}>Global</Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterChip, category === cat.id && styles.filterChipActive]}
              onPress={() => setCategory(cat.id)}
            >
              {cat.image
                ? <Image source={cat.image} style={styles.filterCatImg} resizeMode="contain" />
                : <Text>{cat.emoji}</Text>
              }
              <Text style={[styles.filterText, category === cat.id && styles.filterTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(_, i) => String(i + 3)}
          contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucun score pour l'instant</Text>
          }
          ListHeaderComponent={
            top3.length > 0 ? (
              <View style={styles.podiumRow}>
                {podium.map((item, displayIdx) => {
                  const rank       = displayIdx === 0 ? 1 : displayIdx === 1 ? 0 : 2;
                  const medalColor = MEDAL_COLORS[rank];
                  const isFirst    = rank === 0;
                  if (!item) return <View key={displayIdx} style={styles.podiumSlot} />;
                  return (
                    <View key={displayIdx} style={[styles.podiumSlot, isFirst && styles.podiumSlotFirst]}>
                      <View style={styles.podiumAvatarWrap}>
                        <Avatar
                          username={item.username}
                          uri={item.avatar_url}
                          size={isFirst ? 72 : 56}
                          borderColor={item.border_color ?? undefined}
                          frameId={item.equipped_frame_id}
                          badgeId={item.equipped_badge_id}
                        />
                        <View style={[styles.podiumBadge, { backgroundColor: medalColor }]}>
                          <Text style={styles.podiumBadgeText}>{rank + 1}</Text>
                        </View>
                      </View>
                      <Text style={styles.podiumName} numberOfLines={1}>
                        {item.username ?? '???'}
                      </Text>
                      <Text style={[styles.podiumPts, { color: medalColor }]}>
                        {displayValue(item, tab)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null
          }
          renderItem={({ item, index: i }) => (
            <View style={styles.row}>
              <Text style={styles.rankNum}>#{i + 4}</Text>
              <Avatar
                username={item.username}
                uri={item.avatar_url}
                size={38}
                borderColor={item.border_color ?? undefined}
                frameId={item.equipped_frame_id}
                badgeId={item.equipped_badge_id}
              />
              <View style={styles.rowMeta}>
                <Text style={styles.rowName}>{item.username ?? '???'}</Text>
                {isComposite(item) && tab === 'score' && (
                  <Text style={styles.rowSub}>
                    {[
                      item.defi_pts > 0 && `🎯 ${item.defi_pts}`,
                      item.xp > 0 && `⚡ ${item.xp} XP`,
                      item.streak_infini > 0 && `🔥 ×${item.streak_infini}`,
                    ].filter(Boolean).join('  ')}
                  </Text>
                )}
              </View>
              <Text style={styles.rowPts}>{displayValue(item, tab)}</Text>
            </View>
          )}
        />
      )}

      <BottomNav />
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(22,15,40,0.7)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: Colors.primary, fontSize: 22 },
  headerTitle: {
    flex: 1, color: Colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center',
  },

  tabsScroll: { flexGrow: 0 },
  tabsContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabChipActive: { borderColor: Colors.primary + '88', backgroundColor: Colors.primaryDeep + '28' },
  tabChipLocked: { borderColor: Colors.tertiary + '44', opacity: 0.75 },
  tabLockIcon: { width: 11, height: 11 },
  tabText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  tabTextLocked: { color: Colors.tertiary },

  filtersScroll: { marginTop: 4 },
  filters: { paddingHorizontal: 16, paddingVertical: 4, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9999,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterCatImg: { width: 16, height: 16 },
  filterChipActive: { borderColor: Colors.primary + '88', backgroundColor: Colors.primaryDeep + '33' },
  filterText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: Colors.primary, fontWeight: '800' },

  list: { paddingHorizontal: 16, gap: 10, paddingTop: 8 },
  empty: { color: Colors.textMuted, textAlign: 'center', marginTop: 48, fontSize: 15 },

  podiumRow: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    paddingVertical: 24, gap: 12, marginBottom: 8,
  },
  podiumSlot: { flex: 1, alignItems: 'center', gap: 6 },
  podiumSlotFirst: { marginBottom: 20 },
  podiumAvatarWrap: { position: 'relative' },
  podiumBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.background,
  },
  podiumBadgeText: { color: Colors.background, fontSize: 10, fontWeight: '900' },
  podiumName: { color: Colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center', maxWidth: 90 },
  podiumPts: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    padding: 14, gap: 12,
  },
  rankNum: { width: 36, color: Colors.outline, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  rowMeta: { flex: 1, gap: 2 },
  rowName: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: Colors.textMuted, fontSize: 11 },
  rowPts: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
});
