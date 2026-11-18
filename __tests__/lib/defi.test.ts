import { calcPoints, checkAnswer } from '../../lib/defi';

jest.mock('../../lib/supabase', () => ({ supabase: {} }));

describe('calcPoints', () => {
  it('score de base sans bonus (réponse instantanée, combo 1, facile)', () => {
    // speedBonus=100, comboMult=1.0, diffMult=1.0 → (100+100)*1*1 = 200
    expect(calcPoints(100, 100, 1, 1)).toBe(200);
  });

  it('score minimum (temps écoulé, combo 1, facile)', () => {
    // speedBonus=0 → (100+0)*1*1 = 100
    expect(calcPoints(0, 100, 1, 1)).toBe(100);
  });

  it('combo 2 + difficulté moyenne', () => {
    // speedBonus=50, comboMult=1.2, diffMult=1.5 → 150*1.2*1.5 = 270
    expect(calcPoints(50, 100, 2, 2)).toBe(270);
  });

  it('combo 3 + difficulté difficile', () => {
    // speedBonus=100, comboMult=1.5, diffMult=2.0 → 200*1.5*2.0 = 600
    expect(calcPoints(100, 100, 3, 3)).toBe(600);
  });

  it('combo >= 4 déclenche le multiplicateur maximum (2.0)', () => {
    // combo 4 → comboMult=2.0
    expect(calcPoints(100, 100, 4, 1)).toBe(400);
    // combo 10 → toujours 2.0
    expect(calcPoints(100, 100, 10, 1)).toBe(400);
  });

  it('combo >= 4 + difficulté difficile = score max', () => {
    // speedBonus=100, comboMult=2.0, diffMult=2.0 → 200*2.0*2.0 = 800
    expect(calcPoints(100, 100, 5, 3)).toBe(800);
  });
});

describe('checkAnswer', () => {
  describe('correspondance exacte', () => {
    it('identique', () => {
      expect(checkAnswer('Dragon Ball', 'Dragon Ball')).toBe(true);
    });

    it('casse différente', () => {
      expect(checkAnswer('dragon ball', 'Dragon Ball')).toBe(true);
    });

    it('accents ignorés', () => {
      expect(checkAnswer('naruto', 'Nàrûtô')).toBe(true);
    });

    it('espaces superflus ignorés', () => {
      expect(checkAnswer('dragon  ball', 'Dragon Ball')).toBe(true);
    });
  });

  describe('tolérance Levenshtein', () => {
    it('mot court (≤4 chars) : aucune faute tolérée', () => {
      expect(checkAnswer('dbz', 'dbz')).toBe(true);
      expect(checkAnswer('dbx', 'dbz')).toBe(false);
    });

    it('mot moyen (5-8 chars) : 1 faute tolérée', () => {
      expect(checkAnswer('narto', 'naruto')).toBe(true);
    });

    it('mot long (>8 chars) : 2 fautes tolérées', () => {
      expect(checkAnswer('one pece', 'one piece')).toBe(true);
    });

    it('trop de fautes : rejeté', () => {
      expect(checkAnswer('pkemon galatica', 'naruto shippuden')).toBe(false);
    });
  });

  describe('correspondance par sous-chaîne', () => {
    it('"dragon ball" accepté pour "dragon ball z"', () => {
      expect(checkAnswer('dragon ball', 'Dragon Ball Z')).toBe(true);
    });

    it('sous-chaîne trop courte (<4 chars) : non acceptée', () => {
      expect(checkAnswer('the', 'The Legend of Zelda')).toBe(false);
    });
  });

  describe('correspondance par mot-clé', () => {
    it('un mot du titre suffit', () => {
      expect(checkAnswer('shippuden', 'Naruto Shippuden')).toBe(true);
    });

    it('mot-clé long avec 1 faute', () => {
      expect(checkAnswer('shippudin', 'Naruto Shippuden')).toBe(true);
    });

    it('mot-clé trop court (<4 chars) : ignoré', () => {
      expect(checkAnswer('the', 'The Legend of Zelda')).toBe(false);
    });
  });

  describe('cas de rejet', () => {
    it('réponse complètement fausse', () => {
      expect(checkAnswer('pokemon', 'digimon')).toBe(false);
    });

    it('chaîne vide', () => {
      expect(checkAnswer('', 'Dragon Ball')).toBe(false);
    });
  });
});
