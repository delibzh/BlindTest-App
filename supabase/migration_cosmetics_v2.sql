-- ============================================================
-- MIGRATION v2 — Nettoyage schéma cosmétiques
-- À exécuter après migration_cosmetics.sql
-- ============================================================

-- 1. Renommer les colonnes
alter table public.cosmetics rename column xp_required  to required_xp;
alter table public.cosmetics rename column is_premium   to premium_only;

-- 2. Ajouter achievement_id
alter table public.cosmetics
  add column if not exists achievement_id text;

-- 3. Mettre à jour la contrainte source (drop + recreate)
alter table public.cosmetics
  drop constraint if exists cosmetics_source_check;

alter table public.cosmetics
  add constraint cosmetics_source_check
  check (source in ('free', 'xp', 'achievement', 'premium', 'event'));

-- 4. Migrer les anciennes valeurs source
update public.cosmetics set source = 'event'       where source = 'seasonal';
update public.cosmetics set source = 'achievement' where source = 'streak';

-- 5. Mettre à jour le seed (items mal classifiés)
update public.cosmetics set source = 'free'    where id in ('frame_default', 'badge_none', 'title_none', 'title_blindeur', 'badge_fire');
update public.cosmetics set source = 'premium' where premium_only = true;
