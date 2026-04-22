-- Ensure customers/items policies allow inserts for tenant members.
-- The original policy only covered USING (reads/updates/deletes),
-- not WITH CHECK (inserts/updates). Fixing here for production.

drop policy if exists "tenant members only" on customers;
create policy "tenant members only" on customers
  using (is_member(tenant_id))
  with check (is_member(tenant_id));

drop policy if exists "tenant members only" on items;
create policy "tenant members only" on items
  using (is_member(tenant_id))
  with check (is_member(tenant_id));
