-- Optional program equipment context (home vs full gym, etc.)
alter table public.programs add column if not exists equipment text;

comment on column public.programs.equipment is 'Trainer-facing label e.g. home gym, full gym';
