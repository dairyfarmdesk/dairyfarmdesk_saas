// Two-farm isolation + "nothing breaks for Farm #1" test. Runs entirely in a local in-memory Postgres (PGlite).
//   node scripts/saas/test-tenancy.mjs
import { newDb, runFiles, grantApi, BASE_MIGRATIONS, read, q, as, asService, tryRun } from './harness.mjs'

let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ok   ' + name) } else { fail++; console.log('  FAIL ' + name) } }
const F1 = '00000000-0000-0000-0000-000000000001'
const U = (n) => `00000000-0000-0000-0000-0000000000${n}`
const ADMIN1 = U(11), MGR1 = U(12), ADMIN2 = U(21), MGR2 = U(22), PLAT = U(99)
const PEMAIL = { email: 'sunilkibm480@gmail.com' }

const db = await newDb()
console.log('1. Build the CURRENT production schema (migrations 0001-0008) with data for the existing farm')
await runFiles(db, BASE_MIGRATIONS)
await grantApi(db)
await db.exec(`
  insert into auth.users (id, email) values ('${ADMIN1}','admin1@x.com'),('${MGR1}','mgr1@x.com');
  insert into profiles (id, full_name, email, role) values ('${ADMIN1}','Admin One','admin1@x.com','admin'),('${MGR1}','Mgr One','mgr1@x.com','manager');
  update settings set farm_name = 'Old Farm', manager_edit_days = 3 where id = 1;
  insert into animals (tag_no, name) values ('C-1','Gauri'),('C-2','Ganga');
  insert into customers (name, default_rate) values ('Sharma', 60),('Verma', 55);
  insert into milk_production (animal_id, entry_date, shift, litres) select id, current_date, 'Morning', 10 from animals;
  insert into milk_sales (customer_id, entry_date, shift, litres, rate) select id, current_date, 'Morning', 2, 60 from customers;
  insert into customer_payments (customer_id, entry_date, amount) select id, current_date, 50 from customers limit 1;
  insert into expenses (entry_date, item_name, amount) values (current_date, 'Feed', 1000);
  insert into cash_collections (entry_date, amount) values (current_date, 200);
  insert into labourers (name, monthly_salary) values ('Ramu', 9000);
  insert into labour_payments (labour_id, entry_date, amount) select id, current_date, 500 from labourers;
`)
const safe = async (fn) => { try { return await fn() } catch (e) { return 'ERROR: ' + String(e.message).slice(0, 60) } }
const snap = async () => as(db, ADMIN1, async () => ({
  // The ORIGINAL admin_summary / daily_series (migrations 0004-0006) fail with "column reference litres is ambiguous";
  // the 0009 versions fix that. So only the ledger and the row counts can be compared before vs after.
  summary: await safe(() => q(db, 'select * from admin_summary(current_date - 5, current_date)')),
  series: await safe(() => q(db, 'select * from daily_series(current_date - 2, current_date)')),
  ledger: await q(db, 'select * from customer_ledger() order by name'),
  counts: await q(db, `select (select count(*) from animals) a, (select count(*) from milk_production) m, (select count(*) from milk_sales) s,
                              (select count(*) from customers) c, (select count(*) from expenses) e, (select count(*) from labour_payments) l`),
}))
const stable = (s) => JSON.stringify({ ledger: s.ledger, counts: s.counts })
const before = await snap()
console.log('  note original reports: ' + (typeof before.summary === 'string' ? before.summary : 'work'))
const auditBefore = (await q(db, 'select count(*) n from audit_log'))[0].n

console.log('2. Run the NEW migration 0009 on top of it')
await runFiles(db, ['supabase/migrations/0009_saas_tenancy.sql'])
await grantApi(db)
await runFiles(db, ['supabase/migrations/0009_saas_tenancy.sql'])    // running it twice must be harmless
ok(true, '0009 applies cleanly, and a second run is harmless')

console.log('3. Farm #1 is unchanged')
const after = await snap()
ok(stable(before) === stable(after), 'customer ledger and all row counts identical before/after')
const sm = after.summary[0]
ok(Number(sm.litres) === 20 && Number(sm.revenue) === 440 && Number(sm.expenses) === 1000 && Number(sm.labour) === 500 && Number(sm.profit) === -1060 && Number(sm.cost_per_litre) === 75,
  'admin_summary now returns the right Farm #1 numbers (20 L, revenue 440 incl. 200 cash, expenses 1000, labour 500, profit -1060)')
