export const XP = {
  CORRECT_ANSWER: 10,
  WIN: 50,
  PERFECT_GAME: 100,
  PARTICIPATION: 5,
  STREAK_BONUS: 25,
  COMBO_TIER_2: 5,
  COMBO_TIER_3: 10,
  COMBO_TIER_4: 20,
} as const;

export function getComboMultiplier(combo: number): number {
  if (combo >= 8) return 2.5;
  if (combo >= 5) return 2.0;
  if (combo >= 3) return 1.5;
  return 1.0;
}

// total XP requis pour atteindre le niveau n (level 1 = 0 XP)
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 75 * level * (level - 1) / 2 + 25 * level;
}

export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  // Inverse analytique de xpForLevel(n) = n*(75n-25)/2 → 75n²-25n-2*xp = 0
  const n = (25 + Math.sqrt(625 + 600 * totalXp)) / 150;
  return Math.max(1, Math.floor(n));
}

export function xpProgress(totalXp: number): { current: number; needed: number; level: number } {
  const level = levelFromXp(totalXp);
  const current = totalXp - xpForLevel(level);
  const needed = xpForLevel(level + 1) - xpForLevel(level);
  return { current, needed, level };
}

export interface MatchResult {
  correct: number;
  total: number;
  maxCombo: number;
  isWinner: boolean;
  currentStreak: number;
}

export function calculateMatchXp(result: MatchResult): { total: number; breakdown: Record<string, number> } {
  const base = result.correct * XP.CORRECT_ANSWER + XP.PARTICIPATION;
  const perfect = result.total >= 5 && result.correct === result.total ? XP.PERFECT_GAME : 0;
  const win = result.isWinner ? XP.WIN : 0;
  const streak = result.currentStreak >= 3 ? XP.STREAK_BONUS : 0;

  let combo = 0;
  if (result.maxCombo >= 8) combo = XP.COMBO_TIER_4;
  else if (result.maxCombo >= 5) combo = XP.COMBO_TIER_3;
  else if (result.maxCombo >= 3) combo = XP.COMBO_TIER_2;

  const total = base + perfect + win + streak + combo;
  return { total, breakdown: { base, perfect, win, streak, combo } };
}

export class ComboTracker {
  private combo = 0;
  private maxCombo = 0;

  onCorrect(): { combo: number; multiplier: number; xpBonus: number } {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    let xpBonus = 0;
    if (this.combo === 8) xpBonus = XP.COMBO_TIER_4;
    else if (this.combo === 5) xpBonus = XP.COMBO_TIER_3;
    else if (this.combo === 3) xpBonus = XP.COMBO_TIER_2;

    return {
      combo: this.combo,
      multiplier: getComboMultiplier(this.combo),
      xpBonus,
    };
  }

  onWrong(): void {
    this.combo = 0;
  }

  getMax(): number {
    return this.maxCombo;
  }

  reset(): void {
    this.combo = 0;
    this.maxCombo = 0;
  }
}
