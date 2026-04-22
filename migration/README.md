# Customer Migration

One-time scripts and assets for importing the **766 legacy customers** from
`legacy-customers.xlsx` into the GoldTrack `customers` table.

## Files

| File                    | Purpose                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `MIGRATION_GUIDE.md`    | **Read this first** — full step-by-step deployment instructions      |
| `legacy-customers.xlsx` | The source data file                                                 |
| `transform.mjs`         | Pure transform functions (no I/O — easy to test)                     |
| `transform.test.mjs`    | 28-test suite — runs against all 766 real rows                       |
| `import-customers.mjs`  | Runs the migration. Three modes: `dry-run`, `delete-tests`, `import` |
| `verify-import.sql`     | 10 spot-check queries to run after import                            |
| `reports/`              | Generated CSVs (gitignored) — review these in stage A                |

## Run the tests (no DB needed)

```bash
cd migration
npm install xlsx        # one-time
node --test transform.test.mjs
```

You should see `# pass 28`.

## Run the migration

See `MIGRATION_GUIDE.md`.
