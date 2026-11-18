import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, Easing, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { MODES } from '@/components/ModeCard';
import { Colors } from '@/constants/colors';
import { CATEGORIES, Category } from '@/components/CategoryCard';
import { fetchCatalogCounts } from '@/lib/tracks';
import { loadSounds, playClick } from '@/lib/sounds';
import { useFocusEffect } from 'expo-router';
import { checkLoginStreak } from '@/lib/streaks';
import { addXp } from '@/lib/auth';
import { BottomNav } from '@/components/ui/BottomNav';
import { AudioSpectrum } from '@/components/ui/AudioSpectrum';
import { WaveBackground } from '@/components/ui/WaveBackground';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { usePremium } from '@/hooks/usePremium';
import { useMyProfile } from '@/hooks/useMyProfile';

const BANNER_ID = __DEV__
  ? TestIds.BANNER
  : Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS!
    : process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID!;

type CatalogEntry = { category: string; total: number; premium: number };

const CARD_W   = 88;
const CARD_GAP = 10;
const ITEM_W   = CARD_W + CARD_GAP;
const SET_W    = CATEGORIES.length * ITEM_W;
const MARQUEE_ITEMS = [...CATEGORIES, ...CATEGORIES, ...CATEGORIES];

export default function HomeScreen() {
  const { user } = useAuth();
  const { premium } = usePremium();
  const { profile: myProfile, loading: profileLoading } = useMyProfile();
  const username = myProfile?.username ?? '';

  const heroAnim   = useRef(new Animated.Value(0)).current;
  const cardsAnim  = useRef(new Animated.Value(0)).current;
  const bottomAnim = useRef(new Animated.Value(0)).current;
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    checkLoginStreak(user.id)
      .then(xp => { if (xp > 0) addXp(user.id, xp); })
      .catch(() => {});
  }, [user?.id]));

  useEffect(() => {
    loadSounds();
    Animated.sequence([
      Animated.timing(heroAnim,   { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cardsAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(bottomAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    fetchCatalogCounts().then(setCatalog).catch(() => {});
  }, []);

  function handleMode(modeId: string) {
    playClick();
    if (modeId === 'defi') router.push('/(app)/defi-menu');
    else if (modeId === 'soiree') router.push('/(app)/soiree-menu');
    else if (modeId === 'infini') router.push('/(app)/infini-setup');
  }

  return (
    <View style={styles.root}>
      <WaveBackground />
      <View style={styles.waveVeil} pointerEvents="none" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Avatar + salutation */}
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => { playClick(); router.push('/(app)/profile'); }}
            activeOpacity={0.8}
            style={{ opacity: profileLoading ? 0 : 1 }}
            disabled={profileLoading}
          >
            <Avatar
              username={username}
              uri={myProfile?.avatar_url}
              size={44}
              borderColor={myProfile?.border_color}
              frameId={myProfile?.equipped_frame_id}
              badgeId={myProfile?.equipped_badge_id}
            />
          </TouchableOpacity>
          <Text style={[styles.greeting, { opacity: profileLoading ? 0 : 1 }]}>
            {`Salut, ${username} 👋`}
          </Text>
          <TouchableOpacity onPress={() => { playClick(); router.push('/(app)/leaderboard'); }} activeOpacity={0.8}>
            <Image source={require('@/assets/Icon/UI/trophy.png')} style={styles.rankIcon} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* Hero centré */}
        <Animated.View style={[
          styles.hero,
          {
            opacity: heroAnim,
            transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
          },
        ]}>
          <View style={styles.spectrumWrap} pointerEvents="none">
            <AudioSpectrum size={250} radius={110} color={Colors.primary} />
          </View>
          <View style={styles.heroGlow} pointerEvents="none" />
          <Text style={styles.heroTitle}>TALAREF' ?</Text>
          <Text style={styles.heroSub}>Si tu l'as, tu régales !</Text>
        </Animated.View>

        {/* Modes de jeu */}
        <Animated.View style={{
          opacity: cardsAnim,
          transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        }}>
          <Text style={styles.sectionTitle}>Modes de jeu</Text>
          <View style={styles.modesGrid}>
            {MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[styles.modeCard, { borderColor: mode.color + '66' }]}
                onPress={() => handleMode(mode.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.modeIconWrap, { backgroundColor: mode.color + '22' }]}>
                  {mode.image
                    ? <Image source={mode.image} style={styles.modeImage} resizeMode="contain" />
                    : <Text style={styles.modeEmoji}>{mode.emoji}</Text>
                  }
                </View>
                <Text style={[styles.modeLabel, { color: mode.color }]}>{mode.label}</Text>
                <Text style={styles.modeDesc}>{mode.description}</Text>
                {mode.isPremium && (
                  <View style={styles.premiumBadgeWrap}>
                    <Text style={styles.premiumBadge}>PREMIUM</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.onlineBtn}
            onPress={() => { playClick(); router.push('/(app)/salon'); }}
            activeOpacity={0.8}
          >
            <View style={styles.onlineIconWrap}>
              <Text style={styles.onlineEmoji}>🌐</Text>
            </View>
            <View style={styles.onlineTextCol}>
              <Text style={styles.onlineLabel}>En ligne</Text>
              <Text style={styles.onlineDesc}>Joue en direct contre d'autres joueurs</Text>
              <Text style={styles.onlineDesc2}>Joue localement avec tes amis, ou contre des gens aléatoires !</Text>
            </View>
            <View style={styles.onlineBadgeWrap}>
              <Text style={styles.onlineBadge}>BÊTA</Text>
            </View>
            <Text style={styles.onlineArrow}>›</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bannière catalogue animée */}
        <CategoryMarquee catalog={catalog} onPress={() => { playClick(); router.push('/(app)/paywall'); }} />

        {/* Actions bas */}
        <Animated.View style={[
          styles.bottomCol,
          {
            opacity: bottomAnim,
            transform: [{ translateY: bottomAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          },
        ]}>
          <TouchableOpacity
            style={styles.premiumBtn}
            activeOpacity={0.85}
            onPress={() => { playClick(); router.push('/(app)/paywall'); }}
          >
            <View style={styles.premiumBtnInner}>
              <Image source={require('@/assets/Icon/UI/premium.png')} style={styles.premiumBtnIcon} resizeMode="contain" />
              <Text style={styles.premiumBtnText}>Passer en Premium</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.smallBtn} onPress={() => { playClick(); router.push('/(app)/boutique'); }} activeOpacity={0.85}>
              <Text style={styles.smallBtnText}>🛍️ Boutique</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtn} onPress={() => { playClick(); router.push('/(app)/about'); }} activeOpacity={0.75}>
              <Text style={styles.smallBtnText}>ℹ️ À propos</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.legalBtn} onPress={() => { playClick(); router.push('/(app)/legal'); }} activeOpacity={0.7}>
            <Text style={styles.legalBtnText}>Mentions légales & Crédits</Text>
          </TouchableOpacity>
        </Animated.View>

        {!premium && (
          <View style={styles.bannerWrap}>
            <BannerAd
              unitId={BANNER_ID}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
            />
          </View>
        )}

      </ScrollView>
      <BottomNav />
    </View>
  );
}

