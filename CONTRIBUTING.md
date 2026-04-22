# Contributing to GoldTrack

This document is for developers working on the codebase. It covers how we write code,
how files are organised, and how to add a new feature without breaking conventions.

---

## Principles

1. **Consistency over cleverness.** If a pattern exists, follow it. Propose changes in a PR.
2. **Boring is beautiful.** Plain React, plain JavaScript, standard patterns. No framework-of-the-month.
3. **Server (Supabase) is the source of truth.** Never trust client state for authorisation or validation.
4. **Mobile-first.** Every screen is designed for a phone first, then scaled up.
5. **Readable wins.** If a junior dev can't read it, rewrite it.

---

## JavaScript conventions

- **No TypeScript**, but **use JSDoc** for function signatures that are not obvious:
  ```js
  /**
   * @param {string} id
   * @returns {Promise<Customer>}
   */
  async function getCustomer(id) { ... }
  ```
- **Zod schemas** are the canonical shape of entities — see `app/lib/validations/`.
  When you need a type, derive it from the schema:
  ```js
  /** @typedef {import('zod').infer<typeof customerSchema>} Customer */
  ```
- Use `~/...` imports for anything under `app/`. Never use deep relative paths.

  ```js
  // ✅
  import { supabase } from '~/lib/supabase'

  // ❌
  import { supabase } from '../../../lib/supabase'
  ```

- Prefer named exports. Default exports only for route modules (required by React Router).

---

## File organisation

### Where does new code go?

| What                                     | Where                                                   |
| ---------------------------------------- | ------------------------------------------------------- |
| A new page                               | `app/routes/` — add the path to `app/routes.js`         |
| A primitive UI (Button, Input, Dialog)   | `app/components/ui/` — prefer copying from shadcn.com   |
| An app-specific component (CustomerCard) | `app/components/app/`                                   |
| A shared helper                          | `app/lib/utils.js` (or a new file if it grows)          |
| A Zod schema                             | `app/lib/validations/<entity>.js`                       |
| A TanStack Query hook                    | `app/lib/queries/<entity>.js`                           |
| A cross-cutting React hook               | `app/hooks/`                                            |
| A DB migration                           | `supabase/migrations/NNN_description.sql` (next number) |

### When in doubt

Follow the pattern of the closest existing feature. The whole point of keeping customers
and items structured identically is so a new dev only has to learn one pattern.

---

## Adding a new feature — example: Invoices

1. **DB migration** — `supabase/migrations/006_invoices.sql` with the table + RLS policies
2. **Zod schema** — `app/lib/validations/invoice.js` defining the shape
3. **Query hooks** — `app/lib/queries/invoices.js` with `useInvoices()`, `useCreateInvoice()`, etc.
4. **Route(s)** — `app/routes/_app.invoices._index.jsx` (list) and `app/routes/_app.invoices.$id.jsx` (detail)
5. **Register the routes** — add entries to `app/routes.js`
6. **Nav tab** — add to `TABS` in `app/components/app/TabNav.jsx`
7. **Tests** — unit test for the Zod schema, e2e test for the happy path

---

## Styling conventions

- **Use design tokens** — `brand-500`, not `amber-600`. See `tailwind.config.js`.
- **No inline hex colours** in JSX.
- **Mobile-first utilities** — write the base class for mobile, use `sm:` / `md:` / `lg:`
  prefixes for larger screens.
- **Touch targets ≥ 44px** on mobile (`h-11 min-h-11` or equivalent).
- **Use the `Button` component** for every button. Never raw `<button>` with ad-hoc classes.

---

## Supabase patterns

- **All queries filter by `tenant_id`** explicitly, even though RLS enforces it.
  This is belt-and-braces and makes queries more intention-revealing.
  ```js
  await supabase.from('customers').select('*').eq('tenant_id', tenantId)
  ```
- **Never use the service role key in the client.** The anon key + RLS is the full
  security model.
- **Migrations are append-only.** Never edit an existing migration — add a new one.

---

## Testing

- **Unit tests** (Vitest) live next to the code they test: `foo.js` + `foo.test.js`
- **End-to-end tests** (Playwright) live in `tests/e2e/`
- **What to test**: Zod schemas, non-trivial utils, and the happy path of each feature.
  Don't test React rendering for its own sake — test behaviour.

---

## Pull requests

- Keep PRs small and focused. One feature, one refactor, one fix.
- Every PR must pass CI: lint + format + unit tests + build.
- Link the issue being resolved in the description.
- Screenshots are mandatory for any UI change.

---

## Commits

Conventional commits encouraged:

- `feat: add customer search`
- `fix: prevent double-submit on customer form`
- `refactor: extract tenant loader into route`
- `docs: expand CONTRIBUTING`
- `chore: bump deps`

---

## Questions?

Open a discussion on GitHub or ping the team lead before going deep on a pattern-breaking
change. Consistency matters more than any individual PR.
