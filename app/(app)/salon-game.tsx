import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { fetchTracksForSolo, getSignedAudioUrl, Track } from '@/lib/tracks';
import { Timer } from '@/components/ui/Timer';
import { Avatar } from '@/components/ui/Avatar';
import { AnswerButton } from '@/components/ui/AnswerButton';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';

type Phase = 'waiting' | 'playing' | 'round-end' | 'finished';

interface ScoreEntry { userId: string; username: string; score: number; avatarUrl?: string; }

interface SessionUpdatedPayload { players?: ScoreEntry[]; }
interface RoundStartPayload { trackIndex: number; audioUrl: string; hint?: string; }
interface RoundEndPayload { correctAnswer: string; scores: Record<string, number>; }
interface GameFinishedPayload { scores: Record<string, number>; }

export default function SalonGameScreen() {
  const { sessionId, isGm, categories, count, scoringMode } =
    useLocalSearchParams<{ sessionId: string; isGm: string; categories: string; count: string; scoringMode: string }>();

  const { user } = useAuth();
  const isGameMaster = isGm === 'true';

  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [players, setPlayers] = useState<ScoreEntry[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shuffledAnswers, setShuffledAnswers] = useState<Track['answers']>([]);
  const [correctAnswer, setCorrectAnswer] = useState('');

  const sound = useRef<AudioPlayer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const startTime = useRef(0);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('session:updated', ({ players: p }: SessionUpdatedPayload) => {
      setPlayers(p ?? []);
    });

    socket.on('round:start', async ({ trackIndex, audioUrl }: RoundStartPayload) => {
      setIndex(trackIndex);
      setAnswerState('idle');
      setSelectedAnswer(null);
      setTimerRunning(true);
      startTime.current = Date.now();

      if (isGameMaster) {
        try {
          await sound.current?.remove();
          const player = createAudioPlayer({ uri: audioUrl });
          player.play();
          sound.current = player;
        } catch { /* dev */ }
      }
    });

    socket.on('round:end', ({ correctAnswer: ca, scores: s }: RoundEndPayload) => {
      setCorrectAnswer(ca);
      setScores(s);
      setTimerRunning(false);
      setPhase('round-end');
      sound.current?.pause();
    });

    socket.on('game:finished', ({ scores: s }: GameFinishedPayload) => {
      setScores(s);
      setPhase('finished');
    });

    return () => {
      socket.emit('session:leave');
      disconnectSocket();
      sound.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (isGameMaster) loadTracks();
  }, []);

  useEffect(() => {
    const track = tracks[index];
    if (track) setShuffledAnswers([...track.answers].sort(() => Math.random() - 0.5));
  }, [index, tracks.length]);

  async function loadTracks() {
    try {
      const data = await fetchTracksForSolo(categories.split(','), Number(count));
      setTracks(data);
    } catch {
      router.back();
    }
  }

  function handleAnswer(answerId: string, isCorrect: boolean) {
    if (answerState !== 'idle') return;
    setSelectedAnswer(answerId);
    setAnswerState(isCorrect ? 'correct' : 'wrong');
    const timeMs = Date.now() - startTime.current;
    socketRef.current?.emit('game:answer', { answer: shuffledAnswers.find(a => a.id === answerId)?.label ?? '', timeMs });
  }

  function handleTimeout() {
    setTimerRunning(false);
  }

  const track = tracks[index];

  if (phase === 'finished') {
    const sorted = players.slice().sort((a, b) => (scores[b.userId] ?? 0) - (scores[a.userId] ?? 0));
    return (
      <MeshBackground>
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={styles.finishedTitle}>Classement final 🏆</Text>
        {sorted.map((p, i) => (
          <View key={p.userId} style={styles.scoreRow}>
            <Text style={styles.rank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</Text>
            <Avatar username={p.username} size={32} />
            <Text style={styles.scoreName}>{p.username}</Text>
            <Text style={styles.scorePoints}>{scores[p.userId] ?? 0} pts</Text>
          </View>
        ))}
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(app)/home')}>
          <Text style={styles.homeBtnText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </ScrollView>
      </MeshBackground>
    );
  }

  if (phase === 'round-end') {
    const sorted = players.slice().sort((a, b) => (scores[b.userId] ?? 0) - (scores[a.userId] ?? 0));
    return (
      <MeshBackground>
      <ScrollView contentContainerStyle={styles.center}>
        <Text style={styles.roundEndTitle}>Réponse : {correctAnswer}</Text>
        {sorted.map((p, i) => (
          <View key={p.userId} style={styles.scoreRow}>
            <Text style={styles.rank}>#{i + 1}</Text>
            <Text style={styles.scoreName}>{p.username}</Text>
            <Text style={styles.scorePoints}>{scores[p.userId] ?? 0} pts</Text>
          </View>
        ))}
        {isGameMaster && (
          <TouchableOpacity style={styles.nextRoundBtn} onPress={() => { setPhase('waiting'); socketRef.current?.emit('player:ready'); }}>
            <Text style={styles.nextRoundBtnText}>Son suivant →</Text>
          </TouchableOpacity>
        )}
        {!isGameMaster && <Text style={styles.waitGm}>⏳ En attente du GM...</Text>}
      </ScrollView>
      </MeshBackground>
    );
  }

  return (
    <MeshBackground>
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.progress}>Son {index + 1} / {count}</Text>
        {isGameMaster && <Text style={styles.gmBadge}>👑 GM</Text>}
      </View>

      <Timer durationMs={30_000} running={timerRunning} onEnd={handleTimeout} />

      {/* Carte son — seul le GM voit la note musicale animée */}
      <View style={styles.soundCard}>
        {isGameMaster ? (
          <>
            <Image source={require('@/assets/Icon/UI/music_note.png')} style={styles.musicNote} />
            <Text style={styles.gmInfo}>Joue le son pour tes joueurs</Text>
            <Text style={styles.category}>{track?.category?.toUpperCase() ?? '...'}</Text>
          </>
        ) : (
          <>
            <Text style={styles.musicNote}>👂</Text>
            <Text style={styles.gmInfo}>Écoute le son joué par le GM</Text>
          </>
        )}
      </View>

      {/* Réponses — tout le monde répond */}
      {track && shuffledAnswers.length > 0 && (
        <View style={styles.answers}>
          {shuffledAnswers.map((answer, i) => (
            <AnswerButton
              key={answer.id}
              index={i}
              answer={answer}
              selectedId={selectedAnswer}
              revealed={answerState !== 'idle'}
              highlightCorrect={false}
              onPress={() => handleAnswer(answer.id, answer.is_correct)}
            />
          ))}
        </View>
      )}

      {/* Scores en temps réel */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.liveScores}>
        {players.map((p) => (
          <View key={p.userId} style={styles.liveScore}>
            <Avatar username={p.username} size={28} />
            <Text style={styles.liveScoreName}>{p.username.split(' ')[0]}</Text>
            <Text style={styles.liveScorePts}>{scores[p.userId] ?? 0}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 56, gap: 14 },
  center: { flexGrow: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progress: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  gmBadge: { color: Colors.warning, fontSize: 14, fontWeight: '700' },
  soundCard: { flex: 1, maxHeight: 160, backgroundColor: Colors.surface, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', gap: 8 },
  musicNote: { width: 48, height: 48 },
  gmInfo: { color: Colors.textMuted, fontSize: 13 },
  category: { color: Colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  answers: { gap: 10 },
  liveScores: { maxHeight: 60 },
  liveScore: { alignItems: 'center', marginRight: 16, gap: 3 },
  liveScoreName: { color: Colors.textMuted, fontSize: 11 },
  liveScorePts: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  finishedTitle: { color: Colors.text, fontSize: 26, fontWeight: '800', marginBottom: 8 },
  roundEndTitle: { color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 10 },
  rank: { fontSize: 18, width: 32 },
  scoreName: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '600' },
  scorePoints: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  nextRoundBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  nextRoundBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  waitGm: { color: Colors.textMuted, fontSize: 14, marginTop: 8 },
  homeBtn: { backgroundColor: Colors.surface, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border, marginTop: 8 },
  homeBtnText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
});
