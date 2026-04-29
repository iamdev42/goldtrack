-- Migration 013: public catalogue foundations
--
-- Adds the database pieces required for a public-facing catalogue:
--
--  1. tenants.slug          — short URL identifier, e.g. /shop/diekrone
--  2. tenants.public_display_name, public_bio — what appears on the public page
--  3. items.is_published    — per-item flag; only published+for_sale items
--                             appear in the catalogue
--
-- AND, critically, the FIRST-EVER PUBLIC RLS POLICIES on this database.
-- Read this carefully — every line either intentionally exposes data or
-- carefully limits what's exposed.

-- ── 1. Tenant catalogue identity ─────────────────────────────────

-- Slug: must be URL-safe, lowercase, unique. We auto-generate one for
-- existing tenants from their name, then make it required.
alter table tenants add column if not exists slug text;
alter table tenants add column if not exists public_display_name text;
alter table tenants add column if not exists public_bio text;

-- Auto-generate slug for existing tenants. The generated slug:
--   * lowercase
--   * letters + digits + hyphens only
--   * collapses runs of non-alphanumerics into a single hyphen
--   * trimmed of leading/trailing hyphens
-- If the result conflicts with an existing slug we append a short suffix.
do $$
declare
  t record;
  base_slug text;
  candidate text;
  attempt int;
begin
  for t in select id, name from tenants where slug is null loop
    base_slug := lower(regexp_replace(t.name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    if base_slug = '' then
      base_slug := 'shop';
    end if;
    candidate := base_slug;
    attempt := 1;
    -- collision check loop
    while exists (select 1 from tenants where slug = candidate) loop
      attempt := attempt + 1;
      candidate := base_slug || '-' || attempt;
    end loop;
    update tenants set slug = candidate where id = t.id;
  end loop;
end $$;

-- Now lock it down: required + URL-safe + unique.
alter table tenants alter column slug set not null;
alter table tenants add constraint tenants_slug_format
  check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$' and length(slug) between 2 and 60);
alter table tenants add constraint tenants_slug_unique unique (slug);

-- ── 2. Item publication flag ─────────────────────────────────────

-- Default false (existing items are NOT exposed). Goldsmith opts in per item.
alter table items add column if not exists is_published boolean not null default false;

-- Fast lookup for the catalogue query (only published + for_sale items).
-- Partial index keeps it tiny.
create index if not exists items_published_idx on items (tenant_id)
  where is_published = true and status = 'for_sale';

-- ── 3. PUBLIC RLS POLICIES ───────────────────────────────────────
--
-- We're adding new SELECT policies. Existing policies (member-only access)
-- are untouched. PostgreSQL RLS evaluates policies with OR, so a row is
-- visible if EITHER the existing member policy OR a new public policy
-- matches. We add narrow, specific public policies that only expose what's
-- needed for the catalogue.

-- ── 3a. Public read of items ─────────────────────────────────────

-- Anonymous users can SELECT items where:
--   * is_published = true AND
--   * status = 'for_sale'
-- Both conditions, both required. No other items leak.
drop policy if exists "public read of catalogue items" on items;
create policy "public read of catalogue items" on items
  for select
  to anon, authenticated
  using (is_published = true and status = 'for_sale');

-- ── 3b. Public read of tenants (limited fields via column-level pattern) ──
--
-- We can't restrict columns through RLS — RLS is row-level. So we accept
-- that anonymous users can see all columns of a tenant row IF they can
-- guess/know the slug, but we control what columns exist publicly via the
-- query layer (the catalogue query selects only safe columns).
--
-- Anonymous users can read tenants — but we don't expose tenant LISTING.
-- The public catalogue query uses .eq('slug', ...) which returns at most
-- one row, so anonymous users can only see a tenant they explicitly
-- request via slug.
--
-- IMPORTANT: tenants table doesn't store sensitive data (no addresses,
-- no contact info). Anything sensitive lives on customers/items/etc.
drop policy if exists "public read of tenants by slug" on tenants;
create policy "public read of tenants by slug" on tenants
  for select
  to anon, authenticated
  using (true);
-- ^ This is broad on purpose: returns all tenants, but the query layer
--   only ever fetches by slug, returning at most one row. We accept that
--   anonymous users could enumerate tenant names + slugs if they tried —
--   that's public info anyway (slugs ARE the public URLs).

-- ── 3c. Item photos in storage — already public ─────────────────
--
-- The `item-photos` bucket was created with public=true in migration 002.
-- That means anyone with the URL of any photo can already retrieve it.
-- No new RLS policy needed for the catalogue; we just emit the public URLs
-- from the items query.
--
-- Note: this is a minor information leak — even photos belonging to
-- unpublished items can be retrieved if someone guesses the URL. For v1
-- this is acceptable (the URL contains random UUIDs, hard to guess).
-- A future migration could move to a private bucket + signed URLs for
-- non-published items if this ever becomes an issue.

-- ── 4. Notes on what is NOT exposed ──────────────────────────────
--
-- The following tables are NOT touched by this migration. They retain
-- their existing member-only RLS:
--   * customers
--   * materials
--   * tenant_defaults
--   * item_materials, item_ad_hoc_costs (BOM)
--   * attachments (and the `attachments` storage bucket)
--   * tenant_users (the membership table itself)
--
-- An item's BOM and customer link are NOT visible publicly. Only the
-- item row itself (name, description, category, price, photos, weight,
-- status) is exposed via the catalogue.
