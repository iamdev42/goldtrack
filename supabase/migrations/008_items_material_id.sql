-- Migration 008: link items to the materials registry
--
-- Previously `items.material` was a free-text field with a hardcoded
-- frontend list. Now that materials are a real table (see migration 007),
-- we add a foreign key so items can reference registered materials.
--
-- The legacy `material` text column stays untouched for existing rows —
-- nothing in the app reads/writes it any more for new items, but we don't
-- drop it so existing data is preserved and nothing breaks during rollout.
--
-- on delete set null: if the goldsmith deletes a material from the registry,
-- any items referencing it have their material_id cleared (not the whole
-- item). This matches the behaviour of items.customer_id.

alter table items
  add column if not exists material_id uuid
    references materials(id) on delete set null;

-- Index for common query "all items made of material X"
create index if not exists items_tenant_material_idx
  on items (tenant_id, material_id);
