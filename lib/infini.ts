import { supabase } from './supabase';
import { Track, shuffle } from './tracks';

export interface InfiniProgress {
  category: string;
  mode: string;
  best_streak: number;
}

export async function fetchInfiniProgress(userId: string): Promise<InfiniProgress[]> {
  const { data, error } = await supabase
    .from('infini_progress')
    .select('category, mode, best_streak')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchInfiniPool(categories: string | string[]): Promise<Track[]> {
  const cats = Array.isArray(categories) ? categories : [categories];
  const { data, error } = await supabase
    .from('tracks')
    .select('*, answers(*), hints(*)')
    .in('category', cats);
  if (error) throw error;
  return shuffle((data ?? []) as Track[]);
}

export async function saveInfiniResult(
  userId: string,
  category: string,
  streak: number,
  mode: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('infini_progress')
    .select('best_streak')
    .eq('user_id', userId)
    .eq('category', category)
    .eq('mode', mode)
    .maybeSingle();

  const newBest = Math.max(streak, existing?.best_streak ?? 0);

  const { error } = await supabase
    .from('infini_progress')
    .upsert(
      { user_id: userId, category, mode, best_streak: newBest, current_run_seen: [], updated_at: new Date().toISOString() },
      { onConflict: 'user_id,category,mode' }
    );
  if (error) throw error;
}
