-- ════════════════════════════════════════════════════════════════════
-- Run AFTER the import completes. Each query has an expected result —
-- if any actual result differs, something went wrong and we should
-- investigate before letting the goldsmith open the app.
-- ════════════════════════════════════════════════════════════════════

-- ⚠ Replace the placeholder with your actual TENANT_ID before running
\set tenant_id '00000000-0000-0000-0000-000000000000'

-- ── Test 1 — Total count ────────────────────────────────────────────
-- Expected: 766
select count(*) as total_customers
from customers
where tenant_id = :'tenant_id';

-- ── Test 2 — No duplicate legacy IDs ────────────────────────────────
-- Expected: 0 rows
select legacy_id, count(*) as occurrences
from customers
where tenant_id = :'tenant_id'
group by legacy_id
having count(*) > 1;

-- ── Test 3 — Country distribution ───────────────────────────────────
-- Expected: ~760 Switzerland, a handful of nulls/others
select country, count(*) as n
from customers
where tenant_id = :'tenant_id'
group by country
order by n desc;

-- ── Test 4 — Customers with both first AND last name set ───────────
-- Expected: ~645 (766 minus the ~121 with no first name minus a few company entries)
select count(*) as fully_named
from customers
where tenant_id = :'tenant_id'
  and first_name is not null
  and last_name is not null;

-- ── Test 5 — Spot check a known row ─────────────────────────────────
-- Pick legacy_id 2951 from the source file (Abegg Rudolf, Hinwil)
-- Expected: first_name=Rudolf, last_name=Abegg, postcode=8340, city=Hinwil
select legacy_id, name, first_name, last_name, street, postcode, city, country, phone
from customers
where tenant_id = :'tenant_id' and legacy_id = 2951;

-- ── Test 6 — Spot check the 28 duplicate-name customers ────────────
-- Expected: all 28 rows present, each with their own legacy_id and address
select legacy_id, last_name, first_name, street, postcode, city
from customers
where tenant_id = :'tenant_id'
  and last_name in ('Bleiker','Bösch','Gähwiler','Huber','Kuhn','Meyer','Näf','Preisig','Raschle','Roth','Schmid','Strässle')
order by last_name, legacy_id;

-- ── Test 7 — Email field sanity ─────────────────────────────────────
-- Expected: ~72 valid emails (1 was malformed and got dropped to null)
-- Every present email should look valid
select count(*) filter (where email is not null) as with_email,
       count(*) filter (where email is not null and email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') as malformed_email
from customers
where tenant_id = :'tenant_id';

-- ── Test 8 — Phones combined correctly ──────────────────────────────
-- Pick a legacy row known to have both Tel. G. and Tel. P.
-- (This is just a spot check — no expected count)
select legacy_id, name, phone
from customers
where tenant_id = :'tenant_id'
  and phone like '%, %'
limit 5;

-- ── Test 9 — Postcodes correctly formatted ──────────────────────────
-- Expected: all CH postcodes are exactly 4 digits, no decimals (.0) anywhere
select count(*) as bad_postcodes
from customers
where tenant_id = :'tenant_id'
  and country = 'Switzerland'
  and postcode !~ '^\d{4}$';

-- ── Test 10 — Sanity check the migration flags in notes ────────────
-- Show how many rows were flagged for manual cleanup
select count(*) as flagged_rows
from customers
where tenant_id = :'tenant_id'
  and notes like '%⚠ Migration flags%';
