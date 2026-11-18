import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { Timer } from '@/components/ui/Timer';
import { AnswerButton } from '@/components/ui/AnswerButton';
import { fetchTracksForSolo, getSignedAudioUrl, saveScore, Track, shuffle } from '@/lib/tracks';
import { loadSounds, playClick, unloadSounds } from '@/lib/sounds';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { ComboTracker } from '@/lib/progression';
import { createMatch, saveMatchPlayer, endMatch } from '@/lib/matches';
import { evaluateAchievements, achievementTitle } from '@/lib/achievements';
import { getProfile } from '@/lib/auth';
import { MeshBackground } from '@/components/ui/MeshBackground';

const ROUND_DURATION = 30_000;

type AnswerState = 'idle' | 'correct' | 'wrong';

export default function SoloGameScreen() {
  const { categories, count } = useLocalSearchParams<{ categories: string; count: string }>();
  const { user } = useAuth();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timerRunning, setTimerRunning] = useState(false);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [shuffledAnswers, setShuffledAnswers] = useState<Track['answers']>([]);

  const [combo, setCombo] = useState(0);
  const [unlocked, setUnlocked] = useState<string | null>(null);
  const [gender, setGender] = useState('masc');

  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const sound = useRef<AudioPlayer | null>(null);
  const startTimeRef = useRef<number>(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTracker = useRef(new ComboTracker());
  const matchIdRef = useRef<string | null>(null);
  const comboAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (user) getProfile(user.id).then(p => setGender(p.gender ?? 'masc')).catch(() => {});
    loadSounds();
    loadTracks();
    return () => { sound.current?.remove(); unloadSounds(); };
  }, []);

  useEffect(() => {
    if (tracks.length > 0 && !matchIdRef.current) {
      createMatch({ mode: 'solo', categories: categories.split(','), totalRounds: tracks.length, hostUserId: user?.id })
        .then((id) => { matchIdRef.current = id; })
        .catch(() => {});
    }
  }, [tracks]);

  useEffect(() => {
    if (tracks.length > 0) startRound();
  }, [tracks, index]);

  async function loadTracks() {
    try {
      const cats = categories.split(',');
      const data = await fetchTracksForSolo(cats, Number(count));
      setTracks(data);
    } catch {
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function startRound() {
    setAnswerState('idle');
    setSelectedAnswer(null);
    setShowHint(false);
    setHintUsed(false);

    const track = tracks[index];
    if (!track) return;

    const answers = shuffle(track.answers);
    setShuffledAnswers(answers);

    hintTimerRef.current = setTimeout(() => setShowHint(true), 10_000);

    try {
      sound.current?.remove();
      const url = await getSignedAudioUrl(track.r2_key);
      const player = createAudioPlayer({ uri: url });
      player.play();
      sound.current = player;
    } catch { /* pas de son en dev sans fichier réel */ }

    startTimeRef.current = Date.now();
    setTimerRunning(true);
  }

  async function handleAnswer(answerId: string, isCorrect: boolean) {
    if (answerState !== 'idle') return;
    playClick();
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);

    setTimerRunning(false);
    setSelectedAnswer(answerId);
    setAnswerState(isCorrect ? 'correct' : 'wrong');

    sound.current?.pause();

    if (isCorrect) {
      const { combo: newCombo, multiplier } = comboTracker.current.onCorrect();
      setCombo(newCombo);
      Animated.sequence([
        Animated.timing(comboAnim, { toValue: 1.4, duration: 120, useNativeDriver: true }),
        Animated.timing(comboAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();

      const elapsed = Date.now() - startTimeRef.current;
      const ratio = Math.max(0, 1 - elapsed / ROUND_DURATION);
      const basePts = Math.round(1000 * ratio) - (hintUsed ? 200 : 0);
      const finalPts = Math.max(0, Math.round(basePts * multiplier));
      scoreRef.current += finalPts;
      correctRef.current += 1;
      setScore(scoreRef.current);
      setCorrect(correctRef.current);
    } else {
      comboTracker.current.onWrong();
      wrongRef.current += 1;
      setCombo(0);
    }

    setTimeout(() => goNext(), 1500);
  }

  function handleTimeout() {
    if (answerState !== 'idle') return;
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setAnswerState('wrong');
    setTimerRunning(false);
    setTimeout(() => goNext(), 1500);
  }

  function goNext() {
    if (index + 1 >= tracks.length) {
      finishGame();
    } else {
      setIndex((i) => i + 1);
    }
  }

  async function finishGame() {
    const finalScore = scoreRef.current;
    const finalCorrect = correctRef.current;
    const finalWrong = wrongRef.current;
    const maxCombo = comboTracker.current.getMax();
    const cats = categories.split(',');

    if (user) {
      try { await saveScore(user.id, cats[0], finalScore); } catch { /* ignore */ }
      if (matchIdRef.current) {
        try {
          await saveMatchPlayer({
            matchId: matchIdRef.current,
            userId: user.id,
            displayName: user.user_metadata?.username ?? user.email?.split('@')[0] ?? 'Joueur',
            score: finalScore,
            correct: finalCorrect,
            wrong: finalWrong,
            maxCombo,
            rank: 1,
            isWinner: true,
          });
          await endMatch(matchIdRef.current);
          const achievements = await evaluateAchievements(user.id, {
            matchMode: 'solo',
            correct: finalCorrect,
            total: tracks.length,
            maxCombo,
            isWinner: true,
            categories: cats,
          });
          if (achievements.length > 0) {
            setUnlocked(`${achievements[0].emoji} ${achievementTitle(achievements[0], gender)}`);
          }
        } catch { /* ignore */ }
      }
    }
    router.replace({ pathname: '/(app)/solo-results', params: { score: String(finalScore), correct: String(finalCorrect), total: String(tracks.length) } });
  }

  function handleHint() {
    setHintUsed(true);
    setShowHint(false);
  }

  if (loading) {
    return (
      <MeshBackground>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Chargement des sons...</Text>
        </View>
      </MeshBackground>
    );
  }

  const track = tracks[index];
  if (!track) return null;

  const hint = track.hints[0];

  return (
    <MeshBackground>
    <View style={styles.container}>
      {/* Achievement toast */}
      {unlocked && (
        <View style={styles.achievementToast}>
          <Text style={styles.achievementText}>🏅 Succès débloqué : {unlocked}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.progress}>{index + 1} / {tracks.length}</Text>
        <View style={styles.headerRight}>
          {combo >= 3 && (
            <Animated.Text style={[styles.comboText, { transform: [{ scale: comboAnim }] }]}>
              🔥 x{combo}
            </Animated.Text>
          )}
          <Text style={styles.score}>🏆 {score} pts</Text>
        </View>
      </View>

      <Timer durationMs={ROUND_DURATION} running={timerRunning} onEnd={handleTimeout} />

      {/* Son en cours */}
      <View style={styles.soundCard}>
        <Image source={require('@/assets/Icon/UI/music_note.png')} style={styles.musicNote} />
        <Text style={styles.category}>{track.category.toUpperCase()}</Text>
        <Text style={styles.year}>{track.year}</Text>
      </View>

      {/* Indice */}
      {hintUsed && hint ? (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>💡 {hint.content}</Text>
        </View>
      ) : showHint && hint ? (
        <TouchableOpacity style={styles.hintBtn} onPress={handleHint}>
          <Text style={styles.hintBtnText}>💡 Afficher l'indice (−200 pts)</Text>
        </TouchableOpacity>
      ) : null}

      {/* Réponses */}
      <View style={styles.answers}>
        {shuffledAnswers.map((answer, i) => (
          <AnswerButton
            key={answer.id}
            index={i}
            answer={answer}
            selectedId={selectedAnswer}
            revealed={answerState !== 'idle'}
            onPress={() => handleAnswer(answer.id, answer.is_correct)}
          />
        ))}
      </View>
    </View>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: Colors.textMuted, fontSize: 15 },
  container: { flex: 1, padding: 20, paddingTop: 56, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progress: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  score: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  comboText: { color: Colors.warning, fontSize: 15, fontWeight: '900' },
  achievementToast: { position: 'absolute', top: 56, left: 20, right: 20, backgroundColor: Colors.primary + 'dd', borderRadius: 12, padding: 12, zIndex: 99, alignItems: 'center' },
  achievementText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  soundCard: {
    flex: 1,
    maxHeight: 180,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  musicNote: { width: 56, height: 56 },
  category: { color: Colors.primary, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  year: { color: Colors.textMuted, fontSize: 13 },
  hintBox: { backgroundColor: Colors.warning + '22', borderRadius: 12, borderWidth: 1, borderColor: Colors.warning + '55', padding: 12 },
  hintText: { color: Colors.warning, fontSize: 14, fontWeight: '600' },
  hintBtn: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 12, alignItems: 'center' },
  hintBtnText: { color: Colors.textMuted, fontSize: 14 },
  answers: { gap: 10 },
});
