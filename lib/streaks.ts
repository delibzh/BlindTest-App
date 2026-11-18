import { supabase } from './supabase';

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function streakXp(streak: number): number {
  if (streak >= 30) return 1500;
  if (streak >= 7)  return 300;
  if (streak >= 3)  return 100;
  if (streak >= 2)  return 75;
  return 50;
}

export async function checkLoginStreak(userId: string): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('login_streak, last_login_at')
    .eq('id', userId)
    .single();
  if (!data) return 0;

  const todayMs = dayStart(new Date());
  const lastMs  = data.last_login_at ? dayStart(new Date(data.last_login_at)) : 0;

  if (todayMs === lastMs) return 0;

  const isConsecutive = (todayMs - lastMs) === 86_400_000;
  const newStreak     = isConsecutive ? (data.login_streak ?? 0) + 1 : 1;
  const xpGain        = streakXp(newStreak);

  await supabase
    .from('profiles')
    .update({ login_streak: newStreak, last_login_at: new Date().toISOString() })
    .eq('id', userId);

  return xpGain;
}
