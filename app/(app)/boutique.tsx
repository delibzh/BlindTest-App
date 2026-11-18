import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { Avatar } from '@/components/ui/Avatar';
import { usePremium } from '@/hooks/usePremium';
import { useMyProfile } from '@/hooks/useMyProfile';
import {
  useCosmetics, isItemUnlocked, lockReason,
  type CosmeticItem,
} from '@/hooks/useCosmetics';
import { playClick } from '@/lib/sounds';

// ── Constantes visuelles ────────────────────────────────────────
const RARITY_COLOR: Record<string, string> = {
  common:    Colors.textMuted,
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f59e0b',
};

const RARITY_LABEL: Record<string, string> = {
  common: 'Commun', rare: 'Rare', epic: 'Épique', legendary: 'Légendaire',
};

const BADGE_EMOJI: Record<string, string> = {
  badge_none: '○', badge_fire: '🔥', badge_star: '⭐', badge_crown: '👑', badge_diamond: '💎',
};

const FRAME_COLOR: Record<string, string> = {
  frame_default:     Colors.textMuted,
  frame_silver:      '#94a3b8',
  frame_gold:        '#f59e0b',
  frame_neon_blue:   '#3b82f6',
  frame_neon_purple: '#a855f7',
  frame_legendary:   '#f97316',
};

// ── Types onglets ────────────────────────────────────────────────
type Tab = 'equip' | 'xp' | 'premium' | 'event';
const TABS: { id: Tab; label: string }[] = [
  { id: 'equip',   label: 'Équipé'   },
  { id: 'xp',      label: 'XP'       },
  { id: 'premium', label: '✦ Premium' },
  { id: 'event',   label: 'Événements'},
];

// ── Helpers ──────────────────────────────────────────────────────
function xpPct(item: CosmeticItem, userXp: number): number {
  if (!item.required_xp) return 1;
  return Math.min(1, userXp / item.required_xp);
}

export default function BoutiqueScreen() {
  const { profile: myProfile } = useMyProfile();
  const { premium } = usePremium();
  const insets = useSafeAreaInsets();
  const { catalogue, profileCosmetics, ownedIds, loading, equip } = useCosmetics();
  const [tab, setTab] = useState<Tab>('equip');

  if (loading || !profileCosmetics) {
    return (
      <MeshBackground>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </MeshBackground>
    );
  }

  const userXp = profileCosmetics.xp;

  function unlocked(item: CosmeticItem) {
    return isItemUnlocked(item, userXp, ownedIds, !!premium);
  }

  function handleEquip(item: CosmeticItem) {
    if (!unlocked(item)) { router.push('/(app)/paywall'); return; }
    playClick();
    if (item.type === 'frame') {
      equip('equipped_frame_id', item.id === 'frame_default' ? null : item.id);
    } else if (item.type === 'badge') {
      equip('equipped_badge_id', item.id === 'badge_none' ? null : item.id);
    } else if (item.type === 'title') {
      equip('equipped_title_id', item.id === 'title_none' ? null : item.id);
    }
  }

  const isEquipped = (item: CosmeticItem) => {
    if (item.type === 'frame') return profileCosmetics.equipped_frame_id === item.id || (item.id === 'frame_default' && !profileCosmetics.equipped_frame_id);
    if (item.type === 'badge') return profileCosmetics.equipped_badge_id === item.id || (item.id === 'badge_none'   && !profileCosmetics.equipped_badge_id);
    if (item.type === 'title') return profileCosmetics.equipped_title_id === item.id || (item.id === 'title_none'   && !profileCosmetics.equipped_title_id);
    return false;
  };

  // Filtres par onglet
  const xpItems      = catalogue.filter((c) => c.source === 'xp');
  const premiumItems = catalogue.filter((c) => c.source === 'premium');
  const eventItems   = catalogue.filter((c) => c.source === 'event' || c.source === 'achievement');

  const equippedItems = catalogue.filter(isEquipped);

  return (
    <MeshBackground>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { playClick(); router.replace('/(app)/home'); }} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collection</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Aperçu avatar live */}
      <View style={styles.preview}>
        <Avatar
          size={72}
          borderColor={profileCosmetics.border_color}
          frameId={profileCosmetics.equipped_frame_id}
          badgeId={profileCosmetics.equipped_badge_id}
        />
        <View style={styles.previewMeta}>
          <Text style={[styles.previewName, { color: profileCosmetics.username_color }]}>
            {myProfile?.username ?? ''}
          </Text>
          {profileCosmetics.equipped_title_id && (
            <Text style={styles.previewTitle}>
              {catalogue.find((c) => c.id === profileCosmetics.equipped_title_id)?.label ?? ''}
            </Text>
          )}
          <Text style={styles.previewXp}>⚡ {userXp} XP</Text>
        </View>
      </View>

      {/* Onglets */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => { playClick(); setTab(t.id); }}
            activeOpacity={0.75}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}>

        {/* ─── ONGLET : Équipé ─── */}
        {tab === 'equip' && (
          <>
            <Text style={styles.sectionTitle}>ACTUELLEMENT ÉQUIPÉ</Text>
            {equippedItems.length > 0 ? (
              <View style={styles.grid}>
                {equippedItems.map((item) => (
                  <ItemCard key={item.id} item={item} equipped onPress={() => handleEquip(item)} userXp={userXp} isPremium={!!premium} ownedIds={ownedIds} />
                ))}
              </View>
            ) : (
              <Text style={styles.emptyNote}>Aucun item équipé — explore les onglets ci-dessus.</Text>
            )}

          </>
        )}

        {/* ─── ONGLET : XP ─── */}
        {tab === 'xp' && (
          <>
            <Text style={styles.sectionTitle}>RÉCOMPENSES XP</Text>
            <Text style={styles.sectionSub}>Débloquées automatiquement en jouant</Text>
            {xpItems.map((item) => (
              <XpItemRow
                key={item.id}
                item={item}
                userXp={userXp}
                isPremium={!!premium}
                ownedIds={ownedIds}
                equipped={isEquipped(item)}
                onPress={() => handleEquip(item)}
              />
            ))}
          </>
        )}

        {/* ─── ONGLET : Premium ─── */}
        {tab === 'premium' && (
          <>
            {!premium && (
              <TouchableOpacity style={styles.premiumBanner} onPress={() => router.push('/(app)/paywall')} activeOpacity={0.85}>
                <Image source={require('@/assets/Icon/UI/premium.png')} style={styles.premiumBannerIcon} resizeMode="contain" />
                <Text style={styles.premiumBannerText}>Passe Premium — débloquer tous les exclusifs  →</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.sectionTitle}>EXCLUSIFS PREMIUM</Text>
            <View style={styles.grid}>
              {premiumItems.map((item) => (
                <ItemCard key={item.id} item={item} equipped={isEquipped(item)} onPress={() => handleEquip(item)} userXp={userXp} isPremium={!!premium} ownedIds={ownedIds} />
              ))}
            </View>
          </>
        )}

        {/* ─── ONGLET : Événements ─── */}
        {tab === 'event' && (
          <>
            <Text style={styles.sectionTitle}>ÉVÉNEMENTS & SUCCÈS</Text>
            {eventItems.length === 0 ? (
              <Text style={styles.emptyNote}>Aucun événement en cours.{'\n'}Reviens lors des prochains events saisonniers.</Text>
            ) : (
              <View style={styles.grid}>
                {eventItems.map((item) => (
                  <ItemCard key={item.id} item={item} equipped={isEquipped(item)} onPress={() => handleEquip(item)} userXp={userXp} isPremium={!!premium} ownedIds={ownedIds} />
                ))}
              </View>
            )}
          </>
        )}

      </ScrollView>
    </MeshBackground>
  );
}

