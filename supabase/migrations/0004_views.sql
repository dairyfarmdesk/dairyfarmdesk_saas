-- Admin-only reporting functions (profit etc.). Managers get an error.

create or replace function customer_ledger()
returns table (customer_id uuid, name text, phone text, opening numeric, supplied numeric, paid numeric, outstanding numeric)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.phone, c.opening_balance,
    coalesce((select sum(amount) from milk_sales s where s.customer_id = c.id),0),
    coalesce((select sum(amount) from customer_payments p where p.customer_id = c.id),0),
    c.opening_balance
      + coalesce((select sum(amount) from milk_sales s where s.customer_id = c.id),0)
      - coalesce((select sum(amount) from customer_payments p where p.customer_id = c.id),0)
  from customers c where is_staff();
$$;

create or replace function admin_summary(from_d date, to_d date)
returns table (litres numeric, sold_litres numeric, revenue numeric, expenses numeric, medical numeric, profit numeric, cost_per_litre numeric)
language plpgsql stable security definer set search_path = public as $$
declare l numeric; sl numeric; r numeric; e numeric; m numeric;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select coalesce(sum(litres),0) into l from milk_production where entry_date between from_d and to_d;
  select coalesce(sum(litres),0), coalesce(sum(amount),0) into sl, r from milk_sales where entry_date between from_d and to_d;
  select coalesce(sum(amount),0) into e from expenses where entry_date between from_d and to_d;
  select coalesce(sum(cost),0) into m from medical_records where entry_date between from_d and to_d;
  return query select l, sl, r, e, m, r - e - m, case when l > 0 then round((e + m) / l, 2) else 0 end;
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
  from generate_series(from_d, to_d, interval '1 day') g order by 1;
end $$;

-- Animals currently under milk withdrawal (any staff)
create or replace function animals_under_withdrawal()
returns table (animal_id uuid, tag_no text, medicine text, until date)
language sql stable security definer set search_path = public as $$
  select a.id, a.tag_no, m.medicine, (m.entry_date + m.withdrawal_days)
  from medical_records m join animals a on a.id = m.animal_id
  where is_staff() and m.withdrawal_days > 0 and today_ist() <= m.entry_date + m.withdrawal_days;
$$;

grant execute on function customer_ledger(), animals_under_withdrawal() to authenticated;
grant execute on function admin_summary(date,date), daily_series(date,date) to authenticated;
