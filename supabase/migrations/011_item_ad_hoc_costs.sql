-- Migration 011: ad-hoc cost lines on items
--
-- Some BOM lines don't come from the materials registry: "1.2ct diamond",
-- "polishing by Alex", "stone setting (3rd party)". The goldsmith enters a
-- description and a cost directly — no quantity, no registry row.
--
-- These live in their own table `item_ad_hoc_costs` (keeping `item_materials`
-- clean and strictly for registered-material references).
--
-- The RPC `save_item_bom` is replaced with one that saves both kinds
-- atomically — a single transaction for the whole BOM, registered + ad-hoc.

-- ── Step 1: new table ────────────────────────────────────────────────

create table if not exists item_ad_hoc_costs (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items on delete cascade,
  description text not null check (length(trim(description)) > 0),
  cost        numeric(12, 2) not null check (cost > 0),
  created_at  timestamptz default now()
);

-- Fast look-up for "show me an item's ad-hoc costs"
create index if not exists item_ad_hoc_costs_item_idx on item_ad_hoc_costs (item_id);

-- RLS derived from the parent item (same pattern as item_materials).
alter table item_ad_hoc_costs enable row level security;

create policy "tenant members via parent item" on item_ad_hoc_costs
  using (
    exists (
      select 1 from items
      where items.id = item_ad_hoc_costs.item_id
        and is_member(items.tenant_id)
    )
  )
  with check (
    exists (
      select 1 from items
      where items.id = item_ad_hoc_costs.item_id
        and is_member(items.tenant_id)
    )
  );

-- ── Step 2: replace save_item_bom RPC ────────────────────────────────
--
-- New signature accepts TWO arrays:
--   p_material_lines: [{ material_id, quantity }, ...]
--   p_adhoc_lines:    [{ description, cost }, ...]
--
-- Both are wiped and re-inserted inside a single function call = atomic.
-- Empty arrays for either parameter are fine (and common).

create or replace function save_item_bom(
  p_item_id        uuid,
  p_material_lines jsonb,
  p_adhoc_lines    jsonb
)
returns void
language plpgsql
as $$
begin
  -- Authorisation check: caller must be a member of the item's tenant.
  -- RLS would enforce this anyway but surfacing it here gives a clearer error.
  if not exists (
    select 1 from items
    where id = p_item_id and is_member(tenant_id)
  ) then
    raise exception 'item not found or not accessible' using errcode = 'P0001';
  end if;

  -- Wipe existing BOM (both tables) and re-insert. One statement each =
  -- atomic within the function.
  delete from item_materials where item_id = p_item_id;
  delete from item_ad_hoc_costs where item_id = p_item_id;

  insert into item_materials (item_id, material_id, quantity)
  select
    p_item_id,
    (line ->> 'material_id')::uuid,
    (line ->> 'quantity')::numeric
  from jsonb_array_elements(coalesce(p_material_lines, '[]'::jsonb)) as line;

  insert into item_ad_hoc_costs (item_id, description, cost)
  select
    p_item_id,
    line ->> 'description',
    (line ->> 'cost')::numeric
  from jsonb_array_elements(coalesce(p_adhoc_lines, '[]'::jsonb)) as line;
end;
$$;
