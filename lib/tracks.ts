import { supabase } from './supabase';

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Track {
  id: string;
  title: string;
  category: string;
  year: number;
  r2_key: string;
  image_url?: string;
  difficulty: number;
  is_premium: boolean;
  audio_url?: string;
  answers: Answer[];
  hints: Hint[];
}

export interface Answer {
  id: string;
  track_id: string;
  label: string;
  is_correct: boolean;
}

export interface Hint {
  id: string;
  track_id: string;
  type: string;
  content: string;
}

export async function fetchTracksForDefi(categories: string | string[], difficulty: number): Promise<Track[]> {
  const cats = Array.isArray(categories) ? categories : [categories];
  const { data, error } = await supabase
    .from('tracks')
    .select('*, answers(*), hints(*)')
    .in('category', cats)
    .eq('difficulty', difficulty)
    .limit(cats.length > 1 ? 60 : 25);
  if (error) throw error;
  return shuffle((data ?? []) as Track[]).slice(0, 20);
}

export async function fetchRecentCategories(days = 30): Promise<string[]> {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from('tracks')
    .select('category')
    .gte('created_at', since);
  return [...new Set((data ?? []).map((r: { category: string }) => r.category))];
}

export async function fetchTracksForSolo(categories: string[], count: number): Promise<Track[]> {
  const perCat = Math.floor(count / categories.length);
  const remainder = count % categories.length;

  // Fetch chaque catégorie en parallèle avec une marge pour le shuffle
  const fetches = await Promise.all(
    categories.map((cat) =>
      supabase
        .from('tracks')
        .select('*, answers(*), hints(*)')
        .eq('category', cat)
        .limit(Math.max(perCat + 1, 20))
        .then(({ data, error }) => {
          if (error) return [] as Track[];
          return shuffle((data ?? []) as Track[]);
        })
    )
  );

  // Distribution équitable avec gestion du manque
  const quotas = categories.map((_, i) => {
    const base = perCat + (i < remainder ? 1 : 0);
    return Math.min(base, fetches[i].length);
  });

  // Redistribue le manque éventuel aux catégories qui ont plus de tracks
  let taken = quotas.reduce((s, q) => s + q, 0);
  for (let pass = 0; pass < 2 && taken < count; pass++) {
    for (let i = 0; i < categories.length && taken < count; i++) {
      const extra = fetches[i].length - quotas[i];
      if (extra > 0) { quotas[i]++; taken++; }
    }
  }

  // Assemble et mélange le tout
  const result: Track[] = [];
  for (let i = 0; i < categories.length; i++) {
    result.push(...fetches[i].slice(0, quotas[i]));
  }
  return shuffle(result);
}

export function parseCategoryParam(param: string | undefined): string[] {
  if (!param) return [];
  return param.includes(',') ? param.split(',') : [param];
}

export async function getSignedAudioUrl(r2Key: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-audio-url', {
    body: { r2_key: r2Key },
  });
  if (error) throw new Error('Erreur génération URL audio');
  return data.url;
}

export async function saveScore(
  userId: string,
  category: string,
  points: number,
  mode: string = 'solo'
) {
  const { error } = await supabase
    .from('scores')
    .insert({ user_id: userId, mode, category, points });
  if (error) throw error;
}

export async function fetchCatalogCounts(): Promise<{ category: string; total: number; premium: number }[]> {
  const { data, error } = await supabase
    .from('tracks')
    .select('category, is_premium');
  if (error || !data) return [];

  const map = new Map<string, { total: number; premium: number }>();
  for (const row of data) {
    const cur = map.get(row.category) ?? { total: 0, premium: 0 };
    cur.total++;
    if (row.is_premium) cur.premium++;
    map.set(row.category, cur);
  }
  return Array.from(map.entries()).map(([category, counts]) => ({ category, ...counts }));
}

export interface CompositeEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  border_color: string | null;
  equipped_frame_id: string | null;
  equipped_badge_id: string | null;
  score: number;
  defi_pts: number;
  xp: number;
  streak_infini: number;
  streak_best: number;
  accuracy_pct: number;
}

export interface InfiniEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  border_color: string | null;
  equipped_frame_id: string | null;
  equipped_badge_id: string | null;
  best_streak: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache: {
  composite?: { data: CompositeEntry[]; ts: number };
  infini: Map<string, { data: InfiniEntry[]; ts: number }>;
} = { infini: new Map() };

export async function fetchCompositeLeaderboard(): Promise<CompositeEntry[]> {
  const now = Date.now();
  if (cache.composite && now - cache.composite.ts < CACHE_TTL_MS) {
    return cache.composite.data;
  }
  const { data, error } = await supabase
    .from('leaderboard_composite')
    .select('*')
    .limit(100);
  if (error) throw error;
  const result = (data ?? []) as CompositeEntry[];
  cache.composite = { data: result, ts: now };
  return result;
}

export async function fetchInfiniLeaderboard(category?: string): Promise<InfiniEntry[]> {
  const key = category ?? '__global__';
  const now = Date.now();
  const hit = cache.infini.get(key);
  if (hit && now - hit.ts < CACHE_TTL_MS) return hit.data;

  const { data, error } = await supabase.rpc('get_infini_leaderboard', {
    p_category: category ?? null,
  });
  if (error) throw error;
  const result = (data ?? []) as InfiniEntry[];
  cache.infini.set(key, { data: result, ts: now });
  return result;
}
