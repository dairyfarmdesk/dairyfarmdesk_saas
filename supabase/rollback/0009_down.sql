-- Rollback for 0009_saas_tenancy.sql. Restores the single-farm rules from migrations 0003 / 0005 / 0006 / 0007 / 0008.
-- Safe ONLY while exactly one farm exists (Farm #1). If other farms were created, export/delete them first,
-- otherwise their rows would become visible to Farm #1's users again. The farm_id columns are left in place (harmless).
-- Take a database backup before running.

do $$
begin
  if (select count(*) from farms) > 1 then
    raise exception 'More than one farm exists - rollback refused. Remove the extra farms first.';
  end if;
end $$;

-- drop all multi-farm policies
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
           where schemaname = current_schema()
             and tablename in ('profiles','settings','animals','customers','milk_production','milk_sales','customer_payments',
                               'expenses','medical_records','audit_log','labourers','labour_payments','cash_collections','farms')
  loop
    execute format('drop policy %I on %I', p.policyname, p.tablename);
  end loop;
end $$;

-- single-farm policies (as left by migrations 0003-0008)
create policy profiles_select on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_admin_write on profiles for all using (is_admin()) with check (is_admin());
create policy settings_select on settings for select using (is_staff());
create policy settings_admin_write on settings for update using (is_admin()) with check (is_admin());
create policy animals_select on animals for select using (is_staff());
create policy animals_admin_write on animals for all using (is_admin()) with check (is_admin());

do $$
declare t text;
begin
  foreach t in array array['customers','labourers']
  loop
    execute format('create policy %1$s_select on %1$s for select using (is_staff())', t);
    execute format('create policy %1$s_insert on %1$s for insert with check (is_staff())', t);
    execute format('create policy %1$s_update on %1$s for update using (is_staff()) with check (is_staff())', t);
    execute format('create policy %1$s_delete on %1$s for delete using (is_staff())', t);
  end loop;
  foreach t in array array['milk_production','milk_sales','customer_payments','expenses','medical_records','labour_payments','cash_collections']
  loop
    execute format('create policy %1$s_select on %1$s for select using (is_staff())', t);
    execute format('create policy %1$s_insert on %1$s for insert with check (manager_can_edit(entry_date))', t);
    execute format('create policy %1$s_update on %1$s for update using (manager_can_edit(entry_date)) with check (manager_can_edit(entry_date))', t);
    execute format('create policy %1$s_delete on %1$s for delete using (manager_can_edit(entry_date))', t);
  end loop;
end $$;
create policy audit_select on audit_log for select using (is_admin());

-- single-farm helper functions
create or replace function manager_can_edit(d date) returns boolean
language sql stable security definer set search_path = public as
$$ select is_admin() or (is_staff() and d >= today_ist() - (select manager_edit_days from settings where id = 1)) $$;

create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as
$$
declare uname text; rid uuid;
begin
  select full_name into uname from profiles where id = auth.uid();
  if (tg_table_name = 'settings') then rid := null;
  elsif (tg_op = 'DELETE') then rid := old.id;
  else rid := new.id; end if;
  insert into audit_log (user_id, user_name, action, table_name, record_id, old_data, new_data, created_by)
  values (auth.uid(), uname, tg_op, tg_table_name, rid,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end, auth.uid());
  if (tg_op = 'DELETE') then return old; end if;
  return new;
end $$;

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

create or replace function animals_under_withdrawal()
returns table (animal_id uuid, tag_no text, medicine text, until date)
language sql stable security definer set search_path = public as $$
  select a.id, a.tag_no, m.medicine, (m.entry_date + m.withdrawal_days)
  from medical_records m join animals a on a.id = m.animal_id
  where is_staff() and m.withdrawal_days > 0 and today_ist() <= m.entry_date + m.withdrawal_days;
$$;

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

-- tag numbers globally unique again, settings pinned to one row again
drop index if exists animals_farm_tag_key;
alter table animals add constraint animals_tag_no_key unique (tag_no);
drop index if exists settings_farm_id_key;
alter table settings alter column id set default 1;
alter table settings add constraint settings_id_check check (id = 1);

-- remove same-farm triggers and platform functions (the farms / platform_admins tables are kept; drop them by hand if wanted)
do $$
declare r record;
begin
  for r in select * from (values ('milk_production'),('medical_records'),('milk_sales'),('customer_payments'),('labour_payments')) v(t)
  loop execute format('drop trigger if exists trg_%1$s_samefarm on %1$s', r.t); end loop;
end $$;
drop function if exists enforce_same_farm();
drop function if exists platform_create_farm(text, uuid, text, text, text);
drop function if exists platform_set_farm_status(uuid, text);
drop function if exists platform_farms();

-- STORAGE-BEGIN
drop policy if exists "staff upload media" on storage.objects;
create policy "staff upload media" on storage.objects for insert to authenticated
  with check (bucket_id in ('animal-photos','bills') and is_staff());
drop policy if exists "admin upload logo" on storage.objects;
create policy "admin upload logo" on storage.objects for insert to authenticated
  with check (bucket_id = 'logo' and is_admin());
drop policy if exists "admin update media" on storage.objects;
create policy "admin update media" on storage.objects for update to authenticated using (is_admin());
-- STORAGE-END
