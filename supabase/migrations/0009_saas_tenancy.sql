-- 0009: multi-farm (SaaS) tenancy. Run after 0008. Safe to run more than once.
--
-- Every row now belongs to a farm. Your current data becomes "Farm #1" (id 00000000-0000-0000-0000-000000000001).
-- Nothing is removed and the current web/Android app keeps working unchanged:
--   * farm_id on every table defaults to the signed-in user's farm, so existing inserts need no change;
--   * SQL-editor / seed inserts (no signed-in user) default to Farm #1;
--   * the old "settings where id = 1" lookup still returns Farm #1's row.
-- Row Level Security is rewritten so a user only ever sees / changes rows of their own farm.
-- A suspended farm is read-only (reads work, writes are refused). Rollback: supabase/rollback/0009_down.sql
--
-- Functions use "set search_path = public"; scripts/build-stg-sql.mjs rewrites that to "stg" for the staging schema.

-- ---------- farms + platform owners ----------
create table if not exists farms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active','suspended')),
  plan text not null default 'free',            -- placeholder for future billing
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into farms (id, name)
select '00000000-0000-0000-0000-000000000001'::uuid, coalesce((select farm_name from settings where id = 1), 'My Farm')
on conflict (id) do nothing;

-- Platform owners (may use the /platform page). No policies on purpose: only SECURITY DEFINER functions read it.
create table if not exists platform_admins (
  email text primary key,
  created_at timestamptz not null default now()
);
insert into platform_admins (email) values ('sunilkibm480@gmail.com') on conflict do nothing;
alter table platform_admins enable row level security;
alter table farms enable row level security;

drop trigger if exists trg_farms_updated on farms;
create trigger trg_farms_updated before update on farms for each row execute function set_updated_at();

-- ---------- helper functions ----------
create or replace function farm1_id() returns uuid language sql immutable as
$$ select '00000000-0000-0000-0000-000000000001'::uuid $$;

alter table profiles add column if not exists farm_id uuid references farms(id);
alter table profiles disable trigger user;
update profiles set farm_id = farm1_id() where farm_id is null;
alter table profiles enable trigger user;

create or replace function current_farm_id() returns uuid
language sql stable security definer set search_path = public as
$$ select farm_id from profiles where id = auth.uid() and active $$;

-- Default for farm_id columns: the caller's farm; Farm #1 when there is no signed-in user (SQL editor / seeds).
create or replace function default_farm_id() returns uuid
language sql stable security definer set search_path = public as
$$ select case when auth.uid() is null then farm1_id()
               else (select farm_id from profiles where id = auth.uid() and active) end $$;

-- False when the caller's farm is suspended (or the caller has no farm). Used to make suspended farms read-only.
create or replace function farm_writable() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select f.status = 'active' from farms f where f.id = current_farm_id()), false) $$;

create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from platform_admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))) $$;

alter table profiles alter column farm_id set default default_farm_id();
alter table profiles alter column farm_id set not null;

-- ---------- farm_id on every data table ----------
do $$
declare t text;
begin
  foreach t in array array['settings','animals','milk_production','customers','milk_sales','customer_payments','expenses',
                           'medical_records','audit_log','labourers','labour_payments','cash_collections']
  loop
    execute format('alter table %I add column if not exists farm_id uuid references farms(id)', t);
    -- triggers off during the backfill so it does not rewrite updated_at or flood the audit log
    execute format('alter table %I disable trigger user', t);
    execute format('update %I set farm_id = farm1_id() where farm_id is null', t);
    execute format('alter table %I enable trigger user', t);
    execute format('alter table %I alter column farm_id set default default_farm_id()', t);
    execute format('alter table %I alter column farm_id set not null', t);
    execute format('create index if not exists %I on %I (farm_id)', t || '_farm_id_idx', t);
  end loop;
end $$;

