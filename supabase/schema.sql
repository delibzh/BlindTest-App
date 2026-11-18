-- ============================================================
-- BLINDEST — Schéma complet Supabase
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PHASE 2.1 — Utilisateurs & Auth
-- ============================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  avatar_url  text,
  is_premium  boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.cosmetics (
  id       uuid primary key default uuid_generate_v4(),
  user_id  uuid not null references public.profiles(id) on delete cascade,
  type     text not null check (type in ('cadre', 'badge', 'skin')),
  item_id  text not null,
  equipped boolean not null default false,
  unique (user_id, item_id)
);

-- Auto-création du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- PHASE 2.2 — Contenu (sons & questions)
-- ============================================================

create table public.tracks (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  category    text not null check (category in ('anime', 'games', 'series', 'movies', 'animation', 'pubs')),
  year        int,
  r2_key      text not null unique,
  difficulty  int not null default 1 check (difficulty between 1 and 3),
  is_premium  boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.answers (
  id          uuid primary key default uuid_generate_v4(),
  track_id    uuid not null references public.tracks(id) on delete cascade,
  label       text not null,
  is_correct  boolean not null default false
);

create index on public.answers(track_id);

create table public.hints (
  id        uuid primary key default uuid_generate_v4(),
  track_id  uuid not null references public.tracks(id) on delete cascade,
  type      text not null check (type in ('text', 'image')),
  content   text not null
);

create index on public.hints(track_id);

-- ============================================================
-- PHASE 2.3 — Scores & Classement
-- ============================================================

create table public.scores (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  mode        text not null check (mode in ('solo', 'buzz', 'online')),
  categories  text[] not null,  -- tableau pour supporter le multi-catégories
  points      int not null default 0,
  track_count int not null default 0,
  created_at  timestamptz not null default now()
);

create index on public.scores(user_id);
create index on public.scores(mode, points desc);

create view public.leaderboard as
  select
    p.id as user_id,
    p.username,
    p.avatar_url,
    s.mode,
    max(s.points) as best_score
  from public.scores s
  join public.profiles p on p.id = s.user_id
  group by p.id, p.username, p.avatar_url, s.mode
  order by best_score desc;

create table public.sessions (
  id          uuid primary key default uuid_generate_v4(),
  host_id     uuid not null references public.profiles(id) on delete cascade,
  code        text unique not null,
  mode        text not null check (mode in ('buzz', 'online')),
  status      text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index on public.sessions(code);

create table public.session_players (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  guest_name  text,
  score       int not null default 0,
  constraint one_identity check (
    (user_id is not null and guest_name is null) or
    (user_id is null and guest_name is not null)
  ),
  unique (session_id, user_id),
  unique (session_id, guest_name)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.cosmetics       enable row level security;
alter table public.tracks          enable row level security;
alter table public.answers         enable row level security;
alter table public.hints           enable row level security;
alter table public.scores          enable row level security;
alter table public.sessions        enable row level security;
alter table public.session_players enable row level security;

-- profiles
create policy "Lecture publique des profils"
  on public.profiles for select using (true);

create policy "Modification de son propre profil"
  on public.profiles for update using (auth.uid() = id);

-- cosmetics
create policy "Lecture de ses propres cosmétiques"
  on public.cosmetics for select using (auth.uid() = user_id);

create policy "Insertion de ses propres cosmétiques"
  on public.cosmetics for insert with check (auth.uid() = user_id);

create policy "Modification de ses propres cosmétiques"
  on public.cosmetics for update using (auth.uid() = user_id);

-- tracks (lecture publique, écriture admin seulement)
create policy "Lecture publique des tracks"
  on public.tracks for select using (true);

-- answers & hints (lecture publique)
create policy "Lecture publique des réponses"
  on public.answers for select using (true);

create policy "Lecture publique des indices"
  on public.hints for select using (true);

-- scores
create policy "Lecture publique des scores"
  on public.scores for select using (true);

create policy "Insertion de son propre score"
  on public.scores for insert with check (auth.uid() = user_id);

-- sessions
create policy "Lecture publique des sessions"
  on public.sessions for select using (true);

create policy "Création de salon par premium uniquement"
  on public.sessions for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_premium = true
    )
  );

create policy "Modification de son propre salon"
  on public.sessions for update using (auth.uid() = host_id);

-- session_players
create policy "Lecture des joueurs d'une session"
  on public.session_players for select using (true);

create policy "Rejoindre une session"
  on public.session_players for insert with check (true);

create policy "Mise à jour de son propre score en session"
  on public.session_players for update using (auth.uid() = user_id);
