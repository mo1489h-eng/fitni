-- If an older exercisedb_cache (external_id / name_en / jsonb) exists, replace with current schema.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'exercisedb_cache' and column_name = 'external_id'
  ) then
    drop table public.exercisedb_cache cascade;
  end if;
end $$;

create extension if not exists pg_trgm;

create table if not exists public.exercisedb_cache (
  id text primary key,
  name text,
  body_part text,
  equipment text,
  gif_url text,
  target text,
  secondary_muscles text[],
  instructions text[],
  created_at timestamptz default now()
);

create index if not exists exercisedb_cache_body_part_idx on public.exercisedb_cache (body_part);
create index if not exists exercisedb_cache_equipment_lower_idx on public.exercisedb_cache (lower(equipment));
create index if not exists exercisedb_cache_name_trgm on public.exercisedb_cache using gin (name gin_trgm_ops);

comment on table public.exercisedb_cache is 'RapidAPI ExerciseDB cache; filled by exercise-library-sync edge function';

alter table public.exercisedb_cache enable row level security;

drop policy if exists "exercisedb_cache_select_authenticated" on public.exercisedb_cache;
create policy "exercisedb_cache_select_authenticated"
  on public.exercisedb_cache for select
  to authenticated
  using (true);