ok(after.series.length === 3 && Number(after.series[2].litres) === 20, 'daily_series works for Farm #1')
ok((await q(db, 'select count(*) n from audit_log'))[0].n === auditBefore, 'backfill did not create audit-log noise')
ok((await q(db, 'select count(*) n from farms'))[0].n === 1, 'exactly one farm (Farm #1) exists after migrating')
ok((await q(db, `select count(*) n from (select farm_id from animals union select farm_id from milk_sales union select farm_id from expenses
    union select farm_id from settings union select farm_id from profiles) x where farm_id <> '${F1}'`))[0].n === 0, 'every existing row belongs to Farm #1')
ok((await q(db, 'select id, farm_name, manager_edit_days from settings'))[0].id === 1, 'Farm #1 settings keep id = 1 (old app lookup still works)')

console.log('4. The existing app still works for Farm #1 (no farm_id sent)')
await as(db, MGR1, async () => {
  await db.exec(`insert into customers (name) values ('Added by manager')`)
  const c = (await q(db, `select farm_id from customers where name='Added by manager'`))[0]
  ok(c.farm_id === F1, 'insert without farm_id lands in the user\'s farm')
  await db.exec(`insert into expenses (entry_date, item_name, amount) values (current_date, 'Mgr expense', 10)`)
  ok(true, 'manager can add an expense (inside the edit window)')
  ok((await tryRun(() => db.exec(`insert into expenses (entry_date, item_name, amount) values (current_date - 10, 'Too old', 10)`))) !== null, 'manager still blocked outside the edit window (3 days, from Farm #1 settings)')
  await db.exec(`delete from customers where name='Added by manager'`)
  ok(true, 'manager can delete a customer (migration 0008 behaviour kept)')
  await db.exec(`delete from animals`)
  ok((await q(db, 'select count(*) n from animals'))[0].n === 2, 'manager still cannot delete animals (0 rows deleted)')
})
await as(db, ADMIN1, async () => {
  await db.exec(`update settings set farm_name = 'Renamed' where id = 1`)
  ok((await q(db, 'select farm_name from settings where id = 1'))[0].farm_name === 'Renamed', 'admin can still update settings where id = 1')
})

console.log('5. Create a SECOND farm the same way the create-farm function does')
await db.exec(`insert into auth.users (id, email) values ('${ADMIN2}','admin2@y.com'),('${MGR2}','mgr2@y.com'),('${PLAT}','sunilkibm480@gmail.com')`)
const f2 = (await asService(db, () => q(db, `select platform_create_farm('Second Farm','${ADMIN2}','Admin Two','admin2@y.com','999') id`)))[0].id
await asService(db, () => db.exec(`insert into profiles (id, full_name, email, role, farm_id) values ('${MGR2}','Mgr Two','mgr2@y.com','manager','${f2}')`))
ok(!!f2 && f2 !== F1, 'platform_create_farm returns a new farm id')
ok((await q(db, `select count(*) n from settings where farm_id='${f2}'`))[0].n === 1, 'new farm gets its own settings row')
await as(db, ADMIN2, async () => {
  await db.exec(`insert into animals (tag_no, name) values ('C-1','Same tag, other farm')`)
  ok(true, 'the same animal tag number can exist in two farms')
  await db.exec(`insert into customers (name, default_rate) values ('Farm2 customer', 70)`)
  await db.exec(`insert into milk_production (animal_id, entry_date, shift, litres) select id, current_date, 'Morning', 99 from animals`)
  await db.exec(`insert into expenses (entry_date, item_name, amount) values (current_date, 'Farm2 expense', 7777)`)
  await db.exec(`insert into labourers (name) values ('Farm2 worker')`)
})
ok((await tryRun(() => as(db, ADMIN2, () => db.exec(`insert into animals (tag_no) values ('C-1')`)))) !== null, 'duplicate tag inside ONE farm is still refused')

