-- 0008: cow / buffalo milk per customer + managers can delete records. Run after 0007. Safe to run more than once.
--
-- 1) A customer can buy cow milk, buffalo milk or both. Each type has its own default rate and default litres.
--    Every delivery row (milk_sales) now records which milk it was; existing rows are treated as Cow.
-- 2) Managers can delete customers, workers and the dated records (expenses, payments, cash, labour payments,
--    health records, milk entries, deliveries). Dated records can only be deleted inside the manager edit window
--    (settings.manager_edit_days), the same rule that already applies to adding/editing. Animals stay admin-only.

do $$ begin
  create type milk_type as enum ('Cow','Buffalo');
exception when duplicate_object then null; end $$;

-- ---- customers ----
alter table customers add column if not exists buys_cow boolean not null default true;
alter table customers add column if not exists buys_buffalo boolean not null default false;
alter table customers add column if not exists default_rate_buffalo numeric(8,2);
alter table customers add column if not exists default_morning_litres_buffalo numeric(6,2) not null default 0;
alter table customers add column if not exists default_evening_litres_buffalo numeric(6,2) not null default 0;
update customers set default_rate_buffalo = default_rate where default_rate_buffalo is null;
alter table customers alter column default_rate_buffalo set not null;
alter table customers alter column default_rate_buffalo set default 55;

-- ---- deliveries: one row per customer + date + shift + milk type ----
alter table milk_sales add column if not exists milk_type milk_type not null default 'Cow';

do $$
declare c record;
begin
  -- drop the old unique (customer_id, entry_date, shift) whatever its generated name is
  for c in
    select conname from pg_constraint
    where conrelid = 'public.milk_sales'::regclass and contype = 'u' and conname <> 'milk_sales_customer_date_shift_type_key'
  loop
    execute format('alter table milk_sales drop constraint %I', c.conname);
  end loop;
  if not exists (select 1 from pg_constraint where conname = 'milk_sales_customer_date_shift_type_key') then
    alter table milk_sales add constraint milk_sales_customer_date_shift_type_key unique (customer_id, entry_date, shift, milk_type);
  end if;
end $$;

-- ---- manager delete rights ----
drop policy if exists customers_delete on customers;
create policy customers_delete on customers for delete using (is_staff());

drop policy if exists labourers_delete on labourers;
create policy labourers_delete on labourers for delete using (is_staff());

do $$
declare t text;
begin
  foreach t in array array['milk_production','milk_sales','customer_payments','expenses','medical_records','labour_payments']
  loop
    execute format('drop policy if exists %1$s_delete on %1$s', t);
    execute format('create policy %1$s_delete on %1$s for delete using (manager_can_edit(entry_date))', t);
  end loop;
end $$;

drop policy if exists cash_delete on cash_collections;
create policy cash_delete on cash_collections for delete using (manager_can_edit(entry_date));

-- Note: a customer or worker that already has sales / payments cannot be deleted (the records reference them).
-- The app tells the user to mark them inactive instead.
