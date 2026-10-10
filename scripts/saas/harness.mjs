// Local Postgres (PGlite) that imitates the parts of Supabase the migrations rely on: roles, auth.uid()/auth.jwt(),
// storage.objects + RLS. Nothing here touches a real Supabase project.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')

const BOOT = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema auth, storage to anon, authenticated, service_role;
grant execute on all functions in schema auth, storage to anon, authenticated, service_role;
grant all on all tables in schema auth, storage to anon, authenticated, service_role;
`

export async function newDb() {
  const db = new PGlite()
  await db.exec(BOOT)
  return db
}

// Original single-farm migrations, exactly as in the repo (0001..0008).
export const BASE_MIGRATIONS = [
  '0001_schema', '0002_helpers', '0003_rls', '0004_views', '0005_labour', '0006_cash', '0007_manager_access', '0008_milk_types_manager_delete',
].map((f) => `supabase/migrations/${f}.sql`)

export async function runFiles(db, files) {
  for (const f of files) {
    // pgcrypto is preinstalled on Supabase; gen_random_uuid() is built into Postgres 13+, so the local copy does not need it
    const sql = read(f).replace(/^create extension.*$/gim, '')
    try { await db.exec(sql) } catch (e) { throw new Error(`${f}: ${e.message}`) }
  }
}

// What Supabase's default privileges give the API roles on the public schema.
export async function grantApi(db, schema = 'public') {
  await db.exec(`
    grant usage on schema ${schema} to anon, authenticated, service_role;
    grant all on all tables in schema ${schema} to anon, authenticated, service_role;
    grant all on all sequences in schema ${schema} to anon, authenticated, service_role;`)
}

export const q = async (db, sql, params) => (await db.query(sql, params)).rows

/** Run `fn` as a signed-in API user (RLS applies). `email` is only needed for platform-owner checks. */
export async function as(db, userId, fn, { email = '', schema = 'public' } = {}) {
  const claims = JSON.stringify({ sub: userId, email, role: 'authenticated' })
  await db.query(`select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)`, [userId, claims])
  await db.exec(`set search_path = ${schema}; set role authenticated`)
  try { return await fn() } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claims', '', false); reset search_path`)
  }
}

export async function asService(db, fn, schema = 'public') {
  await db.exec(`set search_path = ${schema}; set role service_role`)
  try { return await fn() } finally { await db.exec(`reset role; reset search_path`) }
}

/** Returns the error (or null) instead of throwing, so tests can assert that something is refused. */
export async function tryRun(fn) {
  try { await fn(); return null } catch (e) { return e }
}
