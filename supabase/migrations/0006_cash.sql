-- Daily cash collection from direct (walk-in / unknown customer) milk sales. Run after 0005.

create table cash_collections (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  litres numeric(8,2),
  handed_to text,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on cash_collections (entry_date);

create trigger trg_cash_collections_updated before update on cash_collections for each row execute function set_updated_at();
create trigger trg_cash_collections_audit after insert or update or delete on cash_collections for each row execute function audit_trigger();

alter table cash_collections enable row level security;
create policy cash_select on cash_collections for select using (is_staff());
create policy cash_insert on cash_collections for insert with check (manager_can_edit(entry_date));
create policy cash_update on cash_collections for update using (manager_can_edit(entry_date)) with check (manager_can_edit(entry_date));
create policy cash_delete on cash_collections for delete using (is_admin());

-- Revenue now = customer milk sales + direct cash sales
drop function if exists admin_summary(date, date);
create or replace function admin_summary(from_d date, to_d date)
returns table (litres numeric, sold_litres numeric, revenue numeric, expenses numeric, medical numeric, labour numeric, cash numeric, profit numeric, cost_per_litre numeric)
language plpgsql stable security definer set search_path = public as $$
declare l numeric; sl numeric; r numeric; e numeric; m numeric; lb numeric; c numeric; cl numeric;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select coalesce(sum(litres),0) into l from milk_production where entry_date between from_d and to_d;
  select coalesce(sum(litres),0), coalesce(sum(amount),0) into sl, r from milk_sales where entry_date between from_d and to_d;
  select coalesce(sum(amount),0), coalesce(sum(litres),0) into c, cl from cash_collections where entry_date between from_d and to_d;
  select coalesce(sum(amount),0) into e from expenses where entry_date between from_d and to_d;
  select coalesce(sum(cost),0) into m from medical_records where entry_date between from_d and to_d;
  select coalesce(sum(amount),0) into lb from labour_payments where entry_date between from_d and to_d;
  return query select l, sl + cl, r + c, e, m, lb, c, r + c - e - m - lb, case when l > 0 then round((e + m + lb) / l, 2) else 0 end;
end $$;

create or replace function daily_series(from_d date, to_d date)
returns table (d date, litres numeric, sold numeric, revenue numeric, expense numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  select g::date,
    coalesce((select sum(litres) from milk_production where entry_date = g::date),0),
    coalesce((select sum(litres) from milk_sales where entry_date = g::date),0)
      + coalesce((select sum(litres) from cash_collections where entry_date = g::date),0),
    coalesce((select sum(amount) from milk_sales where entry_date = g::date),0)
      + coalesce((select sum(amount) from cash_collections where entry_date = g::date),0),
    coalesce((select sum(amount) from expenses where entry_date = g::date),0)
      + coalesce((select sum(amount) from labour_payments where entry_date = g::date),0)
  from generate_series(from_d, to_d, interval '1 day') g order by 1;
end $$;

grant execute on function admin_summary(date,date), daily_series(date,date) to authenticated;
