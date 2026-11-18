import { supabase } from './supabase';
import { calculateMatchXp } from './progression';

export async function createMatch(params: {
  mode: 'solo' | 'oral' | 'buzz' | 'salon';
  categories: string[];
  totalRounds: number;
  hostUserId?: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      mode: params.mode,
      categories: params.categories,
      total_rounds: params.totalRounds,
      host_user_id: params.hostUserId ?? null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function saveMatchPlayer(params: {
  matchId: string;
  userId?: string;
  displayName: string;
  score: number;
  correct: number;
  wrong: number;
  maxCombo: number;
  rank: number;
  isWinner: boolean;
  currentStreak?: number;
}): Promise<void> {
  const xpResult = calculateMatchXp({
    correct: params.correct,
    total: params.correct + params.wrong,
    maxCombo: params.maxCombo,
    isWinner: params.isWinner,
    currentStreak: params.currentStreak ?? 0,
  });

  const { error } = await supabase.rpc('save_match_player', {
    p_match_id:     params.matchId,
    p_user_id:      params.userId ?? null,
    p_display_name: params.displayName,
    p_score:        params.score,
    p_correct:      params.correct,
    p_wrong:        params.wrong,
    p_max_combo:    params.maxCombo,
    p_rank:         params.rank,
    p_xp_earned:    xpResult.total,
    p_is_winner:    params.isWinner,
  });

  if (error) throw error;
}

export async function endMatch(matchId: string): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', matchId);

  if (error) throw error;
}

export async function fetchPlayerStats(userId: string): Promise<{
  gamesPlayed: number;
  gamesWon: number;
  totalXp: number;
  level: number;
  bestCombo: number;
  avgAccuracy: number;
}> {
  const [profileRes, comboRes, accuracyRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('total_xp, games_played, games_won, level')
      .eq('id', userId)
      .single(),

    supabase
      .from('match_players')
      .select('max_combo')
      .eq('user_id', userId)
      .order('max_combo', { ascending: false })
      .limit(1)
      .single(),

    supabase
      .from('match_players')
      .select('correct_answers, wrong_answers')
      .eq('user_id', userId),
  ]);

  if (profileRes.error) throw profileRes.error;

  const profile = profileRes.data;

  const bestCombo = comboRes.data?.max_combo ?? 0;

  let avgAccuracy = 0;
  if (accuracyRes.data && accuracyRes.data.length > 0) {
    const totals = accuracyRes.data.reduce(
      (acc, row) => ({
        correct: acc.correct + row.correct_answers,
        total: acc.total + row.correct_answers + row.wrong_answers,
      }),
      { correct: 0, total: 0 }
    );
    avgAccuracy = totals.total > 0 ? Math.round((totals.correct / totals.total) * 100) : 0;
  }

  return {
    gamesPlayed: profile.games_played ?? 0,
    gamesWon: profile.games_won ?? 0,
    totalXp: profile.total_xp ?? 0,
    level: profile.level ?? 1,
    bestCombo,
    avgAccuracy,
  };
}
