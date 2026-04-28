-- Supplementary to migration 012: Storage bucket setup.
-- Run this AFTER migration 012 in the Supabase SQL editor.
--
-- Storage in Supabase has its own RLS that runs against `storage.objects`.
-- We mirror the application-table policy: a user can read/write objects in
-- the `attachments` bucket only if they're a member of the tenant whose UUID
-- is the first segment of the object path.
--
-- Object path convention (set in client code):
--   {tenant_id}/items/{item_id}/{uuid}-{filename}
--
-- The first path segment is therefore the tenant_id, and storage.foldername(name)[1]
-- gives us that segment for RLS comparison.

-- Create the bucket (idempotent).
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Allow tenant members to read their tenant's attachments.
drop policy if exists "tenant members read attachments" on storage.objects;
create policy "tenant members read attachments" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and is_member((storage.foldername(name))[1]::uuid)
  );

-- Allow tenant members to upload to their tenant's path.
drop policy if exists "tenant members write attachments" on storage.objects;
create policy "tenant members write attachments" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and is_member((storage.foldername(name))[1]::uuid)
  );

-- Allow tenant members to delete their tenant's attachments.
drop policy if exists "tenant members delete attachments" on storage.objects;
create policy "tenant members delete attachments" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and is_member((storage.foldername(name))[1]::uuid)
  );
