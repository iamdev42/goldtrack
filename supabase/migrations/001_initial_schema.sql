-- Tenants
create table tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

-- Memberships (links auth.users to tenants)
create table memberships (
  user_id   uuid references auth.users on delete cascade,
  tenant_id uuid references tenants on delete cascade,
  role      text not null default 'staff' check (role in ('owner', 'staff')),
  primary key (user_id, tenant_id)
);

-- Customers
create table customers (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants on delete cascade,
  name       text not null,
  phone      text,
  email      text,
  address    text,
  notes      text,
  created_at timestamptz default now()
);

-- Items (jewellery pieces)
create table items (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants on delete cascade,
  customer_id uuid references customers on delete set null,
  name        text not null,
  description text,
  category    text check (category in ('ring','necklace','bracelet','earrings','other')),
  material    text,
  weight_g    numeric,
  status      text not null default 'in_stock' check (status in ('in_stock','with_customer','in_repair','sold')),
  photos      text[],
  created_at  timestamptz default now()
);

-- Row-Level Security
alter table tenants   enable row level security;
alter table customers enable row level security;
alter table items      enable row level security;

-- Helper: check membership
create or replace function is_member(tid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid() and tenant_id = tid
  );
$$;

-- Policies
create policy "tenant members only" on customers
  using (is_member(tenant_id));

create policy "tenant members only" on items
  using (is_member(tenant_id));
