import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Image, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { getSignedAudioUrl } from '@/lib/tracks';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { useLocalMultiplayerGame } from '@/hooks/useLocalMultiplayerGame';
import { loadSounds, playClick, playGameStart, playPrevious, playRight, playWrong } from '@/lib/sounds';
import { usePreventBack, confirmQuit } from '@/hooks/usePreventBack';
import { usePremium } from '@/hooks/usePremium';
import { trackPartySound } from '@/lib/ads';

// ROUND_SEC est défini dynamiquement depuis le param timer
const SCOREBOARD_INTERVAL = 10;

const PLAYER_COLORS = [
  '#ecb2ff', // violet clair (primary)
  '#00eefc', // cyan (secondary)
  '#f59e0b', // ambre
  '#22c55e', // vert
  '#e7006e', // rose vif (tertiary)
  '#8b5cf6', // violet
  '#f97316', // orange
  '#06b6d4', // teal
];

type Phase = 'loading' | 'countdown' | 'playing' | 'revealed' | 'gorgee' | 'scoreboard' | 'finished';

// ── Equalizer animé ─────────────────────────────────────────
function EqualizerBars() {
  const heights = [
    useRef(new Animated.Value(0.5)).current,
    useRef(new Animated.Value(0.9)).current,
    useRef(new Animated.Value(0.3)).current,
  ];
  useEffect(() => {
    heights.forEach((h, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(h, { toValue: 1,   duration: 260 + i * 80, useNativeDriver: true }),
          Animated.timing(h, { toValue: 0.2, duration: 260 + i * 80, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);
  const colors = [Colors.primary, Colors.secondary, Colors.tertiary];
  return (
    <View style={eq.row}>
      {heights.map((h, i) => (
        <Animated.View key={i} style={[eq.bar, { backgroundColor: colors[i], transform: [{ scaleY: h }] }]} />
      ))}
    </View>
  );
}
const eq = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 18 },
  bar: { width: 4, height: 16, borderRadius: 2 },
});

// ── Timer en points circulaires ───────────────────────────────
function DotCircleTimer({ pct, color, size = 200, children }: {
  pct: number; color: string; size?: number; children?: React.ReactNode;
}) {
  const DOTS = 60;
  const radius = (size - 28) / 2;
  const activeDots = Math.round(pct * DOTS);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: DOTS }).map((_, i) => {
        const angleDeg = (i / DOTS) * 360 - 90;
        const rad = (angleDeg * Math.PI) / 180;
        const cx = Math.cos(rad) * radius;
        const cy = Math.sin(rad) * radius;
        const active = i < activeDots;
        return (
          <View key={i} style={{
            position: 'absolute',
            width: 3.5,
            height: active ? 10 : 7,
            borderRadius: 2,
            backgroundColor: active ? color : 'rgba(255,255,255,0.14)',
            left: size / 2 + cx - 1.75,
            top: size / 2 + cy - (active ? 5 : 3.5),
            transform: [{ rotate: `${angleDeg + 90}deg` }],
            ...(active ? {
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 5,
              elevation: 3,
            } : {}),
          }} />
        );
      })}
      <View style={{ alignItems: 'center', justifyContent: 'center', gap: 0 }}>
        {children}
      </View>
    </View>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function SoireeGameScreen() {
  const { categories, count, wrongRule, players: playersParam, timer } =
    useLocalSearchParams<{ categories: string; count: string; wrongRule: string; players: string; timer: string }>();
  const ROUND_SEC = timer ? Number(timer) : 20;
  const { user } = useAuth();
  const { premium } = usePremium();
  const insets = useSafeAreaInsets();
  const myName = user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? null;

  const rawParam = Array.isArray(playersParam) ? playersParam[0] : playersParam;
  const players = rawParam?.split('|').filter(Boolean) ?? [];

  const {
    tracks, tracksRef, index, setIndex,
    countdown, scores, setScores, scoresRef, correctCounts, wrongCounts,
    sound, loadTracks, saveGameResults, cleanup,
  } = useLocalMultiplayerGame({
    categories: categories ?? '',
    count: count ?? '0',
    players,
    matchMode: 'oral',
    userId: user?.id,
    myName,
  });

  const [phase, setPhase] = useState<Phase>('loading');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [gorgeePlayer, setGorgeePlayer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_SEC);

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerAnim   = useRef(new Animated.Value(1)).current;
  const timerAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const countdownScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadSounds();
    loadTracks(
      () => { setPhase('countdown'); playGameStart(); },
      () => startRound(0),
    );
    return () => {
      cleanup();
      stopRoundTimer();
    };
  }, []);

  useEffect(() => {
    if (phase === 'countdown') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(countdownScale, { toValue: 1.1, duration: 400, useNativeDriver: true }),
          Animated.timing(countdownScale, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      countdownScale.stopAnimation();
      countdownScale.setValue(1);
    }
  }, [phase]);

  function handleQuit() {
    stopRoundTimer();
    cleanup();
    playPrevious();
    router.back();
  }

  usePreventBack(handleQuit);

  function stopRoundTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    timerAnimRef.current?.stop();
  }

  function startRoundTimer() {
    setTimeLeft(ROUND_SEC);
    timerAnim.setValue(1);
    timerAnimRef.current = Animated.timing(timerAnim, {
      toValue: 0, duration: ROUND_SEC * 1000, useNativeDriver: false,
    });
    timerAnimRef.current.start();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          skipRound();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  async function startRound(idx: number) {
    const track = tracksRef.current[idx];
    if (!track) return;
    setSelectedPlayer(null);
    setIndex(idx);
    setPhase('playing');
    startRoundTimer();
    try {
      sound.current?.remove();
      const url = await getSignedAudioUrl(track.r2_key);
      const player = createAudioPlayer({ uri: url });
      player.play();
      sound.current = player;
    } catch {}
  }

  function selectPlayer(name: string) {
    if (phase !== 'playing') return;
    playClick();
    stopRoundTimer();
    sound.current?.pause();
    setSelectedPlayer(name);
    setPhase('revealed');
  }

  function skipRound() {
    stopRoundTimer();
    sound.current?.pause();
    setSelectedPlayer(null);
    setPhase('revealed');
  }

  function handleScore(isCorrect: boolean) {
    if (!selectedPlayer) return;
    if (isCorrect) {
      playRight();
      correctCounts.current[selectedPlayer] = (correctCounts.current[selectedPlayer] ?? 0) + 1;
    } else {
      playWrong();
      wrongCounts.current[selectedPlayer] = (wrongCounts.current[selectedPlayer] ?? 0) + 1;
    }
    const updated = { ...scoresRef.current };
    if (isCorrect) {
      updated[selectedPlayer] = updated[selectedPlayer] + 1;
      setGorgeePlayer(null);
    } else if (wrongRule === 'malus') {
      updated[selectedPlayer] = Math.max(0, updated[selectedPlayer] - 1);
      setGorgeePlayer(null);
    } else if (wrongRule === 'gorgee') {
      setGorgeePlayer(selectedPlayer);
      scoresRef.current = updated;
      setScores({ ...updated });
      sound.current?.pause();
      setPhase('gorgee');
      return;
    } else {
      setGorgeePlayer(null);
    }
    scoresRef.current = updated;
    setScores({ ...updated });
    sound.current?.pause();
    afterReveal();
  }

  async function finishGame() {
    setPhase('finished');
    await saveGameResults();
  }

  async function afterReveal() {
    playClick();
    const nextIndex = index + 1;
    if (nextIndex >= tracksRef.current.length) { finishGame(); return; }
    await trackPartySound('confiance', premium);
    if (nextIndex % SCOREBOARD_INTERVAL === 0) {
      setIndex(nextIndex);
      setPhase('scoreboard');
    } else {
      startRound(nextIndex);
    }
  }

  const track = tracks[index] ?? tracksRef.current[index];
  const correctAnswer = track?.answers.find((a) => a.is_correct)?.label;
  const total = tracksRef.current.length;
  const timerPct = timeLeft / ROUND_SEC;
  const urgencyColor = timerPct > 0.5 ? Colors.secondary : timerPct > 0.25 ? Colors.primary : Colors.error;

  // ── Loading ──────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <MeshBackground>
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={s.loadTxt}>Chargement des sons…</Text>
        </View>
      </MeshBackground>
    );
  }

  // ── Countdown (pre-game) ─────────────────────────────────────
  if (phase === 'countdown') {
    const penaltyLabel = wrongRule === 'malus' ? '−1 pt' : wrongRule === 'gorgee' ? 'une gorgée' : 'aucun malus';
    return (
      <MeshBackground>
        <View style={s.center}>
          <Text style={s.cdTitle}>Préparez-vous !</Text>
          <Animated.Text style={[s.cdNumber, { transform: [{ scale: countdownScale }] }]}>
            {countdown}
          </Animated.Text>
          <View style={s.cdRules}>
            <View style={s.cdStepRow}>
              <Image source={require('@/assets/Icon/UI/music_note.png')} style={s.cdStepIcon} />
              <Text style={s.cdStep}>Écoutez le son et répondez à l'oral</Text>
            </View>
            <Text style={s.cdStep}>👆 L'hôte tape le premier qui répond</Text>
            <Text style={s.cdStep}>✅ Bonne réponse → +1 pt</Text>
            <Text style={s.cdStep}>❌ Mauvaise réponse → {penaltyLabel}</Text>
          </View>
          <View style={s.playerPreview}>
            {players.map((name, i) => (
              <View key={name} style={[s.playerPreviewChip, { borderColor: PLAYER_COLORS[i % PLAYER_COLORS.length] + '99', backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] + '18' }]}>
                <Text style={[s.playerPreviewName, { color: PLAYER_COLORS[i % PLAYER_COLORS.length] }]}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      </MeshBackground>
    );
  }

  // ── Finished ─────────────────────────────────────────────────
  if (phase === 'finished') {
    const sorted = [...players].sort((a, b) => scoresRef.current[b] - scoresRef.current[a]);
    return (
      <MeshBackground>
        <View style={s.center}>
          <Text style={s.resultEmoji}>🏆</Text>
          <Text style={s.resultTitle}>Classement final</Text>
          {sorted.map((name, i) => {
            const color = PLAYER_COLORS[players.indexOf(name) % PLAYER_COLORS.length];
            return (
              <View key={name} style={[s.scoreRow, { borderColor: color + '44' }]}>
                <Text style={s.scoreRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</Text>
                <Text style={[s.scoreName, { color }]}>{name}</Text>
                <Text style={[s.scorePoints, { color }]}>{scoresRef.current[name]} pt{scoresRef.current[name] > 1 ? 's' : ''}</Text>
              </View>
            );
          })}
          <TouchableOpacity style={s.primaryBtn} onPress={() => { playPrevious(); router.replace('/(app)/home'); }}>
            <Text style={s.primaryBtnText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </MeshBackground>
    );
  }

  // ── Scoreboard ───────────────────────────────────────────────
  if (phase === 'scoreboard') {
    const sorted = [...players].sort((a, b) => scoresRef.current[b] - scoresRef.current[a]);
    return (
      <MeshBackground>
        <View style={s.center}>
          <Text style={s.resultEmoji}>📊</Text>
          <Text style={s.resultTitle}>Son {index} / {total}</Text>
          {sorted.map((name, i) => {
            const color = PLAYER_COLORS[players.indexOf(name) % PLAYER_COLORS.length];
            return (
              <View key={name} style={[s.scoreRow, { borderColor: color + '44' }]}>
                <Text style={s.scoreRank}>{i === 0 ? '👑' : `#${i + 1}`}</Text>
                <Text style={[s.scoreName, { color }]}>{name}</Text>
                <Text style={[s.scorePoints, { color }]}>{scoresRef.current[name]} pt{scoresRef.current[name] > 1 ? 's' : ''}</Text>
              </View>
            );
          })}
          <TouchableOpacity style={s.primaryBtn} onPress={() => startRound(index)}>
            <Text style={s.primaryBtnText}>Continuer ›</Text>
          </TouchableOpacity>
        </View>
      </MeshBackground>
    );
  }

  // ── Gorgee ───────────────────────────────────────────────────
  if (phase === 'gorgee' && gorgeePlayer) {
    const idx = players.indexOf(gorgeePlayer);
    const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
    return (
      <MeshBackground>
        <View style={s.center}>
          <Text style={s.resultEmoji}>🍺</Text>
          <Text style={[s.gorgeeName, { color }]}>{gorgeePlayer}</Text>
          <Text style={s.gorgeeText}>boit une gorgée !</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={afterReveal}>
            <Text style={s.primaryBtnText}>C'est bu · Continuer ›</Text>
          </TouchableOpacity>
        </View>
      </MeshBackground>
    );
  }

  // ── Revealed ─────────────────────────────────────────────────
  if (phase === 'revealed') {
    const selectedIdx = selectedPlayer ? players.indexOf(selectedPlayer) : -1;
    const playerColor = selectedIdx >= 0 ? PLAYER_COLORS[selectedIdx % PLAYER_COLORS.length] : Colors.primary;
    return (
      <MeshBackground>
        <View style={s.center}>
          {/* Réponse correcte */}
          <View style={s.revealHeader}>
            <Text style={s.revealLabel}>RÉPONSE CORRECTE</Text>
            {track?.image_url && (
              <Image source={{ uri: track.image_url }} style={s.revealImage} resizeMode="contain" />
            )}
            <Text style={s.revealAnswer}>{correctAnswer}</Text>
          </View>

          {selectedPlayer ? (
            <>
              {/* Badge joueur sélectionné */}
              <View style={[s.playerBadge, { borderColor: playerColor + '88', backgroundColor: playerColor + '18' }]}>
                <View style={[s.playerBadgeDot, { backgroundColor: playerColor }]} />
                <Text style={[s.playerBadgeName, { color: playerColor }]}>{selectedPlayer}</Text>
                <Text style={s.playerBadgeSub}>a répondu en premier</Text>
              </View>

              {/* Boutons correct / faux */}
              <TouchableOpacity style={[s.judgeBtn, { borderColor: Colors.success + '88', backgroundColor: Colors.success + '15' }]} onPress={() => handleScore(true)}>
                <Text style={[s.judgeBtnIcon]}>✅</Text>
                <View>
                  <Text style={[s.judgeBtnLabel, { color: Colors.success }]}>Bonne réponse</Text>
                  <Text style={[s.judgeBtnSub, { color: Colors.success + 'AA' }]}>+1 point</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[s.judgeBtn, { borderColor: Colors.error + '88', backgroundColor: Colors.error + '12' }]} onPress={() => handleScore(false)}>
                <Text style={[s.judgeBtnIcon]}>
                  {wrongRule === 'gorgee' ? '🍺' : '❌'}
                </Text>
                <View>
                  <Text style={[s.judgeBtnLabel, { color: Colors.error }]}>Mauvaise réponse</Text>
                  <Text style={[s.judgeBtnSub, { color: Colors.error + 'AA' }]}>
                    {wrongRule === 'malus' ? '−1 pt' : wrongRule === 'gorgee' ? 'Une gorgée' : 'Sans malus'}
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={s.primaryBtn} onPress={afterReveal}>
              <Text style={s.primaryBtnText}>Son suivant ›</Text>
            </TouchableOpacity>
          )}
        </View>
      </MeshBackground>
    );
  }

  // ── Playing ──────────────────────────────────────────────────
  const widthPct = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <MeshBackground>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.headerBtn} onPress={() => confirmQuit(handleQuit)} activeOpacity={0.7}>
          <Text style={s.headerBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerSub}>SON {index + 1} / {total}</Text>
          <Text style={s.headerCat}>{track?.category?.toUpperCase()}</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      {/* Timer circulaire */}
      <View style={s.timerSection}>
        <DotCircleTimer pct={timerPct} color={urgencyColor} size={210}>
          <Text style={[s.timerNum, { color: urgencyColor }]}>{String(timeLeft).padStart(2, '0')}</Text>
          <Text style={s.timerLabel}>SECONDS</Text>
        </DotCircleTimer>

        {/* Barre de progression du son */}
        <View style={s.progressWrap}>
          <View style={s.progressHeader}>
            <Text style={s.nowPlaying}>NOW PLAYING</Text>
            <EqualizerBars />
          </View>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: widthPct }]}>
              <View style={[s.progressHead, { shadowColor: Colors.secondary }]} />
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Mini scores */}
      <View style={s.scoresRow}>
        {[...players].sort((a, b) => scoresRef.current[b] - scoresRef.current[a]).map((name) => {
          const color = PLAYER_COLORS[players.indexOf(name) % PLAYER_COLORS.length];
          return (
            <View key={name} style={[s.miniScore, { borderColor: color + '55', backgroundColor: color + '12' }]}>
              <Text style={[s.miniScoreName, { color }]}>{name}</Text>
              <Text style={[s.miniScorePts, { color }]}>{scoresRef.current[name]}pt</Text>
            </View>
          );
        })}
      </View>

      {/* "Qui a répondu en premier ?" */}
      <Text style={s.pickLabel}>Qui a répondu en premier ?</Text>

      {/* Boutons joueurs */}
      <View style={s.playerGrid}>
        {players.map((name, i) => {
          const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
          return (
            <TouchableOpacity
              key={name}
              style={[s.playerBtn, { borderColor: color + '88', backgroundColor: color + '20' }]}
              onPress={() => selectPlayer(name)}
              activeOpacity={0.75}
            >
              <View style={[s.playerDot, { backgroundColor: color }]} />
              <Text style={[s.playerBtnText, { color }]}>{name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={s.skipBtn} onPress={() => { playClick(); skipRound(); }}>
        <Text style={s.skipTxt}>Personne · Révéler la réponse ›</Text>
      </TouchableOpacity>
    </MeshBackground>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  loadTxt: { color: Colors.textMuted, fontSize: 15, marginTop: 8 },

  // Countdown
  cdTitle: { color: Colors.textMuted, fontSize: 18, fontWeight: '600' },
  cdNumber: {
    color: Colors.primary, fontSize: 110, fontWeight: '900', lineHeight: 120,
    textShadowColor: Colors.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
  },
  cdRules: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    padding: 16, gap: 10, width: '100%',
  },
  cdStep: { color: Colors.textMuted, fontSize: 14, lineHeight: 22, flex: 1 },
  cdStepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cdStepIcon: { width: 18, height: 18 },
  playerPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  playerPreviewChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  playerPreviewName: { fontSize: 13, fontWeight: '700' },

  // Résultats / scoreboard
  resultEmoji: { fontSize: 60 },
  resultTitle: { color: Colors.text, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  scoreRow: {
    flexDirection: 'row', width: '100%', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    padding: 14, borderWidth: 1, gap: 10,
  },
  scoreRank: { fontSize: 20, width: 36 },
  scoreName: { fontSize: 16, fontWeight: '700', flex: 1 },
  scorePoints: { fontSize: 16, fontWeight: '800' },
  primaryBtn: {
    backgroundColor: Colors.primaryDeep, borderRadius: 9999,
    paddingHorizontal: 28, paddingVertical: 14, width: '100%', alignItems: 'center',
    shadowColor: Colors.primaryDeep, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 18,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Gorgee
  gorgeeName: { fontSize: 34, fontWeight: '900', textAlign: 'center' },
  gorgeeText: { color: Colors.textMuted, fontSize: 20, fontWeight: '600' },

  // Revealed
  revealHeader: { width: '100%', alignItems: 'center', gap: 10 },
  revealLabel: { color: Colors.outline, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  revealImage: { width: 220, height: 300, borderRadius: 14, borderWidth: 2, borderColor: Colors.primary + '55' },
  revealAnswer: {
    color: Colors.primary, fontSize: 24, fontWeight: '900',
    textAlign: 'center', paddingHorizontal: 16,
    textShadowColor: Colors.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  playerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 10, width: '100%',
  },
  playerBadgeDot: { width: 10, height: 10, borderRadius: 5 },
  playerBadgeName: { fontSize: 18, fontWeight: '900', flex: 1 },
  playerBadgeSub: { color: Colors.textMuted, fontSize: 12 },
  judgeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 18, borderWidth: 1.5, padding: 16, width: '100%',
  },
  judgeBtnIcon: { fontSize: 28 },
  judgeBtnLabel: { fontSize: 16, fontWeight: '800' },
  judgeBtnSub: { fontSize: 13, marginTop: 2 },

  // Playing — header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(22,15,40,0.6)', gap: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { color: Colors.outline, fontSize: 18 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerSub: { color: Colors.outline, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  headerCat: { color: Colors.primary, fontSize: 14, fontWeight: '800' },

  // Timer circulaire + barre
  timerSection: { alignItems: 'center', paddingVertical: 16, gap: 12 },
  timerNum: { fontSize: 52, fontWeight: '900', lineHeight: 56 },
  timerLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  progressWrap: { width: '100%', paddingHorizontal: 24, gap: 6 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nowPlaying: { color: Colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  progressTrack: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  progressFill: {
    height: '100%', backgroundColor: Colors.secondary, borderRadius: 4,
    overflow: 'visible', position: 'relative',
  },
  progressHead: {
    position: 'absolute', right: -6, top: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.text,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8, elevation: 4,
  },

  // Scores
  scoresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16 },
  miniScore: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5,
  },
  miniScoreName: { fontSize: 12, fontWeight: '700' },
  miniScorePts: { fontSize: 12, fontWeight: '800' },

  // Joueurs
  pickLabel: {
    color: Colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center',
    paddingHorizontal: 16,
  },
  playerGrid: {
    flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, alignContent: 'flex-start',
  },
  playerBtn: {
    flex: 1, minWidth: '44%', minHeight: 62,
    borderRadius: 18, borderWidth: 2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingHorizontal: 12,
  },
  playerDot: { width: 8, height: 8, borderRadius: 4 },
  playerBtnText: { fontSize: 16, fontWeight: '800' },

  skipBtn: { alignSelf: 'center', paddingVertical: 12, marginBottom: 8 },
  skipTxt: { color: Colors.outline, fontSize: 13 },
});
