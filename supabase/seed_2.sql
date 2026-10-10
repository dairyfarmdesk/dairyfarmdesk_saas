-- DairyFarmDesk sample data (part 2 of 2): payments, expenses, medical records. Run after seed.sql.

-- Payments: roughly every 10 days, about 8 days' worth of milk each time
insert into customer_payments (customer_id, entry_date, amount, mode, note)
select c.id, d::date, round(((c.default_morning_litres + c.default_evening_litres) * c.default_rate * 8)::numeric, 0),
  (array['Cash','UPI','Bank'])[1 + (extract(doy from d)::int + length(c.name)) % 3]::pay_mode, 'Part payment'
from customers c
cross join generate_series((now() at time zone 'Asia/Kolkata')::date - 25, (now() at time zone 'Asia/Kolkata')::date - 3, interval '10 day') d;

-- Expenses
insert into expenses (entry_date, category, item_name, quantity, unit, rate, amount, supplier, pay_mode)
select d::date, 'Feed', 'Green fodder', 4, 'quintal', 280, 1120, 'Ramesh Kisan', 'Cash'
from generate_series((now() at time zone 'Asia/Kolkata')::date - 29, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') d;

insert into expenses (entry_date, category, item_name, quantity, unit, rate, amount, supplier, pay_mode)
select d::date, 'Feed', 'Cattle feed/Pellet', 10, 'bag', 1250, 12500, 'Krishi Feed Store', 'UPI'
from generate_series((now() at time zone 'Asia/Kolkata')::date - 27, (now() at time zone 'Asia/Kolkata')::date, interval '9 day') d;

insert into expenses (entry_date, category, item_name, quantity, unit, rate, amount, supplier, pay_mode)
select d::date, 'Feed', 'Dry fodder/Bhusa', 1, 'trolley', 4500, 4500, 'Ramesh Kisan', 'Cash'
from generate_series((now() at time zone 'Asia/Kolkata')::date - 24, (now() at time zone 'Asia/Kolkata')::date, interval '12 day') d;

insert into expenses (entry_date, category, item_name, amount, supplier, pay_mode) values
 ((now() at time zone 'Asia/Kolkata')::date - 20, 'Labour/Salary', 'Worker salary', 12000, 'Raju', 'Cash'),
 ((now() at time zone 'Asia/Kolkata')::date - 15, 'Electricity', 'Electricity bill', 3200, 'State Electricity Board', 'UPI'),
 ((now() at time zone 'Asia/Kolkata')::date - 10, 'Fuel', 'Diesel for delivery van', 2400, 'HP Petrol Pump', 'Cash'),
 ((now() at time zone 'Asia/Kolkata')::date - 6, 'Repairs', 'Milking machine repair', 1800, 'Sharma Mechanic', 'Cash'),
 ((now() at time zone 'Asia/Kolkata')::date - 4, 'Transport', 'Cattle feed transport', 1500, 'Local tempo', 'Cash');

-- Medical records: C-102 is under milk withdrawal (5 days from 2 days ago); several follow-ups fall within 7 days
insert into medical_records (animal_id, entry_date, type, symptoms, medicine, dose, vet_name, cost, withdrawal_days, next_due_date)
select a.id, (now() at time zone 'Asia/Kolkata')::date + m.day_off, m.kind::medical_type, m.sym, m.med, m.dose, 'Dr. Yadav', m.cost, m.wd,
       (now() at time zone 'Asia/Kolkata')::date + m.due_off
from (values
 ('C-102', -2,  'Treatment',               'Mastitis',      'Ceftriaxone (antibiotic)', '5 ml x 3 days', 850, 5, 3),
 ('C-101', -40, 'Vaccination',             null,            'FMD vaccine',              '2 ml',          150, 0, 4),
 ('C-103', -30, 'Vaccination',             null,            'HS-BQ vaccine',            '2 ml',          120, 0, 6),
 ('C-104', -20, 'Artificial Insemination', 'Heat observed', 'AI - Sahiwal semen',       '1 straw',       500, 0, 21),
 ('C-107', -100,'Pregnancy check',         null,            'Ultrasound',               null,            300, 0, -1),
 ('B-201', -12, 'Deworming',               null,            'Albendazole',              '30 ml',         200, 0, 80),
 ('C-105', -8,  'Checkup',                 'Routine',       null,                       null,            300, 0, 30)
) as m(tag, day_off, kind, sym, med, dose, cost, wd, due_off)
join animals a on a.tag_no = m.tag;
