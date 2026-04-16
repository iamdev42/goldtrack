-- Storage bucket for item photos (public read)
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

-- Allow authenticated tenant members to upload photos
-- Path structure: {tenant_id}/{item_id}/{filename}
create policy "tenant members can upload item photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'item-photos'
  and is_member(split_part(name, '/', 1)::uuid)
);

-- Allow authenticated tenant members to delete their own photos
create policy "tenant members can delete item photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'item-photos'
  and is_member(split_part(name, '/', 1)::uuid)
);
