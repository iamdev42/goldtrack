-- Migration 006: structured customer address fields
--
-- Until now, `customers.name` was a single text field and there was nowhere
-- clean to store the address parts. This migration introduces:
--   - first_name / last_name        — split for sorting and search
--   - company                       — for clients invoicing as a business
--   - street                        — line 1 of the postal address
--   - postcode / city / country     — split so we can filter and integrate
--   - legacy_id                     — original ID from the imported system, for traceability
--
-- All new columns are nullable. The existing `name` field stays as a
-- denormalised "display name" so nothing in the app breaks during the rollout.
--
-- Existing rows get their `first_name` and `last_name` populated by best-effort
-- splitting of the existing `name` value (one-off, not a constraint).

alter table customers
  add column if not exists first_name text,
  add column if not exists last_name  text,
  add column if not exists company    text,
  add column if not exists street     text,
  add column if not exists postcode   text,
  add column if not exists city       text,
  add column if not exists country    text,
  add column if not exists legacy_id  integer;

-- Backfill first_name / last_name for any existing rows.
-- Strategy: split on the LAST whitespace — "Sophie Anne Hartmann" → "Sophie Anne" / "Hartmann".
update customers
set
  first_name = case
    when name like '% %' then trim(substring(name from 1 for length(name) - position(' ' in reverse(name))))
    else null
  end,
  last_name = case
    when name like '% %' then trim(substring(name from length(name) - position(' ' in reverse(name)) + 2))
    else trim(name)
  end
where first_name is null and last_name is null and name is not null;

-- Make legacy_id unique per tenant so a re-run of the migration script can't
-- create duplicates. Partial unique index — null legacy_ids are allowed
-- (manually-added customers have no legacy ID).
create unique index if not exists customers_tenant_legacy_id_unique
  on customers (tenant_id, legacy_id)
  where legacy_id is not null;

-- Helpful indexes for the new common query patterns.
create index if not exists customers_tenant_last_name_idx on customers (tenant_id, last_name);
create index if not exists customers_tenant_city_idx      on customers (tenant_id, city);
create index if not exists customers_tenant_postcode_idx  on customers (tenant_id, postcode);
