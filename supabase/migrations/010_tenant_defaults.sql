-- Migration 010: Tenant-scoped defaults
--
-- A small, future-proof table for remembering "defaults" the goldsmith has
-- marked for her shop. Today the only kind is 'material' — materials that
-- pre-fill the BOM on brand-new items. Tomorrow we might add 'status' or
-- 'category'. The `kind` column keeps all such defaults in one place.
--
-- A row says: "for this tenant, for this kind of default, this value."
-- Multiple rows per (tenant_id, kind) are allowed (e.g. multiple default
-- materials) — but the same (tenant_id, kind, value) can't appear twice.

create table if not exists tenant_defaults (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants on delete cascade,
  kind       text not null check (kind in ('material')),
  value      uuid not null,
  created_at timestamptz default now(),
  unique (tenant_id, kind, value)
);

-- Fast look-up: "what defaults does this tenant have for this kind?"
create index if not exists tenant_defaults_lookup_idx
  on tenant_defaults (tenant_id, kind);

-- Row-Level Security: standard "member of the tenant" guard.
alter table tenant_defaults enable row level security;

create policy "tenant members only" on tenant_defaults
  using (is_member(tenant_id))
  with check (is_member(tenant_id));

-- When a material is deleted, remove any defaults pointing to it.
-- We can't use a foreign key because `value` is untyped — it may reference
-- different tables depending on `kind`. So a trigger does the cleanup
-- specifically for kind='material' deletions.
create or replace function clean_material_defaults_on_delete()
returns trigger language plpgsql as $$
begin
  delete from tenant_defaults
  where kind = 'material' and value = old.id;
  return old;
end;
$$;

drop trigger if exists materials_clean_defaults on materials;
create trigger materials_clean_defaults
  before delete on materials
  for each row execute function clean_material_defaults_on_delete();
