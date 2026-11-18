import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, ActivityIndicator, Vibration, Animated, Dimensions, Image, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePreventBack, confirmQuit } from '@/hooks/usePreventBack';
import { usePremium } from '@/hooks/usePremium';
import { trackPartySound } from '@/lib/ads';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { getSignedAudioUrl } from '@/lib/tracks';
import { loadSounds, playBuzz, playGameStart, playPrevious, playRight, playWrong, unloadSounds } from '@/lib/sounds';
import { CATEGORIES } from '@/components/CategoryCard';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { useLocalMultiplayerGame } from '@/hooks/useLocalMultiplayerGame';
import { MeshBackground } from '@/components/ui/MeshBackground';

const { height: SCREEN_H } = Dimensions.get('window');

const PLAYER_COLORS = [
  Colors.primary, '#ec4899', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316',
];

const CORRECT_PTS = 1;
const WRONG_PTS = -3;

type Phase = 'loading' | 'countdown' | 'waiting-buzz' | 'buzzed' | 'revealed' | 'between-rounds' | 'scoreboard' | 'finished';

export default function BuzzGameScreen() {
  const { categories, count, wrongRule, players: playersParam } =
    useLocalSearchParams<{ categories: string; count: string; wrongRule: string; players: string }>();
  const { user } = useAuth();
  const { premium } = usePremium();
  const myName = user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? null;

  const rawParam = Array.isArray(playersParam) ? playersParam[0] : playersParam;
  const players = rawParam?.split('|').filter(Boolean) ?? [];

  const {
    tracks, tracksRef, index, setIndex, indexRef,
    countdown, scores, setScores, scoresRef, correctCounts, wrongCounts,
    sound, loadTracks, saveGameResults, cleanup,
  } = useLocalMultiplayerGame({
    categories: categories ?? '',
    count: count ?? '0',
    players,
    matchMode: 'buzz',
    userId: user?.id,
    myName,
  });

  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('loading');
  const [buzzedPlayer, setBuzzedPlayer] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | 'gorgee' | null>(null);
  const buzzLocked = useRef(false);

  function handleQuit() {
    cleanup();
    playPrevious();
    router.back();
  }

  usePreventBack(handleQuit);

  const countdownScale = useRef(new Animated.Value(1)).current;
  const zonesPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadSounds();
    loadTracks(
      () => { setPhase('countdown'); playGameStart(); },
      () => launchRound(0),
    );
    return () => { cleanup(); unloadSounds(); };
  }, []);

  useEffect(() => {
    if (phase === 'countdown') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(countdownScale, { toValue: 1.12, duration: 400, useNativeDriver: true }),
          Animated.timing(countdownScale, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      countdownScale.stopAnimation();
      countdownScale.setValue(1);
    }

    if (phase === 'waiting-buzz') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(zonesPulse, { toValue: 0.92, duration: 900, useNativeDriver: true }),
          Animated.timing(zonesPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      zonesPulse.stopAnimation();
      zonesPulse.setValue(1);
    }
  }, [phase]);

  async function launchRound(idx: number) {
    const track = tracksRef.current[idx];
    if (!track) return;

    buzzLocked.current = false;
    setBuzzedPlayer(null);
    setLastResult(null);
    setIndex(idx);
    setPhase('waiting-buzz');

    try {
      sound.current?.remove();
      const url = await getSignedAudioUrl(track.r2_key);
      const player = createAudioPlayer({ uri: url });
      player.play();
      sound.current = player;
    } catch { /* pas de son */ }
  }

  function handlePlayerBuzz(name: string) {
    if (phase !== 'waiting-buzz' || buzzLocked.current) return;
    buzzLocked.current = true;
    Vibration.vibrate([0, 60, 40, 80]);
    playBuzz();
    sound.current?.pause();
    setBuzzedPlayer(name);
    setPhase('buzzed');
  }

  function handleReveal() {
    sound.current?.play();
    setPhase('revealed');
  }

  function handleScore(isCorrect: boolean) {
    if (!buzzedPlayer) return;
    if (isCorrect) {
      correctCounts.current[buzzedPlayer] = (correctCounts.current[buzzedPlayer] ?? 0) + 1;
      playRight();
    } else {
      wrongCounts.current[buzzedPlayer] = (wrongCounts.current[buzzedPlayer] ?? 0) + 1;
      playWrong();
    }
    const updated = { ...scoresRef.current };
    if (isCorrect) {
      updated[buzzedPlayer] += CORRECT_PTS;
      setLastResult('correct');
    } else if (wrongRule === 'malus') {
      updated[buzzedPlayer] += WRONG_PTS;
      setLastResult('wrong');
    } else if (wrongRule === 'gorgee') {
      setLastResult('gorgee');
    } else {
      setLastResult('wrong');
    }
    scoresRef.current = updated;
    setScores({ ...updated });
    sound.current?.pause();
    goNext();
  }

  function skipRound() {
    sound.current?.pause();
    setBuzzedPlayer(null);
    setLastResult(null);
    goNext();
  }

  async function finishGame() {
    setPhase('finished');
    await saveGameResults();
  }

  async function goNext() {
    const nextIndex = indexRef.current + 1;
    indexRef.current = nextIndex;
    if (nextIndex >= tracksRef.current.length) {
      setIndex(nextIndex);
      finishGame();
    } else {
      await trackPartySound('buzz', premium);
      if (nextIndex % 10 === 0) {
        setIndex(nextIndex);
        setPhase('scoreboard');
      } else {
        launchRound(nextIndex);
      }
    }
  }

  const track = tracksRef.current[index] ?? tracks[index];
  const correctAnswer = track?.answers.find((a) => a.is_correct)?.label;
  const total = tracksRef.current.length || Number(count);
  const zoneHeight = Math.floor(SCREEN_H / Math.ceil(players.length / 2));

  // ── Loading ──────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <MeshBackground>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Chargement des sons...</Text>
        </View>
      </MeshBackground>
    );
  }

  // ── Countdown ────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <MeshBackground>
      <View style={styles.center}>
        <TouchableOpacity style={[styles.quitBtn, { top: insets.top + 12 }]} onPress={() => confirmQuit(handleQuit)} activeOpacity={0.7}>
          <Text style={styles.quitBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.cdTitle}>Préparez-vous !</Text>
        <Animated.Text style={[styles.cdNumber, { transform: [{ scale: countdownScale }] }]}>
          {countdown}
        </Animated.Text>
        <View style={styles.cdInstructions}>
          <Text style={styles.cdStep}>1. Chacun repère son espace sur l'écran</Text>
          <Text style={styles.cdStep}>2. Posez votre doigt dès que vous connaissez la réponse</Text>
          <Text style={styles.cdStep}>3. Le premier à appuyer répond à l'oral</Text>
          <Text style={[styles.cdStep, styles.cdWarning]}>⚠️ Mauvaise réponse = {WRONG_PTS} pts</Text>
        </View>
        <View style={styles.cdZonesPreview}>
          {players.map((name, i) => (
            <View key={name} style={[styles.cdZonePreview, { backgroundColor: PLAYER_COLORS[i % PLAYER_COLORS.length] + '33', borderColor: PLAYER_COLORS[i % PLAYER_COLORS.length] + '66' }]}>
              <Text style={[styles.cdZoneName, { color: PLAYER_COLORS[i % PLAYER_COLORS.length] }]}>{name}</Text>
            </View>
          ))}
        </View>
      </View>
      </MeshBackground>
    );
  }

  // ── Waiting Buzz — zones plein écran ─────────────────────────────────
  if (phase === 'waiting-buzz') {
    return (
      <MeshBackground>
      <View style={styles.fullScreen}>
        <View style={styles.zonesGrid}>
          {players.map((name, i) => {
            const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
            const isLastOdd = players.length % 2 !== 0 && i === players.length - 1;
            return (
              <Pressable
                key={name}
                style={({ pressed }) => [
                  styles.zone,
                  {
                    width: isLastOdd ? '100%' : '50%',
                    height: zoneHeight,
                    backgroundColor: pressed ? color + '55' : color + '22',
                    borderColor: color + (pressed ? 'cc' : '55'),
                  },
                ]}
                onPress={() => handlePlayerBuzz(name)}
              >
                <Animated.View style={{ alignItems: 'center', gap: 10, transform: [{ scale: zonesPulse }] }}>
                  <View style={[styles.fingerprintOuter, { borderColor: color }]}>
                    <View style={[styles.fingerprintMid, { borderColor: color + 'aa' }]}>
                      <View style={[styles.fingerprintInner, { backgroundColor: color + '44', borderColor: color }]}>
                        <Text style={[styles.fingerprintNum, { color }]}>{i + 1}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.zoneName, { color }]}>{name}</Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.buzzOverlayInfo} pointerEvents="none">
          {(() => {
            const cat = CATEGORIES.find((c) => c.id === track?.category);
            return cat ? (
              <Text style={[styles.buzzCatBadge, { color: cat.color }]}>{cat.emoji} {cat.label}</Text>
            ) : null;
          })()}
          <View style={styles.buzzOverlayRow}>
            <Image source={require('@/assets/Icon/UI/music_note.png')} style={styles.buzzOverlayIcon} />
            <Text style={styles.buzzOverlayText}>Appuyez dès que vous connaissez !</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.quitBtn, { top: insets.top + 12 }]} onPress={() => confirmQuit(handleQuit)} activeOpacity={0.7}>
          <Text style={styles.quitBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
      </MeshBackground>
    );
  }

  // ── Buzzed ───────────────────────────────────────────────────────────
  if (phase === 'buzzed' && buzzedPlayer) {
    const playerColor = PLAYER_COLORS[players.indexOf(buzzedPlayer) % PLAYER_COLORS.length];
    return (
      <MeshBackground>
      <View style={[styles.center, { backgroundColor: playerColor + '22' }]}>
        <TouchableOpacity style={[styles.quitBtn, { top: insets.top + 12 }]} onPress={() => confirmQuit(handleQuit)} activeOpacity={0.7}>
          <Text style={styles.quitBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={[styles.buzzedBadge, { borderColor: playerColor }]}>
          <Text style={styles.buzzedEmoji}>⚡</Text>
          <Text style={[styles.buzzedName, { color: playerColor }]}>{buzzedPlayer}</Text>
          <Text style={styles.buzzedSub}>Réponds à l'oral !</Text>
        </View>
        <TouchableOpacity style={[styles.revealBtn, { backgroundColor: playerColor }]} onPress={handleReveal}>
          <Text style={styles.revealBtnText}>Révéler la réponse</Text>
        </TouchableOpacity>
        <View style={styles.scorePreview}>
          <Text style={styles.scorePreviewText}>Bonne réponse +{CORRECT_PTS} pt · Mauvaise {WRONG_PTS} pts</Text>
        </View>
        <TouchableOpacity style={styles.cancelLink} onPress={skipRound}>
          <Text style={styles.cancelLinkText}>Passer ce son</Text>
        </TouchableOpacity>
      </View>
      </MeshBackground>
    );
  }

  // ── Revealed ─────────────────────────────────────────────────────────
  if (phase === 'revealed' && buzzedPlayer) {
    return (
      <MeshBackground>
      <View style={styles.center}>
        <TouchableOpacity style={[styles.quitBtn, { top: insets.top + 12 }]} onPress={() => confirmQuit(handleQuit)} activeOpacity={0.7}>
          <Text style={styles.quitBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.revealedLabel}>Réponse correcte</Text>
        {track?.image_url && (
          <Image source={{ uri: track.image_url }} style={styles.goldImage} resizeMode="contain" />
        )}
        <Text style={styles.revealedAnswer}>{correctAnswer}</Text>
        <Text style={styles.revealedQuestion}>
          Est-ce que{' '}
          <Text style={{ color: PLAYER_COLORS[players.indexOf(buzzedPlayer) % PLAYER_COLORS.length], fontWeight: '800' }}>
            {buzzedPlayer}
          </Text>{' '}
          avait bon ?
        </Text>
        <TouchableOpacity style={styles.correctBtn} onPress={() => handleScore(true)}>
          <Text style={styles.correctBtnText}>✅ Oui  +{CORRECT_PTS} pt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.wrongBtn} onPress={() => handleScore(false)}>
          <Text style={styles.wrongBtnText}>
            {wrongRule === 'malus' ? `❌ Non  ${WRONG_PTS} pts` : wrongRule === 'gorgee' ? '🍺 Non  une gorgée !' : '❌ Non, passer le son'}
          </Text>
        </TouchableOpacity>
      </View>
      </MeshBackground>
    );
  }

  // ── Between rounds ───────────────────────────────────────────────────
  if (phase === 'between-rounds') {
    return (
      <MeshBackground>
      <View style={styles.center}>
        <TouchableOpacity style={[styles.quitBtn, { top: insets.top + 12 }]} onPress={() => confirmQuit(handleQuit)} activeOpacity={0.7}>
          <Text style={styles.quitBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.betweenTitle}>Son {index + 1} / {total}</Text>
        {lastResult && buzzedPlayer && (
          <Text style={lastResult === 'correct' ? styles.resultCorrect : lastResult === 'gorgee' ? styles.resultGorgee : styles.resultWrong}>
            {lastResult === 'correct'
              ? `✅ Bravo ${buzzedPlayer} ! +${CORRECT_PTS} pt`
              : lastResult === 'gorgee'
              ? `🍺 ${buzzedPlayer} boit une gorgée !`
              : `❌ ${buzzedPlayer} — ${WRONG_PTS} pts`}
          </Text>
        )}
        <View style={styles.answerBox}>
          {track?.image_url && (
            <Image source={{ uri: track.image_url }} style={styles.goldImage} resizeMode="contain" />
          )}
          <Text style={styles.answerBoxLabel}>Réponse correcte</Text>
          <Text style={styles.answerBoxText}>{correctAnswer}</Text>
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
          <Text style={styles.nextBtnText}>{index + 1 >= total ? 'Résultats finaux' : 'Son suivant ›'}</Text>
        </TouchableOpacity>
      </View>
      </MeshBackground>
    );
  }

  // ── Scoreboard (tous les 10 sons) ────────────────────────────────────
  if (phase === 'scoreboard') {
    const sorted = [...players].sort((a, b) => scoresRef.current[b] - scoresRef.current[a]);
    return (
      <MeshBackground>
      <View style={styles.center}>
        <TouchableOpacity style={[styles.quitBtn, { top: insets.top + 12 }]} onPress={() => confirmQuit(handleQuit)} activeOpacity={0.7}>
          <Text style={styles.quitBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.betweenTitle}>🏆 Classement — {index} sons joués</Text>
        {sorted.map((name, i) => (
          <View key={name} style={styles.scoreRow}>
            <Text style={styles.scoreRank}>{i === 0 ? '👑' : `#${i + 1}`}</Text>
            <Text style={styles.scoreName}>{name}</Text>
            <Text style={[styles.scorePoints, scoresRef.current[name] < 0 && styles.scoreNeg]}>
              {scoresRef.current[name]} pt{Math.abs(scoresRef.current[name]) > 1 ? 's' : ''}
            </Text>
          </View>
        ))}
        <TouchableOpacity style={styles.nextBtn} onPress={() => launchRound(index)}>
          <Text style={styles.nextBtnText}>Continuer ›</Text>
        </TouchableOpacity>
      </View>
      </MeshBackground>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const sorted = [...players].sort((a, b) => scoresRef.current[b] - scoresRef.current[a]);
    return (
      <MeshBackground>
      <View style={styles.center}>
        <Text style={styles.finishedTitle}>Classement final 🏆</Text>
        {sorted.map((name, i) => (
          <View key={name} style={styles.scoreRow}>
            <Text style={styles.scoreRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</Text>
            <Text style={styles.scoreName}>{name}</Text>
            <Text style={[styles.scorePoints, scoresRef.current[name] < 0 && styles.scoreNeg]}>
              {scoresRef.current[name]} pt{Math.abs(scoresRef.current[name]) > 1 ? 's' : ''}
            </Text>
          </View>
        ))}
        <TouchableOpacity style={styles.homeBtn} onPress={() => { playPrevious(); router.replace('/(app)/home'); }}>
          <Text style={styles.homeBtnText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
      </MeshBackground>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: Colors.textMuted, fontSize: 15 },
  fullScreen: { flex: 1 },
  quitBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quitBtnText: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontWeight: '800' },

  cdTitle: { color: Colors.textMuted, fontSize: 18, fontWeight: '600' },
  cdNumber: { color: Colors.primary, fontSize: 110, fontWeight: '900', lineHeight: 120 },
  cdInstructions: { backgroundColor: Colors.surface, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 8, width: '100%' },
  cdStep: { color: Colors.textMuted, fontSize: 13, lineHeight: 20 },
  cdWarning: { color: Colors.error, fontWeight: '700', marginTop: 4 },
  cdZonesPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%', justifyContent: 'center' },
  cdZonePreview: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  cdZoneName: { fontSize: 13, fontWeight: '700' },

  zonesGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  zone: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  fingerprintOuter: { width: 90, height: 90, borderRadius: 45, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  fingerprintMid: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  fingerprintInner: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  fingerprintNum: { fontSize: 18, fontWeight: '900' },
  zoneName: { fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  buzzOverlayInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingVertical: 10, backgroundColor: Colors.background + 'cc' },
  buzzOverlayText: { color: Colors.textMuted, fontSize: 13 },
  buzzOverlayRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  buzzOverlayIcon: { width: 14, height: 14 },
  buzzCatBadge: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  buzzedBadge: { borderWidth: 2, borderRadius: 24, padding: 28, alignItems: 'center', gap: 8, width: '100%' },
  buzzedEmoji: { fontSize: 56 },
  buzzedName: { fontSize: 34, fontWeight: '900' },
  buzzedSub: { color: Colors.textMuted, fontSize: 16 },
  revealBtn: { width: '100%', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  revealBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  scorePreview: { backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  scorePreviewText: { color: Colors.textMuted, fontSize: 13 },
  cancelLink: { paddingVertical: 8 },
  cancelLinkText: { color: Colors.textMuted, fontSize: 14 },

  goldImage: { width: 280, height: 400, borderRadius: 16, borderWidth: 3, borderColor: '#FFD700' },
  revealedLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  revealedAnswer: { color: Colors.text, fontSize: 30, fontWeight: '900', textAlign: 'center' },
  revealedQuestion: { color: Colors.textMuted, fontSize: 16, textAlign: 'center' },
  correctBtn: { width: '100%', backgroundColor: Colors.success + '22', borderWidth: 1.5, borderColor: Colors.success, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  correctBtnText: { color: Colors.success, fontSize: 16, fontWeight: '700' },
  wrongBtn: { width: '100%', backgroundColor: Colors.error + '22', borderWidth: 1.5, borderColor: Colors.error, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  wrongBtnText: { color: Colors.error, fontSize: 16, fontWeight: '700' },

  betweenTitle: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  resultCorrect: { color: Colors.success, fontSize: 18, fontWeight: '700' },
  resultWrong: { color: Colors.error, fontSize: 18, fontWeight: '700' },
  resultGorgee: { color: Colors.warning, fontSize: 18, fontWeight: '700' },
  answerBox: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, width: '100%', alignItems: 'center', gap: 4 },
  answerBoxLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  answerBoxText: { color: Colors.text, fontSize: 20, fontWeight: '800' },
  scoreRow: { flexDirection: 'row', width: '100%', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  scoreRank: { fontSize: 18, width: 32 },
  scoreName: { color: Colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  scorePoints: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  scoreNeg: { color: Colors.error },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  finishedTitle: { color: Colors.text, fontSize: 28, fontWeight: '800', marginBottom: 8 },
  homeBtn: { marginTop: 16, backgroundColor: Colors.surface, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border },
  homeBtnText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
});
