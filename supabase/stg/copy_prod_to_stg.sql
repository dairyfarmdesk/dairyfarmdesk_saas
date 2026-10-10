-- GENERATED: copies production data (schema public) into the staging schema (stg). Run once, after stg_schema.sql.
-- Only READS from public; only WRITES to stg. Existing rows in stg are removed first.
do $$
declare t text; cols text; vals text;
begin
  foreach t in array array['farms','platform_admins','profiles','settings','animals','milk_production','customers','milk_sales','customer_payments','expenses','medical_records','audit_log','labourers','labour_payments','cash_collections'] loop
    execute format('alter table stg.%I disable trigger user', t);
    execute format('truncate stg.%I cascade', t);
  end loop;
  foreach t in array array['farms','platform_admins','profiles','settings','animals','milk_production','customers','milk_sales','customer_payments','expenses','medical_records','audit_log','labourers','labour_payments','cash_collections'] loop
    -- columns are cast through text because stg has its own copies of the enum types (user_role, shift_t, ...)
    select string_agg(format('%I', c.column_name), ',' order by c.ordinal_position),
           string_agg(format('p.%I::text::%s', c.column_name,
             case when c.data_type = 'USER-DEFINED' then 'stg.' || c.udt_name else format_type(a.atttypid, a.atttypmod) end),
             ',' order by c.ordinal_position)
      into cols, vals
      from information_schema.columns c
      join pg_attribute a on a.attrelid = format('stg.%I', t)::regclass and a.attname = c.column_name
      where c.table_schema = 'stg' and c.table_name = t and c.is_generated = 'NEVER'
        and exists (select 1 from information_schema.columns p where p.table_schema = 'public' and p.table_name = t and p.column_name = c.column_name);
    execute format('insert into stg.%1$I (%2$s) select %3$s from public.%1$I p', t, cols, vals);
  end loop;
  foreach t in array array['farms','platform_admins','profiles','settings','animals','milk_production','customers','milk_sales','customer_payments','expenses','medical_records','audit_log','labourers','labour_payments','cash_collections'] loop
    execute format('alter table stg.%I enable trigger user', t);
  end loop;
  perform setval('stg.settings_id_seq', greatest(2, (select coalesce(max(id), 1) + 1 from stg.settings)), false);
end $$;
