-- DairyFarmDesk sample data (part 1 of 2): 10 animals, 8 customers, 30 days of milk production and sales.
-- Run in the Supabase SQL editor AFTER migrations 0001-0004, on an empty database. Then run seed_2.sql.

insert into animals (tag_no, name, type, breed, dob, purchase_date, purchase_price, source, status, notes) values
 ('C-101','Lakshmi','Cow','HF','2019-03-10','2020-01-15',72000,'Karnal market','Lactating',null),
 ('C-102','Ganga','Cow','Gir','2018-07-21','2019-06-02',85000,'Gujarat farm','Lactating',null),
 ('C-103','Radha','Cow','Jersey','2020-01-05','2021-03-12',60000,'Local dealer','Lactating',null),
 ('C-104','Kamdhenu','Cow','Sahiwal','2019-09-14','2020-10-20',78000,'Punjab farm','Lactating',null),
 ('C-105','Sundari','Cow','Crossbred','2020-05-30','2021-08-01',55000,'Local dealer','Lactating',null),
 ('B-201','Kali','Buffalo','Murrah','2018-02-11','2019-04-18',95000,'Haryana fair','Lactating',null),
 ('B-202','Gauri','Buffalo','Murrah','2019-06-25','2020-12-09',90000,'Haryana fair','Lactating',null),
 ('C-106','Bholi','Cow','HF','2017-11-02','2018-05-05',68000,'Karnal market','Dry','Dry since last month'),
 ('C-107','Nandini','Cow','Crossbred','2021-04-19',null,null,'Born on farm','Pregnant','AI done 4 months ago'),
 ('H-301','Chhoti','Heifer','Jersey','2023-08-08',null,null,'Born on farm','Dry',null);

insert into customers (name, phone, area, type, default_rate, default_morning_litres, default_evening_litres, opening_balance) values
 ('Sharma ji','9810011111','Sector 4','Home delivery',60,2,1,0),
 ('Verma Family','9810022222','Model Town','Home delivery',60,3,2,500),
 ('Gupta Sweets','9810033333','Main Bazaar','Shop',55,10,5,1200),
 ('Hotel Ashoka','9810044444','GT Road','Hotel',52,15,10,0),
 ('Village Dairy Co-op','9810055555','Rampur','Dairy-cooperative',45,40,30,0),
 ('Mrs. Kaur','9810066666','Sector 9','Home delivery',62,1.5,1.5,0),
 ('Rajesh Tea Stall','9810077777','Bus Stand','Shop',54,5,0,300),
 ('Dr. Mehta','9810088888','Civil Lines','Home delivery',65,2,0,0);

-- Milk production: base litres per animal, evening = 80% of morning, deterministic daily variation
insert into milk_production (animal_id, entry_date, shift, litres, fat, snf)
select a.id, d::date, s.shift::shift_t,
  round((b.base * (case s.shift when 'Morning' then 1.0 else 0.8 end)
        * (0.88 + 0.24 * abs(sin(extract(doy from d)::float8 * 3.1 + hashtext(a.tag_no)))))::numeric, 1),
  round((case when a.type = 'Buffalo' then 7.0 else 4.0 end + 0.5 * sin(extract(doy from d)::float8))::numeric, 1),
  round((8.4 + 0.3 * cos(extract(doy from d)::float8))::numeric, 1)
from animals a
join (values ('C-101',9.0),('C-102',7.0),('C-103',8.0),('C-104',6.5),('C-105',5.5),('B-201',6.0),('B-202',5.0)) b(tag, base) on b.tag = a.tag_no
cross join generate_series((now() at time zone 'Asia/Kolkata')::date - 29, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') d
cross join (values ('Morning'),('Evening')) s(shift);

-- Milk sales: default quantities, with occasional absences (0 L) and extra litres
insert into milk_sales (customer_id, entry_date, shift, litres, rate)
select c.id, d::date, s.shift::shift_t,
  case when (extract(doy from d)::int + length(c.name)) % 11 = 0 then 0
       when (extract(doy from d)::int + length(c.name)) % 7 = 0
         then (case s.shift when 'Morning' then c.default_morning_litres else c.default_evening_litres end) + 1
       else (case s.shift when 'Morning' then c.default_morning_litres else c.default_evening_litres end) end,
  c.default_rate
from customers c
cross join generate_series((now() at time zone 'Asia/Kolkata')::date - 29, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') d
cross join (values ('Morning'),('Evening')) s(shift)
where (case s.shift when 'Morning' then c.default_morning_litres else c.default_evening_litres end) > 0;
