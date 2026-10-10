-- Let managers add and edit workers (labourers), so they can record labour payments.
-- Deleting workers stays admin-only. Safe to run more than once.

drop policy if exists labourers_admin_write on labourers;
drop policy if exists labourers_insert on labourers;
drop policy if exists labourers_update on labourers;
drop policy if exists labourers_delete on labourers;

create policy labourers_insert on labourers for insert with check (is_staff());
create policy labourers_update on labourers for update using (is_staff()) with check (is_staff());
create policy labourers_delete on labourers for delete using (is_admin());

-- Summary of what a manager can now do (rules already in place from earlier migrations):
--   expenses           : insert/update for the last N days (manager_can_edit), no delete
--   cash_collections   : insert/update for the last N days, no delete
--   labour_payments    : insert/update for the last N days, no delete
--   labourers          : insert/update (this file), no delete