// ─── Composant carte item ─────────────────────────────────────────
function ItemCard({ item, equipped, onPress, userXp, isPremium, ownedIds }: {
  item: CosmeticItem; equipped: boolean; onPress: () => void;
  userXp: number; isPremium: boolean; ownedIds: Set<string>;
}) {
  const ok     = isItemUnlocked(item, userXp, ownedIds, isPremium);
  const reason = lockReason(item, userXp, isPremium);
  const color  = FRAME_COLOR[item.id] ?? RARITY_COLOR[item.rarity] ?? Colors.text;

  return (
    <TouchableOpacity
      style={[styles.card, equipped && styles.cardEquipped, !ok && styles.cardLocked]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {item.type === 'frame' ? (
        <Avatar size={48} borderColor={color} frameId={item.id} />
      ) : item.type === 'badge' ? (
        <Text style={styles.badgeEmoji}>{BADGE_EMOJI[item.id] ?? '?'}</Text>
      ) : (
        <View style={styles.titlePreview}>
          <Text style={[styles.titlePreviewText, { color }]} numberOfLines={2}>
            {item.label || '(aucun)'}
          </Text>
        </View>
      )}
      <Text style={[styles.cardLabel, { color: ok ? Colors.text : Colors.outline }]} numberOfLines={1}>
        {item.label || 'Aucun'}
      </Text>
      <Text style={[styles.rarityTag, { color: RARITY_COLOR[item.rarity] }]}>
        {RARITY_LABEL[item.rarity]}
      </Text>
      {reason !== '' && (
        <View style={[styles.lockPill, item.source === 'premium' && styles.lockPillPremium]}>
          <Text style={styles.lockPillText}>{reason}</Text>
        </View>
      )}
      {equipped && <Text style={styles.equippedMark}>✓</Text>}
    </TouchableOpacity>
  );
}

// ─── Composant ligne XP avec barre de progression ─────────────────
function XpItemRow({ item, userXp, isPremium, ownedIds, equipped, onPress }: {
  item: CosmeticItem; userXp: number; isPremium: boolean; ownedIds: Set<string>;
  equipped: boolean; onPress: () => void;
}) {
  const ok     = isItemUnlocked(item, userXp, ownedIds, isPremium);
  const pct    = xpPct(item, userXp);
  const color  = FRAME_COLOR[item.id] ?? RARITY_COLOR[item.rarity];
  const reason = lockReason(item, userXp, isPremium);

  return (
    <TouchableOpacity style={[styles.xpRow, equipped && styles.xpRowEquipped]} onPress={onPress} activeOpacity={0.8}>
      {/* Preview */}
      <View style={styles.xpPreview}>
        {item.type === 'frame'
          ? <Avatar size={44} borderColor={color} frameId={item.id} />
          : item.type === 'badge'
          ? <Text style={{ fontSize: 28 }}>{BADGE_EMOJI[item.id] ?? '?'}</Text>
          : <Text style={[styles.xpTitleLabel, { color }]}>{item.label}</Text>
        }
      </View>

      {/* Info */}
      <View style={styles.xpInfo}>
        <View style={styles.xpInfoTop}>
          <Text style={[styles.xpItemLabel, !ok && { color: Colors.outline }]}>{item.label || 'Aucun'}</Text>
          {equipped && <Text style={styles.xpEquippedTag}>Équipé</Text>}
        </View>
        <Text style={[styles.rarityTag, { color: RARITY_COLOR[item.rarity] }]}>{RARITY_LABEL[item.rarity]}</Text>

        {/* Barre de progression */}
        {!ok && item.required_xp && (
          <View style={styles.xpBarWrap}>
            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, { width: `${Math.round(pct * 100)}%` }]} />
            </View>
            <Text style={styles.xpBarLabel}>{userXp} / {item.required_xp} XP</Text>
          </View>
        )}
        {ok && !equipped && (
          <Text style={styles.xpUnlockedTag}>✓ Débloqué</Text>
        )}
        {reason !== '' && item.source !== 'xp' && (
          <Text style={styles.xpLockReason}>{reason}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(22,15,40,0.6)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: Colors.primary, fontSize: 22 },
  headerTitle: { flex: 1, color: Colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 },

  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  previewMeta: { gap: 3 },
  previewName: { fontSize: 17, fontWeight: '900' },
  previewTitle: { color: Colors.textMuted, fontSize: 11, fontStyle: 'italic' },
  previewXp: { color: Colors.primary, fontSize: 12, fontWeight: '700', marginTop: 2 },

  tabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  tabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabActive: { borderColor: Colors.primary + '88', backgroundColor: Colors.primaryDeep + '28' },
  tabText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  content: { padding: 16, gap: 10 },

  sectionTitle: { color: Colors.outline, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 },
  sectionSub: { color: Colors.textMuted, fontSize: 12, marginTop: -4, marginBottom: 8 },
  emptyNote: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 22, marginTop: 24 },

  // Grille items
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  card: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)',
    padding: 14, alignItems: 'center', gap: 7, position: 'relative', minHeight: 120,
    justifyContent: 'center',
  },
  cardEquipped: { borderColor: Colors.primary + '99', backgroundColor: Colors.primaryDeep + '18' },
  cardLocked: { opacity: 0.7 },
  cardLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  rarityTag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'capitalize' },
  badgeEmoji: { fontSize: 36 },
  titlePreview: { height: 44, alignItems: 'center', justifyContent: 'center' },
  titlePreviewText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  lockPill: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  lockPillPremium: { borderColor: Colors.tertiary + '66', backgroundColor: Colors.tertiary + '18' },
  lockPillText: { color: Colors.tertiary, fontSize: 9, fontWeight: '800' },
  equippedMark: { position: 'absolute', top: 8, left: 10, color: Colors.primary, fontSize: 14, fontWeight: '900' },

  // Lignes XP
  xpRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    padding: 14,
  },
  xpRowEquipped: { borderColor: Colors.primary + '88', backgroundColor: Colors.primaryDeep + '14' },
  xpPreview: { width: 52, alignItems: 'center', justifyContent: 'center' },
  xpTitleLabel: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  xpInfo: { flex: 1, gap: 3 },
  xpInfoTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpItemLabel: { color: Colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
  xpEquippedTag: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  xpUnlockedTag: { color: Colors.primary, fontSize: 11, fontWeight: '600', marginTop: 2 },
  xpLockReason: { color: Colors.tertiary, fontSize: 11, fontWeight: '700', marginTop: 2 },
  xpBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  xpBarTrack: {
    flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 3, overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%', backgroundColor: Colors.primary, borderRadius: 3,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4,
  },
  xpBarLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', minWidth: 80, textAlign: 'right' },

  // Premium banner
  premiumBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.tertiary + '18', borderRadius: 14,
    borderWidth: 1, borderColor: Colors.tertiary + '55', padding: 14, marginBottom: 4,
  },
  premiumBannerIcon: { width: 16, height: 16 },
  premiumBannerText: { color: Colors.tertiary, fontSize: 13, fontWeight: '700' },
});
