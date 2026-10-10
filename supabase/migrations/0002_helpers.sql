-- Helpers and audit/updated_at triggers

create or replace function today_ist() returns date language sql stable as
$$ select (now() at time zone 'Asia/Kolkata')::date $$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select role = 'admin' and active from profiles where id = auth.uid()), false) $$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce((select active from profiles where id = auth.uid()), false) $$;

-- Manager may touch a row only if its date is within the last N days (settings.manager_edit_days). Admin always.
create or replace function manager_can_edit(d date) returns boolean
language sql stable security definer set search_path = public as
$$ select is_admin() or (is_staff() and d >= today_ist() - (select manager_edit_days from settings where id = 1)) $$;

create or replace function set_updated_at() returns trigger language plpgsql as
$$ begin new.updated_at = now(); return new; end $$;

create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  uname text;
  rid uuid;
begin
  select full_name into uname from profiles where id = auth.uid();
  if (tg_table_name = 'settings') then
    rid := null;
  elsif (tg_op = 'DELETE') then
    rid := old.id;
  else
    rid := new.id;
  end if;
  insert into audit_log (user_id, user_name, action, table_name, record_id, old_data, new_data, created_by)
  values (auth.uid(), uname, tg_op, tg_table_name, rid,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
          auth.uid());
  if (tg_op = 'DELETE') then return old; end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','animals','milk_production','customers','milk_sales','customer_payments','expenses','medical_records','settings']
  loop
    execute format('create trigger trg_%1$s_updated before update on %1$s for each row execute function set_updated_at()', t);
    execute format('create trigger trg_%1$s_audit after insert or update or delete on %1$s for each row execute function audit_trigger()', t);
  end loop;
end $$;
