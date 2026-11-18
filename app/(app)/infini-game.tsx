import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useAuth } from '@/hooks/useAuth';
import { getSignedAudioUrl, Track, shuffle, parseCategoryParam } from '@/lib/tracks';
import { loadSounds, playClick, playGameStart, playRight, playWrong, playPrevious, unloadSounds } from '@/lib/sounds';
import { checkAnswer } from '@/lib/defi';
import { addXp, updateGameStats } from '@/lib/auth';
import { usePreventBack, confirmQuit } from '@/hooks/usePreventBack';
import { DefiKeyboard } from '@/components/ui/DefiKeyboard';
import { AnswerButton } from '@/components/ui/AnswerButton';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { fetchInfiniPool, saveInfiniResult, fetchInfiniProgress } from '@/lib/infini';

const TIMER_SEC          = 25;
const TIMER_MS           = TIMER_SEC * 1000;
const RECENT_MAIN_WINDOW = 10;
const RECENT_DIST_WINDOW = 15;

const PARTICLE_COUNT          = 8;
const PARTICLE_COLORS_QCM     = [Colors.primary, Colors.secondary, Colors.tertiary, '#ffffff', Colors.primary, Colors.secondary, Colors.tertiary, '#22c55e'];
const PARTICLE_COLORS_CLAVIER = [Colors.secondary, '#7dd3fc', '#38bdf8', '#ffffff', Colors.secondary, '#7dd3fc', '#bae6fd', '#e0f2fe'];

type Phase = 'loading' | 'countdown' | 'playing' | 'gameover';

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
        <Animated.View key={i} style={[eq.bar, { backgroundColor: colors[i], transform: [{ scaleY: h }] }]} />
      ))}
    </View>
  );
}
const eq = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 16 },
  bar: { width: 3, height: 14, borderRadius: 2 },
});

