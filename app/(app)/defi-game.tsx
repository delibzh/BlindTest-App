import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Animated, Image, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useAuth } from '@/hooks/useAuth';
import { fetchTracksForDefi, getSignedAudioUrl, Track, shuffle } from '@/lib/tracks';
import { loadSounds, playClick, playGameStart, playRight, playWrong, playPrevious, unloadSounds } from '@/lib/sounds';
import { checkAnswer, saveDefiProgress, calcPoints, Difficulty } from '@/lib/defi';
import { addXp, updateGameStats, getProfile } from '@/lib/auth';
import { usePreventBack, confirmQuit } from '@/hooks/usePreventBack';
import { DefiKeyboard } from '@/components/ui/DefiKeyboard';
import { AnswerButton } from '@/components/ui/AnswerButton';
import { LivesDisplay } from '@/components/ui/LivesDisplay';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { evaluateAchievements, Achievement, achievementTitle } from '@/lib/achievements';
import { usePremium } from '@/hooks/usePremium';
import { showRewardedAd } from '@/lib/ads';

const TIMER_SEC          = 25;
const TIMER_MS           = TIMER_SEC * 1000;
const TOTAL              = 20;
const RECENT_DIST_WINDOW = 8;

const PARTICLE_COUNT  = 8;
const PARTICLE_COLORS = [
  Colors.primary, Colors.secondary, Colors.tertiary, '#ffffff',
  Colors.primary, Colors.secondary, Colors.tertiary, '#22c55e',
];

type Phase = 'loading' | 'countdown' | 'playing' | 'correct' | 'wrong' | 'timeout' | 'gameover' | 'finished';

