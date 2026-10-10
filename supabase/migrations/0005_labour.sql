-- Labour records: workers + every payment made to them (salary, advances, bonus). Run after 0004.

create type labour_pay_type as enum ('Salary','Advance','Bonus','Other');

create table labourers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  role text,
  monthly_salary numeric(10,2) not null default 0,
  join_date date,
  active boolean not null default true,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table labour_payments (
  id uuid primary key default gen_random_uuid(),
  labour_id uuid not null references labourers(id),
  entry_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  pay_type labour_pay_type not null default 'Salary',
  mode pay_mode not null default 'Cash',
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on labour_payments (labour_id, entry_date);
create index on labour_payments (entry_date);

do $$
declare t text;
begin
  foreach t in array array['labourers','labour_payments']
  loop
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function set_updated_at()', t);
    execute format('create trigger trg_%1$s_audit after insert or update or delete on %1$s for each row execute function audit_trigger()', t);
    execute format('alter table %1$s enable row level security', t);
  end loop;
end $$;

-- Workers: staff can read, only admin can add / edit / delete
create policy labourers_select on labourers for select using (is_staff());
create policy labourers_admin_write on labourers for all using (is_admin()) with check (is_admin());

-- Payments: same rules as other dated entries (manager: last N days, no delete)
create policy labour_payments_select on labour_payments for select using (is_staff());
create policy labour_payments_insert on labour_payments for insert with check (manager_can_edit(entry_date));
create policy labour_payments_update on labour_payments for update using (manager_can_edit(entry_date)) with check (manager_can_edit(entry_date));
create policy labour_payments_delete on labour_payments for delete using (is_admin());

-- Profit now includes labour payments (salary + advance + bonus + other)
drop function if exists admin_summary(date, date);
create or replace function admin_summary(from_d date, to_d date)
returns table (litres numeric, sold_litres numeric, revenue numeric, expenses numeric, medical numeric, labour numeric, profit numeric, cost_per_litre numeric)
language plpgsql stable security definer set search_path = public as $$
declare l numeric; sl numeric; r numeric; e numeric; m numeric; lb numeric;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select coalesce(sum(litres),0) into l from milk_production where entry_date between from_d and to_d;
  select coalesce(sum(litres),0), coalesce(sum(amount),0) into sl, r from milk_sales where entry_date between from_d and to_d;
  select coalesce(sum(amount),0) into e from expenses where entry_date between from_d and to_d;
  select coalesce(sum(cost),0) into m from medical_records where entry_date between from_d and to_d;
  select coalesce(sum(amount),0) into lb from labour_payments where entry_date between from_d and to_d;
  return query select l, sl, r, e, m, lb, r - e - m - lb, case when l > 0 then round((e + m + lb) / l, 2) else 0 end;
end $$;

create or replace function daily_series(from_d date, to_d date)
returns table (d date, litres numeric, sold numeric, revenue numeric, expense numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  select g::date,
    coalesce((select sum(litres) from milk_production where entry_date = g::date),0),
    coalesce((select sum(litres) from milk_sales where entry_date = g::date),0),
    coalesce((select sum(amount) from milk_sales where entry_date = g::date),0),
    coalesce((select sum(amount) from expenses where entry_date = g::date),0)
      + coalesce((select sum(amount) from labour_payments where entry_date = g::date),0)
  from generate_series(from_d, to_d, interval '1 day') g order by 1;
end $$;

grant execute on function admin_summary(date,date), daily_series(date,date) to authenticated;
