-- DairyFarmDesk schema. Run in the Supabase SQL editor in order: 0001, 0002, 0003, 0004, then seed.sql (optional)
create extension if not exists pgcrypto;

create type user_role as enum ('admin','manager');
create type animal_type as enum ('Cow','Buffalo','Calf','Heifer','Bull');
create type animal_breed as enum ('HF','Jersey','Gir','Sahiwal','Murrah','Crossbred','Other');
create type animal_status as enum ('Lactating','Dry','Pregnant','Sold','Dead');
create type shift_t as enum ('Morning','Evening');
create type customer_type as enum ('Home delivery','Dairy-cooperative','Hotel','Shop');
create type pay_mode as enum ('Cash','UPI','Bank');
create type expense_category as enum ('Feed','Labour/Salary','Electricity','Fuel','Transport','Repairs','Other');
create type medical_type as enum ('Treatment','Vaccination','Deworming','Artificial Insemination','Pregnancy check','Checkup','Other');

create table settings (
  id int primary key default 1 check (id = 1),
  farm_name text not null default 'DairyFarmDesk',
  logo_url text,
  default_rate numeric(8,2) not null default 55,
  manager_edit_days int not null default 2,
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role user_role not null default 'manager',
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table animals (
  id uuid primary key default gen_random_uuid(),
  tag_no text not null unique,
  name text,
  type animal_type not null default 'Cow',
  breed animal_breed not null default 'Crossbred',
  dob date,
  purchase_date date,
  purchase_price numeric(12,2),
  source text,
  status animal_status not null default 'Lactating',
  photo_url text,
  notes text,
  archived boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table milk_production (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals(id),
  entry_date date not null,
  shift shift_t not null,
  litres numeric(6,2) not null check (litres >= 0),
  fat numeric(4,2),
  snf numeric(4,2),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (animal_id, entry_date, shift)
);
create index on milk_production (entry_date);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  area text,
  type customer_type not null default 'Home delivery',
  default_rate numeric(8,2) not null default 55,
  default_morning_litres numeric(6,2) not null default 0,
  default_evening_litres numeric(6,2) not null default 0,
  opening_balance numeric(12,2) not null default 0,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table milk_sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  entry_date date not null,
  shift shift_t not null,
  litres numeric(6,2) not null check (litres >= 0),
  rate numeric(8,2) not null check (rate >= 0),
  amount numeric(12,2) generated always as (round(litres * rate, 2)) stored,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, entry_date, shift)
);
create index on milk_sales (entry_date);

create table customer_payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  entry_date date not null,
  amount numeric(12,2) not null check (amount > 0),
  mode pay_mode not null default 'Cash',
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on customer_payments (entry_date);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  category expense_category not null default 'Feed',
  item_name text not null,
  quantity numeric(10,2),
  unit text,
  rate numeric(10,2),
  amount numeric(12,2) not null check (amount >= 0),
  supplier text,
  pay_mode pay_mode not null default 'Cash',
  bill_url text,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on expenses (entry_date);

create table medical_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals(id),
  entry_date date not null,
  type medical_type not null default 'Treatment',
  symptoms text,
  medicine text,
  dose text,
  vet_name text,
  cost numeric(12,2) not null default 0,
  withdrawal_days int not null default 0 check (withdrawal_days >= 0),
  next_due_date date,
  notes text,
  photo_url text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on medical_records (animal_id, entry_date);
create index on medical_records (next_due_date);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_name text,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on audit_log (created_at desc);