-- ---------- settings: one row per farm (Farm #1 keeps id = 1) ----------
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'settings'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%id = 1%' loop
    execute format('alter table settings drop constraint %I', c.conname);   -- the old "check (id = 1)"
  end loop;
end $$;
create sequence if not exists settings_id_seq start 2;
alter table settings alter column id set default nextval('settings_id_seq');
create unique index if not exists settings_farm_id_key on settings (farm_id);

-- ---------- animal tag numbers are unique per farm, not globally ----------
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'animals'::regclass and contype = 'u' and pg_get_constraintdef(oid) = 'UNIQUE (tag_no)' loop
    execute format('alter table animals drop constraint %I', c.conname);
  end loop;
end $$;
create unique index if not exists animals_farm_tag_key on animals (farm_id, tag_no);

-- ---------- a child row must belong to the same farm as the parent it points at ----------
create or replace function enforce_same_farm() returns trigger
language plpgsql security definer set search_path = public as $$
declare pf uuid; fk uuid;
begin
  fk := nullif(to_jsonb(new) ->> tg_argv[1], '')::uuid;
  execute format('select farm_id from %I where id = $1', tg_argv[0]) into pf using fk;
  if pf is distinct from new.farm_id then
    raise exception 'cross-farm reference not allowed (% -> %)', tg_table_name, tg_argv[0] using errcode = '23514';
  end if;
  return new;
end $$;

do $$
declare r record;
begin
  for r in select * from (values
    ('milk_production','animals','animal_id'), ('medical_records','animals','animal_id'),
    ('milk_sales','customers','customer_id'), ('customer_payments','customers','customer_id'),
    ('labour_payments','labourers','labour_id')) v(child, parent, col)
  loop
    execute format('drop trigger if exists trg_%1$s_samefarm on %1$s', r.child);
    execute format('create trigger trg_%1$s_samefarm before insert or update on %1$s for each row execute function enforce_same_farm(%2$L, %3$L)',
                   r.child, r.parent, r.col);
  end loop;
end $$;

-- ---------- manager edit window now comes from the caller's own farm; suspended farms cannot write ----------
create or replace function manager_can_edit(d date) returns boolean
language sql stable security definer set search_path = public as
$$ select farm_writable() and (is_admin() or (is_staff() and d >= today_ist() -
     coalesce((select manager_edit_days from settings where farm_id = current_farm_id()), 2))) $$;

-- ---------- audit log records the farm of the changed row ----------
create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  uname text;
  rid uuid;
  fid uuid;
  j jsonb;
begin
  select full_name into uname from profiles where id = auth.uid();
  j := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  fid := nullif(j ->> 'farm_id', '')::uuid;
  if (tg_table_name = 'settings') then
    rid := null;
  elsif (tg_op = 'DELETE') then
    rid := old.id;
  else
    rid := new.id;
  end if;
  insert into audit_log (farm_id, user_id, user_name, action, table_name, record_id, old_data, new_data, created_by)
  values (coalesce(fid, farm1_id()), auth.uid(), uname, tg_op, tg_table_name, rid,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
          auth.uid());
  if (tg_op = 'DELETE') then return old; end if;
  return new;
end $$;

-- ---------- Row Level Security: replace EVERY policy (a leftover permissive policy would leak across farms) ----------
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

create policy farms_select on farms for select using (id = current_farm_id());

create policy profiles_select on profiles for select
  using (id = auth.uid() or (farm_id = current_farm_id() and is_admin()));
create policy profiles_admin_write on profiles for all
  using (farm_id = current_farm_id() and is_admin() and farm_writable())
  with check (farm_id = current_farm_id() and is_admin() and farm_writable());

create policy settings_select on settings for select using (farm_id = current_farm_id() and is_staff());
create policy settings_admin_write on settings for update
  using (farm_id = current_farm_id() and is_admin() and farm_writable())
  with check (farm_id = current_farm_id() and is_admin() and farm_writable());

create policy animals_select on animals for select using (farm_id = current_farm_id() and is_staff());
create policy animals_admin_write on animals for all
  using (farm_id = current_farm_id() and is_admin() and farm_writable())
  with check (farm_id = current_farm_id() and is_admin() and farm_writable());

-- customers and workers: any staff of the farm can read, add, edit and delete
do $$
declare t text;
begin
  foreach t in array array['customers','labourers']
  loop
    execute format('create policy %1$s_select on %1$s for select using (farm_id = current_farm_id() and is_staff())', t);
    execute format('create policy %1$s_insert on %1$s for insert with check (farm_id = current_farm_id() and is_staff() and farm_writable())', t);
    execute format('create policy %1$s_update on %1$s for update using (farm_id = current_farm_id() and is_staff() and farm_writable()) with check (farm_id = current_farm_id() and is_staff() and farm_writable())', t);
    execute format('create policy %1$s_delete on %1$s for delete using (farm_id = current_farm_id() and is_staff() and farm_writable())', t);
  end loop;
end $$;

-- dated records: staff read; add / edit / delete only inside the manager edit window (admin: any date)
do $$
declare t text;
begin
  foreach t in array array['milk_production','milk_sales','customer_payments','expenses','medical_records','labour_payments','cash_collections']
  loop
    execute format('create policy %1$s_select on %1$s for select using (farm_id = current_farm_id() and is_staff())', t);
    execute format('create policy %1$s_insert on %1$s for insert with check (farm_id = current_farm_id() and manager_can_edit(entry_date))', t);
    execute format('create policy %1$s_update on %1$s for update using (farm_id = current_farm_id() and manager_can_edit(entry_date)) with check (farm_id = current_farm_id() and manager_can_edit(entry_date))', t);
    execute format('create policy %1$s_delete on %1$s for delete using (farm_id = current_farm_id() and manager_can_edit(entry_date))', t);
  end loop;
end $$;

create policy audit_select on audit_log for select using (farm_id = current_farm_id() and is_admin());

-- ---------- reports only count the caller's farm ----------
create or replace function customer_ledger()
returns table (customer_id uuid, name text, phone text, opening numeric, supplied numeric, paid numeric, outstanding numeric)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.phone, c.opening_balance,
    coalesce((select sum(amount) from milk_sales s where s.customer_id = c.id),0),
    coalesce((select sum(amount) from customer_payments p where p.customer_id = c.id),0),
    c.opening_balance
      + coalesce((select sum(amount) from milk_sales s where s.customer_id = c.id),0)
      - coalesce((select sum(amount) from customer_payments p where p.customer_id = c.id),0)
  from customers c where is_staff() and c.farm_id = current_farm_id();
$$;

create or replace function animals_under_withdrawal()
returns table (animal_id uuid, tag_no text, medicine text, until date)
language sql stable security definer set search_path = public as $$
  select a.id, a.tag_no, m.medicine, (m.entry_date + m.withdrawal_days)
  from medical_records m join animals a on a.id = m.animal_id
  where is_staff() and m.farm_id = current_farm_id() and m.withdrawal_days > 0 and today_ist() <= m.entry_date + m.withdrawal_days;
$$;

create or replace function admin_summary(from_d date, to_d date)
returns table (litres numeric, sold_litres numeric, revenue numeric, expenses numeric, medical numeric, labour numeric, cash numeric, profit numeric, cost_per_litre numeric)
language plpgsql stable security definer set search_path = public as $$
declare l numeric; sl numeric; r numeric; e numeric; m numeric; lb numeric; c numeric; cl numeric; fid uuid := current_farm_id();
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select coalesce(sum(x.litres),0) into l from milk_production x where x.farm_id = fid and x.entry_date between from_d and to_d;
  select coalesce(sum(x.litres),0), coalesce(sum(x.amount),0) into sl, r from milk_sales x where x.farm_id = fid and x.entry_date between from_d and to_d;
  select coalesce(sum(x.amount),0), coalesce(sum(x.litres),0) into c, cl from cash_collections x where x.farm_id = fid and x.entry_date between from_d and to_d;
  select coalesce(sum(x.amount),0) into e from expenses x where x.farm_id = fid and x.entry_date between from_d and to_d;
  select coalesce(sum(x.cost),0) into m from medical_records x where x.farm_id = fid and x.entry_date between from_d and to_d;
  select coalesce(sum(x.amount),0) into lb from labour_payments x where x.farm_id = fid and x.entry_date between from_d and to_d;
  return query select l, sl + cl, r + c, e, m, lb, c, r + c - e - m - lb, case when l > 0 then round((e + m + lb) / l, 2) else 0 end;
end $$;

create or replace function daily_series(from_d date, to_d date)
returns table (d date, litres numeric, sold numeric, revenue numeric, expense numeric)
language plpgsql stable security definer set search_path = public as $$
declare fid uuid := current_farm_id();
begin
  if not is_admin() then raise exception 'admin only'; end if;
  return query
  select g::date,
    coalesce((select sum(x.litres) from milk_production x where x.farm_id = fid and x.entry_date = g::date),0),
    coalesce((select sum(x.litres) from milk_sales x where x.farm_id = fid and x.entry_date = g::date),0)
      + coalesce((select sum(x.litres) from cash_collections x where x.farm_id = fid and x.entry_date = g::date),0),
    coalesce((select sum(x.amount) from milk_sales x where x.farm_id = fid and x.entry_date = g::date),0)
      + coalesce((select sum(x.amount) from cash_collections x where x.farm_id = fid and x.entry_date = g::date),0),
    coalesce((select sum(x.amount) from expenses x where x.farm_id = fid and x.entry_date = g::date),0)
      + coalesce((select sum(x.amount) from labour_payments x where x.farm_id = fid and x.entry_date = g::date),0)
  from generate_series(from_d, to_d, interval '1 day') g order by 1;
end $$;

-- ---------- platform owner functions (the /platform page) ----------
create or replace function platform_farms()
returns table (farm_id uuid, farm_name text, status text, plan text, created_at timestamptz,
               user_count bigint, animal_count bigint, customer_count bigint, last_activity timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'platform admin only'; end if;
  return query
  select f.id, f.name, f.status, f.plan, f.created_at,
    (select count(*) from profiles p where p.farm_id = f.id),
    (select count(*) from animals a where a.farm_id = f.id and not a.archived),
    (select count(*) from customers c where c.farm_id = f.id),
    (select max(l.created_at) from audit_log l where l.farm_id = f.id)
  from farms f order by f.created_at;
end $$;

create or replace function platform_set_farm_status(p_farm uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'platform admin only'; end if;
  if p_status not in ('active','suspended') then raise exception 'invalid status'; end if;
  update farms set status = p_status where id = p_farm;
end $$;

-- Called only by the create-farm Edge Function (service role): one farm + its settings + the owner's admin profile.
create or replace function platform_create_farm(p_name text, p_owner uuid, p_owner_name text, p_email text, p_phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if coalesce(trim(p_name), '') = '' then raise exception 'farm name required'; end if;
  insert into farms (name) values (trim(p_name)) returning id into fid;
  insert into settings (farm_id, farm_name) values (fid, trim(p_name));
  insert into profiles (id, full_name, email, phone, role, active, farm_id)
  values (p_owner, coalesce(p_owner_name, ''), p_email, nullif(p_phone, ''), 'admin', true, fid);
  return fid;
end $$;

revoke all on function platform_create_farm(text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function platform_farms() from public, anon;
revoke all on function platform_set_farm_status(uuid, text) from public, anon;
grant execute on function platform_farms(), platform_set_farm_status(uuid, text) to authenticated;
grant execute on function platform_create_farm(text, uuid, text, text, text) to service_role;
grant execute on function current_farm_id(), is_platform_admin(), farm_writable(), customer_ledger(), animals_under_withdrawal() to authenticated;
grant execute on function admin_summary(date, date), daily_series(date, date) to authenticated;

-- STORAGE-BEGIN (skipped for the staging schema: storage is shared by the whole Supabase project)
-- New uploads go to <farm id>/<file>. Uploads without a folder (older app versions) are still accepted.
drop policy if exists "staff upload media" on storage.objects;
create policy "staff upload media" on storage.objects for insert to authenticated
  with check (bucket_id in ('animal-photos','bills') and is_staff()
              and ((storage.foldername(name))[1] = current_farm_id()::text or array_length(storage.foldername(name), 1) is null));
drop policy if exists "admin upload logo" on storage.objects;
create policy "admin upload logo" on storage.objects for insert to authenticated
  with check (bucket_id = 'logo' and is_admin()
              and ((storage.foldername(name))[1] = current_farm_id()::text or array_length(storage.foldername(name), 1) is null));
drop policy if exists "admin update media" on storage.objects;
create policy "admin update media" on storage.objects for update to authenticated
  using (is_admin() and ((storage.foldername(name))[1] = current_farm_id()::text or array_length(storage.foldername(name), 1) is null));
-- STORAGE-END