export default function InfiniGameScreen() {
  const { category, mode } = useLocalSearchParams<{ category: string; mode: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const isQcm         = mode === 'qcm';
  const flameColor    = isQcm ? Colors.primary   : Colors.secondary;
  const particleColors = isQcm ? PARTICLE_COLORS_QCM : PARTICLE_COLORS_CLAVIER;

  const [phase,           setPhase]           = useState<Phase>('loading');
  const [countdown,       setCountdown]       = useState(5);
  const [streak,          setStreak]          = useState(0);
  const [bestStreak,      setBestStreak]      = useState(0);
  const [isNewRecord,     setIsNewRecord]     = useState(false);
  const [timeLeft,        setTimeLeft]        = useState(TIMER_SEC);
  const [typed,           setTyped]           = useState('');
  const [correctAnswer,   setCorrectAnswer]   = useState('');
  const [revealImageUrl,  setRevealImageUrl]  = useState<string | undefined>();
  const [shuffledAnswers, setShuffledAnswers] = useState<Track['answers']>([]);
  const [selectedAnswer,  setSelectedAnswer]  = useState<string | null>(null);
  const [qcmFeedback,     setQcmFeedback]     = useState<{ correct: boolean } | null>(null);
  const [currentTrack,    setCurrentTrack]    = useState<Track | null>(null);
  const [showGain,        setShowGain]        = useState(false);
  const [showReveal,      setShowReveal]      = useState(false);

  const poolRef           = useRef<Track[]>([]);
  const poolIndexRef      = useRef(0);
  const currentTrackRef   = useRef<Track | null>(null);
  const recentMainRef     = useRef<string[]>([]);
  const recentDistRef     = useRef<string[]>([]);
  const correctSetRef     = useRef<Set<string>>(new Set());
  const streakRef         = useRef(0);
  const bestStreakRef      = useRef(0);
  const correctAnswerRef  = useRef('');
  const savedRef          = useRef(false);
  const pendingRef        = useRef(false);
  const sound             = useRef<AudioPlayer | null>(null);
  const audioGenRef       = useRef(0);
  const timerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const introRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerAnim         = useRef(new Animated.Value(1)).current;
  const timerAnimRef      = useRef<Animated.CompositeAnimation | null>(null);
  const scorePulse        = useRef(new Animated.Value(1)).current;
  const gainY             = useRef(new Animated.Value(0)).current;
  const gainOpacity       = useRef(new Animated.Value(0)).current;
  const particleAnims     = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(0), y: new Animated.Value(0), opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    loadSounds();
    init();
    return () => {
      audioGenRef.current++;
      if (introRef.current) { clearInterval(introRef.current); introRef.current = null; }
      sound.current?.pause();
      sound.current?.remove();
      sound.current = null;
      unloadSounds();
      clearTimer();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchInfiniProgress(user.id)
      .then((progress) => {
        const prev = progress.find((p) => p.category === category && p.mode === mode)?.best_streak ?? 0;
        if (prev > bestStreakRef.current) {
          bestStreakRef.current = prev;
          setBestStreak(prev);
        }
      })
      .catch(() => {});
  }, [user?.id]);

  async function init() {
    try {
      const cats = parseCategoryParam(category);
      const pool = await fetchInfiniPool(cats);
      if (pool.length === 0) { router.back(); return; }
      poolRef.current = pool;
      poolIndexRef.current = 0;
      startCountdown();
    } catch {
      router.back();
    }
  }

  function nextTrack(): Track {
    const recentIds = new Set(recentMainRef.current);
    let candidates = poolRef.current.filter((t) => !recentIds.has(t.id));
    if (candidates.length === 0) {
      recentMainRef.current = [];
      candidates = poolRef.current;
    }
    const track = candidates[Math.floor(Math.random() * candidates.length)];
    recentMainRef.current = [...recentMainRef.current, track.id].slice(-RECENT_MAIN_WINDOW);
    return track;
  }

  function buildQcmAnswers(track: Track): Track['answers'] {
    const correct = track.answers.find((a) => a.is_correct);
    if (!correct) return shuffle(track.answers).slice(0, 4);
    if (track.answers.length >= 4) return shuffle(track.answers);

    const recentDist = new Set(recentDistRef.current);
    const correctSet = correctSetRef.current;
    const seen = new Set([correct.label]);
    const distractors: Track['answers'][number][] = [];
    const usedIds: string[] = [];

    function tryPick(pool: Track[]) {
      for (const t of shuffle(pool)) {
        if (distractors.length >= 3) break;
        const ans = t.answers.find((a) => a.is_correct);
        if (ans && !seen.has(ans.label)) {
          seen.add(ans.label);
          distractors.push({ ...ans, is_correct: false });
          usedIds.push(t.id);
        }
      }
    }

    const base = poolRef.current.filter((t) => t.id !== track.id);
    // Passe 1 : fresh + pas encore bien répondus cette session
    tryPick(base.filter((t) => !recentDist.has(t.id) && !correctSet.has(t.id)));
    // Passe 2 : relâche "déjà bien répondu"
    if (distractors.length < 3)
      tryPick(base.filter((t) => !recentDist.has(t.id) && !usedIds.includes(t.id)));
    // Passe 3 : dernier recours
    if (distractors.length < 3)
      tryPick(base.filter((t) => !usedIds.includes(t.id)));

    recentDistRef.current = [...recentDistRef.current, ...usedIds].slice(-RECENT_DIST_WINDOW);
    return shuffle([correct, ...distractors]);
  }

  function startCountdown() {
    setCountdown(5);
    setPhase('countdown');
    playGameStart();
    let count = 5;
    if (introRef.current) clearInterval(introRef.current);
    introRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(introRef.current!);
        introRef.current = null;
        startRound();
      }
    }, 1000);
  }

  function startRound() {
    pendingRef.current = false;
    setShowReveal(false);
    const track = nextTrack();
    currentTrackRef.current = track;
    setCurrentTrack(track);
    const answer = track.answers.find((a) => a.is_correct)?.label ?? '';
    correctAnswerRef.current = answer;
    setCorrectAnswer(answer);
    setRevealImageUrl(track.image_url);
    setTyped('');
    setSelectedAnswer(null);
    setQcmFeedback(null);
    if (isQcm) setShuffledAnswers(buildQcmAnswers(track));
    setPhase('playing');

    setTimeLeft(TIMER_SEC);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(countdownRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);

    timerAnim.setValue(1);
    timerAnimRef.current = Animated.timing(timerAnim, { toValue: 0, duration: TIMER_MS, useNativeDriver: false });
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

  function clearTimer() {
    if (timerRef.current)    { clearTimeout(timerRef.current); timerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    timerAnimRef.current?.stop();
  }

  function handleQuit() {
    audioGenRef.current++;
    if (introRef.current) { clearInterval(introRef.current); introRef.current = null; }
    clearTimer();
    sound.current?.pause();
    sound.current = null;
    playPrevious();
    router.back();
  }

  usePreventBack(handleQuit);

  function handleKey(char: string)  { if (phase === 'playing') setTyped((t) => t + char); }
  function handleDelete()            { if (phase === 'playing') setTyped((t) => t.slice(0, -1)); }

  function animateGain() {
    try {
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
    if (phase !== 'playing' || !typed.trim() || pendingRef.current) return;
    clearTimer();
    sound.current?.pause();
    if (checkAnswer(typed, correctAnswerRef.current)) {
      onCorrect();
    } else {
      playWrong();
      doGameOver();
    }
  }

  function handleQcmAnswer(answerId: string, isCorrect: boolean) {
    if (phase !== 'playing' || selectedAnswer !== null || pendingRef.current) return;
    playClick();
    clearTimer();
    sound.current?.pause();
    setSelectedAnswer(answerId);
    setQcmFeedback({ correct: isCorrect });

    setTimeout(() => {
      setQcmFeedback(null);
      if (isCorrect) {
        onCorrect();
      } else {
        playWrong();
        doGameOver();
      }
    }, 900);
  }

  function onTimeout() {
    playWrong();
    sound.current?.pause();
    doGameOver();
  }

  function onCorrect() {
    pendingRef.current = true;
    playRight();
    streakRef.current++;
    setStreak(streakRef.current);
    if (currentTrackRef.current) correctSetRef.current.add(currentTrackRef.current.id);
    setTyped('');
    setShowReveal(true);
    animateGain();
    setTimeout(() => startRound(), 1100);
  }

  async function doGameOver() {
    if (savedRef.current) return;
    savedRef.current = true;
    audioGenRef.current++;
    sound.current?.pause();
    setPhase('gameover');

    const finalStreak = streakRef.current;
    const isRecord = finalStreak > bestStreakRef.current;
    if (isRecord) {
      setIsNewRecord(true);
      setBestStreak(finalStreak);
    }

    if (user) {
      try {
        await saveInfiniResult(user.id, category, finalStreak, mode);
        const xpGain = finalStreak * 8 + (isRecord ? 100 : 0);
        if (xpGain > 0) addXp(user.id, xpGain).catch(() => {});
        updateGameStats(user.id, {
          correct: finalStreak,
          total: finalStreak + 1,
          newStreak: finalStreak,
        }).catch(() => {});
      } catch {}
    }
  }

  function handleRetry() {
    audioGenRef.current++;
    pendingRef.current      = false;
    streakRef.current       = 0;
    savedRef.current        = false;
    currentTrackRef.current = null;
    recentMainRef.current   = [];
    recentDistRef.current   = [];
    correctSetRef.current   = new Set();
    poolRef.current         = shuffle(poolRef.current);
    setStreak(0);
    setIsNewRecord(false);
    setShowReveal(false);
    setCurrentTrack(null);
    startCountdown();
  }

  const track = currentTrack;
  const urgencyPct = timeLeft / TIMER_SEC;
  const ringColor  = urgencyPct > 0.5 ? Colors.secondary : urgencyPct > 0.25 ? Colors.primary : Colors.error;

  // ─── Loading ────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <MeshBackground>
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={s.loadTxt}>Chargement du mode infini…</Text>
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
          <View style={[s.countdownChip, { borderColor: flameColor + '88', backgroundColor: flameColor + '18' }]}>
            <Text style={[s.countdownChipText, { color: flameColor }]}>♾️  {category?.toUpperCase()}</Text>
          </View>
        </View>
      </MeshBackground>
    );
  }

  // ─── Game Over ───────────────────────────────────────────────
  if (phase === 'gameover') {
    return (
      <MeshBackground>
        <View style={s.center}>
          <Image
            source={isNewRecord ? require('@/assets/Icon/UI/trophy.png') : require('@/assets/Icon/UI/death.png')}
            style={s.bigEmojiImg}
          />
          <Text style={s.resultTitle}>{isNewRecord ? 'Nouveau record !' : 'Game Over'}</Text>
          <View style={s.streakRow}>
            <View style={s.streakBox}>
              <Text style={s.streakBoxLabel}>STREAK</Text>
              <Text style={[s.streakBoxValue, { color: flameColor }]}>{streak}</Text>
            </View>
            <View style={s.streakDivider} />
            <View style={s.streakBox}>
              <Text style={s.streakBoxLabel}>RECORD</Text>
              <Text style={[s.streakBoxValue, { color: isNewRecord ? flameColor : Colors.textMuted }]}>
                {isNewRecord ? streak : bestStreak}
              </Text>
            </View>
          </View>
          {revealImageUrl && (
            <Image source={{ uri: revealImageUrl }} style={s.revealImageSmall} resizeMode="contain" />
          )}
          <Text style={s.revealLabel}>La réponse était</Text>
          <Text style={[s.revealAnswer, { color: flameColor }]}>{correctAnswer}</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={handleRetry}>
            <View style={s.btnRow}>
              <Image source={require('@/assets/Icon/UI/retry.png')} style={s.btnIcon} />
              <Text style={s.primaryBtnText}>Rejouer</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.ghostBtn} onPress={() => { playPrevious(); router.replace('/(app)/infini-setup'); }}>
            <Text style={s.ghostBtnText}>← Menu Infini</Text>
          </TouchableOpacity>
        </View>
      </MeshBackground>
    );
  }

  // ─── Playing ─────────────────────────────────────────────────
  const widthPct = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <MeshBackground>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.headerBtn} onPress={() => confirmQuit(handleQuit)} activeOpacity={0.7}>
          <Text style={s.headerBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerSub}>♾️  MODE INFINI</Text>
          <Text style={[s.headerScore, { color: flameColor }]}>🔥 {streak}  ·  Record {bestStreak}</Text>
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

      {/* Progress */}
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
        {showReveal && revealImageUrl ? (
          <View style={s.revealRow}>
            <Image source={{ uri: revealImageUrl }} style={[s.revealCompact, { borderColor: flameColor + '66' }]} resizeMode="cover" />
            <View style={s.revealInfo}>
              <Animated.Text style={[s.streakDisplaySmall, { transform: [{ scale: scorePulse }], textShadowColor: flameColor + '55' }]}>
                🔥 {streak}
              </Animated.Text>
              <Text style={[s.revealCompactTitle, { color: flameColor }]} numberOfLines={2}>{correctAnswer}</Text>
            </View>
          </View>
        ) : (
          <Animated.Text style={[s.streakDisplay, { transform: [{ scale: scorePulse }], textShadowColor: flameColor + '55' }]}>
            🔥 {streak}
          </Animated.Text>
        )}
        {!showReveal && <Text style={[s.streakLabel, { color: flameColor + 'AA' }]}>streak</Text>}
        {showGain && (
          <Animated.Text style={[s.gainText, { transform: [{ translateY: gainY }], opacity: gainOpacity, color: flameColor, textShadowColor: flameColor }]}>
            +1 🔥
          </Animated.Text>
        )}
        {particleAnims.map((p, i) => (
          <Animated.View
            key={i}
            style={[
              s.particle,
              {
                backgroundColor: particleColors[i % PARTICLE_COUNT],
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
                <Text style={[s.qcmFeedbackTitle, { color: qcmFeedback.correct ? Colors.success : Colors.error }]}>
                  {qcmFeedback.correct ? 'Bonne réponse !' : `C'était : ${correctAnswer}`}
                </Text>
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
      </View>
    </MeshBackground>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 28 },
  loadTxt: { color: Colors.textMuted, fontSize: 15, marginTop: 8 },

  countdownNum: {
    color: Colors.primary, fontSize: 120, fontWeight: '900', lineHeight: 128,
    textShadowColor: Colors.primary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 32,
  },
  countdownLabel: { color: Colors.text, fontSize: 22, fontWeight: '700' },
  countdownChip: {
    marginTop: 8, backgroundColor: Colors.primaryDeep + '28', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 7, borderWidth: 1, borderColor: Colors.primaryDeep + '88',
  },
  countdownChipText: { color: Colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  revealImageSmall: { width: 180, height: 120, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary + '44' },
  revealLabel: { color: Colors.textMuted, fontSize: 13 },
  revealAnswer: { color: Colors.primary, fontSize: 22, fontWeight: '800', textAlign: 'center', paddingHorizontal: 20 },

  bigEmoji: { fontSize: 72 },
  bigEmojiImg: { width: 72, height: 72 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnIcon: { width: 18, height: 18, tintColor: '#fff' },
  resultTitle: { color: Colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center' },

  streakRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden',
    width: '100%',
  },
  streakBox: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  streakDivider: { width: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.12)' },
  streakBoxLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  streakBoxValue: { fontSize: 40, fontWeight: '900', lineHeight: 44 },

  primaryBtn: {
    backgroundColor: Colors.primaryDeep, borderRadius: 9999,
    paddingHorizontal: 28, paddingVertical: 14, width: '100%', alignItems: 'center',
    shadowColor: Colors.primaryDeep, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 18,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghostBtn: { paddingVertical: 12 },
  ghostBtnText: { color: Colors.textMuted, fontSize: 15 },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(22,15,40,0.6)', gap: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { color: Colors.outline, fontSize: 18 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerSub: { color: Colors.outline, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  headerScore: { color: Colors.primary, fontSize: 14, fontWeight: '800' },

  timerWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  timerRing: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 18, elevation: 8,
  },
  timerNum: { fontSize: 42, fontWeight: '900', lineHeight: 46 },
  timerLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  progressSection: { paddingHorizontal: 20, gap: 8 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nowPlaying: { color: Colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  progressTrack: {
    height: 10, backgroundColor: Colors.surfaceHighest, borderRadius: 5, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  progressFill: { height: '100%', backgroundColor: Colors.secondary, borderRadius: 5, overflow: 'visible', position: 'relative' },
  progressHead: {
    position: 'absolute', right: -6, top: -3, width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.text, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8, elevation: 4,
  },
  catChip: { color: Colors.outline, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  scoreZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    overflow: 'visible',
  },
  streakDisplay: {
    color: Colors.text,
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 48,
    textShadowColor: Colors.primary + '55',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  streakDisplaySmall: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: Colors.primary + '55',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  streakLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  revealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  revealCompact: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary + '66',
  },
  revealInfo: { flex: 1, gap: 4 },
  revealCompactTitle: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
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
  qcmFeedbackDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  qcmFeedbackIcon: { fontSize: 16 },
  qcmFeedbackTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },

  inputBox: {
    minHeight: 58, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14,
    borderWidth: 2, borderColor: Colors.primaryDeep, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: Colors.primaryDeep, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  inputText: { color: Colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  inputPlaceholder: { color: Colors.textMuted, fontSize: 15 },
});