console.log('6. ISOLATION: farm 2 users cannot see or touch farm 1 (and vice versa)')
const tables = ['animals', 'milk_production', 'customers', 'milk_sales', 'customer_payments', 'expenses', 'medical_records', 'labourers', 'labour_payments', 'cash_collections', 'settings', 'profiles', 'audit_log']
for (const [who, uid, other] of [['farm2 admin', ADMIN2, F1], ['farm2 manager', MGR2, F1], ['farm1 admin', ADMIN1, f2], ['farm1 manager', MGR1, f2]]) {
  await as(db, uid, async () => {
    let leaked = 0
    for (const t of tables) leaked += Number((await q(db, `select count(*) n from ${t} where farm_id = '${other}'`))[0].n)
    ok(leaked === 0, `${who} sees 0 rows of the other farm across ${tables.length} tables`)
  })
}
await as(db, ADMIN2, async () => {
  ok((await q(db, 'select count(*) n from customers'))[0].n === 1, 'farm2 admin sees only its own customers')
  ok((await q(db, 'select count(*) n from profiles'))[0].n === 2, 'farm2 admin sees only its own 2 users')
  ok((await q(db, 'select count(*) n from farms'))[0].n === 1, 'farm2 admin sees only its own farm record')
})
await as(db, ADMIN2, async () => {
  const dml = [
    `update customers set name = 'HACKED' where farm_id = '${F1}'`, `delete from customers where farm_id = '${F1}'`, `delete from expenses where farm_id = '${F1}'`,
    `update settings set farm_name = 'HACKED' where farm_id = '${F1}'`, `update profiles set role = 'manager' where farm_id = '${F1}'`,
    `delete from animals where farm_id = '${F1}'`,
  ]
  for (const s of dml) await db.exec(s)       // allowed to run, but must affect 0 rows
})
const f1after = (await asService(db, () => q(db, `select (select count(*) from customers where farm_id='${F1}') c, (select count(*) from expenses where farm_id='${F1}') e,
  (select farm_name from settings where farm_id='${F1}') s, (select count(*) from animals where farm_id='${F1}') a, (select count(*) from profiles where farm_id='${F1}' and role='admin') adm`)))[0]
ok(Number(f1after.c) === 2 && Number(f1after.e) === 2 && f1after.s === 'Renamed' && Number(f1after.a) === 2 && Number(f1after.adm) === 1, 'farm2 admin\'s UPDATE/DELETE attempts changed nothing in farm 1')
ok((await tryRun(() => as(db, ADMIN2, () => db.exec(`insert into customers (name, farm_id) values ('x','${F1}')`)))) !== null, 'farm2 admin cannot insert a row INTO farm 1')
ok((await tryRun(() => as(db, ADMIN2, () => db.exec(`update customers set farm_id = '${F1}' where name = 'Farm2 customer'`)))) !== null, 'a row cannot be moved to another farm')
const c1 = (await asService(db, () => q(db, `select id from customers where farm_id='${F1}' limit 1`)))[0].id
ok((await tryRun(() => as(db, ADMIN2, () => db.exec(`insert into milk_sales (customer_id, entry_date, shift, litres, rate) values ('${c1}', current_date, 'Morning', 1, 1)`)))) !== null, 'cannot attach a sale to ANOTHER farm\'s customer')
const a1 = (await asService(db, () => q(db, `select id from animals where farm_id='${F1}' limit 1`)))[0].id
ok((await tryRun(() => as(db, ADMIN2, () => db.exec(`insert into medical_records (animal_id, entry_date, type) values ('${a1}', current_date, 'Checkup')`)))) !== null, 'cannot attach a medical record to ANOTHER farm\'s animal')

console.log('7. Reports are per farm')
await as(db, ADMIN2, async () => {
  const s = (await q(db, 'select * from admin_summary(current_date - 5, current_date)'))[0]
  ok(Number(s.litres) === 99 && Number(s.expenses) === 7777, 'admin_summary for farm 2 counts only farm 2 (99 L, expenses 7777)')
  ok((await q(db, 'select * from customer_ledger()')).length === 1, 'customer_ledger for farm 2 lists only farm 2 customers')
  ok(Number((await q(db, 'select sum(litres) l from daily_series(current_date, current_date)'))[0].l) === 99, 'daily_series for farm 2 counts only farm 2')
})
const reportsF1 = await snap()
ok(JSON.stringify(reportsF1.ledger) === JSON.stringify(after.ledger), 'farm 1 customer ledger unchanged after farm 2 added data')

console.log('8. Edit window is per farm')
await asService(db, () => db.exec(`update settings set manager_edit_days = 0 where farm_id = '${f2}'`))
ok((await tryRun(() => as(db, MGR2, () => db.exec(`insert into expenses (entry_date, item_name, amount) values (current_date - 1, 'old', 1)`)))) !== null, 'farm 2 (0 days) refuses yesterday')
ok((await tryRun(() => as(db, MGR1, () => db.exec(`insert into expenses (entry_date, item_name, amount) values (current_date - 2, 'ok', 1)`)))) === null, 'farm 1 (3 days) still accepts 2 days ago')

