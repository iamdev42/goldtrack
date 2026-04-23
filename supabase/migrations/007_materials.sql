-- Migration 007: materials (cost registry)
--
-- The goldsmith maintains a list of materials/costs used across items.
-- Each material has a free-text name (e.g. "Gold 18K", "Diamond", "Labour"),
-- a free-text unit ("gram", "piece", "hour"), and a cost per unit.
--
-- This is a lookup/registry table. Items will reference these in a later
-- migration when we add the BOM feature. Updating a material's cost here
-- will (by design) re-price any items that reference it.
--
-- RLS: same "tenant members only" pattern as customers and items.

create table if not exists materials (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants on delete cascade,
  name       text not null,
  unit       text,
  cost       numeric(12, 2) not null default 0 check (cost >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for the common "list all materials for a tenant, ordered by name" query.
create index if not exists materials_tenant_name_idx
  on materials (tenant_id, name);

-- Row-Level Security — one policy, covers select/insert/update/delete.
alter table materials enable row level security;

create policy "tenant members only" on materials
  using (is_member(tenant_id))
  with check (is_member(tenant_id));

-- Keep updated_at fresh automatically.
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists materials_touch_updated_at on materials;
create trigger materials_touch_updated_at
  before update on materials
  for each row execute function touch_updated_at();
