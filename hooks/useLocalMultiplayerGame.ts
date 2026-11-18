import { useState, useRef } from 'react';
import { Vibration } from 'react-native';
import { router } from 'expo-router';
import { AudioPlayer } from 'expo-audio';
import { fetchTracksForSolo, Track } from '@/lib/tracks';
import { createMatch, saveMatchPlayer, endMatch } from '@/lib/matches';
import { evaluateAchievements } from '@/lib/achievements';
import { updateGameStats } from '@/lib/auth';

interface Options {
  categories: string;
  count: string;
  players: string[];
  matchMode: 'buzz' | 'oral';
  userId?: string;
  myName?: string | null;
}

export function useLocalMultiplayerGame({
  categories,
  count,
  players,
  matchMode,
  userId,
  myName,
}: Options) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(players.map((p) => [p, 0]))
  );

  const tracksRef = useRef<Track[]>([]);
  const indexRef = useRef(0);
  const scoresRef = useRef<Record<string, number>>(Object.fromEntries(players.map((p) => [p, 0])));
  const correctCounts = useRef<Record<string, number>>(Object.fromEntries(players.map((p) => [p, 0])));
  const wrongCounts = useRef<Record<string, number>>(Object.fromEntries(players.map((p) => [p, 0])));
  const sound = useRef<AudioPlayer | null>(null);
  const matchIdRef = useRef<string | null>(null);
  const savedRef = useRef(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startCountdown(onComplete: () => void) {
    setCountdown(10);
    let remaining = 10;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      Vibration.vibrate(50);
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        onComplete();
      }
    }, 1000);
  }

  async function loadTracks(onCountdownStart: () => void, onCountdownEnd: () => void) {
    try {
      const cats = categories.split(',');
      const data = await fetchTracksForSolo(cats, Number(count));
      tracksRef.current = data;
      setTracks(data);
      createMatch({ mode: matchMode, categories: cats, totalRounds: data.length, hostUserId: userId })
        .then((id) => { matchIdRef.current = id; })
        .catch(() => {});
      onCountdownStart();
      startCountdown(onCountdownEnd);
    } catch {
      router.back();
    }
  }

  async function saveGameResults() {
    if (!userId || !matchIdRef.current || savedRef.current) return;
    savedRef.current = true;

    const sorted = [...players].sort((a, b) => scoresRef.current[b] - scoresRef.current[a]);
    const cats = categories.split(',');
    const total = tracksRef.current.length;

    try {
      await Promise.all(
        players.map((name) =>
          saveMatchPlayer({
            matchId: matchIdRef.current!,
            userId: name === myName ? userId : undefined,
            displayName: name,
            score: scoresRef.current[name],
            correct: correctCounts.current[name] ?? 0,
            wrong: wrongCounts.current[name] ?? 0,
            maxCombo: 0,
            rank: sorted.indexOf(name) + 1,
            isWinner: sorted[0] === name,
          })
        )
      );
      await endMatch(matchIdRef.current);

      if (myName && players.includes(myName)) {
        const myCorrect = correctCounts.current[myName] ?? 0;
        const myWrong   = wrongCounts.current[myName]   ?? 0;
        const myTotal   = myCorrect + myWrong;
        await evaluateAchievements(userId, {
          matchMode,
          correct: myCorrect,
          total,
          maxCombo: 0,
          isWinner: sorted[0] === myName,
          categories: cats,
        });
        updateGameStats(userId, {
          correct: myCorrect,
          total: myTotal,
          perfect: myWrong === 0 && myTotal > 0,
        }).catch(() => {});
      }
    } catch { /* ignore */ }
  }

  function cleanup() {
    sound.current?.remove();
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }

  return {
    tracks,
    tracksRef,
    index,
    setIndex,
    indexRef,
    countdown,
    scores,
    setScores,
    scoresRef,
    correctCounts,
    wrongCounts,
    sound,
    matchIdRef,
    savedRef,
    loadTracks,
    saveGameResults,
    cleanup,
  };
}