console.log('9. Platform owner and suspension')
ok((await tryRun(() => as(db, ADMIN2, () => q(db, 'select * from platform_farms()')))) !== null, 'a farm admin cannot call platform_farms()')
ok((await tryRun(() => as(db, ADMIN1, () => db.exec(`select platform_set_farm_status('${f2}','suspended')`)))) !== null, 'a farm admin cannot suspend farms')
ok((await tryRun(() => as(db, ADMIN1, () => db.exec(`select platform_create_farm('x', '${ADMIN1}','x','x','x')`)))) !== null, 'a logged-in user cannot call platform_create_farm directly')
await as(db, PLAT, async () => {
  const farms = await q(db, 'select * from platform_farms()')
  ok(farms.length === 2, 'platform owner lists both farms')
  ok(Number(farms.find((f) => f.farm_id === f2).animal_count) === 1, 'platform list shows usage counts')
  ok(Number((await q(db, 'select count(*) n from customers'))[0].n) === 0, 'platform owner (no farm profile) does NOT see farm data through normal tables')
}, PEMAIL)
await as(db, PLAT, () => db.exec(`select platform_set_farm_status('${f2}','suspended')`), PEMAIL)
await as(db, ADMIN2, async () => {
  ok(Number((await q(db, 'select count(*) n from customers'))[0].n) === 1, 'suspended farm can still READ its data')
})
ok((await tryRun(() => as(db, ADMIN2, () => db.exec(`insert into customers (name) values ('blocked')`)))) !== null, 'suspended farm cannot add customers')
ok((await tryRun(() => as(db, ADMIN2, () => db.exec(`insert into expenses (entry_date, item_name, amount) values (current_date, 'blocked', 1)`)))) !== null, 'suspended farm cannot add expenses')
await as(db, ADMIN2, () => db.exec(`update settings set farm_name = 'x'`))
ok((await asService(db, () => q(db, `select farm_name from settings where farm_id='${f2}'`)))[0].farm_name === 'Second Farm', 'suspended farm cannot change settings')
await as(db, PLAT, () => db.exec(`select platform_set_farm_status('${f2}','active')`), PEMAIL)
ok((await tryRun(() => as(db, ADMIN2, () => db.exec(`insert into customers (name) values ('works again')`)))) === null, 'reactivated farm can write again')

console.log('10. Audit log is per farm')
ok(Number((await as(db, ADMIN1, () => q(db, `select count(*) n from audit_log where farm_id <> '${F1}'`)))[0].n) === 0, 'farm 1 admin sees no farm 2 audit rows')
ok(Number((await as(db, ADMIN2, () => q(db, 'select count(*) n from audit_log')))[0].n) > 0, 'farm 2 audit rows were written with the farm 2 id')
ok((await as(db, MGR2, () => q(db, 'select * from audit_log'))).length === 0, 'managers see no audit log')

console.log('11. Storage policy (farm folder)')
await db.exec(`insert into storage.buckets values ('bills','bills',true) on conflict do nothing`)
const up = (uid, name) => tryRun(() => as(db, uid, () => db.exec(`insert into storage.objects (bucket_id, name) values ('bills', '${name}')`)))
ok((await up(MGR1, `${F1}/receipt.jpg`)) === null, 'upload into own farm folder allowed')
ok((await up(MGR1, 'old-style-file.jpg')) === null, 'upload with no folder (older app version) still allowed')
ok((await up(MGR1, `${f2}/receipt.jpg`)) !== null, 'upload into ANOTHER farm\'s folder refused')

console.log('12. Rollback restores the single-farm rules (while only one farm exists)')
ok((await tryRun(() => db.exec(read('supabase/rollback/0009_down.sql')))) !== null, 'rollback refuses while 2 farms exist')
await db.exec(`set session_replication_role = replica; delete from audit_log where farm_id = '${f2}'; delete from settings where farm_id='${f2}'; delete from labourers where farm_id='${f2}';
  delete from milk_production where farm_id='${f2}'; delete from expenses where farm_id='${f2}'; delete from customers where farm_id='${f2}';
  delete from animals where farm_id='${f2}'; delete from profiles where farm_id='${f2}'; delete from farms where id='${f2}'; set session_replication_role = origin`)
const preRollback = await snap()
await db.exec(read('supabase/rollback/0009_down.sql'))
ok(true, 'rollback runs once only Farm #1 is left')
const back = await snap()
ok(stable(back) === stable(preRollback), 'after rollback the Farm #1 ledger and row counts are unchanged')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
