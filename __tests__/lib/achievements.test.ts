import { achievementTitle, Achievement } from '../../lib/achievements';

jest.mock('../../lib/supabase', () => ({ supabase: {} }));

const base: Achievement = {
  id: 'ach-1',
  key: 'first_win',
  title: 'Vainqueur',
  titleFem: 'Vainqueure',
  description: 'Gagner une première partie',
  emoji: '🏆',
  xpReward: 50,
};

describe('achievementTitle', () => {
  it('genre féminin avec titleFem → retourne titleFem', () => {
    expect(achievementTitle(base, 'fem')).toBe('Vainqueure');
  });

  it('genre masculin → retourne title', () => {
    expect(achievementTitle(base, 'masc')).toBe('Vainqueur');
  });

  it('genre féminin sans titleFem → retourne title', () => {
    const noFem: Achievement = { ...base, titleFem: null };
    expect(achievementTitle(noFem, 'fem')).toBe('Vainqueur');
  });

  it('genre inconnu → retourne title', () => {
    expect(achievementTitle(base, 'other')).toBe('Vainqueur');
  });
});