// Barres d'égaliseur animées
function EqualizerBars() {
  const heights = [useRef(new Animated.Value(0.5)).current, useRef(new Animated.Value(0.9)).current, useRef(new Animated.Value(0.3)).current];
  useEffect(() => {
    heights.forEach((h, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(h, { toValue: 1, duration: 250 + i * 80, useNativeDriver: true }),
          Animated.timing(h, { toValue: 0.2, duration: 250 + i * 80, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);
  const colors = [Colors.primary, Colors.secondary, Colors.tertiary];
  return (
    <View style={eq.row}>
      {heights.map((h, i) => (
        <Animated.View
          key={i}
          style={[eq.bar, { backgroundColor: colors[i], transform: [{ scaleY: h }] }]}
        />
      ))}
    </View>
  );
}
const eq = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 16 },
  bar: { width: 3, height: 14, borderRadius: 2 },
});

export default function DefiGameScreen() {
  const { category, difficulty, mode } = useLocalSearchParams<{ category: string; difficulty: string; mode: string }>();
  const { user } = useAuth();
  const { premium } = usePremium();
  const insets = useSafeAreaInsets();
  const diff = Number(difficulty) as Difficulty;
  const isQcm = mode === 'qcm';

  const [tracks,         setTracks]         = useState<Track[]>([]);
  const [index,          setIndex]          = useState(0);
  const [phase,          setPhase]          = useState<Phase>('loading');
  const [typed,          setTyped]          = useState('');
  const [lives,          setLives]          = useState(3);
  const [score,          setScore]          = useState(0);   // points pondérés
  const [correct,        setCorrect]        = useState(0);   // nb bonnes réponses
  const [combo,          setCombo]          = useState(0);   // combo en cours
  const [timeLeft,       setTimeLeft]       = useState(TIMER_SEC);
  const [correctAnswer,  setCorrectAnswer]  = useState('');
  const [revealImageUrl, setRevealImageUrl] = useState<string | undefined>();
  const [shuffledAnswers,setShuffledAnswers]= useState<Track['answers']>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [newAchievements,setNewAchievements]= useState<Achievement[]>([]);
  const [gender,         setGender]         = useState('masc');
  const [countdown,      setCountdown]      = useState(5);
  const [qcmFeedback,    setQcmFeedback]    = useState<{ correct: boolean } | null>(null);
  const [lastGain,       setLastGain]       = useState(0);
  const [showGain,       setShowGain]       = useState(false);

  const tracksRef        = useRef<Track[]>([]);
  const livesRef         = useRef(3);
  const scoreRef         = useRef(0);   // points
  const correctRef       = useRef(0);   // nb bonnes réponses
  const comboRef         = useRef(0);   // combo courant
  const maxComboRef      = useRef(0);   // pic de combo
  const indexRef         = useRef(0);
  const correctAnswerRef = useRef('');
  const timerRef            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const introCountdownRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerAnim        = useRef(new Animated.Value(1)).current;
  const timerAnimRef     = useRef<Animated.CompositeAnimation | null>(null);
  const sound            = useRef<AudioPlayer | null>(null);
  const audioGenRef      = useRef(0);
  const savedRef         = useRef(false);
  const rewardUsedRef    = useRef(false);
  const recentDistRef    = useRef<string[]>([]);
  const correctIdsRef    = useRef<Set<string>>(new Set());
  const scorePulse       = useRef(new Animated.Value(1)).current;
  const gainY            = useRef(new Animated.Value(0)).current;
  const gainOpacity      = useRef(new Animated.Value(0)).current;
  const particleAnims    = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0), y: new Animated.Value(0), opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (user) getProfile(user.id).then(p => setGender(p.gender ?? 'masc')).catch(() => {});
    loadSounds();
    loadTracks();
    return () => {
      audioGenRef.current++;
      sound.current?.pause();
      sound.current?.remove();
      sound.current = null;
      unloadSounds();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (introCountdownRef.current) clearInterval(introCountdownRef.current);
      timerAnimRef.current?.stop();
    };
  }, []);

  async function loadTracks() {
    try {
      const cats = category?.includes(',') ? category.split(',') : category ? [category] : [];
      if (cats.length === 0) { router.replace('/(app)/defi-menu'); return; }
      const data = await fetchTracksForDefi(cats, diff);
      if (data.length === 0) { router.replace('/(app)/defi-menu'); return; }
      tracksRef.current = data;
      setTracks(data);
      startCountdown(data);
    } catch {
      router.replace('/(app)/defi-menu');
    }
  }

  function startCountdown(trackList: Track[]) {
    setCountdown(5);
    setPhase('countdown');
    playGameStart();
    let count = 5;
    if (introCountdownRef.current) clearInterval(introCountdownRef.current);
    introCountdownRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(introCountdownRef.current!);
        introCountdownRef.current = null;
        startRound(trackList, 0);
      }
    }, 1000);
  }

  function buildQcmAnswers(trackList: Track[], i: number): Track['answers'] {
    const current = trackList[i];
    const correct = current.answers.find((a) => a.is_correct);
    if (!correct) return current.answers;
    if (current.answers.length >= 4) return shuffle(current.answers);
    const existing = current.answers.filter((a) => !a.is_correct);
    const needed = 3 - existing.length;
    const recentDist = new Set(recentDistRef.current);
    const correctIds = correctIdsRef.current;
    const seen = new Set([correct.label, ...existing.map((a) => a.label)]);
    const distractors: Track['answers'][number][] = [];
    const usedIds: string[] = [];

    function tryPick(pool: Track[]) {
      for (const t of shuffle(pool)) {
        if (distractors.length >= needed) break;
        const ans = t.answers.find((a) => a.is_correct);
        if (ans && !seen.has(ans.label)) {
          seen.add(ans.label);
          distractors.push({ ...ans, is_correct: false });
          usedIds.push(t.id);
        }
      }
    }

    const base = trackList.filter((_, j) => j !== i);
    // Passe 1 : fresh + pas encore bien répondus
    tryPick(base.filter((t) => !recentDist.has(t.id) && !correctIds.has(t.id)));
    // Passe 2 : relâche "déjà bien répondu"
    if (distractors.length < needed)
      tryPick(base.filter((t) => !recentDist.has(t.id) && !usedIds.includes(t.id)));
    // Passe 3 : dernier recours
    if (distractors.length < needed)
      tryPick(base.filter((t) => !usedIds.includes(t.id)));

    recentDistRef.current = [...recentDistRef.current, ...usedIds].slice(-RECENT_DIST_WINDOW);
    return shuffle([correct, ...existing, ...distractors]);
  }

  function startRound(trackList: Track[], i: number) {
    const track = trackList[i];
    if (!track) return;

    const answer = track.answers.find((a) => a.is_correct)?.label ?? '';
    correctAnswerRef.current = answer;
    setCorrectAnswer(answer);
    setRevealImageUrl(track.image_url);
    setTyped('');
    setSelectedAnswer(null);
    setQcmFeedback(null);
    if (isQcm) setShuffledAnswers(shuffle(buildQcmAnswers(trackList, i)));
    setPhase('playing');

    // Countdown affiché
    setTimeLeft(TIMER_SEC);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(countdownRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);

    // Animation barre
    timerAnim.setValue(1);
    timerAnimRef.current = Animated.timing(timerAnim, {
      toValue: 0, duration: TIMER_MS, useNativeDriver: false,
    });
    timerAnimRef.current.start();
    timerRef.current = setTimeout(onTimeout, TIMER_MS);

    playAudio(track.r2_key);
  }

  async function playAudio(r2Key: string) {
    const gen = ++audioGenRef.current;
    try {
      await sound.current?.pause();
      await sound.current?.remove();
      sound.current = null;
      const url = await getSignedAudioUrl(r2Key);
      if (gen !== audioGenRef.current) return;
      const player = createAudioPlayer({ uri: url });
      if (gen !== audioGenRef.current) { player.remove(); return; }
      player.play();
      sound.current = player;
    } catch {}
  }

  function stopTimer() {
    if (timerRef.current)    { clearTimeout(timerRef.current); timerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    timerAnimRef.current?.stop();
  }

  function handleQuit() {
    audioGenRef.current++;
    if (introCountdownRef.current) { clearInterval(introCountdownRef.current); introCountdownRef.current = null; }
    stopTimer();
    sound.current?.pause();
    sound.current = null;
    playPrevious();
    router.back();
  }

  usePreventBack(handleQuit);

  function handleKey(char: string)  { if (phase === 'playing') setTyped((t) => t + char); }
  function handleDelete()            { if (phase === 'playing') setTyped((t) => t.slice(0, -1)); }

  function animateGain(pts: number) {
    try {
      setLastGain(pts);
      setShowGain(true);
      scorePulse.setValue(1);
      Animated.spring(scorePulse, { toValue: 1.28, useNativeDriver: true, tension: 200, friction: 6 }).start(() => {
        Animated.spring(scorePulse, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
      });
      gainY.setValue(0);
      gainOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(gainY,       { toValue: -54, duration: 900, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(350),
          Animated.timing(gainOpacity, { toValue: 0, duration: 550, useNativeDriver: true }),
        ]),
      ]).start(() => setShowGain(false));
      const angles = Array.from({ length: PARTICLE_COUNT }, (_, i) => (i / PARTICLE_COUNT) * Math.PI * 2);
      particleAnims.forEach((p, i) => {
        const dist = 44 + (i % 3) * 12;
        p.x.setValue(0); p.y.setValue(0); p.opacity.setValue(1);
        Animated.parallel([
          Animated.timing(p.x,       { toValue: Math.cos(angles[i]) * dist, duration: 550, useNativeDriver: true }),
          Animated.timing(p.y,       { toValue: Math.sin(angles[i]) * dist, duration: 550, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(200),
            Animated.timing(p.opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
          ]),
        ]).start();
      });
    } catch {}
  }

  function handleSubmit() {
    if (phase !== 'playing' || !typed.trim()) return;
    stopTimer();
    sound.current?.pause();
    if (checkAnswer(typed, correctAnswerRef.current)) {
      playRight();
      comboRef.current++;
      correctRef.current++;
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
      setCombo(comboRef.current);
      setCorrect(correctRef.current);
      const pts = calcPoints(timeLeft, TIMER_SEC, comboRef.current, diff);
      scoreRef.current += pts;
      setScore(scoreRef.current);
      correctIdsRef.current.add(tracksRef.current[indexRef.current]?.id ?? '');
      animateGain(pts);
      setPhase('correct');
      const captured = index;
      setTimeout(() => goNext(captured), 1800);
    } else {
      playWrong();
      comboRef.current = 0;
      setCombo(0);
      loseLife('wrong');
    }
  }

  function handleQcmAnswer(answerId: string, isCorrect: boolean) {
    if (phase !== 'playing' || selectedAnswer !== null) return;
    playClick();
    stopTimer();
    sound.current?.pause();
    setSelectedAnswer(answerId);
    setQcmFeedback({ correct: isCorrect });

    if (isCorrect) {
      playRight();
      comboRef.current++;
      correctRef.current++;
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
      setCombo(comboRef.current);
      setCorrect(correctRef.current);
      const pts = calcPoints(timeLeft, TIMER_SEC, comboRef.current, diff);
      scoreRef.current += pts;
      setScore(scoreRef.current);
      correctIdsRef.current.add(tracksRef.current[indexRef.current]?.id ?? '');
      animateGain(pts);
    } else {
      playWrong();
      comboRef.current = 0;
      setCombo(0);
      livesRef.current--;
      setLives(livesRef.current);
    }

    const capturedIdx   = indexRef.current;
    const capturedLives = livesRef.current;

    setTimeout(() => {
      setQcmFeedback(null);
      if (!isCorrect && capturedLives <= 0) {
        doSaveProgress(capturedIdx + 1);
        setPhase('gameover');
        return;
      }
      goNext(capturedIdx);
    }, 1800);
  }

  function handleSkip() {
    if (phase !== 'playing') return;
    playWrong();
    comboRef.current = 0;
    setCombo(0);
    stopTimer();
    sound.current?.pause();
    loseLife('timeout');
  }

  function onTimeout() {
    playWrong();
    comboRef.current = 0;
    setCombo(0);
    sound.current?.pause();
    loseLife('timeout');
  }

  function loseLife(type: 'wrong' | 'timeout') {
    livesRef.current--;
    setLives(livesRef.current);
    if (livesRef.current <= 0) {
      doSaveProgress(indexRef.current + 1);
      setPhase('gameover');
    } else {
      setPhase(type);
    }
  }

  function goNext(currentIndex: number) {
    const next = currentIndex + 1;
    if (next >= tracksRef.current.length || next >= TOTAL) {
      doSaveProgress(next);
      setPhase('finished');
    } else {
      indexRef.current = next;
      setIndex(next);
      startRound(tracksRef.current, next);
    }
  }

  function handleContinue() { goNext(index); }

  function handleRetry() {
    livesRef.current    = 3;
    scoreRef.current    = 0;
    correctRef.current  = 0;
    comboRef.current    = 0;
    maxComboRef.current = 0;
    indexRef.current    = 0;
    savedRef.current    = false;
    rewardUsedRef.current = false;
    recentDistRef.current = [];
    correctIdsRef.current = new Set();
    setLives(3); setScore(0); setCorrect(0); setCombo(0); setIndex(0); setNewAchievements([]);
    startCountdown(tracksRef.current);
  }

  async function handleWatchAd() {
    const rewarded = await showRewardedAd();
    if (!rewarded) return;
    rewardUsedRef.current = true;
    savedRef.current = false;
    livesRef.current = 1;
    setLives(1);
    startRound(tracksRef.current, indexRef.current);
  }

  async function doSaveProgress(played: number) {
    if (!user || savedRef.current) return;
    savedRef.current = true;
    try {
      const perfect      = correctRef.current >= TOTAL;
      const finishBonus  = (livesRef.current >= 3 ? 500 : 0) + (perfect ? 1000 : 0);
      const totalPoints  = scoreRef.current + finishBonus;
      await saveDefiProgress(user.id, category, diff, correctRef.current, mode ?? 'clavier', totalPoints);
      const xpGain = 50 + correctRef.current * 5 + (perfect ? 200 : 0);
      addXp(user.id, xpGain).catch(() => {});
      updateGameStats(user.id, { correct: correctRef.current, total: played, perfect }).catch(() => {});
      const unlocked = await evaluateAchievements(user.id, {
        matchMode: 'defi',
        correct: correctRef.current,
        total: played,
        maxCombo: maxComboRef.current,
        isWinner: livesRef.current > 0,
        categories: category?.includes(',') ? category.split(',') : [category],
        defiDifficulty: diff,
        defiCompleted: perfect,
      });
      if (unlocked.length > 0) setNewAchievements(unlocked);
    } catch {}
  }

  const track = tracksRef.current[index];
  const total = Math.min(tracksRef.current.length, TOTAL);

  // Couleur du ring selon l'urgence
  const urgencyPct = timeLeft / TIMER_SEC;
  const ringColor  = urgencyPct > 0.5 ? Colors.secondary : urgencyPct > 0.25 ? Colors.primary : Colors.error;

  // ─── Loading ────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <MeshBackground>
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={s.loadTxt}>Chargement du défi…</Text>
        </View>
      </MeshBackground>
    );
  }

  // ─── Countdown ──────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <MeshBackground>
        <View style={s.center}>
          <Text style={s.countdownNum}>{countdown}</Text>
          <Text style={s.countdownLabel}>Prépare-toi !</Text>
          <View style={s.countdownChip}>
            <Text style={s.countdownChipText}>{category?.toUpperCase()}</Text>
          </View>
        </View>
      </MeshBackground>
    );
  }

  // ─── Correct ────────────────────────────────────────────────
  if (phase === 'correct') {
    return (
      <MeshBackground>
        <View style={s.center}>
          <View style={[s.feedbackToast, { borderColor: Colors.success + '55', backgroundColor: Colors.success + '15' }]}>
            <View style={[s.toastDot, { backgroundColor: Colors.success }]}>
              <Text style={s.toastDotText}>⚡</Text>
            </View>
            <View>
              <Text style={[s.toastTitle, { color: Colors.success }]}>BONNE RÉPONSE !</Text>
              <Text style={s.toastSub}>{score.toLocaleString('fr-FR')} pts · {correct}/{total}</Text>
            </View>
          </View>
          {revealImageUrl && (
            <Image source={{ uri: revealImageUrl }} style={s.revealImage} resizeMode="contain" />
          )}
          <Text style={s.revealAnswer}>{correctAnswer}</Text>
        </View>
      </MeshBackground>
    );
  }

  // ─── Wrong / Timeout ────────────────────────────────────────
  if (phase === 'wrong' || phase === 'timeout') {
    const isTimeout = phase === 'timeout';
    return (
      <MeshBackground>
        <View style={s.center}>
          <View style={[s.feedbackToast, { borderColor: Colors.error + '55', backgroundColor: Colors.error + '12' }]}>
            <View style={[s.toastDot, { backgroundColor: Colors.error }]}>
              <Text style={s.toastDotText}>{isTimeout ? '⏰' : '✕'}</Text>
            </View>
            <View>
              <Text style={[s.toastTitle, { color: Colors.error }]}>
                {isTimeout ? 'TEMPS ÉCOULÉ !' : 'MAUVAISE RÉPONSE'}
              </Text>
              <LivesDisplay lives={livesRef.current} size={16} />
            </View>
          </View>
          {revealImageUrl && (
            <Image source={{ uri: revealImageUrl }} style={s.revealImage} resizeMode="contain" />
          )}
          <Text style={s.revealLabel}>La réponse était</Text>
          <Text style={s.revealAnswer}>{correctAnswer}</Text>
          <TouchableOpacity style={s.continueBtn} onPress={handleContinue}>
            <Text style={s.continueBtnText}>Continuer  →</Text>
          </TouchableOpacity>
        </View>
      </MeshBackground>
    );
  }

  // ─── Game Over ───────────────────────────────────────────────
  if (phase === 'gameover') {
    return (
      <MeshBackground>
        <View style={s.center}>
          <Image source={require('@/assets/Icon/UI/death.png')} style={s.bigEmojiImg} />
          <Text style={s.resultTitle}>Game Over</Text>
          <Text style={s.resultSub}>{correct} bonne{correct > 1 ? 's' : ''} / {total}  ·  {score.toLocaleString('fr-FR')} pts</Text>
          {newAchievements.length > 0 && <AchievementsBlock list={newAchievements} gender={gender} />}
          {!rewardUsedRef.current && (
            <TouchableOpacity style={s.rewardBtn} onPress={handleWatchAd}>
              <Text style={s.rewardBtnText}>📺  Regarder une pub pour +1 vie</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.primaryBtn} onPress={handleRetry}>
            <View style={s.btnRow}>
              <Image source={require('@/assets/Icon/UI/retry.png')} style={s.btnIcon} />
              <Text style={s.primaryBtnText}>Réessayer</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} onPress={() => { playPrevious(); router.replace('/(app)/defi-menu'); }}>
            <Text style={s.ghostBtnText}>← Menu Défi</Text>
          </TouchableOpacity>
        </View>
      </MeshBackground>
    );
  }

  // ─── Finished ────────────────────────────────────────────────
  if (phase === 'finished') {
    const perfect = correct >= total;
    return (
      <MeshBackground>
        <View style={s.center}>
          <Image source={perfect ? require('@/assets/Icon/UI/premium.png') : require('@/assets/Icon/UI/trophy.png')} style={s.bigEmojiImg} resizeMode="contain" />
          <Text style={s.resultTitle}>{perfect ? 'Score parfait !' : 'Défi terminé !'}</Text>
          <Text style={s.finishedScore}>{score.toLocaleString('fr-FR')}<Text style={s.finishedTotal}> pts</Text></Text>
          <Text style={s.resultSub}>{correct}/{total} bonnes réponses</Text>
          {perfect && <Text style={s.perfectText}>20/20 · Niveau suivant débloqué !</Text>}
          {newAchievements.length > 0 && <AchievementsBlock list={newAchievements} gender={gender} />}
          <TouchableOpacity style={s.primaryBtn} onPress={handleRetry}>
            <View style={s.btnRow}>
              <Image source={require('@/assets/Icon/UI/retry.png')} style={s.btnIcon} />
              <Text style={s.primaryBtnText}>Rejouer</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} onPress={() => { playPrevious(); router.replace('/(app)/defi-menu'); }}>
            <Text style={s.ghostBtnText}>← Menu Défi</Text>
          </TouchableOpacity>
        </View>
      </MeshBackground>
    );
  }

  // ─── Playing ─────────────────────────────────────────────────
  const widthPct = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <MeshBackground>
      {/* Header fixe */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.headerBtn} onPress={() => confirmQuit(handleQuit)} activeOpacity={0.7}>
          <Text style={s.headerBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerSub}>
            {index + 1}/{total}  ·  {correct} ✓{combo >= 2 ? `  ${combo >= 4 ? '×2' : combo === 3 ? '×1.5' : '×1.2'}🔥` : ''}
          </Text>
          <View style={s.headerScoreRow}>
            <Text style={s.headerScore}>{score.toLocaleString('fr-FR')} pts</Text>
            <LivesDisplay lives={lives} size={14} />
          </View>
        </View>
        <View style={s.headerBtn} />
      </View>

      {/* Timer circulaire */}
      <View style={s.timerWrap}>
        <View style={[s.timerRing, { borderColor: ringColor, shadowColor: ringColor }]}>
          <Text style={[s.timerNum, { color: ringColor }]}>{String(timeLeft).padStart(2, '0')}</Text>
          <Text style={s.timerLabel}>SEC</Text>
        </View>
      </View>

      {/* Barre de progression glowing */}
      <View style={s.progressSection}>
        <View style={s.progressHeader}>
          <Text style={s.nowPlaying}>NOW PLAYING</Text>
          <EqualizerBars />
        </View>
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: widthPct }]}>
            <View style={[s.progressHead, { shadowColor: Colors.secondary }]} />
          </Animated.View>
        </View>
        <Text style={s.catChip}>{track?.category?.toUpperCase()}  {track?.year ? `· ${track.year}` : ''}</Text>
      </View>

      {/* Score Zone */}
      <View style={s.scoreZone}>
        {combo >= 2 && (
          <View style={s.comboBadge}>
            <Text style={s.comboText}>{combo >= 4 ? '×2.0' : combo === 3 ? '×1.5' : '×1.2'} 🔥</Text>
          </View>
        )}
        <Animated.Text style={[s.scoreDisplay, { transform: [{ scale: scorePulse }] }]}>
          {score.toLocaleString('fr-FR')}
        </Animated.Text>
        <Text style={s.scorePtsLabel}>pts</Text>
        {showGain && (
          <Animated.Text style={[s.gainText, { transform: [{ translateY: gainY }], opacity: gainOpacity }]}>
            +{lastGain.toLocaleString('fr-FR')}
          </Animated.Text>
        )}
        {particleAnims.map((p, i) => (
          <Animated.View
            key={i}
            style={[
              s.particle,
              {
                backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                transform: [{ translateX: p.x }, { translateY: p.y }],
                opacity: p.opacity,
              },
            ]}
          />
        ))}
      </View>

      {/* Zone de jeu */}
      <View style={s.gameZone}>
        {isQcm ? (
          <View style={s.answers}>
            {/* Feedback inline */}
            {qcmFeedback !== null && (
              <View style={[
                s.qcmFeedback,
                qcmFeedback.correct
                  ? { borderColor: Colors.success + '55', backgroundColor: Colors.success + '15' }
                  : { borderColor: Colors.error   + '55', backgroundColor: Colors.error   + '12' },
              ]}>
                <View style={[s.qcmFeedbackDot, { backgroundColor: qcmFeedback.correct ? Colors.success : Colors.error }]}>
                  <Text style={s.qcmFeedbackIcon}>{qcmFeedback.correct ? '⚡' : '✕'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.qcmFeedbackTitle, { color: qcmFeedback.correct ? Colors.success : Colors.error }]}>
                    {qcmFeedback.correct ? 'BONNE RÉPONSE !' : 'MAUVAISE RÉPONSE'}
                  </Text>
                  {!qcmFeedback.correct && (
                    <Text style={s.qcmFeedbackAnswer} numberOfLines={1}>{correctAnswer}</Text>
                  )}
                </View>
                {qcmFeedback.correct
                  ? <Text style={[s.qcmFeedbackStat, { color: Colors.success }]}>{score} ✓</Text>
                  : <LivesDisplay lives={livesRef.current} size={14} />
                }
              </View>
            )}

            {shuffledAnswers.map((answer, i) => (
              <AnswerButton
                key={answer.id}
                index={i}
                answer={answer}
                selectedId={selectedAnswer}
                revealed={selectedAnswer !== null}
                onPress={() => handleQcmAnswer(answer.id, answer.is_correct)}
              />
            ))}
          </View>
        ) : (
          <>
            <View style={s.inputBox}>
              {typed
                ? <Text style={s.inputText} numberOfLines={2}>{typed}</Text>
                : <Text style={s.inputPlaceholder}>Tape ta réponse…</Text>
              }
            </View>
            <DefiKeyboard
              onKey={handleKey}
              onDelete={handleDelete}
              onSubmit={handleSubmit}
              canSubmit={typed.trim().length > 0}
            />
          </>
        )}
        {selectedAnswer === null && (
          <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
            <View style={s.skipRow}>
              <Text style={s.skipTxt}>Passer · −1</Text>
              <Image source={require('@/assets/Icon/UI/life.png')} style={{ width: 14, height: 14 }} resizeMode="contain" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </MeshBackground>
  );
}

