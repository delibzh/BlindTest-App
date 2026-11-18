import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORIES } from '@/components/CategoryCard';
import { fetchInfiniProgress, InfiniProgress } from '@/lib/infini';
import { fetchRecentCategories } from '@/lib/tracks';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { BottomNav } from '@/components/ui/BottomNav';
import { loadSounds, playClick, playPrevious } from '@/lib/sounds';

type DefiMode = 'clavier' | 'qcm';

export default function InfiniSetupScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [progress,      setProgress]      = useState<InfiniProgress[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [mode,          setMode]          = useState<DefiMode>('qcm');
  const [chipWidth,     setChipWidth]     = useState(0);
  const [newCategories, setNewCategories] = useState<string[]>([]);

  const sliderX   = useRef(new Animated.Value(0)).current;
  const chipWRef  = useRef(0);
  const cardAnims = useRef(
    CATEGORIES.map(() => ({ opacity: new Animated.Value(0), y: new Animated.Value(16) }))
  ).current;

  useEffect(() => { loadSounds(); }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRecentCategories().then(setNewCategories).catch(() => {});
      if (!user) { setLoading(false); return; }
      setLoading(true);
      cardAnims.forEach(a => { a.opacity.setValue(0); a.y.setValue(16); });
      fetchInfiniProgress(user.id)
        .then(setProgress)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [user])
  );

  useEffect(() => {
    if (!loading) {
      Animated.stagger(55, cardAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(a.y,       { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      )).start();
    }
  }, [loading]);

  function getBestStreak(category: string): number {
    return progress.find(p => p.category === category && p.mode === mode)?.best_streak ?? 0;
  }

  function handleModeChange(m: DefiMode) {
    playClick();
    setMode(m);
    Animated.spring(sliderX, {
      toValue: m === 'qcm' ? 0 : chipWRef.current + 10,
      useNativeDriver: true,
      tension: 220,
      friction: 22,
    }).start();
  }

  function handlePlay(category: string) {
    playClick();
    router.push({ pathname: '/(app)/infini-game', params: { category, mode } });
  }

  const modeProgress     = progress.filter(p => p.mode === mode);
  const globalBest       = modeProgress.reduce((m, p) => Math.max(m, p.best_streak), 0);
  const categoriesPlayed = modeProgress.filter(p => p.best_streak > 0).length;
  const flameColor       = mode === 'qcm' ? Colors.primary : Colors.secondary;

  if (loading) {
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
        <TouchableOpacity style={styles.backBtn} onPress={() => { playPrevious(); router.back(); }} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Mode Infini</Text>
          <Text style={styles.subtitle}>1 vie · streak à battre</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        {/* Bannière stats globales */}
        <View style={styles.banner}>
          <View style={styles.bannerItem}>
            <Text style={[styles.bannerValue, globalBest > 0 && { color: flameColor }]}>
              {globalBest > 0 ? `🔥 ${globalBest}` : '—'}
            </Text>
            <Text style={styles.bannerLabel}>Meilleur streak</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerItem}>
            <Text style={styles.bannerValue}>
              {categoriesPlayed}
              <Text style={styles.bannerValueSub}> / {CATEGORIES.length}</Text>
            </Text>
            <Text style={styles.bannerLabel}>Catégories jouées</Text>
          </View>
        </View>

        {/* Toggle mode — segmented control animé */}
        <View
          style={styles.modeRow}
          onLayout={e => {
            const w = Math.floor((e.nativeEvent.layout.width - 16) / 2);
            chipWRef.current = w;
            setChipWidth(w);
          }}
        >
          {chipWidth > 0 && (
            <Animated.View style={[
              styles.modeSlider,
              {
                width: chipWidth,
                transform: [{ translateX: sliderX }],
                borderColor: flameColor + '88',
                backgroundColor: flameColor + '18',
              },
            ]} />
          )}
          {(['qcm', 'clavier'] as DefiMode[]).map(m => (
            <TouchableOpacity
              key={m}
              style={styles.modeChip}
              onPress={() => handleModeChange(m)}
              activeOpacity={0.85}
            >
              <Image
                source={m === 'clavier' ? require('@/assets/Icon/UI/keyboard.png') : require('@/assets/Icon/UI/QCM.png')}
                style={styles.modeIcon}
                resizeMode="contain"
              />
              <Text style={[styles.modeChipText, mode === m && styles.modeChipTextActive]}>
                {m === 'clavier' ? 'Clavier' : 'QCM'}
              </Text>
              {m === 'clavier' && (
                <Text style={[styles.modeChipSub, mode === m && { color: Colors.secondary + 'AA' }]}>Hardcore</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Mode FULL ── */}
        <TouchableOpacity
          style={[styles.fullBtn, { borderColor: flameColor + '88', backgroundColor: flameColor + '18' }]}
          onPress={() => {
            playClick();
            router.push({ pathname: '/(app)/infini-game', params: { category: CATEGORIES.map(c => c.id).join(','), mode } });
          }}
          activeOpacity={0.85}
        >
          <Text style={[styles.fullBtnIcon, { color: flameColor }]}>♾️</Text>
          <View style={styles.fullBtnText}>
            <Text style={[styles.fullBtnTitle, { color: flameColor }]}>Mode FULL</Text>
            <Text style={styles.fullBtnSub}>Toutes les catégories mélangées</Text>
          </View>
          <Text style={[styles.fullBtnArrow, { color: flameColor }]}>›</Text>
        </TouchableOpacity>

        {/* Catégories */}
        {CATEGORIES.map((cat, i) => {
          const best = getBestStreak(cat.id);
          return (
            <Animated.View
              key={cat.id}
              style={[
                styles.cardShadow,
                { opacity: cardAnims[i].opacity, transform: [{ translateY: cardAnims[i].y }], shadowColor: cat.color },
              ]}
            >
              <TouchableOpacity
                style={[styles.catCard, { borderColor: cat.color + '55' }]}
                onPress={() => handlePlay(cat.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.catLeft, { backgroundColor: cat.color + '22' }]}>
                  {cat.image
                    ? <Image source={cat.image} style={styles.catImage} resizeMode="contain" />
                    : <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  }
                </View>
                <View style={styles.catRight}>
                  <View style={styles.catNameRow}>
                    <Text style={[styles.catName, { color: cat.color }]}>{cat.label}</Text>
                    {newCategories.includes(cat.id) && (
                      <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                    )}
                  </View>
                  <Text style={styles.catSub}>
                    {best > 0 ? 'Record personnel' : 'Pas encore joué'}
                  </Text>
                </View>
                {best > 0 ? (
                  <View style={[styles.bestBadge, { borderColor: flameColor + '66' }]}>
                    <Text style={styles.bestFlame}>🔥</Text>
                    <Text style={[styles.bestNum, { color: flameColor }]}>{best}</Text>
                  </View>
                ) : (
                  <Text style={styles.arrow}>›</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Règles */}
        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Comment jouer</Text>
          <View style={styles.rulesItemRow}>
            <Image source={require('@/assets/Icon/UI/music_note.png')} style={styles.rulesIcon} resizeMode="contain" />
            <Text style={styles.rulesItemText}>Un extrait joué — 25 secondes pour répondre</Text>
          </View>
          <View style={styles.rulesItemRow}>
            <Image source={require('@/assets/Icon/UI/life.png')} style={styles.rulesIcon} resizeMode="contain" />
            <Text style={styles.rulesItemText}>1 seule vie — mauvaise réponse ou timeout = fin</Text>
          </View>
          <Text style={styles.rulesItem}>🔥  Enchaîne les bonnes réponses pour battre ton record</Text>
          <Text style={styles.rulesItem}>♾️  Les tracks défilent sans limite, sans répétition</Text>
        </View>

      </ScrollView>
      <BottomNav />
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(22,15,40,0.6)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: Colors.primary, fontSize: 22 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { color: Colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  subtitle: { color: Colors.textMuted, fontSize: 12 },

  container: { padding: 16, paddingBottom: 110, gap: 12 },

  /* Bannière */
  banner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  bannerItem: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  bannerDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.10)' },
  bannerValue: { color: Colors.text, fontSize: 24, fontWeight: '900', lineHeight: 28 },
  bannerValueSub: { fontSize: 16, color: Colors.textMuted, fontWeight: '600' },
  bannerLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },

  /* Toggle mode */
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 3,
    position: 'relative',
  },
  modeSlider: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 11,
    backgroundColor: Colors.primaryDeep + '50',
    borderWidth: 1.5,
    borderColor: Colors.primary + '88',
  },
  modeChip: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, zIndex: 1 },
  modeIcon: { width: 22, height: 22 },
  modeChipText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' },
  modeChipTextActive: { color: Colors.primary },
  modeChipSub: { color: Colors.outline, fontSize: 10 },
  modeChipSubActive: { color: Colors.primary + 'AA' },

  /* FULL */
  fullBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  fullBtnIcon: { fontSize: 24 },
  fullBtnText: { flex: 1, gap: 2 },
  fullBtnTitle: { fontSize: 15, fontWeight: '800' },
  fullBtnSub: { color: Colors.textMuted, fontSize: 12 },
  fullBtnArrow: { fontSize: 22, fontWeight: '700' },

  /* Badge NEW */
  catNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  newBadge: {
    backgroundColor: Colors.success, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  newBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  /* Cards catégorie */
  cardShadow: {
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 80,
  },
  catLeft: { width: 80, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 36 },
  catImage: { width: 42, height: 42 },
  catRight: { flex: 1, padding: 14, gap: 4, justifyContent: 'center' },
  catName: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  catSub: { color: Colors.textMuted, fontSize: 12 },
  arrow: { color: Colors.textMuted, fontSize: 22, paddingRight: 16 },
  bestBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 1,
    borderLeftWidth: 1,
    alignSelf: 'stretch',
  },
  bestFlame: { fontSize: 15 },
  bestNum: { fontSize: 22, fontWeight: '900', lineHeight: 24 },

  /* Règles */
  rulesBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    gap: 8,
    marginTop: 4,
  },
  rulesTitle: { color: Colors.text, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  rulesItem: { color: Colors.textMuted, fontSize: 13, lineHeight: 20 },
  rulesItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rulesIcon: { width: 16, height: 16, flexShrink: 0 },
  rulesItemText: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },
});
