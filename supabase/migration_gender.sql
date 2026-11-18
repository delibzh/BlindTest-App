-- ============================================================
-- Migration : genre utilisateur + titre féminin des achievements
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Colonne genre dans profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'masc'
  CHECK (gender IN ('masc', 'fem', 'non_precise'));

-- 2. Colonne titre féminin dans achievements + contrainte pour ON CONFLICT (key)
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS title_fem text;

ALTER TABLE public.achievements
  DROP CONSTRAINT IF EXISTS achievements_key_unique;
ALTER TABLE public.achievements
  ADD CONSTRAINT achievements_key_unique UNIQUE (key);

-- ============================================================
-- 3. Mise à jour des 15 achievements existants
--    Remplace les valeurs si tes clés sont différentes.
-- ============================================================

-- Parties jouées
UPDATE public.achievements SET title_fem = 'Première Partie'       WHERE key = 'first_game';
UPDATE public.achievements SET title_fem = 'Joueuse Assidue'        WHERE key = 'games_5';
UPDATE public.achievements SET title_fem = 'Habituée'               WHERE key = 'games_10';
UPDATE public.achievements SET title_fem = 'Vétérane'               WHERE key = 'games_25';
UPDATE public.achievements SET title_fem = 'Légende Vivante'        WHERE key = 'games_50';

-- Victoires
UPDATE public.achievements SET title_fem = 'Première Victoire'      WHERE key = 'first_win';
UPDATE public.achievements SET title_fem = 'Gagnante'               WHERE key = 'wins_5';
UPDATE public.achievements SET title_fem = 'Inarrêtable'            WHERE key = 'wins_10';

-- Combos
UPDATE public.achievements SET title_fem = 'En Série'               WHERE key = 'combo_3';
UPDATE public.achievements SET title_fem = 'Enchaîneuse'            WHERE key = 'combo_5';
UPDATE public.achievements SET title_fem = 'Intouchable'            WHERE key = 'combo_10';

-- Précision / Perfection
UPDATE public.achievements SET title_fem = 'Parfaite'               WHERE key = 'perfect_game';
UPDATE public.achievements SET title_fem = 'Pointue'                WHERE key = 'accuracy_streak_3';
UPDATE public.achievements SET title_fem = 'Chirurgicale'           WHERE key = 'accuracy_streak_5';

-- Classement
UPDATE public.achievements SET title_fem = 'Numéro 1'               WHERE key = 'top_ranking_1';

-- ⚠️  Si tes clés (key) sont différentes, adapte les WHERE ci-dessus.
--    Tu peux les retrouver avec : SELECT key, title FROM public.achievements;
