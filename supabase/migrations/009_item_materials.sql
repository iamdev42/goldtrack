-- Migration 009: Bill of Materials (BOM)
--
-- Replaces the single `items.material_id` / `items.material` fields with a
-- proper many-to-many via a new `item_materials` table. Each row is one line
-- of an item's BOM: "4.8 grams of Gold 18K", "1 piece of Diamond", etc.
--
-- This migration does four things, in order:
--   1. Creates the `item_materials` table with RLS
--   2. Migrates existing items.material_id into single-line BOM entries
--   3. Drops the legacy `items.material_id` and `items.material` columns
--   4. Creates an RPC `save_item_bom` for atomic BOM updates

-- ── Step 1: new table ────────────────────────────────────────────────

create table if not exists item_materials (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items on delete cascade,
  material_id uuid not null references materials on delete restrict,
  quantity    numeric(12, 3) not null check (quantity > 0),
  created_at  timestamptz default now()
);

-- Fast look-ups: "show me the BOM for item X" is by far the most common query
create index if not exists item_materials_item_idx on item_materials (item_id);

-- Reverse look-up: "which items use this material?"
create index if not exists item_materials_material_idx on item_materials (material_id);

-- Row-Level Security: derive tenancy from the parent item.
-- Users can see/edit a BOM line iff they can see/edit the parent item.
alter table item_materials enable row level security;

create policy "tenant members via parent item" on item_materials
  using (
    exists (
      select 1 from items
      where items.id = item_materials.item_id
        and is_member(items.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from items
      where items.id = item_materials.item_id
        and is_member(items.tenant_id)
    )
  );

-- ── Step 2: migrate existing data ────────────────────────────────────

-- For every item that has a material_id set, create one BOM line.
-- Quantity defaults to weight_g when available (makes sense for metals priced
-- per gram), otherwise 1 (sensible for "piece" and "hour" materials).
insert into item_materials (item_id, material_id, quantity)
select
  i.id,
  i.material_id,
  coalesce(i.weight_g, 1)
from items i
where i.material_id is not null
  and not exists (
    -- Safety: don't double-insert if this migration was somehow re-run
    select 1 from item_materials im
    where im.item_id = i.id and im.material_id = i.material_id
  );

-- ── Step 3: drop legacy columns ──────────────────────────────────────

alter table items drop column if exists material_id;
alter table items drop column if exists material;

-- Drop the old index too (it referenced the dropped column)
drop index if exists items_tenant_material_idx;

-- ── Step 4: atomic save RPC ──────────────────────────────────────────
--
-- Usage from the client:
--   supabase.rpc('save_item_bom', {
--     p_item_id: 'uuid',
--     p_lines: [{ material_id: 'uuid', quantity: 4.8 }, ...]
--   })
--
-- Semantics: delete every BOM line belonging to the item, then insert the
-- lines passed in. All inside one SQL function = one implicit transaction.
-- Either all lines land or none do — no half-saved BOM.
--
-- Security: the function is `security invoker` (default), so it runs with
-- the caller's permissions. The item_materials RLS policy above enforces
-- that the caller must be a tenant member of the parent item. Anyone
-- outside the tenant gets zero rows affected and silently succeeds, which
-- is the standard RLS-friendly behaviour.

create or replace function save_item_bom(
  p_item_id uuid,
  p_lines jsonb
)
returns void
language plpgsql
as $$
begin
  -- Defensive: require the caller to have access to the parent item.
  -- Without this, RLS on item_materials would block the inserts anyway,
  -- but surfacing the error up front gives a clearer message.
  if not exists (
    select 1 from items
    where id = p_item_id and is_member(tenant_id)
  ) then
    raise exception 'item not found or not accessible' using errcode = 'P0001';
  end if;

  -- Wipe existing lines and insert the new ones. Single statement = atomic.
  delete from item_materials where item_id = p_item_id;

  insert into item_materials (item_id, material_id, quantity)
  select
    p_item_id,
    (line ->> 'material_id')::uuid,
    (line ->> 'quantity')::numeric
  from jsonb_array_elements(p_lines) as line;
end;
$$;
