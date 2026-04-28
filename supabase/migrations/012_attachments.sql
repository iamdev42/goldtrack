-- Migration 012: file attachments
--
-- Generic "attachments" table that can attach files to items, customers, or
-- the tenant itself. Today only items use it; the schema is designed so we
-- can wire up customers + tenant in a future session without a migration.
--
-- The polymorphic `(attached_to_kind, attached_to_id)` pair is a common SQL
-- pattern. We can't have a real foreign key on `attached_to_id` because it
-- references different tables depending on `attached_to_kind`, so we
-- enforce cleanup with triggers (one per parent table).

create table if not exists attachments (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants on delete cascade,
  attached_to_kind text not null check (attached_to_kind in ('item', 'customer', 'tenant')),
  attached_to_id   uuid not null,
  category         text not null check (
    category in ('photo', 'certificate', 'receipt', 'invoice', 'sketch', 'correspondence', 'other')
  ),
  note             text,
  storage_path     text not null,
  filename         text not null,
  mime_type        text not null,
  size_bytes       bigint not null check (size_bytes > 0),
  created_at       timestamptz default now()
);

-- Common look-up: "all attachments for this parent thing"
create index if not exists attachments_parent_idx
  on attachments (attached_to_kind, attached_to_id);

-- For tenant-wide queries (audit, total storage used, etc.)
create index if not exists attachments_tenant_idx on attachments (tenant_id);

-- RLS: tenant-member check on the row's own tenant_id.
alter table attachments enable row level security;

create policy "tenant members only" on attachments
  using (is_member(tenant_id))
  with check (is_member(tenant_id));

-- Cleanup trigger: when an item is deleted, delete its attachments rows.
-- We can't use ON DELETE CASCADE because the FK is polymorphic. Storage
-- file cleanup happens client-side at delete time (we know the paths).
create or replace function clean_item_attachments_on_delete()
returns trigger language plpgsql as $$
begin
  delete from attachments
  where attached_to_kind = 'item' and attached_to_id = old.id;
  return old;
end;
$$;

drop trigger if exists items_clean_attachments on items;
create trigger items_clean_attachments
  before delete on items
  for each row execute function clean_item_attachments_on_delete();