function AchievementsBlock({ list, gender }: { list: Achievement[]; gender: string }) {
  return (
    <View style={s.achBox}>
      <Text style={s.achTitle}>🏅 Succès débloqués !</Text>
      {list.map((a) => (
        <Text key={a.id} style={s.achRow}>
          {a.emoji} {achievementTitle(a, gender)}{'  '}
          <Text style={s.achXp}>+{a.xpReward} XP</Text>
        </Text>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  /* Phases non-playing */
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 28 },
  loadTxt: { color: Colors.textMuted, fontSize: 15, marginTop: 8 },

  countdownNum: {
    color: Colors.primary,
    fontSize: 120,
    fontWeight: '900',
    lineHeight: 128,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 32,
  },
  countdownLabel: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  countdownChip: {
    marginTop: 8,
    backgroundColor: Colors.primaryDeep + '28',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.primaryDeep + '88',
  },
  countdownChipText: { color: Colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  feedbackToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    width: '100%',
    marginBottom: 8,
  },
  toastDot: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  toastDotText: { fontSize: 18 },
  toastTitle: { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  toastSub: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },

  revealImage: {
    width: 260, height: 370, borderRadius: 16,
    borderWidth: 2, borderColor: Colors.primary + '55',
  },
  revealLabel: { color: Colors.textMuted, fontSize: 13 },
  revealAnswer: {
    color: Colors.primary, fontSize: 22, fontWeight: '800',
    textAlign: 'center', paddingHorizontal: 20,
  },

  bigEmoji: { fontSize: 72 },
  bigEmojiImg: { width: 72, height: 72 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnIcon: { width: 18, height: 18, tintColor: '#fff' },
  resultTitle: { color: Colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },
  resultSub: { color: Colors.textMuted, fontSize: 16 },
  finishedScore: { color: Colors.text, fontSize: 64, fontWeight: '900', lineHeight: 72 },
  finishedTotal: { color: Colors.textMuted, fontSize: 28, fontWeight: '600' },
  perfectText: {
    color: Colors.secondary, fontSize: 14, fontWeight: '700',
    textAlign: 'center', paddingHorizontal: 20,
  },

  continueBtn: {
    backgroundColor: Colors.primaryDeep,
    borderRadius: 9999,
    paddingHorizontal: 32,
    paddingVertical: 14,
    marginTop: 4,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  primaryBtn: {
    backgroundColor: Colors.primaryDeep,
    borderRadius: 9999,
    paddingHorizontal: 28,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghostBtn: { paddingVertical: 12 },
  ghostBtnText: { color: Colors.textMuted, fontSize: 15 },
  rewardBtn: {
    width: '100%', borderRadius: 16, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.warning + '88', backgroundColor: Colors.warning + '14',
  },
  rewardBtnText: { color: Colors.warning, fontSize: 15, fontWeight: '700' },

  achBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    width: '100%',
    gap: 6,
  },
  achTitle: { color: Colors.secondary, fontSize: 13, fontWeight: '800', marginBottom: 2 },
  achRow: { color: Colors.text, fontSize: 13, lineHeight: 20 },
  achXp: { color: Colors.primary, fontWeight: '700' },

  /* Playing */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(22,15,40,0.6)',
    gap: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { color: Colors.outline, fontSize: 18 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerSub: { color: Colors.outline, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  headerScore: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  headerScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  timerWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  timerRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 5,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 8,
  },
  timerNum: { fontSize: 42, fontWeight: '900', lineHeight: 46 },
  timerLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  progressSection: { paddingHorizontal: 20, gap: 8 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nowPlaying: { color: Colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  progressTrack: {
    height: 10,
    backgroundColor: Colors.surfaceHighest,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 5,
    overflow: 'visible',
    position: 'relative',
  },
  progressHead: {
    position: 'absolute',
    right: -6,
    top: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.text,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  catChip: {
    color: Colors.outline,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  scoreZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    overflow: 'visible',
  },
  scoreDisplay: {
    color: Colors.text,
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
    textShadowColor: Colors.primary + '55',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  scorePtsLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  comboBadge: {
    position: 'absolute',
    top: 8,
    right: 16,
    backgroundColor: Colors.tertiary + '22',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: Colors.tertiary + '88',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  comboText: { color: Colors.tertiary, fontSize: 13, fontWeight: '800' },
  gainText: {
    position: 'absolute',
    color: Colors.secondary,
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: Colors.secondary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  gameZone: { flex: 1, paddingHorizontal: 16, paddingBottom: 12, gap: 10, justifyContent: 'flex-end' },
  answers: { gap: 8 },

  qcmFeedback: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, borderWidth: 1.5, padding: 14,
  },
  qcmFeedbackDot: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  qcmFeedbackIcon: { fontSize: 16 },
  qcmFeedbackTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  qcmFeedbackAnswer: { color: Colors.textMuted, fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  qcmFeedbackStat: { fontSize: 16, fontWeight: '800' },

  inputBox: {
    minHeight: 58,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primaryDeep,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  inputText: { color: Colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  inputPlaceholder: { color: Colors.textMuted, fontSize: 15 },

  skipBtn: { alignSelf: 'center', paddingVertical: 6 },
  skipRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  skipTxt: { color: Colors.outline, fontSize: 13 },
});
