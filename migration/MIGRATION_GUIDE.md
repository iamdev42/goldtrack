# Customer Migration — Deployment Guide

You are migrating **766 legacy customers** from `legacy-customers.xlsx` into the
production Supabase database. Follow these steps in order. Do not skip steps.

---

## What this changes

1. **DB schema** — adds `first_name`, `last_name`, `company`, `street`, `postcode`, `city`, `country`, `legacy_id` columns to `customers`
2. **App** — the customer form now has structured address fields; the customer card shows postcode/city; search now matches city, postcode, company name, etc.
3. **Data** — 766 new customer rows imported into the `Die Krone Goldschmiede` tenant; the existing 6 test customers deleted first

---

## Prerequisites — what you need before starting

- Your **Supabase service_role key** (Supabase → Project Settings → API → `service_role`)
- The **TENANT_ID** of `Die Krone Goldschmiede` — find it with this SQL in Supabase SQL Editor:
  ```sql
  select id from tenants where name = 'Die Krone Goldschmiede';
  ```
  Save the UUID it prints.

---

## Step 1 — Apply the DB migration

In Supabase Dashboard → SQL Editor → New Query:

1. Paste the entire contents of `supabase/migrations/006_customer_address_fields.sql`
2. Click **Run**
3. You should see "Success. No rows returned."

This adds the new columns. Existing customers (your 6 test ones) get their `first_name` and `last_name` auto-filled from their existing `name`. No data is destroyed.

**Verify it worked** — run this query:

```sql
select column_name from information_schema.columns
where table_name = 'customers' order by ordinal_position;
```

You should see the new columns: `first_name`, `last_name`, `company`, `street`, `postcode`, `city`, `country`, `legacy_id`.

---

## Step 2 — Deploy the app changes (so the new fields show in the UI)

In Terminal, from your goldtrack folder:

```bash
cd ~/AI/GoldJulia/goldtrack
git pull
unzip -o ~/Downloads/customer-migration.zip -d ~/Downloads/cm-temp
cp -R ~/Downloads/cm-temp/. .
rm -rf ~/Downloads/cm-temp
git status
```

You should see modifications to:

- `app/components/app/CustomerCard.jsx`
- `app/components/app/CustomerForm.jsx`
- `app/lib/validations/customer.js`
- `app/routes/_app.customers._index.jsx`
- `tests/unit/customer.test.js`
- `supabase/migrations/006_customer_address_fields.sql` (new)
- `migration/` folder (new, contains the import script)

Commit and push:

```bash
git add .
git commit -m "feat(customers): structured address fields + legacy import"
git push
```

Cloudflare auto-deploys in ~2 minutes.

---

## Step 3 — Run the legacy import script

The import script lives in `migration/import-customers.mjs` and runs from your computer.

### Set up the env

Create the file `migration/.env.import` (it's already in `.gitignore` so it won't be committed):

```bash
cd migration
cat > .env.import <<'EOF'
SUPABASE_URL=https://hwcfzybiqzpnzumepumg.supabase.co
SUPABASE_SERVICE_KEY=PASTE-YOUR-SERVICE-ROLE-KEY-HERE
TENANT_ID=PASTE-THE-TENANT-UUID-HERE
EOF
```

Then edit it and replace the placeholders with the real values from your prerequisites.

### Install dependencies (one-time)

```bash
cd migration
npm install xlsx @supabase/supabase-js dotenv
```

### Run the import in 3 stages

**Stage A — Dry run (no DB writes, generates CSV reports for review):**

```bash
node import-customers.mjs
```

This produces two CSV files in `migration/reports/`:

- `all-rows-preview.csv` — every one of the 766 rows showing exactly what will be written
- `flagged-rows.csv` — the 15 rows with data quality issues

Open `flagged-rows.csv` in Excel/Numbers and skim it. Confirm nothing looks crazy.

**Stage B — Delete the test customers:**

```bash
MODE=delete-tests node import-customers.mjs
```

Output should be:

```
[migrate] Deleting test customers from tenant ...
[migrate] Deleted 6 rows: Dusan Skerget, Dusan Skerget21, ...
```

**Stage C — Run the actual import:**

```bash
MODE=import node import-customers.mjs
```

Output should be:

```
[migrate] Current customer count in tenant: 0
[migrate] Inserted chunk 1 — 200/766
[migrate] Inserted chunk 2 — 400/766
[migrate] Inserted chunk 3 — 600/766
[migrate] Inserted chunk 4 — 766/766
[migrate] ✅ Imported 766 customers into tenant ...
```

If it errors halfway, the error message tells you which chunk failed. The `legacy_id` unique index in the schema means re-running the script after a partial success will fail the duplicates — message me and I'll add a `--resume` flag.

---

## Step 4 — Verify the import in Supabase

Open `migration/verify-import.sql` and run each query in the Supabase SQL Editor.

⚠ Replace `00000000-0000-0000-0000-000000000000` at the top with your real TENANT_ID.

The expected results are documented as comments above each query. If any disagree with reality, **stop** and tell me what doesn't match.

---

## Step 5 — Open the app and spot-check

Refresh `goldtrack.almostworks.dev/customers` (Cmd+Shift+R for hard refresh).

You should see:

- A long list (766) of customers, alphabetical by name
- City + postcode shown under each name
- Search now finds customers by city, company, etc.
- Click any customer → the dialog shows the new structured address fields populated

Pick 3-4 customers at random and verify their data matches the source Excel file (cross-reference by their `legacy_id` if needed).

---

## Rollback plan (if something goes wrong)

If the import lands bad data, you can wipe and retry:

```sql
-- ⚠ Run in Supabase SQL Editor — TENANT_ID matters
delete from customers
where tenant_id = 'YOUR-TENANT-ID-HERE'
  and legacy_id is not null;
```

This deletes only the imported rows — any manually-added customers (with `legacy_id is null`) stay safe.

The schema migration (006) cannot easily be rolled back because dropping columns destroys data. If you need to undo the schema, manually remove the columns:

```sql
alter table customers
  drop column if exists first_name,
  drop column if exists last_name,
  drop column if exists company,
  drop column if exists street,
  drop column if exists postcode,
  drop column if exists city,
  drop column if exists country,
  drop column if exists legacy_id;
```

But then the redeployed app would crash because the form expects them — also revert the deploy first.
