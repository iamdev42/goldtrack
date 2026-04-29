-- Migration 014: tenant calendar embed
--
-- Adds a single column to tenants for the Google/Outlook/etc. calendar
-- embed URL. The Dashboard page renders this in an iframe so the goldsmith
-- can see her existing calendar inside the app.
--
-- The URL is set + cleared via the Settings page. Validation is light: at
-- save time we require https://. The iframe simply renders whatever's
-- there; if it's bad, the user sees a blank/broken frame and re-pastes.

alter table tenants add column if not exists calendar_embed_url text;

alter table tenants add constraint tenants_calendar_embed_url_https
  check (calendar_embed_url is null or calendar_embed_url ~ '^https://');