function CategoryChip({ cat, count }: { cat: Category; count?: number }) {
  return (
    <View style={[chipStyles.wrap, { borderColor: cat.color + '55', backgroundColor: cat.color + '16' }]}>
      {cat.image
        ? <Image source={cat.image} style={chipStyles.img} resizeMode="contain" />
        : <Text style={chipStyles.emoji}>{cat.emoji}</Text>
      }
      <Text style={[chipStyles.label, { color: cat.color }]} numberOfLines={1}>{cat.label}</Text>
      <Text style={chipStyles.count}>{count != null && count > 0 ? `${count} sons` : '—'}</Text>
    </View>
  );
}

function CategoryMarquee({ catalog, onPress }: { catalog: CatalogEntry[]; onPress: () => void }) {
  const row1 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(row1, {
        toValue: -SET_W,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <View style={marqueeStyles.card}>
        <View style={marqueeStyles.header}>
          <View style={marqueeStyles.titleRow}>
            <Image source={require('@/assets/Icon/UI/categories.png')} style={marqueeStyles.titleIcon} resizeMode="contain" />
            <Text style={marqueeStyles.title}>Catalogue</Text>
          </View>
          <Text style={marqueeStyles.cta}>Découvrir →</Text>
        </View>

        <View style={marqueeStyles.rowWrap}>
          <Animated.View style={[marqueeStyles.row, { transform: [{ translateX: row1 }] }]}>
            {MARQUEE_ITEMS.map((cat, i) => {
              const entry = catalog.find(c => c.category === cat.id);
              return <CategoryChip key={`r1-${i}`} cat={cat} count={entry?.total} />;
            })}
          </Animated.View>
        </View>

        <View style={marqueeStyles.subRow}>
          <Image source={require('@/assets/Icon/UI/premium.png')} style={marqueeStyles.subIcon} resizeMode="contain" />
          <Text style={marqueeStyles.sub}>Sons premium inclus dans l'abonnement</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  wrap: {
    width: CARD_W,
    height: 92,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginRight: CARD_GAP,
  },
  img:   { width: 34, height: 34 },
  emoji: { fontSize: 26 },
  label: { fontSize: 10, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  count: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, textAlign: 'center' },
});

const marqueeStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIcon: { width: 20, height: 20 },
  title: { color: Colors.text, fontSize: 15, fontWeight: '800' },
  cta:   { color: Colors.tertiary, fontSize: 12, fontWeight: '800' },
  rowWrap: {
    overflow: 'hidden',
    height: 92,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  subIcon: { width: 12, height: 12 },
  sub: { color: Colors.textMuted, fontSize: 11, textAlign: 'center' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B051D' },
  waveVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,5,29,0.62)' },
  scroll: { flex: 1 },
  container: { padding: 20, paddingTop: 56, paddingBottom: 100, gap: 24 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: { color: Colors.textMuted, fontSize: 15, fontWeight: '500', flex: 1 },
  rankIcon: { width: 28, height: 28 },

  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
    position: 'relative',
    gap: 8,
  },
  spectrumWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.primaryDeep,
    opacity: 0.12,
    top: 10,
  },
  heroTitle: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSub: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  sectionTitle: {
    color: Colors.outline,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },

  modesGrid: { flexDirection: 'row', gap: 12 },
  modeCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  modeIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeEmoji: { fontSize: 30 },
  modeImage: { width: 36, height: 36 },
  modeLabel: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  modeDesc: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  premiumBadgeWrap: {
    backgroundColor: Colors.tertiary + '22',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  premiumBadge: { color: Colors.tertiary, fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  bottomCol: { gap: 12 },
  premiumBtn: {
    backgroundColor: Colors.tertiary + '18',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: Colors.tertiary + '66',
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  premiumBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  premiumBtnIcon: { width: 20, height: 20 },
  premiumBtnText: { color: Colors.tertiary, fontSize: 15, fontWeight: '800' },
  bottomRow: { flexDirection: 'row', gap: 12 },
  smallBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  smallBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  legalBtn: { alignItems: 'center', paddingVertical: 6 },
  legalBtnText: { color: Colors.outline, fontSize: 11, fontWeight: '500' },
  bannerWrap: { alignItems: 'center', marginTop: 8 },

  onlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.secondary + '12',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.secondary + '55',
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  onlineIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: Colors.secondary + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineEmoji: { fontSize: 28 },
  onlineTextCol: { flex: 1, gap: 5 },
  onlineLabel: { color: Colors.secondary, fontSize: 17, fontWeight: '800' },
  onlineDesc: { color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  onlineDesc2: { color: Colors.outline, fontSize: 10, lineHeight: 15, fontStyle: 'italic' },
  onlineBadgeWrap: {
    backgroundColor: Colors.secondary + '22',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  onlineBadge: { color: Colors.secondary, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  onlineArrow: { color: Colors.secondary, fontSize: 22, fontWeight: '300', opacity: 0.7 },
});
