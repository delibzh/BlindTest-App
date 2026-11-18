-- ============================================================
-- Achievements de complétion des Défis (6 catégories × 3 niveaux)
-- condition_type = 'defi_complete'
-- condition_value = difficulté (1=Facile, 2=Moyen, 3=Difficile)
-- condition_category = catégorie du défi
-- ============================================================

INSERT INTO public.achievements
  (key, title, title_fem, description, emoji, xp_reward, condition_type, condition_value, condition_category, is_hidden)
VALUES

-- ANIME
('defi_anime_facile',    'Otaku Débutant',   'Otaku Débutante',   'Termine le Défi Anime Facile à 100%.',    '🌸', 50,  'defi_complete', 1, 'anime',     false),
('defi_anime_moyen',     'Otaku Confirmé',   'Otaku Confirmée',   'Termine le Défi Anime Moyen à 100%.',     '⛩️', 100, 'defi_complete', 2, 'anime',     false),
('defi_anime_difficile', 'Otaku Légendaire', 'Otaku Légendaire',  'Termine le Défi Anime Difficile à 100%.', '🐉', 200, 'defi_complete', 3, 'anime',     false),

-- GAMES
('defi_games_facile',    'Player 1',         'Player 1',          'Termine le Défi Jeux Facile à 100%.',     '🕹️', 50,  'defi_complete', 1, 'games',     false),
('defi_games_moyen',     'Gamer',            'Gameuse',           'Termine le Défi Jeux Moyen à 100%.',      '🎮', 100, 'defi_complete', 2, 'games',     false),
('defi_games_difficile', 'No-Life',          'No-Life',           'Termine le Défi Jeux Difficile à 100%.',  '💀', 200, 'defi_complete', 3, 'games',     false),

-- SERIES
('defi_series_facile',    'Binge Watcher',   'Binge Watcheuse',   'Termine le Défi Séries Facile à 100%.',   '📺', 50,  'defi_complete', 1, 'series',    false),
('defi_series_moyen',     'Serial Watcher',  'Serial Watcheuse',  'Termine le Défi Séries Moyen à 100%.',    '🍿', 100, 'defi_complete', 2, 'series',    false),
('defi_series_difficile', 'Critique TV',     'Critique TV',       'Termine le Défi Séries Difficile à 100%.','🎬', 200, 'defi_complete', 3, 'series',    false),

-- MOVIES
('defi_movies_facile',    'Cinéphile Junior','Cinéphile Junior',   'Termine le Défi Films Facile à 100%.',    '🎞️', 50,  'defi_complete', 1, 'movies',    false),
('defi_movies_moyen',     'Cinéphile',       'Cinéphile',         'Termine le Défi Films Moyen à 100%.',     '🎥', 100, 'defi_complete', 2, 'movies',    false),
('defi_movies_difficile', 'Cinéaste',        'Cinéaste',          'Termine le Défi Films Difficile à 100%.', '🏆', 200, 'defi_complete', 3, 'movies',    false),

-- ANIMATION
('defi_animation_facile',    'Fan de Dessins',  'Fan de Dessins',  'Termine le Défi Animation Facile à 100%.',   '✏️', 50,  'defi_complete', 1, 'animation', false),
('defi_animation_moyen',     'Maître Animé',    'Maîtresse Animée','Termine le Défi Animation Moyen à 100%.',    '🎨', 100, 'defi_complete', 2, 'animation', false),
('defi_animation_difficile', 'Légende Animée',  'Légende Animée',  'Termine le Défi Animation Difficile à 100%.','⭐', 200, 'defi_complete', 3, 'animation', false),

-- PUBS
('defi_pubs_facile',    'Téléspectateur',   'Téléspectatrice',   'Termine le Défi Pubs Facile à 100%.',     '📡', 50,  'defi_complete', 1, 'pubs',      false),
('defi_pubs_moyen',     'Accro aux Pubs',   'Accro aux Pubs',    'Termine le Défi Pubs Moyen à 100%.',      '📢', 100, 'defi_complete', 2, 'pubs',      false),
('defi_pubs_difficile', 'Expert Réclame',   'Experte Réclame',   'Termine le Défi Pubs Difficile à 100%.', '🔔', 200, 'defi_complete', 3, 'pubs',      false)

ON CONFLICT (key) DO UPDATE
  SET title_fem = EXCLUDED.title_fem;
