-- ============================================================
-- MIGRATION — Système de cosmétiques & classement
-- ============================================================
-- À exécuter dans l'éditeur SQL Supabase (une seule fois)
-- ============================================================


-- ============================================================
-- 1. Supprimer l'ancienne table cosmetics (architecture v1)
-- ============================================================

drop policy if exists "Lecture de ses propres cosmétiques" on public.cosmetics;
drop policy if exists "Insertion de ses propres cosmétiques" on public.cosmetics;
drop policy if exists "Modification de ses propres cosmétiques" on public.cosmetics;
drop table if exists public.cosmetics;


-- ============================================================
-- 2. Nouvelles colonnes sur profiles
-- ============================================================

alter table public.profiles
  -- Stats classement
  add column if not exists xp               int not null default 0,
  add column if not exists level            int not null default 1,
  add column if not exists streak_current   int not null default 0,
  add column if not exists streak_best      int not null default 0,
  add column if not exists games_played     int not null default 0,
  add column if not exists games_perfect    int not null default 0,
  add column if not exists accuracy_correct int not null default 0,
  add column if not exists accuracy_total   int not null default 0,
  -- Cosmétiques équipés (dénormalisé pour les lectures rapides)
  add column if not exists equipped_frame_id  text,
  add column if not exists equipped_badge_id  text,
  add column if not exists equipped_title_id  text,
  -- Couleurs personnalisées (hex, ex: '#a855f7')
  add column if not exists border_color       text not null default '#a855f7',
  add column if not exists username_color     text not null default '#ffffff';


-- ============================================================
-- 3. Catalogue de cosmétiques
-- ============================================================

create table public.cosmetics (
  id          text primary key,        -- 'frame_gold', 'badge_crown', etc.
  type        text not null check (type in ('frame', 'badge', 'title', 'avatar_skin')),
  label       text not null,
  rarity      text not null default 'common'
              check (rarity in ('common', 'rare', 'epic', 'legendary')),
  source      text not null
              check (source in ('free', 'xp', 'streak', 'seasonal', 'premium')),
  xp_required int,                     -- si source = 'xp'
  season      text,                    -- si source = 'seasonal', ex: '2026-spring'
  is_premium  boolean not null default false,
  sort_order  int not null default 0
);

alter table public.cosmetics enable row level security;

create policy "Lecture publique du catalogue de cosmétiques"
  on public.cosmetics for select using (true);


-- ============================================================
-- 4. Jonction user_cosmetics
-- ============================================================

create table public.user_cosmetics (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id  text not null references public.cosmetics(id) on delete cascade,
  unlocked_at  timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

create index on public.user_cosmetics(user_id);

alter table public.user_cosmetics enable row level security;

create policy "Lecture de ses propres cosmétiques débloqués"
  on public.user_cosmetics for select using (auth.uid() = user_id);

create policy "Déblocage de ses propres cosmétiques"
  on public.user_cosmetics for insert with check (auth.uid() = user_id);

create policy "Suppression de ses propres cosmétiques"
  on public.user_cosmetics for delete using (auth.uid() = user_id);


-- ============================================================
-- 5. Seed — catalogue initial
-- ============================================================

insert into public.cosmetics
  (id, type, label, rarity, source, xp_required, is_premium, sort_order)
values
  -- ── Cadres ──────────────────────────────────────────────
  ('frame_default',      'frame', 'Aucun cadre',       'common',    'free',    null,   false,  0),
  ('frame_silver',       'frame', 'Argent',             'common',    'xp',      500,    false, 10),
  ('frame_gold',         'frame', 'Or',                 'rare',      'xp',      2000,   false, 20),
  ('frame_neon_blue',    'frame', 'Néon Bleu',          'epic',      'premium', null,   true,  30),
  ('frame_neon_purple',  'frame', 'Néon Violet',        'epic',      'premium', null,   true,  31),
  ('frame_legendary',    'frame', 'Légendaire',         'legendary', 'premium', null,   true,  40),

  -- ── Badges ──────────────────────────────────────────────
  ('badge_none',         'badge', 'Aucun badge',        'common',    'free',    null,   false,  0),
  ('badge_fire',         'badge', 'Feu',                'common',    'free',    null,   false, 10),
  ('badge_star',         'badge', 'Étoile',             'common',    'xp',      200,    false, 20),
  ('badge_crown',        'badge', 'Couronne',           'rare',      'premium', null,   true,  30),
  ('badge_diamond',      'badge', 'Diamant',            'epic',      'premium', null,   true,  40),

  -- ── Titres ──────────────────────────────────────────────
  ('title_none',         'title', '',                   'common',    'free',    null,   false,  0),
  ('title_blindeur',     'title', 'Blindeur',           'common',    'free',    null,   false, 10),
  ('title_melomane',     'title', 'Mélomane',           'common',    'xp',      300,    false, 20),
  ('title_maestro',      'title', 'Maestro',            'rare',      'xp',      1500,   false, 30),
  ('title_perfecteur',   'title', 'Perfecteur',         'epic',      'xp',      null,   false, 40),
  ('title_legende',      'title', 'Légende',            'legendary', 'xp',      10000,  false, 50),
  ('title_premium',      'title', 'Abonné Premium',     'rare',      'premium', null,   true,  60);


-- ============================================================
-- 6. Vue classement globale (remplace l'ancienne)
-- ============================================================

drop view if exists public.leaderboard;

create view public.leaderboard as
  select
    p.id              as user_id,
    p.username,
    p.avatar_url,
    p.border_color,
    p.username_color,
    p.equipped_frame_id,
    p.equipped_badge_id,
    p.equipped_title_id,
    p.xp,
    p.level,
    p.streak_best,
    p.games_played,
    p.games_perfect,
    p.accuracy_correct,
    p.accuracy_total,
    case
      when p.accuracy_total > 0
      then round((p.accuracy_correct::numeric / p.accuracy_total) * 100, 1)
      else 0
    end               as accuracy_pct,
    p.is_premium
  from public.profiles p
  where p.games_played > 0
  order by p.xp desc;
