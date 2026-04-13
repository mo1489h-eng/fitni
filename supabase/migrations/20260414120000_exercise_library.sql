-- RapidAPI ExerciseDB read-through cache (distinct from legacy public.exercise_library trainer table)
create extension if not exists pg_trgm;

create table if not exists public.exercisedb_cache (
  external_id text primary key,
  name_en text not null,
  name_ar text not null default '',
  body_part text not null,
  target text,
  equipment text,
  secondary_muscles jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now()
);

create index if not exists exercisedb_cache_body_part_idx on public.exercisedb_cache (body_part);
create index if not exists exercisedb_cache_equipment_lower_idx on public.exercisedb_cache (lower(equipment));
create index if not exists exercisedb_cache_name_en_trgm on public.exercisedb_cache using gin (name_en gin_trgm_ops);
create index if not exists exercisedb_cache_name_ar_trgm on public.exercisedb_cache using gin (name_ar gin_trgm_ops);

comment on table public.exercisedb_cache is 'RapidAPI ExerciseDB cache; filled by exercise-library-sync edge function';

alter table public.exercisedb_cache enable row level security;

drop policy if exists "exercisedb_cache_select_authenticated" on public.exercisedb_cache;
create policy "exercisedb_cache_select_authenticated"
  on public.exercisedb_cache for select
  to authenticated
  using (true);
