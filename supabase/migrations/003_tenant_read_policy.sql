-- Allow tenant members to read their own tenant record (needed to display company name in header)
create policy "tenant members can read own tenant" on tenants
  for select using (is_member(id));
