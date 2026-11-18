import { supabase } from './supabase';

export type Difficulty = 1 | 2 | 3;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Facile',
  2: 'Moyen',
  3: 'Difficile',
};

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  1: '#22c55e',
  2: '#f59e0b',
  3: '#ef4444',
};

const COMBO_MULT: Record<number, number> = { 1: 1.0, 2: 1.2, 3: 1.5 };
const DIFF_MULT:  Record<number, number> = { 1: 1.0, 2: 1.5, 3: 2.0 };

export function calcPoints(timeLeft: number, timerSec: number, combo: number, difficulty: Difficulty): number {
  const speedBonus = Math.round((timeLeft / timerSec) * 100);
  const comboMult  = combo >= 4 ? 2.0 : (COMBO_MULT[combo] ?? 1.0);
  const diffMult   = DIFF_MULT[difficulty] ?? 1.0;
  return Math.round((100 + speedBonus) * comboMult * diffMult);
}

export interface DefiProgress {
  category: string;
  difficulty: Difficulty;
  mode: string;
  bestScore: number;
  completed: boolean;
  attempts: number;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [];
    for (let j = 0; j <= n; j++) {
      dp[i][j] = i === 0 ? j : j === 0 ? i : 0;
    }
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkAnswer(input: string, correct: string): boolean {
  const a = normalize(input);
  const b = normalize(correct);

  // Correspondance exacte
  if (a === b) return true;

  // Tolérance Levenshtein sur la réponse complète
  const maxDist = b.length <= 4 ? 0 : b.length <= 8 ? 1 : 2;
  if (levenshtein(a, b) <= maxDist) return true;

  // Sous-chaîne significative (ex: "dragon ball" dans "dragon ball z")
  if (a.length >= 4 && b.includes(a)) return true;

  // Mot-clé : un mot tapé (≥ 4 lettres) correspond exactement à un mot du titre
  const wordsB = new Set(b.split(' ').filter((w) => w.length >= 4));
  const wordsA = a.split(' ').filter((w) => w.length >= 4);
  for (const wa of wordsA) {
    if (wordsB.has(wa)) return true;
    // Tolérance d'1 faute sur les mots longs
    for (const wb of wordsB) {
      if (wb.length >= 5 && levenshtein(wa, wb) === 1) return true;
    }
  }

  return false;
}

export async function fetchDefiProgress(userId: string): Promise<DefiProgress[]> {
  const { data, error } = await supabase
    .from('defi_progress')
    .select('*')
    .eq('user_id', userId)
    .order('best_score', { ascending: false });
  if (error) throw error;

  // Déduplique : garde la meilleure ligne par (category, difficulty)
  const best = new Map<string, DefiProgress>();
  for (const r of data ?? []) {
    const key = `${r.category}_${r.difficulty}_${r.mode}`;
    if (!best.has(key)) {
      best.set(key, {
        category: r.category,
        difficulty: r.difficulty as Difficulty,
        mode: r.mode,
        bestScore: r.best_score,
        completed: r.completed || r.best_score >= 20,
        attempts: r.attempts,
      });
    }
  }
  return Array.from(best.values());
}

export async function saveDefiProgress(
  userId: string,
  category: string,
  difficulty: Difficulty,
  correctCount: number,
  mode: string,
  points: number,
): Promise<void> {
  const { data: rows } = await supabase
    .from('defi_progress')
    .select('best_score, best_points, attempts')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('difficulty', difficulty)
    .eq('mode', mode)
    .order('best_score', { ascending: false });

  if (rows && rows.length > 0) {
    const prevBest      = rows[0].best_score  ?? 0;
    const prevPoints    = rows[0].best_points ?? 0;
    const prevAttempts  = rows.reduce((s, r) => s + (r.attempts ?? 0), 0);
    const newBest       = Math.max(correctCount, prevBest);
    const newPoints     = Math.max(points, prevPoints);
    const { error } = await supabase
      .from('defi_progress')
      .update({ best_score: newBest, best_points: newPoints, completed: newBest >= 20, attempts: prevAttempts + 1 })
      .eq('user_id', userId)
      .eq('category', category)
      .eq('difficulty', difficulty)
      .eq('mode', mode);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('defi_progress')
      .insert({ user_id: userId, category, difficulty, mode, best_score: correctCount, best_points: points, completed: correctCount >= 20, attempts: 1 });
    if (error) throw error;
  }
}
