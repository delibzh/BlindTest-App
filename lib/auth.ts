import { supabase } from './supabase';
import { levelFromXp } from './progression';

export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function addXp(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const { data } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single();
  const newXp    = (data?.xp ?? 0) + amount;
  const newLevel = levelFromXp(newXp);
  await supabase
    .from('profiles')
    .update({ xp: newXp, level: newLevel })
    .eq('id', userId);
}

export async function updateGameStats(
  userId: string,
  stats: { correct: number; total: number; perfect?: boolean; newStreak?: number }
): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('games_played, games_perfect, accuracy_correct, accuracy_total, streak_best')
    .eq('id', userId)
    .single();
  if (!data) return;
  const updates: Record<string, number> = {
    games_played:     (data.games_played     ?? 0) + 1,
    accuracy_correct: (data.accuracy_correct ?? 0) + stats.correct,
    accuracy_total:   (data.accuracy_total   ?? 0) + stats.total,
  };
  if (stats.perfect)
    updates.games_perfect = (data.games_perfect ?? 0) + 1;
  if (stats.newStreak !== undefined)
    updates.streak_best = Math.max(data.streak_best ?? 0, stats.newStreak);
  await supabase.from('profiles').update(updates).eq('id', userId);
}

export async function updateProfile(userId: string, updates: { username?: string; avatar_url?: string; gender?: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
