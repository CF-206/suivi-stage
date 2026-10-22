-- =============================================================================
-- Suivi Stage — schéma Supabase
-- =============================================================================
-- À exécuter dans le SQL Editor de ton projet Supabase
-- (Dashboard > SQL Editor > New query > Run).
--
-- Ce script est idempotent : tu peux le relancer sans rien casser.
-- -----------------------------------------------------------------------------

-- 1. Table des candidatures ---------------------------------------------------
-- Une seule table pour les deux types de candidature ; la colonne `origine`
-- distingue les réponses à une offre ('offre') des candidatures spontanées
-- ('spontanee'). La fiche complète est stockée en JSONB (`data`) : le schéma
-- reste stable même si l'app évolue, et quelques colonnes sont dupliquées
-- (entreprise, poste, statut) pour pouvoir trier/filtrer côté SQL.
create table if not exists public.candidatures (
  id             text primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  origine        text not null default 'offre'
                   check (origine in ('offre', 'spontanee')),
  data           jsonb not null default '{}'::jsonb,
  entreprise_nom text,
  poste          text,
  statut         text not null default 'nouveau'
                   check (statut in ('nouveau', 'postule', 'refuse', 'archive')),
  date_ajout     timestamptz,
  updated_at     timestamptz not null default now()
);

-- 1b. Ajout de la colonne `origine` sur une table déjà créée ----------------
alter table public.candidatures
  add column if not exists origine text not null default 'offre';

-- 2. Table des profils (un par utilisateur) -----------------------------------
create table if not exists public.profils (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 3. Index utiles -------------------------------------------------------------
create index if not exists candidatures_user_id_idx
  on public.candidatures (user_id);

create index if not exists candidatures_statut_idx
  on public.candidatures (user_id, statut);

create index if not exists candidatures_origine_idx
  on public.candidatures (user_id, origine);

-- 4. Mise à jour automatique de updated_at ------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists candidatures_touch_updated_at on public.candidatures;
create trigger candidatures_touch_updated_at
  before update on public.candidatures
  for each row execute function public.touch_updated_at();

drop trigger if exists profils_touch_updated_at on public.profils;
create trigger profils_touch_updated_at
  before update on public.profils
  for each row execute function public.touch_updated_at();

-- 5. Row Level Security : chaque utilisateur ne voit que ses données ---------
alter table public.candidatures enable row level security;
alter table public.profils enable row level security;

drop policy if exists "candidatures: lecture" on public.candidatures;
create policy "candidatures: lecture"
  on public.candidatures for select
  using (auth.uid() = user_id);

drop policy if exists "candidatures: insertion" on public.candidatures;
create policy "candidatures: insertion"
  on public.candidatures for insert
  with check (auth.uid() = user_id);

drop policy if exists "candidatures: modification" on public.candidatures;
create policy "candidatures: modification"
  on public.candidatures for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "candidatures: suppression" on public.candidatures;
create policy "candidatures: suppression"
  on public.candidatures for delete
  using (auth.uid() = user_id);

drop policy if exists "profils: lecture" on public.profils;
create policy "profils: lecture"
  on public.profils for select
  using (auth.uid() = user_id);

drop policy if exists "profils: insertion" on public.profils;
create policy "profils: insertion"
  on public.profils for insert
  with check (auth.uid() = user_id);

drop policy if exists "profils: modification" on public.profils;
create policy "profils: modification"
  on public.profils for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "profils: suppression" on public.profils;
create policy "profils: suppression"
  on public.profils for delete
  using (auth.uid() = user_id);

-- 6. Temps réel (optionnel) : l'app se rafraîchit sur les changements ---------
do $$
begin
  begin
    alter publication supabase_realtime add table public.candidatures;
  exception
    when duplicate_object then null;
  end;
end;
$$;
