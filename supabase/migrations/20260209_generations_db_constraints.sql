-- Phase 6: DB-level constraints for generation integrity.
-- This migration performs:
-- 1) in-place backfill for clearly invalid rows
-- 2) conservative check constraints
-- 3) validation of all constraints

do $$
declare
  invalid_attempt_count bigint;
  invalid_prefs_shape_count bigint;
  invalid_composition_shape_count bigint;
begin
  select count(*)
  into invalid_attempt_count
  from public.generations
  where attempt_index is null or attempt_index < 1;

  select count(*)
  into invalid_prefs_shape_count
  from public.generations
  where jsonb_typeof(prefs) is distinct from 'object';

  select count(*)
  into invalid_composition_shape_count
  from public.generations
  where jsonb_typeof(composition) is distinct from 'object';

  raise notice 'Preflight audit: invalid attempt_index rows=%', invalid_attempt_count;
  raise notice 'Preflight audit: invalid prefs shape rows=%', invalid_prefs_shape_count;
  raise notice 'Preflight audit: invalid composition shape rows=%', invalid_composition_shape_count;
end $$;

-- Backfill rows that clearly violate intended invariants.
update public.generations
set attempt_index = 1
where attempt_index is null or attempt_index < 1;

update public.generations
set prefs = '{}'::jsonb
where jsonb_typeof(prefs) is distinct from 'object';

update public.generations
set composition = jsonb_build_object(
  'title', coalesce(nullif(title, ''), 'Untitled'),
  'tempo', 120,
  'timeSignature', jsonb_build_array(4, 4),
  'key', 'C Major',
  'tracks', jsonb_build_array()
)
where jsonb_typeof(composition) is distinct from 'object';

-- Ensure required keys exist before enabling structural checks.
update public.generations
set composition = jsonb_build_object(
  'title', coalesce(nullif(title, ''), 'Untitled'),
  'tempo', 120,
  'timeSignature', jsonb_build_array(4, 4),
  'key', 'C Major',
  'tracks', jsonb_build_array()
) || composition
where jsonb_typeof(composition) = 'object'
  and (
    not (composition ? 'title')
    or not (composition ? 'tempo')
    or not (composition ? 'timeSignature')
    or not (composition ? 'key')
    or not (composition ? 'tracks')
  );

alter table public.generations
  drop constraint if exists generations_attempt_index_positive;
alter table public.generations
  add constraint generations_attempt_index_positive
  check (attempt_index > 0)
  not valid;

alter table public.generations
  drop constraint if exists generations_prefs_is_object;
alter table public.generations
  add constraint generations_prefs_is_object
  check (jsonb_typeof(prefs) = 'object')
  not valid;

alter table public.generations
  drop constraint if exists generations_composition_is_object;
alter table public.generations
  add constraint generations_composition_is_object
  check (jsonb_typeof(composition) = 'object')
  not valid;

alter table public.generations
  drop constraint if exists generations_composition_required_keys;
alter table public.generations
  add constraint generations_composition_required_keys
  check (
    composition ? 'title'
    and composition ? 'tempo'
    and composition ? 'timeSignature'
    and composition ? 'key'
    and composition ? 'tracks'
    and jsonb_typeof(composition->'title') = 'string'
    and jsonb_typeof(composition->'tempo') = 'number'
    and jsonb_typeof(composition->'timeSignature') = 'array'
    and jsonb_typeof(composition->'key') = 'string'
    and jsonb_typeof(composition->'tracks') = 'array'
  )
  not valid;

alter table public.generations validate constraint generations_attempt_index_positive;
alter table public.generations validate constraint generations_prefs_is_object;
alter table public.generations validate constraint generations_composition_is_object;
alter table public.generations validate constraint generations_composition_required_keys;
