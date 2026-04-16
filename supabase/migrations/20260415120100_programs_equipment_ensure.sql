-- Ensure programs.equipment exists (idempotent). Mirrors 20260414000000_programs_equipment.sql
-- for environments where that migration was not applied.
alter table public.programs add column if not exists equipment text;

comment on column public.programs.equipment is 'Trainer-facing label e.g. home gym, full gym';
