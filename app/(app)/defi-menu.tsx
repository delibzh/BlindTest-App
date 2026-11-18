import { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { CATEGORIES } from '@/components/CategoryCard';
import { fetchDefiProgress, DefiProgress, DIFFICULTY_LABELS, DIFFICULTY_COLORS, Difficulty } from '@/lib/defi';
import { fetchRecentCategories } from '@/lib/tracks';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { BottomNav } from '@/components/ui/BottomNav';
import { loadSounds, playClick, playPrevious } from '@/lib/sounds';

const DIFFICULTIES: Difficulty[] = [1, 2, 3];
type DefiMode = 'clavier' | 'qcm';

export default function DefiMenuScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [progress,      setProgress]      = useState<DefiProgress[]>([]);
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
      fetchDefiProgress(user.id)
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

  function getProgress(category: string, difficulty: Difficulty): DefiProgress | null {
    return progress.find(p => p.category === category && p.difficulty === difficulty && p.mode === mode) ?? null;
  }

  function isUnlocked(category: string, difficulty: Difficulty): boolean {
    if (difficulty === 1) return true;
    return getProgress(category, (difficulty - 1) as Difficulty)?.completed ?? false;
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

  function handlePlay(category: string, difficulty: Difficulty) {
    if (!isUnlocked(category, difficulty)) return;
    playClick();
    router.push({ pathname: '/(app)/defi-game', params: { category, difficulty: String(difficulty), mode } });
  }

  // Stats globales (mode-dépendant)
  const totalCompleted = CATEGORIES.reduce(
    (sum, cat) => sum + DIFFICULTIES.filter(d => getProgress(cat.id, d)?.completed).length,
    0
  );
  const totalPossible = CATEGORIES.length * DIFFICULTIES.length;
  const topScore = progress
    .filter(p => p.mode === mode)
    .reduce((max, p) => Math.max(max, p.bestScore ?? 0), 0);

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
          <Text style={styles.title}>Mode Défi</Text>
          <Text style={styles.subtitle}>Reconnais les sons</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        {/* Bannière stats globales */}
        <View style={styles.banner}>
          <View style={styles.bannerItem}>
            <Text style={styles.bannerValue}>
              {totalCompleted}
              <Text style={styles.bannerValueSub}> / {totalPossible}</Text>
            </Text>
            <Text style={styles.bannerLabel}>Défis complétés</Text>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerItem}>
            <Text style={styles.bannerValue}>
              {Math.round((totalCompleted / totalPossible) * 100)}
              <Text style={styles.bannerValueSub}>%</Text>
            </Text>
            <Text style={styles.bannerLabel}>Complétion</Text>
          </View>
          {topScore > 0 && (
            <>
              <View style={styles.bannerDivider} />
              <View style={styles.bannerItem}>
                <Text style={styles.bannerValue}>{topScore.toLocaleString('fr-FR')}</Text>
                <Text style={styles.bannerLabel}>Meilleur score</Text>
              </View>
            </>
          )}
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
            <Animated.View style={[styles.modeSlider, { width: chipWidth, transform: [{ translateX: sliderX }] }]} />
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
                <Text style={[styles.modeChipSub, mode === m && styles.modeChipSubActive]}>Hardcore</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Catégories */}
        {CATEGORIES.map((cat, i) => (
          <Animated.View
            key={cat.id}
            style={[
              styles.cardShadow,
              { opacity: cardAnims[i].opacity, transform: [{ translateY: cardAnims[i].y }], shadowColor: cat.color },
            ]}
          >
            <View style={[styles.catCard, { borderColor: cat.color + '55' }]}>
              {/* Bloc gauche coloré */}
              <View style={[styles.catLeft, { backgroundColor: cat.color + '22' }]}>
                {cat.image
                  ? <Image source={cat.image} style={styles.catImage} resizeMode="contain" />
                  : <Text style={styles.catEmoji}>{cat.emoji}</Text>
                }
              </View>

              {/* Contenu droit */}
              <View style={styles.catRight}>
                <View style={styles.catNameRow}>
                  <Text style={[styles.catName, { color: cat.color }]}>{cat.label}</Text>
                  {newCategories.includes(cat.id) && (
                    <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                  )}
                </View>
                <View style={styles.diffRow}>
                  {DIFFICULTIES.map(diff => {
                    const prog    = getProgress(cat.id, diff);
                    const unlocked  = isUnlocked(cat.id, diff);
                    const completed = prog?.completed ?? false;
                    const pct    = prog ? Math.round((prog.bestScore / 20) * 100) : 0;
                    const color  = DIFFICULTY_COLORS[diff];
                    const isPremium = diff > 1;

                    return (
                      <TouchableOpacity
                        key={diff}
                        style={[
                          styles.diffChip,
                          unlocked
                            ? { borderColor: color + '99', backgroundColor: color + '18' }
                            : styles.diffChipLocked,
                          completed && { borderColor: color, backgroundColor: color + '28' },
                        ]}
                        onPress={() => handlePlay(cat.id, diff)}
                        disabled={!unlocked}
                        activeOpacity={0.75}
                      >
                        {!unlocked
                          ? <Image source={require('@/assets/Icon/UI/padlock.png')} style={styles.diffLock} resizeMode="contain" />
                          : completed
                            ? <Text style={styles.diffIcon}>✓</Text>
                            : null
                        }
                        <Text style={[styles.diffLabel, { color: unlocked ? color : Colors.outline }]}>
                          {DIFFICULTY_LABELS[diff]}
                        </Text>
                        {unlocked && !completed && pct > 0 && (
                          <Text style={[styles.diffPct, { color }]}>{pct}%</Text>
                        )}
                        {isPremium && !completed && (
                          <View style={[styles.premiumDot, { backgroundColor: Colors.tertiary }]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </Animated.View>
        ))}

        {/* Règles */}
        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Comment jouer</Text>
          <View style={styles.rulesItemRow}>
            <Image source={require('@/assets/Icon/UI/music_note.png')} style={styles.rulesIcon} resizeMode="contain" />
            <Text style={styles.rulesItemText}>Un extrait joué — 25 secondes pour répondre</Text>
          </View>
          <View style={styles.rulesItemRow}>
            <Image
              source={mode === 'clavier' ? require('@/assets/Icon/UI/keyboard.png') : require('@/assets/Icon/UI/QCM.png')}
              style={styles.rulesIcon}
              resizeMode="contain"
            />
            <Text style={styles.rulesItemText}>
              {mode === 'clavier' ? 'Tape le titre sur le clavier AZERTY' : 'Choisis parmi 4 réponses'}
            </Text>
          </View>
          <View style={styles.rulesItemRow}>
            <Image source={require('@/assets/Icon/UI/life.png')} style={styles.rulesIcon} resizeMode="contain" />
            <Text style={styles.rulesItemText}>3 vies — erreur ou temps écoulé = −1 vie</Text>
          </View>
          <View style={styles.rulesItemRow}>
            <Text style={styles.rulesItem}>⏭️</Text>
            <Text style={styles.rulesItemText}>Passer la question = −1 vie</Text>
          </View>
          <Text style={styles.rulesItem}>🏆  20/20 = niveau suivant débloqué !</Text>
        </View>

      </ScrollView>
      <BottomNav />
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  /* Header */
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
    minHeight: 90,
  },
  catLeft: { width: 80, alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: 38 },
  catImage: { width: 42, height: 42 },
  catRight: { flex: 1, padding: 14, gap: 10, justifyContent: 'center' },
  catName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },

  /* Difficulty chips */
  diffRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  diffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  diffChipLocked: {
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'transparent',
    opacity: 0.5,
  },
  diffIcon: { fontSize: 10 },
  diffLock: { width: 10, height: 10 },
  rulesItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rulesIcon: { width: 16, height: 16, flexShrink: 0 },
  rulesItemText: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, flex: 1 },
  diffLabel: { fontSize: 11, fontWeight: '800' },
  diffPct: { fontSize: 10, fontWeight: '700' },
  premiumDot: { width: 5, height: 5, borderRadius: 3 },

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
});
