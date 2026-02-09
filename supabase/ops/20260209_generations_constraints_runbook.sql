-- Phase 6 runbook: audit + rollback helpers for generations constraints.
-- This file is NOT a migration. Run manually as needed.

-- ===== Preflight audit =====
select count(*) as invalid_attempt_index_rows
from public.generations
where attempt_index is null or attempt_index < 1;

select count(*) as invalid_prefs_shape_rows
from public.generations
where jsonb_typeof(prefs) is distinct from 'object';

select count(*) as invalid_composition_shape_rows
from public.generations
where jsonb_typeof(composition) is distinct from 'object';

select count(*) as missing_required_composition_keys_rows
from public.generations
where jsonb_typeof(composition) = 'object'
  and (
    not (composition ? 'title')
    or not (composition ? 'tempo')
    or not (composition ? 'timeSignature')
    or not (composition ? 'key')
    or not (composition ? 'tracks')
  );

-- ===== Post-migration verification =====
select conname, convalidated
from pg_constraint
where conrelid = 'public.generations'::regclass
  and conname in (
    'generations_attempt_index_positive',
    'generations_prefs_is_object',
    'generations_composition_is_object',
    'generations_composition_required_keys'
  )
order by conname;

-- ===== Rollback plan (manual) =====
-- Run only if you intentionally need to remove these constraints.
-- alter table public.generations drop constraint if exists generations_composition_required_keys;
-- alter table public.generations drop constraint if exists generations_composition_is_object;
-- alter table public.generations drop constraint if exists generations_prefs_is_object;
-- alter table public.generations drop constraint if exists generations_attempt_index_positive;
