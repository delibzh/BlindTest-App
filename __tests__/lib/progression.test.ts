import {
  xpForLevel,
  levelFromXp,
  xpProgress,
  calculateMatchXp,
  getComboMultiplier,
  ComboTracker,
} from '../../lib/progression';

describe('xpForLevel', () => {
  it('niveau 1 = 0 XP', () => expect(xpForLevel(1)).toBe(0));
  it('niveau 2 = 125 XP', () => expect(xpForLevel(2)).toBe(125));
  it('niveau 3 = 300 XP', () => expect(xpForLevel(3)).toBe(300));
  it('niveau 4 = 550 XP', () => expect(xpForLevel(4)).toBe(550));
});

describe('levelFromXp', () => {
  it('0 XP → niveau 1', () => expect(levelFromXp(0)).toBe(1));
  it('XP négatif → niveau 1', () => expect(levelFromXp(-50)).toBe(1));
  it('124 XP → encore niveau 1', () => expect(levelFromXp(124)).toBe(1));
  it('125 XP → niveau 2', () => expect(levelFromXp(125)).toBe(2));
  it('299 XP → encore niveau 2', () => expect(levelFromXp(299)).toBe(2));
  it('300 XP → niveau 3', () => expect(levelFromXp(300)).toBe(3));

  it('levelFromXp est cohérent avec xpForLevel', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      expect(levelFromXp(xpForLevel(lvl))).toBe(lvl);
    }
  });
});

describe('xpProgress', () => {
  it('0 XP : début du niveau 1', () => {
    const { level, current, needed } = xpProgress(0);
    expect(level).toBe(1);
    expect(current).toBe(0);
    expect(needed).toBe(125); // xpForLevel(2) - xpForLevel(1)
  });

  it('exactement au niveau 2', () => {
    const { level, current, needed } = xpProgress(125);
    expect(level).toBe(2);
    expect(current).toBe(0);
    expect(needed).toBe(175); // xpForLevel(3) - xpForLevel(2)
  });

  it('milieu du niveau 2', () => {
    const { level, current } = xpProgress(200);
    expect(level).toBe(2);
    expect(current).toBe(75);
  });
});

describe('getComboMultiplier', () => {
  it('combo < 3 → x1.0', () => {
    expect(getComboMultiplier(1)).toBe(1.0);
    expect(getComboMultiplier(2)).toBe(1.0);
  });
  it('combo 3-4 → x1.5', () => {
    expect(getComboMultiplier(3)).toBe(1.5);
    expect(getComboMultiplier(4)).toBe(1.5);
  });
  it('combo 5-7 → x2.0', () => {
    expect(getComboMultiplier(5)).toBe(2.0);
    expect(getComboMultiplier(7)).toBe(2.0);
  });
  it('combo >= 8 → x2.5', () => {
    expect(getComboMultiplier(8)).toBe(2.5);
    expect(getComboMultiplier(15)).toBe(2.5);
  });
});

describe('calculateMatchXp', () => {
  it('participation seule (0 correct)', () => {
    const { total, breakdown } = calculateMatchXp({
      correct: 0, total: 5, maxCombo: 0, isWinner: false, currentStreak: 0,
    });
    expect(breakdown.base).toBe(5);
    expect(total).toBe(5);
  });

  it('réponses correctes : +10 XP chacune', () => {
    const { breakdown } = calculateMatchXp({
      correct: 3, total: 5, maxCombo: 0, isWinner: false, currentStreak: 0,
    });
    expect(breakdown.base).toBe(35); // 3*10 + 5
  });

  it('partie parfaite (5/5) : +100 XP', () => {
    const { breakdown } = calculateMatchXp({
      correct: 5, total: 5, maxCombo: 0, isWinner: false, currentStreak: 0,
    });
    expect(breakdown.perfect).toBe(100);
  });

  it('4/4 ne donne pas le bonus parfait (total < 5)', () => {
    const { breakdown } = calculateMatchXp({
      correct: 4, total: 4, maxCombo: 0, isWinner: false, currentStreak: 0,
    });
    expect(breakdown.perfect).toBe(0);
  });

  it('victoire : +50 XP', () => {
    const { breakdown } = calculateMatchXp({
      correct: 0, total: 5, maxCombo: 0, isWinner: true, currentStreak: 0,
    });
    expect(breakdown.win).toBe(50);
  });

  it('streak >= 3 : +25 XP', () => {
    const { breakdown } = calculateMatchXp({
      correct: 0, total: 5, maxCombo: 0, isWinner: false, currentStreak: 3,
    });
    expect(breakdown.streak).toBe(25);
  });

  it('combo tier 2 (>= 3) : +5 XP', () => {
    const { breakdown } = calculateMatchXp({
      correct: 0, total: 5, maxCombo: 3, isWinner: false, currentStreak: 0,
    });
    expect(breakdown.combo).toBe(5);
  });

  it('combo tier 3 (>= 5) : +10 XP', () => {
    const { breakdown } = calculateMatchXp({
      correct: 0, total: 5, maxCombo: 5, isWinner: false, currentStreak: 0,
    });
    expect(breakdown.combo).toBe(10);
  });

  it('combo tier 4 (>= 8) : +20 XP', () => {
    const { breakdown } = calculateMatchXp({
      correct: 0, total: 5, maxCombo: 8, isWinner: false, currentStreak: 0,
    });
    expect(breakdown.combo).toBe(20);
  });

  it('tous les bonus cumulés', () => {
    const { total } = calculateMatchXp({
      correct: 5, total: 5, maxCombo: 8, isWinner: true, currentStreak: 3,
    });
    // base=55, perfect=100, win=50, streak=25, combo=20
    expect(total).toBe(250);
  });
});

describe('ComboTracker', () => {
  let tracker: ComboTracker;

  beforeEach(() => {
    tracker = new ComboTracker();
  });

  it('état initial : combo 0', () => {
    expect(tracker.getMax()).toBe(0);
  });

  it('onCorrect incrémente le combo', () => {
    const r = tracker.onCorrect();
    expect(r.combo).toBe(1);
  });

  it('multiplicateur augmente au palier 3', () => {
    tracker.onCorrect();
    tracker.onCorrect();
    const r = tracker.onCorrect();
    expect(r.combo).toBe(3);
    expect(r.multiplier).toBe(1.5);
    expect(r.xpBonus).toBe(5);
  });

  it('multiplicateur augmente au palier 5', () => {
    for (let i = 0; i < 4; i++) tracker.onCorrect();
    const r = tracker.onCorrect();
    expect(r.multiplier).toBe(2.0);
    expect(r.xpBonus).toBe(10);
  });

  it('multiplicateur max au palier 8', () => {
    for (let i = 0; i < 7; i++) tracker.onCorrect();
    const r = tracker.onCorrect();
    expect(r.multiplier).toBe(2.5);
    expect(r.xpBonus).toBe(20);
  });

  it('onWrong remet le combo à 0', () => {
    tracker.onCorrect();
    tracker.onCorrect();
    tracker.onWrong();
    const r = tracker.onCorrect();
    expect(r.combo).toBe(1);
  });

  it('getMax conserve le meilleur combo historique', () => {
    tracker.onCorrect();
    tracker.onCorrect();
    tracker.onCorrect(); // max = 3
    tracker.onWrong();
    tracker.onCorrect(); // combo = 1
    expect(tracker.getMax()).toBe(3);
  });

  it('reset remet tout à zéro', () => {
    tracker.onCorrect();
    tracker.onCorrect();
    tracker.reset();
    expect(tracker.getMax()).toBe(0);
    expect(tracker.onCorrect().combo).toBe(1);
  });
});
