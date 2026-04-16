# GoldTrack — Goldsmith Business Management POC

A mobile/tablet-first app for small goldsmith/jewellery businesses (1–5 employees) to replace hand-written books and loose notes.

**Live:** https://goldtrack.skergetd.workers.dev/

---

## Progress

### Infrastructure
- [x] GitHub repo created (`iamdev42/goldtrack`)
- [x] React + Vite + Tailwind scaffolded
- [x] Supabase project connected
- [x] Supabase schema migrated (tenants, customers, items, memberships + RLS)
- [x] Tenant "Die Krone Goldschmiede" + admin user created
- [x] Deployed to Cloudflare Workers (auto-deploy on push to `main`)

### Phase 1 — POC
- [x] Auth — login / logout (email + password via Supabase)
- [ ] Customers — list all customers
- [ ] Customers — add new customer
- [ ] Customers — edit / delete customer
- [ ] Customers — view customer detail + linked pieces
- [ ] Inventory — list all items
- [ ] Inventory — add new item (link to customer optional)
- [ ] Inventory — edit item / update status
- [ ] Inventory — filter by status

### Phase 2 — If validated
- [ ] Invoices / Billing — link pieces to customers, generate invoice
- [ ] Multi-tenant onboarding — invite team members, separate shop accounts
- [ ] Photo upload for items (Supabase Storage)

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Auth | Supabase Auth (email/password) |
| Database | Supabase Postgres + RLS |
| Hosting | Cloudflare Workers (static assets) |
| CI/CD | Git push to `main` → auto deploy |

---

## Data model

### `tenants`
| column | type |
|---|---|
| id | uuid PK |
| name | text |
| created_at | timestamptz |

### `memberships`
| column | type |
|---|---|
| user_id | uuid FK → auth.users |
| tenant_id | uuid FK → tenants |
| role | text (owner, staff) |

### `customers`
| column | type |
|---|---|
| id | uuid PK |
| tenant_id | uuid FK → tenants |
| name | text |
| phone | text |
| email | text |
| address | text |
| notes | text |
| created_at | timestamptz |

### `items`
| column | type |
|---|---|
| id | uuid PK |
| tenant_id | uuid FK → tenants |
| customer_id | uuid nullable FK → customers |
| name | text |
| description | text |
| category | text (ring, necklace, bracelet, earrings, other) |
| material | text |
| weight_g | numeric |
| status | text (in_stock, with_customer, in_repair, sold) |
| photos | text[] |
| created_at | timestamptz |

---

## Local development

```bash
cp .env.example .env   # fill in Supabase URL + anon key
npm install
npm run dev            # http://localhost:5173
```

---

## Add a new tenant (Supabase SQL Editor)

```sql
insert into tenants (name) values ('Shop Name');

insert into memberships (user_id, tenant_id, role)
values (
  (select id from auth.users where email = 'user@example.com'),
  (select id from tenants where name = 'Shop Name'),
  'owner'
);
```

---


-- Fix customers policy to allow inserts                                                                                      
  drop policy "tenant members only" on customers;
                                                                                                                                
  create policy "tenant members only" on customers                                                                              
    using (is_member(tenant_id))                                                                                                
    with check (is_member(tenant_id));                                                                                          
                                                                                                                                
  -- Same fix for items while we're here
  drop policy "tenant members only" on items;

  create policy "tenant members only" on items
    using (is_member(tenant_id))
    with check (is_member(tenant_id));
    

## Deployment

Push to `main` → Cloudflare Workers auto-deploys via `npx wrangler deploy`.

Env vars required in Cloudflare build settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `CLOUDFLARE_API_TOKEN`
