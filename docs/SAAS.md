# DairyFarmDesk SaaS: staging, production and onboarding runbook

**Nothing here is applied automatically.** Every SQL file is run by you, by hand, in the Supabase SQL editor. The app code is
backward compatible: it works before and after the migration, so you can deploy the website first.

## How staging and production are separated (one Supabase project)

| | Production | Staging |
|---|---|---|
| Database schema | `public` (your current tables, **never renamed or moved**) | `stg` (a full copy, built from the same migration files) |
| Web app | Vercel `main`, no `VITE_DB_SCHEMA` | Vercel preview of branch `staging`, `VITE_DB_SCHEMA=stg` |
| Logins, file storage, API keys | shared | shared |

Staging is only partly isolated: logins (`auth.users`), storage buckets, Edge Functions and keys are shared by the whole
Supabase project. So: never test destructive things on real users; staging uploads go in the same buckets.

## Step 0 - back up production (mandatory)

Supabase -> Database -> Backups, or `pg_dump "<connection-string>" --no-owner -Fc -f prod-backup.dump`.
Keep the file. Do not run anything on `public` without it.

## Step 1 - create the staging schema

1. `npm run build:stg-sql` creates `supabase/stg/stg_schema.sql` and `supabase/stg/copy_prod_to_stg.sql`.
2. Supabase SQL editor: run `stg_schema.sql` (touches only schema `stg`). Then run `copy_prod_to_stg.sql` for real data.
3. Supabase -> Project Settings -> API -> **Exposed schemas**: add `stg`.
4. Vercel: add a Preview environment with `VITE_DB_SCHEMA=stg` (same URL and anon key) for branch `staging`.

## Step 2 - test on staging

- `npm run test:saas` runs the 70 automated checks (56 tenancy + 14 staging) locally (two farms cannot see each other, Farm #1 numbers unchanged, rollback works).
- Sign in on the staging site with an existing login (profiles were copied). Click through every screen.
- Deploy the Edge Functions (they accept `schema: "stg"`): `supabase functions deploy create-manager` and `create-farm`.
- On staging open `/platform`, add a test farm, sign in as its owner, add data, confirm the original farm cannot see it.

## Step 3 - production

1. Backup again. 2. Run `supabase/migrations/0009_saas_tenancy.sql` in the SQL editor (safe to run twice).
3. Deploy the functions, then merge the branch to `main` (Vercel deploys).
4. Verify: existing logins work, dashboard numbers unchanged, `/platform` opens only for `sunilkibm480@gmail.com`.

Rollback: `supabase/rollback/0009_down.sql` (refuses while more than one farm exists).

## Adding a farm (invite-only)

Sign in as the platform owner -> open **Platform** in the admin sidebar (or `/platform`) -> **Add farm**. Enter the farm
name, owner name, email, phone; a temporary password is generated. Copy the login block and send it to the owner yourself.
There is no public signup and no email is sent by the system.

## Suspending a farm

`/platform` -> Suspend. The farm becomes read-only (reads work, every write is refused by the database); nothing is deleted.
Reactivate to restore. Managers and admins of that farm see "not allowed" errors when saving.

## Platform owners

Emails in table `platform_admins` (seeded with `sunilkibm480@gmail.com`). To add another, run in SQL:
`insert into platform_admins (email) values ('someone@example.com');`

## Known limits / not done yet

- No billing or plan limits (the `farms.plan` column is a placeholder).
- A user belongs to exactly one farm.
- Storage buckets are public-read (as before); uploads are separated by farm folder, reads are by unguessable URL.
- Per-farm data export/deletion and the Privacy Policy update for multiple farms are still to do.
