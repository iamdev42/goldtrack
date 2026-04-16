-- Add price column
alter table items add column if not exists price numeric;

-- Drop old constraint first
alter table items drop constraint if exists items_status_check;

-- Migrate existing rows BEFORE adding the new constraint
update items set status = 'for_sale'  where status in ('in_stock', 'in_repair');
update items set status = 'reserved'  where status = 'with_customer';

-- Now safe to add the new constraint
alter table items add constraint items_status_check
  check (status in ('for_sale', 'sold', 'reserved'));

-- Update default
alter table items alter column status set default 'for_sale';
