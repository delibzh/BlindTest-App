-- Fonction 1 : Upsert atomique de la progression défi
-- Remplace le read-then-write non atomique de lib/defi.ts:saveDefiProgress
CREATE OR REPLACE FUNCTION upsert_defi_progress(
  p_user_id   uuid,
  p_category  text,
  p_difficulty int,
  p_score     int
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  INSERT INTO defi_progress (user_id, category, difficulty, best_score, completed, attempts, updated_at)
  VALUES (
    p_user_id,
    p_category,
    p_difficulty,
    p_score,
    p_score = 20,
    1,
    now()
  )
  ON CONFLICT (user_id, category, difficulty) DO UPDATE SET
    best_score = GREATEST(defi_progress.best_score, EXCLUDED.best_score),
    completed  = defi_progress.completed OR (EXCLUDED.best_score = 20),
    attempts   = defi_progress.attempts + 1,
    updated_at = now();
END;
$$;


-- Fonction 2 : Enregistrement atomique d'un joueur de match + mise à jour profil
-- Remplace les 3 opérations séquentielles non atomiques de lib/matches.ts:saveMatchPlayer
CREATE OR REPLACE FUNCTION save_match_player(
  p_match_id    uuid,
  p_user_id     uuid,
  p_display_name text,
  p_score       int,
  p_correct     int,
  p_wrong       int,
  p_max_combo   int,
  p_rank        int,
  p_xp_earned   int,
  p_is_winner   boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_xp    int;
  v_new_level int;
BEGIN
  INSERT INTO match_players (
    match_id, user_id, display_name, score,
    correct_answers, wrong_answers, max_combo, rank, xp_earned
  ) VALUES (
    p_match_id, p_user_id, p_display_name, p_score,
    p_correct, p_wrong, p_max_combo, p_rank, p_xp_earned
  );

  IF p_user_id IS NOT NULL THEN
    SELECT COALESCE(total_xp, 0) + p_xp_earned
      INTO v_new_xp
      FROM profiles
     WHERE id = p_user_id;

    -- Inverse analytique de xpForLevel(n) = n*(75n-25)/2
    v_new_level := GREATEST(
      1,
      FLOOR((25.0 + SQRT(625.0 + 600.0 * v_new_xp)) / 150.0)::int
    );

    UPDATE profiles SET
      total_xp    = v_new_xp,
      xp          = v_new_xp,
      level       = v_new_level,
      games_played = COALESCE(games_played, 0) + 1,
      games_won   = COALESCE(games_won, 0) + CASE WHEN p_is_winner THEN 1 ELSE 0 END
    WHERE id = p_user_id;
  END IF;
END;
$$;
