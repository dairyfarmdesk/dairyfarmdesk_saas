-- Row Level Security policies

alter table profiles enable row level security;
alter table settings enable row level security;
alter table animals enable row level security;
alter table milk_production enable row level security;
alter table customers enable row level security;
alter table milk_sales enable row level security;
alter table customer_payments enable row level security;
alter table expenses enable row level security;
alter table medical_records enable row level security;
alter table audit_log enable row level security;

-- profiles: own row readable, admin all. Managers are created by the Edge Function (service role).
create policy profiles_select on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_admin_write on profiles for all using (is_admin()) with check (is_admin());

-- settings: any staff read, admin update
create policy settings_select on settings for select using (is_staff());
create policy settings_admin_write on settings for update using (is_admin()) with check (is_admin());

-- animals: staff read, admin add/edit/archive/delete
create policy animals_select on animals for select using (is_staff());
create policy animals_admin_write on animals for all using (is_admin()) with check (is_admin());

-- customers: staff read/insert/update, admin delete
create policy customers_select on customers for select using (is_staff());
create policy customers_insert on customers for insert with check (is_staff());
create policy customers_update on customers for update using (is_staff()) with check (is_staff());
create policy customers_delete on customers for delete using (is_admin());

-- Dated tables: staff read; insert/update only inside edit window (admin always); delete admin only
do $$
declare t text;
begin
  foreach t in array array['milk_production','milk_sales','customer_payments','expenses','medical_records']
  loop
    execute format('create policy %1$s_select on %1$s for select using (is_staff())', t);
    execute format('create policy %1$s_insert on %1$s for insert with check (manager_can_edit(entry_date))', t);
    execute format('create policy %1$s_update on %1$s for update using (manager_can_edit(entry_date)) with check (manager_can_edit(entry_date))', t);
    execute format('create policy %1$s_delete on %1$s for delete using (is_admin())', t);
  end loop;
end $$;

-- audit log: admin read only (rows are written by the security definer trigger)
create policy audit_select on audit_log for select using (is_admin());

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('animal-photos','animal-photos', true),
  ('bills','bills', true),
  ('logo','logo', true)
on conflict do nothing;

create policy "staff upload media" on storage.objects for insert to authenticated
  with check (bucket_id in ('animal-photos','bills') and is_staff());
create policy "admin upload logo" on storage.objects for insert to authenticated
  with check (bucket_id = 'logo' and is_admin());
create policy "admin update media" on storage.objects for update to authenticated
  using (is_admin());
create policy "public read media" on storage.objects for select
  using (bucket_id in ('animal-photos','bills','logo'));
