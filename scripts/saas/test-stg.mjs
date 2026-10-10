// Proves the generated staging SQL (schema "stg") works, is isolated from production ("public"), and that the
// prod->stg data copy works. Local in-memory Postgres only.
//   node scripts/saas/test-stg.mjs
import { newDb, runFiles, grantApi, BASE_MIGRATIONS, q, as } from './harness.mjs'
import { buildStgSql, buildCopySql } from '../build-stg-sql.mjs'

let pass = 0, fail = 0
const ok = (c, n) => { if (c) { pass++; console.log('  ok   ' + n) } else { fail++; console.log('  FAIL ' + n) } }
const F1 = '00000000-0000-0000-0000-000000000001'
const ADMIN = '00000000-0000-0000-0000-000000000011'

const db = await newDb()
console.log('1. Production (schema public) = migrations 0001-0009 with some data')
await runFiles(db, BASE_MIGRATIONS)
await grantApi(db)
await db.exec(`insert into auth.users (id,email) values ('${ADMIN}','a@x');
  insert into profiles (id,full_name,email,role) values ('${ADMIN}','Admin','a@x','admin');
  insert into animals (tag_no) values ('C-1'),('C-2'); insert into customers (name) values ('Sharma');
  insert into expenses (entry_date,item_name,amount) values (current_date,'Feed',1000);`)
await runFiles(db, ['supabase/migrations/0009_saas_tenancy.sql'])
await grantApi(db)
const prodBefore = await q(db, `select (select count(*) from public.animals) a, (select count(*) from public.expenses) e, (select count(*) from public.audit_log) l`)

console.log('2. Build the staging schema from the generated file')
const sql = buildStgSql()
ok(!/storage\.objects/.test(sql.replace(/--.*$/gm, '')), 'staging SQL contains no storage policies (storage is shared)')
ok(!/set search_path = public/.test(sql), 'every function is pinned to stg, none to public')
await db.exec(sql)
ok((await q(db, `select count(*) n from information_schema.tables where table_schema='stg' and table_name in ('farms','animals','settings','audit_log','platform_admins')`))[0].n === 5, 'stg has its own copies of the tables')
const prodAfter = await q(db, `select (select count(*) from public.animals) a, (select count(*) from public.expenses) e, (select count(*) from public.audit_log) l`)
ok(JSON.stringify(prodBefore) === JSON.stringify(prodAfter), 'building stg did not change production data')
ok((await q(db, `select count(*) n from stg.animals`))[0].n === 0, 'stg starts empty')

console.log('3. Copy production data into stg')
await db.exec(buildCopySql())
ok((await q(db, `select count(*) n from stg.animals`))[0].n === 2 && (await q(db, `select count(*) n from stg.expenses`))[0].n === 1, 'stg got a copy of the animals and expenses')
ok((await q(db, `select count(*) n from stg.profiles`))[0].n === 1, 'stg got the user profile (same login works in both)')
const prodAfterCopy = await q(db, `select (select count(*) from public.animals) a, (select count(*) from public.expenses) e, (select count(*) from public.audit_log) l`)
ok(JSON.stringify(prodBefore) === JSON.stringify(prodAfterCopy), 'copying did not change production data')
ok((await q(db, `select count(*) n from stg.audit_log`))[0].n === (await q(db, `select count(*) n from public.audit_log`))[0].n, 'copy did not add audit-log noise')

console.log('4. stg behaves like production, and the two stay separate')
await grantApi(db, 'stg')
await as(db, ADMIN, async () => {
  await db.exec(`insert into customers (name) values ('Staging only customer')`)
  ok((await q(db, 'select farm_id from customers where name = $1', ['Staging only customer']))[0].farm_id === F1, 'insert in stg defaults to the user\'s farm')
  ok((await q(db, 'select count(*) n from customers'))[0].n === 2, 'stg RLS lets the admin see stg rows')
  const s = (await q(db, `select * from admin_summary(current_date - 2, current_date)`))[0]
  ok(Number(s.expenses) === 1000, 'stg admin_summary works and reads stg data')
}, { schema: 'stg' })
ok((await q(db, `select count(*) n from public.customers where name = 'Staging only customer'`))[0].n === 0, 'a staging change never appears in production')
await as(db, ADMIN, async () => {
  await db.exec(`insert into customers (name) values ('Production only customer')`)
})
ok((await q(db, `select count(*) n from stg.customers where name = 'Production only customer'`))[0].n === 0, 'a production change never appears in staging')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
