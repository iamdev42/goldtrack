# GoldTrack

Business management SaaS for goldsmith and jewellery shops. Multi-tenant, mobile-first.

**Live:** https://goldtrack.skergetd.workers.dev/

---

## Stack

| Layer               | Choice                                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Framework           | [React Router v7](https://reactrouter.com) (SPA mode)                                                                        |
| Build               | [Vite 5](https://vitejs.dev)                                                                                                 |
| UI                  | [Tailwind CSS v3](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) primitives (copied into `app/components/ui`) |
| Data fetching       | [TanStack Query v5](https://tanstack.com/query)                                                                              |
| Forms               | [react-hook-form](https://react-hook-form.com) + [Zod](https://zod.dev)                                                      |
| Auth + DB + Storage | [Supabase](https://supabase.com)                                                                                             |
| Hosting             | [Cloudflare Workers](https://workers.cloudflare.com) (static assets)                                                         |
| Testing             | [Vitest](https://vitest.dev) (unit) + [Playwright](https://playwright.dev) (e2e)                                             |
| CI                  | GitHub Actions                                                                                                               |

---

## Local development

```bash
# 1. Install
npm install

# 2. Set up env vars
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project

# 3. Run dev server
npm run dev
# → http://localhost:5173
```

---

## Scripts

| Command                | What it does                                 |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Start dev server with HMR                    |
| `npm run build`        | Production build (outputs to `build/client`) |
| `npm run deploy`       | Build + deploy to Cloudflare Workers         |
| `npm run lint`         | ESLint check                                 |
| `npm run format`       | Prettier format all files                    |
| `npm run format:check` | Prettier check (used in CI)                  |
| `npm test`             | Run Vitest unit tests once                   |
| `npm run test:watch`   | Run Vitest in watch mode                     |
| `npm run test:e2e`     | Run Playwright e2e tests                     |

---

## Project structure

```
app/
├─ root.jsx                    Application root (providers, error boundary)
├─ routes.js                   Explicit route table — single source of truth
├─ app.css                     Tailwind entry + base styles
├─ routes/
│  ├─ _index.jsx              /          → redirect based on auth state
│  ├─ _auth.jsx               layout: public (anon only)
│  ├─ _auth.login.jsx         /login     → sign-in screen
│  ├─ _app.jsx                layout: protected (requires session)
│  ├─ _app.customers._index.jsx   /customers
│  └─ _app.inventory._index.jsx   /inventory
├─ components/
│  ├─ ui/                     shadcn primitives — copied in, never imported as a lib
│  │  ├─ button.jsx
│  │  ├─ input.jsx
│  │  └─ label.jsx
│  └─ app/                    App-specific components
│     ├─ Header.jsx
│     └─ TabNav.jsx
├─ lib/
│  ├─ supabase.js             Single browser client
│  ├─ auth.js                 requireSession / requireAnon for route loaders
│  └─ utils.js                cn() class merging helper
└─ hooks/
   └─ useTenant.js            Load current tenant + user

supabase/migrations/          SQL migrations — run in order on fresh DB
.github/workflows/ci.yml      Lint + test + build + deploy on push to main
```

---

## Supabase setup (fresh install)

If you're standing up a brand new Supabase project for GoldTrack:

1. **Create the project** at [supabase.com](https://supabase.com) → grab the
   Project URL and anon key for your `.env`
2. **Run the migrations in order** via SQL Editor:
   - `supabase/migrations/001_initial_schema.sql` — tables, RLS, `is_member()` function
   - `supabase/migrations/002_storage.sql` — `item-photos` bucket + policies
   - `supabase/migrations/003_tenant_read_policy.sql` — tenants read policy
   - `supabase/migrations/004_items_price_status.sql` — adds price, narrows statuses
   - `supabase/migrations/005_customers_insert_policy.sql` — adds `WITH CHECK` for inserts
3. **Create your first user** — Auth → Users → Invite user (or enable sign-ups)
4. **Create a tenant and link the user** using the SQL snippet in the
   [Adding a new shop](#adding-a-new-shop) section below

Migrations are append-only — never edit an existing migration, add a new one.

---

## Multi-tenant model

Each shop is a **tenant**. Users join a tenant through a **membership** row.
Row-level security policies on `customers` and `items` enforce tenant isolation
at the database level — even a bug in the frontend cannot leak data across shops.

See `supabase/migrations/001_initial_schema.sql`.

### Adding a new shop

```sql
insert into tenants (name) values ('Shop Name');

insert into memberships (user_id, tenant_id, role)
values (
  (select id from auth.users where email = 'owner@example.com'),
  (select id from tenants where name = 'Shop Name'),
  'owner'
);
```

---

## Deployment

### Cloudflare Workers setup

1. In Cloudflare dashboard, create a Worker named `goldtrack`
2. Add env vars in GitHub → Settings → Secrets and variables → Actions:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `CLOUDFLARE_API_TOKEN` (create in Cloudflare → API Tokens, "Edit Workers" template)
   - `CLOUDFLARE_ACCOUNT_ID` (Cloudflare dashboard → right sidebar)
3. Push to `main` → GitHub Actions deploys automatically

### Manual deploy

```bash
npm run deploy
```

---

## Milestones

- [x] **M1 — Shell** — scaffold, auth, protected routes, navigation, CI
- [x] **M2 — Customers** — list, search, add, edit, delete, validation
- [x] **M3 — Inventory** — list, filters, stats, add, edit, delete, photo upload, lightbox
- [ ] **M4 — Polish** — Playwright e2e tests, accessibility audit, Sentry integration

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for coding conventions and the workflow
for adding new features.
