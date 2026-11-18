import { supabase } from './supabase';

export interface Achievement {
  id: string;
  key: string;
  title: string;
  titleFem: string | null;
  description: string;
  emoji: string;
  xpReward: number;
}

export function achievementTitle(a: Achievement, gender: string): string {
  return gender === 'fem' && a.titleFem ? a.titleFem : a.title;
}

interface AchievementRow {
  id: string;
  key: string;
  title: string;
  title_fem: string | null;
  description: string;
  emoji: string;
  xp_reward: number;
  condition_type: string;
  condition_value: number;
  condition_category: string | null;
}

export interface EvalContext {
  matchMode: string;
  correct: number;
  total: number;
  maxCombo: number;
  isWinner: boolean;
  categories: string[];
  defiDifficulty?: number;
  defiCompleted?: boolean;
}

async function buildPlayerStats(userId: string) {
  const [profileRes, playersRes, streakRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('games_played, games_won')
      .eq('id', userId)
      .single(),
    supabase
      .from('match_players')
      .select('match_id, correct_answers, wrong_answers, max_combo, rank')
      .eq('user_id', userId),
    supabase
      .from('streaks')
      .select('accuracy_streak')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (playersRes.error) throw playersRes.error;

  const rows = playersRes.data ?? [];
  const matchIds = [...new Set(rows.map((r) => r.match_id))];

  // Fetch categories for each match to compute per-category correct answers
  let categoryCorrectMap: Record<string, number> = {};
  if (matchIds.length > 0) {
    const { data: matches, error: matchErr } = await supabase
      .from('matches')
      .select('id, categories')
      .in('id', matchIds);

    if (matchErr) throw matchErr;

    const matchCatMap = Object.fromEntries(
      (matches ?? []).map((m) => [m.id, m.categories as string[]])
    );

    for (const row of rows) {
      const cats = matchCatMap[row.match_id] ?? [];
      // Distribute correct answers equally across categories of the match
      const perCat = cats.length > 0 ? Math.round(row.correct_answers / cats.length) : 0;
      for (const cat of cats) {
        categoryCorrectMap[cat] = (categoryCorrectMap[cat] ?? 0) + perCat;
      }
    }
  }

  const bestCombo = rows.reduce((max, r) => Math.max(max, r.max_combo), 0);
  const topRankCount = rows.filter((r) => r.rank === 1).length;

  return {
    gamesPlayed: profileRes.data.games_played ?? 0,
    gamesWon: profileRes.data.games_won ?? 0,
    bestCombo,
    topRankCount,
    categoryCorrectMap,
    accuracyStreak: streakRes.data?.accuracy_streak ?? 0,
  };
}

export async function evaluateAchievements(
  userId: string,
  context: EvalContext
): Promise<Achievement[]> {
  const [achievementsRes, alreadyUnlockedRes, stats] = await Promise.all([
    supabase.from('achievements').select('*'),
    supabase.from('player_achievements').select('achievement_id').eq('user_id', userId),
    buildPlayerStats(userId),
  ]);

  if (achievementsRes.error) throw achievementsRes.error;
  if (alreadyUnlockedRes.error) throw alreadyUnlockedRes.error;

  const alreadyUnlocked = new Set(alreadyUnlockedRes.data.map((r) => r.achievement_id));

  // Merge current match into stats for evaluation
  const currentBestCombo = Math.max(stats.bestCombo, context.maxCombo);
  const currentTopRank = stats.topRankCount + (context.isWinner ? 1 : 0);
  const currentGamesPlayed = stats.gamesPlayed + 1;
  const currentGamesWon = stats.gamesWon + (context.isWinner ? 1 : 0);

  const currentCategoryMap = { ...stats.categoryCorrectMap };
  const perCat = context.categories.length > 0
    ? Math.round(context.correct / context.categories.length)
    : 0;
  for (const cat of context.categories) {
    currentCategoryMap[cat] = (currentCategoryMap[cat] ?? 0) + perCat;
  }

  const toUnlock: Achievement[] = [];

  for (const ach of achievementsRes.data as AchievementRow[]) {
    if (alreadyUnlocked.has(ach.id)) continue;

    let met = false;

    switch (ach.condition_type) {
      case 'match_count':
        met = currentGamesPlayed >= ach.condition_value;
        break;

      case 'win_count':
        met = currentGamesWon >= ach.condition_value;
        break;

      case 'combo_reach':
        met = currentBestCombo >= ach.condition_value;
        break;

      case 'perfect_game':
        met = context.total >= 5 && context.correct === context.total;
        break;

      case 'category_correct': {
        const cat = ach.condition_category;
        if (cat) {
          met = (currentCategoryMap[cat] ?? 0) >= ach.condition_value;
        }
        break;
      }

      case 'accuracy_streak':
        met = stats.accuracyStreak >= ach.condition_value;
        break;

      case 'top_ranking':
        met = currentTopRank >= ach.condition_value;
        break;

      case 'defi_complete':
        met =
          context.matchMode === 'defi' &&
          context.defiCompleted === true &&
          context.defiDifficulty === ach.condition_value &&
          ach.condition_category === context.categories[0];
        break;
    }

    if (met) {
      toUnlock.push({
        id: ach.id,
        key: ach.key,
        title: ach.title,
        titleFem: ach.title_fem,
        description: ach.description,
        emoji: ach.emoji,
        xpReward: ach.xp_reward,
      });
    }
  }

  if (toUnlock.length === 0) return [];

  // Batch insert — ignore doublons (23505) issus de requêtes concurrentes
  const { error: insertError } = await supabase.from('player_achievements').upsert(
    toUnlock.map((a) => ({ user_id: userId, achievement_id: a.id })),
    { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
  );
  if (insertError) throw insertError;

  // Mise à jour XP en une seule opération
  const totalXpGain = toUnlock.reduce((sum, a) => sum + a.xpReward, 0);
  if (totalXpGain > 0) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('total_xp')
      .eq('id', userId)
      .single();

    await supabase
      .from('profiles')
      .update({ total_xp: (prof?.total_xp ?? 0) + totalXpGain })
      .eq('id', userId);
  }

  return toUnlock;
}

export async function fetchPlayerAchievements(
  userId: string
): Promise<(Achievement & { unlockedAt: string | null })[]> {
  const { data: all, error: achErr } = await supabase
    .from('achievements')
    .select('id, key, title, title_fem, description, emoji, xp_reward, is_hidden')
    .order('key');

  if (achErr) throw achErr;

  const { data: unlocked, error: ulErr } = await supabase
    .from('player_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', userId);

  if (ulErr) throw ulErr;

  const unlockedMap = Object.fromEntries(
    (unlocked ?? []).map((u) => [u.achievement_id, u.unlocked_at])
  );

  return (all ?? [])
    .filter((a) => !a.is_hidden || unlockedMap[a.id] !== undefined)
    .map((a) => ({
      id: a.id,
      key: a.key,
      title: a.title,
      titleFem: a.title_fem ?? null,
      description: a.description,
      emoji: a.emoji,
      xpReward: a.xp_reward,
      unlockedAt: unlockedMap[a.id] ?? null,
    }));
}
