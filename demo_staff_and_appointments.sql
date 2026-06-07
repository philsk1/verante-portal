-- =====================================================================
-- QERXEL — Demo Staff + Appointments Seed  (v2)
-- =====================================================================
-- Adds rich staff profiles to ALL 10 demo businesses and seeds a
-- full week of realistic appointments.
-- Safe to re-run (DELETEs before re-inserting).
-- Run in Supabase SQL Editor.
-- =====================================================================


-- ═══════════════════════════════════════════════════════════════════
-- 1. EXTEND demo_staff WITH RICHER COLUMNS
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE demo_staff ADD COLUMN IF NOT EXISTS email         text;
ALTER TABLE demo_staff ADD COLUMN IF NOT EXISTS address       text;
ALTER TABLE demo_staff ADD COLUMN IF NOT EXISTS birthday      date;
ALTER TABLE demo_staff ADD COLUMN IF NOT EXISTS private_notes text;
ALTER TABLE demo_staff ADD COLUMN IF NOT EXISTS colour        text;
ALTER TABLE demo_staff ADD COLUMN IF NOT EXISTS direct_line   text;
ALTER TABLE demo_staff ADD COLUMN IF NOT EXISTS start_date    date;


-- ═══════════════════════════════════════════════════════════════════
-- 2. CREATE demo_appointments TABLE
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS demo_appointments (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid references demo_businesses(id) on delete cascade,
  staff_id         uuid references demo_staff(id) on delete set null,
  title            text not null,
  appointment_type text,
  start_time       timestamptz not null,
  end_time         timestamptz not null,
  status           text default 'confirmed',
  client_name      text,
  client_notes     text,
  created_at       timestamptz default now()
);


-- ═══════════════════════════════════════════════════════════════════
-- 3. CLEAR + RESEED STAFF (fixed UUIDs so appointments can ref them)
-- ═══════════════════════════════════════════════════════════════════

DELETE FROM demo_appointments;
DELETE FROM demo_staff;

INSERT INTO demo_staff (id, business_id, name, role, specialist_services, phone, email, address, birthday, direct_line, start_date, colour, private_notes, active) VALUES

-- ─── b01 Hargreaves Plumbing (standard) ─────────────────────────────────────
('00000000-0001-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',
 'Tom Hargreaves','Owner & Master Plumber',
 'Gas Safe registered, Boiler servicing, Unvented cylinders, Emergency callouts',
 '07700 123456','tom@hargreavesplumbing.co.uk',
 '14 Copper Lane, Sheffield, S1 2AB','1978-03-14',
 '0114 234 5678','2008-01-01','#5e3b87',
 'Director. Prefers morning jobs on Tues/Wed. Gas Safe no. 123456.',true),

('00000000-0001-0000-0000-000000000002','00000000-0000-0000-0000-000000000001',
 'Gary Mills','Senior Plumber',
 'Bathroom fitting, Power flushing, Radiator installation, Leak detection',
 '07811 234567','gary@hargreavesplumbing.co.uk',
 '7 Forge Road, Sheffield, S3 7CD','1985-07-22',
 '0114 234 5679','2015-03-01','#1d4ed8',
 'Brilliant with awkward bathrooms. Hates Monday mornings.',true),

-- ─── b02 Elegant Hair Design (light) ─────────────────────────────────────────
('00000000-0002-0000-0000-000000000001','00000000-0000-0000-0000-000000000002',
 'Tracy Walsh','Owner & Senior Stylist',
 'Balayage, Full colour, Olaplex, Bridal styling, Keratin treatments',
 '07622 345678','tracy@eleganthairdesign.co.uk',
 '3 Park Row, Leeds, LS1 5HD','1982-11-05',
 '0113 345 6789','2010-04-01','#db2777',
 'Owner. Books own consultations. Allergy to latex gloves.',true),

('00000000-0002-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
 'Jade Peters','Stylist',
 'Cut & blow dry, Olaplex treatments, Highlights, Colour refresh, Blow-dry bar',
 '07733 456789','jade@eleganthairdesign.co.uk',
 '22 Headingley Lane, Leeds, LS6 2AS','1998-04-18',
 '0113 345 6790','2022-09-01','#d97706',
 'Part-time Mon/Tue/Thu/Fri. Great with new clients — put walk-ins with Jade first.',true),

-- ─── b03 Greenfield Landscape (professional) ─────────────────────────────────
('00000000-0003-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',
 'James Greenfield','Owner & Lead Designer',
 'Garden design, Hard landscaping, Client consultations, Project management',
 '07700 123456','james@greenfieldlandscape.co.uk',
 '1 Orchard Close, Manchester, M21 8PL','1975-06-20',
 '0161 456 7890','2005-01-01','#16a34a',
 'Director. Does all site surveys. Unavailable Weds PM (school run).',true),

('00000000-0003-0000-0000-000000000002','00000000-0000-0000-0000-000000000003',
 'Pete Walsh','Senior Groundsworker',
 'Patio & decking, Fencing, Heavy clearance, Turfing, Drainage',
 '07811 234567','pete@greenfieldlandscape.co.uk',
 '5 Birch Avenue, Salford, M5 3RT','1980-09-12',
 '0161 456 7891','2011-05-01','#0284c7',
 'Excellent quality. Slow but thorough. Don''t rush him.',true),

('00000000-0003-0000-0000-000000000003','00000000-0000-0000-0000-000000000003',
 'Liam Foster','Groundsworker',
 'Planting, Lawn maintenance, Weeding, Seasonal tidy-ups, Irrigation',
 '07922 345670','liam@greenfieldlandscape.co.uk',
 '18 Elm Street, Stretford, M32 0QP','2001-02-28',
 '0161 456 7892','2023-06-01','#9333ea',
 'Apprentice — progressing well. Good with clients. Don''t leave on site unsupervised yet.',true),

-- ─── b04 Swift Electrical (standard) ─────────────────────────────────────────
('00000000-0004-0000-0000-000000000001','00000000-0000-0000-0000-000000000004',
 'Dave Swift','Owner & Electrical Engineer',
 'Consumer units, EV chargers, Commercial fit-outs, Testing & inspection, Solar PV',
 '07500 567890','dave@swiftelectrical.co.uk',
 '9 Voltaire Road, Birmingham, B3 2LK','1977-12-03',
 '0121 567 8901','2006-01-01','#5e3b87',
 'Owner. Handles all commercial quotes personally. NICEIC approved contractor.',true),

('00000000-0004-0000-0000-000000000002','00000000-0000-0000-0000-000000000004',
 'Chris Bell','Electrician',
 'Domestic rewiring, Socket & lighting, Fault finding, PAT testing, Garden lighting',
 '07611 678901','chris@swiftelectrical.co.uk',
 '34 Circuit Drive, Solihull, B91 3QN','1990-05-17',
 '0121 567 8902','2018-07-01','#1d4ed8',
 'Reliable. Good customer manner. Prefers domestic. Booked solid most weeks.',true),

-- ─── b05 Paws & Claws Dog Grooming (light) ───────────────────────────────────
('00000000-0005-0000-0000-000000000001','00000000-0000-0000-0000-000000000005',
 'Mandy Clarke','Owner & Head Groomer',
 'All breeds, Hand stripping, Show preparation, Puppy first grooms, Senior dogs',
 '07400 234567','mandy@pawsandclaws.co.uk',
 '2 Kennel Lane, Bristol, BS3 4HG','1983-08-09',
 '0117 234 5678','2015-01-01','#16a34a',
 'Owner. Certified City & Guilds Level 3. Nervous dogs — always with Mandy.',true),

('00000000-0005-0000-0000-000000000002','00000000-0000-0000-0000-000000000005',
 'Sophie Lane','Groomer',
 'Small to medium breeds, Puppy packages, Breed trims, Bath & brush, Nail clipping',
 '07511 345678','sophie@pawsandclaws.co.uk',
 '67 Terrier Close, Bristol, BS4 2RS','1999-01-14',
 '0117 234 5679','2023-01-01','#db2777',
 'Level 2 qualified. Fantastic with puppies. Currently training for hand stripping.',true),

-- ─── b06 Premier Mortgage Solutions (professional) ───────────────────────────
('00000000-0006-0000-0000-000000000001','00000000-0000-0000-0000-000000000006',
 'Caroline Hughes','Senior Mortgage Advisor',
 'Residential mortgages, First-time buyers, Remortgage, Buy-to-let, Adverse credit',
 '07600 345678','caroline@premiermortgage.co.uk',
 '12 Brokers Row, Bristol, BS1 4RQ','1979-04-25',
 '0117 456 7890','2012-03-01','#5e3b87',
 'CeMAP qualified. Highest conversion rate. Prefers face-to-face consultations.',true),

('00000000-0006-0000-0000-000000000002','00000000-0000-0000-0000-000000000006',
 'David Banks','Protection Specialist',
 'Life insurance, Income protection, Critical illness, Building & contents, Whole of life',
 '07711 456789','david@premiermortgage.co.uk',
 '5 Assurance Close, Clifton, BS8 2GH','1981-10-31',
 '0117 456 7891','2016-09-01','#1d4ed8',
 'FCA authorised. Cross-sells well after Caroline closes the mortgage. Target: £8k protection revenue/month.',true),

-- ─── b07 Valley View B&B (standard) ──────────────────────────────────────────
('00000000-0007-0000-0000-000000000001','00000000-0000-0000-0000-000000000007',
 'Margaret Hill','Owner & Host',
 'Guest experience, Bookings, Housekeeping, Breakfast service, Local guide',
 '07300 456789','margaret@valleyviewbb.co.uk',
 'Valley View, Church Lane, Windermere, LA23 1JY','1961-03-17',
 '01539 445 678','1998-01-01','#db2777',
 'Owner. Very hands-on. Knows all regular guests by name. Doesn''t like last-minute check-outs.',true),

('00000000-0007-0000-0000-000000000002','00000000-0000-0000-0000-000000000007',
 'Robert Hill','Co-owner & Maintenance',
 'Property maintenance, Breakfast, Check-in cover, Garden upkeep, Deliveries',
 '07411 567890','robert@valleyviewbb.co.uk',
 'Valley View, Church Lane, Windermere, LA23 1JY','1959-11-02',
 '01539 445 679','1998-01-01','#0284c7',
 'Margaret''s husband. Handles all maintenance and does breakfasts on Weds/Thurs.',true),

-- ─── b08 Apex Print & Design (professional) ──────────────────────────────────
('00000000-0008-0000-0000-000000000001','00000000-0000-0000-0000-000000000008',
 'Mark Dobson','Owner & Print Director',
 'Large format printing, Vehicle wraps, Production management, Client relations',
 '07500 567890','mark@apexprintdesign.co.uk',
 '18 Litho Lane, Leeds, LS12 2QN','1972-07-08',
 '0113 567 8901','2003-01-01','#5e3b87',
 'Owner. Signs off all vehicle wraps personally. Hates being micromanaged by clients.',true),

('00000000-0008-0000-0000-000000000002','00000000-0000-0000-0000-000000000008',
 'Fiona Chen','Senior Designer',
 'Brand identity, Logo design, Campaign artwork, Exhibition stands, Brochures',
 '07611 678901','fiona@apexprintdesign.co.uk',
 '4 Pantone Court, Headingley, LS6 3PL','1988-02-14',
 '0113 567 8902','2017-04-01','#db2777',
 'Adobe certified. Clients love her. Has a standing offer from a London agency — keep her happy.',true),

('00000000-0008-0000-0000-000000000003','00000000-0000-0000-0000-000000000008',
 'Ryan Park','Production Operator',
 'Large format output, Laminating, Mounting, Finishing, Machine maintenance',
 '07722 789012','ryan@apexprintdesign.co.uk',
 '29 Reel Street, Bramley, LS13 1TF','1995-09-06',
 '0113 567 8903','2020-08-01','#16a34a',
 'Fast and accurate. Handles all press work unsupervised. Night shift available if needed.',true),

-- ─── b09 Nationwide Recruitment (enterprise) ─────────────────────────────────
('00000000-0009-0000-0000-000000000001','00000000-0000-0000-0000-000000000009',
 'Debbie Walsh','Managing Director',
 'Executive search, Strategic accounts, Board level placements, P&L ownership',
 '07700 789012','debbie@nationwiderecruitment.co.uk',
 '12 Talent Square, London, EC2V 8RF','1970-05-19',
 '020 7123 4560','2001-01-01','#5e3b87',
 'MD. Handles any accounts above £50k. Board reporting quarterly.',true),

('00000000-0009-0000-0000-000000000002','00000000-0000-0000-0000-000000000009',
 'Sam Taylor','Head of Commercial',
 'Commercial placements, Finance, Operations, Supply chain, Interim management',
 '07811 890123','sam@nationwiderecruitment.co.uk',
 '6 Placement Road, Manchester, M2 3NP','1984-08-03',
 '020 7123 4561','2013-06-01','#1d4ed8',
 'Consistent biller — £380k last FY. Clients in FMCG and logistics.',true),

('00000000-0009-0000-0000-000000000003','00000000-0000-0000-0000-000000000009',
 'Andy Jones','Head of Technology',
 'IT, Digital, Engineering, DevOps, Cybersecurity, CTO/CIO search',
 '07922 901234','andy@nationwiderecruitment.co.uk',
 '3 Byte Lane, Bristol, BS1 5AB','1982-12-11',
 '020 7123 4562','2015-02-01','#16a34a',
 'Top biller. £440k last FY. Growing fast. Wants a team under him.',true),

('00000000-0009-0000-0000-000000000004','00000000-0000-0000-0000-000000000009',
 'Laura Price','Head of Healthcare',
 'NHS, Allied health, Clinical, Nursing, Social care, GP practice management',
 '07833 012345','laura@nationwiderecruitment.co.uk',
 '14 Ward Walk, Leeds, LS2 7GH','1979-03-27',
 '020 7123 4563','2019-09-01','#db2777',
 'Joined from NHS herself. Strong referral network. Framework agreement with 3 NHS trusts.',true),

-- ─── b10 JB Sports & Fashion (enterprise) ────────────────────────────────────
('00000000-0010-0000-0000-000000000001','00000000-0000-0000-0000-000000000010',
 'James Bright','CEO',
 'Strategy, International partnerships, Investor relations, Brand licensing, M&A',
 '07400 123456','james@jbsports.co.uk',
 'JB House, 1 Commerce Park, Leicester, LE1 3WA','1969-09-14',
 '0116 789 0123','1999-01-01','#5e3b87',
 'Founder CEO. Rarely in the office. Decisions go through Kelly day-to-day.',true),

('00000000-0010-0000-0000-000000000002','00000000-0000-0000-0000-000000000010',
 'Kelly Nash','Head of Sales & Wholesale',
 'Wholesale accounts, Trade shows, New business, Key account management, Pricing',
 '07511 234567','kelly@jbsports.co.uk',
 '7 Retail Row, Leicester, LE2 4SF','1986-06-30',
 '0116 789 0124','2014-03-01','#db2777',
 'Runs day-to-day. Knows every wholesale account personally. Target £2.4m this year.',true),

('00000000-0010-0000-0000-000000000003','00000000-0000-0000-0000-000000000010',
 'Marcus Webb','Operations Director',
 'Supply chain, Warehouse, Logistics, Imports, Quality control, Forecasting',
 '07622 345678','marcus@jbsports.co.uk',
 '22 Distribution Drive, Leicester, LE4 2GH','1981-01-15',
 '0116 789 0125','2016-07-01','#1d4ed8',
 'Ex-Pentland Group. Massive network in Far East manufacturing.',true);


-- ═══════════════════════════════════════════════════════════════════
-- 4. SEED DEMO APPOINTMENTS (current week, Mon–Fri)
-- ═══════════════════════════════════════════════════════════════════
-- date_trunc('week', now()) = Monday 00:00 UTC this week
-- We add day offsets + hour offsets to place appointments naturally.

INSERT INTO demo_appointments (business_id, staff_id, title, appointment_type, start_time, end_time, status, client_name, client_notes) VALUES

-- ═══ b01 HARGREAVES PLUMBING ════════════════════════════════════════════════

-- Mon
('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000001',
 'John Mills — Boiler service','Annual boiler service',
 date_trunc('week',now())+interval'9 hours', date_trunc('week',now())+interval'11 hours',
 'confirmed','John Mills','Gas Safe cert required. Baxi combi.'),

('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000002',
 'Sarah Vickers — Emergency callout','Burst pipe',
 date_trunc('week',now())+interval'8 hours', date_trunc('week',now())+interval'11 hours 30 minutes',
 'completed','Sarah Vickers','Under sink in kitchen. Called 7am.'),

-- Mon PM
('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000001',
 'Mrs Davies — Tap replacement','Kitchen tap swap',
 date_trunc('week',now())+interval'13 hours', date_trunc('week',now())+interval'14 hours',
 'completed','Patricia Davies','Bristan Artisan pull-out mixer — she has the tap.'),

('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000002',
 'Hughes family — Power flush','Full system power flush',
 date_trunc('week',now())+interval'12 hours', date_trunc('week',now())+interval'16 hours',
 'confirmed','David Hughes','8 radiators. Old system, likely heavy sludge.'),

-- Tue
('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000001',
 'Roberts — Annual service','Gas boiler service',
 date_trunc('week',now())+interval'1 day 9 hours', date_trunc('week',now())+interval'1 day 11 hours',
 'confirmed','Alan Roberts','Worcester Bosch Greenstar. 3rd year with us.'),

('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000002',
 'Mr & Mrs Patel — Bathroom suite','Full bathroom installation',
 date_trunc('week',now())+interval'1 day 8 hours', date_trunc('week',now())+interval'1 day 17 hours',
 'confirmed','Mr & Mrs Patel','Day 2 of 3. Suite in garage. First fix done.'),

-- Wed
('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000001',
 'Dave Foster — Leak investigation','Trace & access',
 date_trunc('week',now())+interval'2 days 10 hours', date_trunc('week',now())+interval'2 days 12 hours',
 'provisional','Dave Foster','Customer thinks it''s under the floor. May need to return.'),

('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000002',
 'Mr & Mrs Patel — Bathroom suite','Full bathroom installation',
 date_trunc('week',now())+interval'2 days 8 hours', date_trunc('week',now())+interval'2 days 17 hours',
 'confirmed','Mr & Mrs Patel','Day 3 of 3. Second fix + tiling grouted.'),

-- Thu
('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000001',
 'Lisa Barnes — Boiler service','Annual boiler service',
 date_trunc('week',now())+interval'3 days 9 hours', date_trunc('week',now())+interval'3 days 11 hours',
 'confirmed','Lisa Barnes','Ideal Logic. Landlord property.'),

('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000002',
 'Chen — Unvented cylinder','Cylinder replacement',
 date_trunc('week',now())+interval'3 days 8 hours', date_trunc('week',now())+interval'3 days 14 hours',
 'confirmed','Robert Chen','Megaflo 250L. Materials on order — confirm before visiting.'),

-- Fri
('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000001',
 'Williams — Cylinder replacement','Indirect cylinder swap',
 date_trunc('week',now())+interval'4 days 9 hours', date_trunc('week',now())+interval'4 days 13 hours',
 'confirmed','Mr Williams','Old copper cylinder — measure before ordering.'),

('00000000-0000-0000-0000-000000000001','00000000-0001-0000-0000-000000000002',
 'Mrs Thompson — Radiator add','New radiator installation',
 date_trunc('week',now())+interval'4 days 9 hours', date_trunc('week',now())+interval'4 days 11 hours',
 'confirmed','Janet Thompson','Extension room, needs new rad and TRV.'),


-- ═══ b02 ELEGANT HAIR DESIGN ════════════════════════════════════════════════

('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000001',
 'Emma Hughes — Balayage','Full balayage + toner',
 date_trunc('week',now())+interval'9 hours', date_trunc('week',now())+interval'12 hours',
 'confirmed','Emma Hughes','Beach blonde. Last done 4 months ago. Olaplex 1+2 included.'),

('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000002',
 'Rachel Green — Cut & blow dry','Ladies cut & blow dry',
 date_trunc('week',now())+interval'9 hours 30 minutes', date_trunc('week',now())+interval'10 hours 30 minutes',
 'completed','Rachel Green','Shoulder length, layers. No colour.'),

('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000001',
 'Sarah Mitchell — Consultation','Colour consultation',
 date_trunc('week',now())+interval'13 hours', date_trunc('week',now())+interval'14 hours',
 'completed','Sarah Mitchell','Wants to go lighter. Currently box dyed dark brown.'),

('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000002',
 'Kate Johnson — Olaplex','Olaplex treatment + blow dry',
 date_trunc('week',now())+interval'11 hours', date_trunc('week',now())+interval'12 hours 30 minutes',
 'completed','Kate Johnson','Damaged from previous salon. 3rd Olaplex session.'),

-- Tue
('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000001',
 'Mrs Walker — Full colour','Full head colour + blow dry',
 date_trunc('week',now())+interval'1 day 10 hours', date_trunc('week',now())+interval'1 day 12 hours 30 minutes',
 'confirmed','Mrs Walker','Warm auburn. Wella 6/4.'),

('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000002',
 'Amy Reid — Highlights','Half head highlights',
 date_trunc('week',now())+interval'1 day 9 hours', date_trunc('week',now())+interval'1 day 11 hours',
 'confirmed','Amy Reid','Honey blonde. Fine hair — use small sections.'),

-- Wed
('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000001',
 'Emma Clarke — Bridal trial','Bridal hair trial',
 date_trunc('week',now())+interval'2 days 9 hours', date_trunc('week',now())+interval'2 days 11 hours',
 'confirmed','Emma Clarke','Wedding Aug 14. Low updo with soft curls. Bring Pinterest board.'),

('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000002',
 'Sophie Bell — Cut & blow dry','Ladies cut & blow dry',
 date_trunc('week',now())+interval'2 days 11 hours', date_trunc('week',now())+interval'2 days 12 hours',
 'confirmed','Sophie Bell','Trim only — 1 inch off.'),

-- Thu
('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000001',
 'Maria Santos — Keratin','Keratin smoothing treatment',
 date_trunc('week',now())+interval'3 days 10 hours', date_trunc('week',now())+interval'3 days 13 hours',
 'confirmed','Maria Santos','Frizzy, thick hair. GKhair Juvexin. No washing 3 days after.'),

('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000002',
 'Zoe Barnes — Colour refresh','Toner + blow dry',
 date_trunc('week',now())+interval'3 days 11 hours', date_trunc('week',now())+interval'3 days 12 hours',
 'confirmed','Zoe Barnes','Platinum — brassy roots coming through.'),

-- Fri
('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000001',
 'Lisa Morgan — Highlights','Full head highlights + toner',
 date_trunc('week',now())+interval'4 days 9 hours', date_trunc('week',now())+interval'4 days 11 hours 30 minutes',
 'confirmed','Lisa Morgan','Ash blonde balayage look. Wella T18.'),

('00000000-0000-0000-0000-000000000002','00000000-0002-0000-0000-000000000002',
 'Lucy Ford — Blow dry','Blow dry bar',
 date_trunc('week',now())+interval'4 days 10 hours', date_trunc('week',now())+interval'4 days 10 hours 45 minutes',
 'confirmed','Lucy Ford','Wedding guest Sat. Big bouncy blow dry.'),


-- ═══ b03 GREENFIELD LANDSCAPE ════════════════════════════════════════════════

('00000000-0000-0000-0000-000000000003','00000000-0003-0000-0000-000000000001',
 'Mr & Mrs Ashworth — Design consultation','Garden design consult',
 date_trunc('week',now())+interval'10 hours', date_trunc('week',now())+interval'12 hours',
 'confirmed','Mr & Mrs Ashworth','New build. Blank canvas. £20-25k budget. Bring portfolio.'),

('00000000-0000-0000-0000-000000000003','00000000-0003-0000-0000-000000000002',
 'Brooks — Patio installation','Indian sandstone patio',
 date_trunc('week',now())+interval'8 hours', date_trunc('week',now())+interval'17 hours',
 'confirmed','Ian Brooks','40 sqm. Day 1 of 4. Rubble skip ordered.'),

('00000000-0000-0000-0000-000000000003','00000000-0003-0000-0000-000000000003',
 'Patterson — Garden tidy','Seasonal garden clearance',
 date_trunc('week',now())+interval'9 hours', date_trunc('week',now())+interval'13 hours',
 'completed','Linda Patterson','Overgrown rear garden. Skip needed for green waste.'),

('00000000-0000-0000-0000-000000000003','00000000-0003-0000-0000-000000000002',
 'Brooks — Patio installation','Indian sandstone patio',
 date_trunc('week',now())+interval'1 day 8 hours', date_trunc('week',now())+interval'1 day 17 hours',
 'confirmed','Ian Brooks','Day 2 of 4.'),

('00000000-0000-0000-0000-000000000003','00000000-0003-0000-0000-000000000001',
 'Hendersons — Site survey','Survey + quote',
 date_trunc('week',now())+interval'1 day 14 hours', date_trunc('week',now())+interval'1 day 15 hours 30 minutes',
 'confirmed','Mike Henderson','Wants raised beds + pergola. Rear of terrace house.'),

('00000000-0000-0000-0000-000000000003','00000000-0003-0000-0000-000000000002',
 'Brooks — Patio installation','Indian sandstone patio',
 date_trunc('week',now())+interval'2 days 8 hours', date_trunc('week',now())+interval'2 days 17 hours',
 'confirmed','Ian Brooks','Day 3 of 4. Pointing today.'),

('00000000-0000-0000-0000-000000000003','00000000-0003-0000-0000-000000000003',
 'Khan — Lawn turfing','Turf supply + lay',
 date_trunc('week',now())+interval'2 days 9 hours', date_trunc('week',now())+interval'2 days 15 hours',
 'confirmed','Reza Khan','50 sqm rear lawn. Turf arriving 8am.'),

('00000000-0000-0000-0000-000000000003','00000000-0003-0000-0000-000000000002',
 'Brooks — Patio completion','Snagging + handover',
 date_trunc('week',now())+interval'3 days 8 hours', date_trunc('week',now())+interval'3 days 13 hours',
 'confirmed','Ian Brooks','Day 4. Tidy + handover.'),

('00000000-0000-0000-0000-000000000003','00000000-0003-0000-0000-000000000001',
 'Whitmore — Design presentation','Concept design review',
 date_trunc('week',now())+interval'3 days 14 hours', date_trunc('week',now())+interval'3 days 16 hours',
 'confirmed','Claire Whitmore','Presenting 3 concept boards. Kitchen garden + entertaining area.'),

('00000000-0000-0000-0000-000000000003','00000000-0003-0000-0000-000000000003',
 'Singh — Maintenance visit','Monthly garden maintenance',
 date_trunc('week',now())+interval'4 days 9 hours', date_trunc('week',now())+interval'4 days 12 hours',
 'confirmed','Priya Singh','Standing monthly contract. Lawn, hedges, beds.'),


-- ═══ b04 SWIFT ELECTRICAL ════════════════════════════════════════════════════

('00000000-0000-0000-0000-000000000004','00000000-0004-0000-0000-000000000001',
 'Howards — EV charger install','EV home charger',
 date_trunc('week',now())+interval'9 hours', date_trunc('week',now())+interval'11 hours',
 'confirmed','Steve Howard','Ohme Home Pro. OLEV grant applied. Tesla Model 3.'),

('00000000-0000-0000-0000-000000000004','00000000-0004-0000-0000-000000000002',
 'Clarke — Consumer unit','CU replacement',
 date_trunc('week',now())+interval'8 hours', date_trunc('week',now())+interval'13 hours',
 'confirmed','Janet Clarke','Old BS3036 rewirable fuses. Replace with Hager 18-way RCBO board.'),

('00000000-0000-0000-0000-000000000004','00000000-0004-0000-0000-000000000001',
 'Morrison — EICR','Electrical installation condition report',
 date_trunc('week',now())+interval'1 day 9 hours', date_trunc('week',now())+interval'1 day 12 hours',
 'confirmed','Paul Morrison','Landlord cert. 3-bed semi. Due renewal.'),

('00000000-0000-0000-0000-000000000004','00000000-0004-0000-0000-000000000002',
 'Reid — Garden lighting','Outdoor lighting install',
 date_trunc('week',now())+interval'1 day 9 hours 30 minutes', date_trunc('week',now())+interval'1 day 14 hours',
 'confirmed','Karen Reid','LED path lights + 4 uplighters. Materials on van.'),

('00000000-0000-0000-0000-000000000004','00000000-0004-0000-0000-000000000001',
 'Parkfield Office — Commercial fit','Commercial rewire',
 date_trunc('week',now())+interval'2 days 8 hours', date_trunc('week',now())+interval'2 days 17 hours',
 'confirmed','Parkfield Ltd','Office suite, 12 desks. Day 2 of 3. First fix complete.'),

('00000000-0000-0000-0000-000000000004','00000000-0004-0000-0000-000000000002',
 'Walsh — Fault finding','Electrical fault investigation',
 date_trunc('week',now())+interval'2 days 10 hours', date_trunc('week',now())+interval'2 days 12 hours',
 'provisional','Tony Walsh','Intermittent RCD trip. Kitchen circuit.'),

('00000000-0000-0000-0000-000000000004','00000000-0004-0000-0000-000000000001',
 'Parkfield Office — Commercial fit','Commercial rewire',
 date_trunc('week',now())+interval'3 days 8 hours', date_trunc('week',now())+interval'3 days 17 hours',
 'confirmed','Parkfield Ltd','Day 3 — second fix, testing, sign off.'),

('00000000-0000-0000-0000-000000000004','00000000-0004-0000-0000-000000000002',
 'Fernsby — Socket & lighting','Domestic sockets + lights',
 date_trunc('week',now())+interval'3 days 9 hours', date_trunc('week',now())+interval'3 days 12 hours',
 'confirmed','Helen Fernsby','Extension room. 4 double sockets, 3 downlights.'),

('00000000-0000-0000-0000-000000000004','00000000-0004-0000-0000-000000000001',
 'Jackson — Solar PV survey','Solar PV site survey',
 date_trunc('week',now())+interval'4 days 10 hours', date_trunc('week',now())+interval'4 days 11 hours 30 minutes',
 'confirmed','Mike Jackson','South-facing roof. 4kW system. Wants battery too.'),

('00000000-0000-0000-0000-000000000004','00000000-0004-0000-0000-000000000002',
 'PAT Testing — Ferndale School','Portable appliance testing',
 date_trunc('week',now())+interval'4 days 9 hours', date_trunc('week',now())+interval'4 days 14 hours',
 'confirmed','Ferndale Primary','Annual PAT. ~120 items. Access via reception.'),


-- ═══ b05 PAWS & CLAWS DOG GROOMING ══════════════════════════════════════════

('00000000-0000-0000-0000-000000000005','00000000-0005-0000-0000-000000000001',
 'Buddy (Border Collie) — Full groom','Full groom',
 date_trunc('week',now())+interval'9 hours', date_trunc('week',now())+interval'10 hours 30 minutes',
 'confirmed','Claire Morris (Buddy)','Monthly groom. Anxious — go slow intro. No dryer on full blast.'),

('00000000-0000-0000-0000-000000000005','00000000-0005-0000-0000-000000000002',
 'Poppy (Cockapoo) — Puppy groom','First puppy groom',
 date_trunc('week',now())+interval'9 hours 30 minutes', date_trunc('week',now())+interval'10 hours 30 minutes',
 'confirmed','Steph Lane (Poppy)','10 months old. First ever groom. Keep it positive and short.'),

('00000000-0000-0000-0000-000000000005','00000000-0005-0000-0000-000000000001',
 'Rex (GSD) — Bath & brush','Bath + brush out',
 date_trunc('week',now())+interval'11 hours', date_trunc('week',now())+interval'12 hours',
 'completed','Paul Drew (Rex)','Double coat — full de-shed. Messy.'),

('00000000-0000-0000-0000-000000000005','00000000-0005-0000-0000-000000000002',
 'Daisy (Shih Tzu) — Full groom','Full groom + bow',
 date_trunc('week',now())+interval'11 hours', date_trunc('week',now())+interval'12 hours 15 minutes',
 'completed','Maria Patel (Daisy)','Puppy cut. Pink bow.'),

('00000000-0000-0000-0000-000000000005','00000000-0005-0000-0000-000000000001',
 'Charlie (Schnauzer) — Breed trim','Schnauzer breed trim',
 date_trunc('week',now())+interval'1 day 9 hours', date_trunc('week',now())+interval'1 day 10 hours 30 minutes',
 'confirmed','Tom Wells (Charlie)','Classic schnauzer. Hand strip beard.'),

('00000000-0000-0000-0000-000000000005','00000000-0005-0000-0000-000000000002',
 'Lola (Bichon) — Full groom','Full groom',
 date_trunc('week',now())+interval'1 day 10 hours', date_trunc('week',now())+interval'1 day 11 hours 15 minutes',
 'confirmed','Anna Bright (Lola)','Fluffy round head. Very wriggly.'),

('00000000-0000-0000-0000-000000000005','00000000-0005-0000-0000-000000000001',
 'Milo (Lab) — Bath & dry','Bath + blow dry',
 date_trunc('week',now())+interval'2 days 9 hours', date_trunc('week',now())+interval'2 days 10 hours',
 'confirmed','Raj Singh (Milo)','Muddy dog! Monthly bath. Happy boy.'),

('00000000-0000-0000-0000-000000000005','00000000-0005-0000-0000-000000000001',
 'Bella (Springer) — Show prep','Show preparation groom',
 date_trunc('week',now())+interval'3 days 9 hours', date_trunc('week',now())+interval'3 days 11 hours',
 'confirmed','Julie Fox (Bella)','County show Sat. Full show prep including feathering.'),

('00000000-0000-0000-0000-000000000005','00000000-0005-0000-0000-000000000002',
 'Teddy (Cavapoo) — Full groom','Full groom',
 date_trunc('week',now())+interval'3 days 10 hours', date_trunc('week',now())+interval'3 days 11 hours 15 minutes',
 'confirmed','Sarah Hunt (Teddy)','Teddy bear trim. Chocolate colour.'),

('00000000-0000-0000-0000-000000000005','00000000-0005-0000-0000-000000000001',
 'Archie (Spaniel) — Nail clip','Nail clipping + ear clean',
 date_trunc('week',now())+interval'4 days 9 hours', date_trunc('week',now())+interval'4 days 9 hours 30 minutes',
 'confirmed','Kevin Black (Archie)','Quick one. Just nails and ears.'),


-- ═══ b06 PREMIER MORTGAGE ════════════════════════════════════════════════════

('00000000-0000-0000-0000-000000000006','00000000-0006-0000-0000-000000000001',
 'Mr & Mrs Ahmed — FTB consultation','First-time buyer consultation',
 date_trunc('week',now())+interval'9 hours', date_trunc('week',now())+interval'10 hours',
 'confirmed','Mr & Mrs Ahmed','Looking at £280k. Both employed. 10% deposit saved.'),

('00000000-0000-0000-0000-000000000006','00000000-0006-0000-0000-000000000002',
 'Wilson — Protection review','Protection & insurance review',
 date_trunc('week',now())+interval'10 hours', date_trunc('week',now())+interval'11 hours',
 'confirmed','Mark Wilson','Existing life policy £100k. Underprovided. Two kids.'),

('00000000-0000-0000-0000-000000000006','00000000-0006-0000-0000-000000000001',
 'Taylor — Remortgage','Remortgage review',
 date_trunc('week',now())+interval'11 hours 30 minutes', date_trunc('week',now())+interval'12 hours 30 minutes',
 'confirmed','Lisa Taylor','Fixed rate ending July. £195k outstanding. 65% LTV.'),

('00000000-0000-0000-0000-000000000006','00000000-0006-0000-0000-000000000001',
 'Patel — BTL consultation','Buy-to-let mortgage consultation',
 date_trunc('week',now())+interval'1 day 9 hours', date_trunc('week',now())+interval'1 day 10 hours',
 'confirmed','Sunita Patel','Portfolio landlord. 3 existing properties. Looking at 4th.'),

('00000000-0000-0000-0000-000000000006','00000000-0006-0000-0000-000000000002',
 'Brown — Income protection','Income protection + CI',
 date_trunc('week',now())+interval'1 day 11 hours', date_trunc('week',now())+interval'1 day 12 hours',
 'confirmed','James Brown','Self-employed, no sick pay. High earner, needs proper cover.'),

('00000000-0000-0000-0000-000000000006','00000000-0006-0000-0000-000000000001',
 'Nguyen — Mortgage application','Full mortgage application',
 date_trunc('week',now())+interval'2 days 10 hours', date_trunc('week',now())+interval'2 days 11 hours 30 minutes',
 'confirmed','Thuy Nguyen','DIP approved. Submitting full app today. £315k purchase.'),

('00000000-0000-0000-0000-000000000006','00000000-0006-0000-0000-000000000001',
 'Hargreaves — Adverse credit','Adverse credit mortgage',
 date_trunc('week',now())+interval'3 days 9 hours', date_trunc('week',now())+interval'3 days 10 hours',
 'provisional','Wayne Hargreaves','CCJ from 3 years ago. Specialist lender route.'),

('00000000-0000-0000-0000-000000000006','00000000-0006-0000-0000-000000000002',
 'Clarke — Life insurance','Term life application',
 date_trunc('week',now())+interval'3 days 11 hours', date_trunc('week',now())+interval'3 days 12 hours',
 'confirmed','Diane Clarke','£300k, 25yr. Smoker — referred to specialist underwriter.'),

('00000000-0000-0000-0000-000000000006','00000000-0006-0000-0000-000000000001',
 'Evans — Shared ownership','Shared ownership mortgage',
 date_trunc('week',now())+interval'4 days 10 hours', date_trunc('week',now())+interval'4 days 11 hours',
 'confirmed','Chloe Evans','50% share, £185k. First time buyer. Housing association property.'),


-- ═══ b07 VALLEY VIEW B&B ═════════════════════════════════════════════════════

('00000000-0000-0000-0000-000000000007','00000000-0007-0000-0000-000000000001',
 'Johnson party — Check-in','Guest check-in (4 nights)',
 date_trunc('week',now())+interval'15 hours', date_trunc('week',now())+interval'15 hours 30 minutes',
 'confirmed','Mr & Mrs Johnson','Room 2 (lake view). Anniversary trip. Champagne in room.'),

('00000000-0000-0000-0000-000000000007','00000000-0007-0000-0000-000000000002',
 'Maintenance — Guest bathroom','Tap repair',
 date_trunc('week',now())+interval'10 hours', date_trunc('week',now())+interval'11 hours',
 'completed','Internal','Room 3 bath tap dripping. Fix before guests arrive Tue.'),

('00000000-0000-0000-0000-000000000007','00000000-0007-0000-0000-000000000001',
 'Fletcher — Check-in','Guest check-in (2 nights)',
 date_trunc('week',now())+interval'1 day 14 hours', date_trunc('week',now())+interval'1 day 14 hours 30 minutes',
 'confirmed','Dr & Dr Fletcher','Room 1. Cyclists — need secure bike storage.'),

('00000000-0000-0000-0000-000000000007','00000000-0007-0000-0000-000000000001',
 'Johnson party — Checkout','Guest checkout',
 date_trunc('week',now())+interval'3 days 10 hours', date_trunc('week',now())+interval'3 days 11 hours',
 'confirmed','Mr & Mrs Johnson','Late checkout requested — 11am agreed.'),

('00000000-0000-0000-0000-000000000007','00000000-0007-0000-0000-000000000002',
 'Grounds — Grass cut','Garden maintenance',
 date_trunc('week',now())+interval'3 days 9 hours', date_trunc('week',now())+interval'3 days 11 hours',
 'confirmed','Internal','Front and rear lawns. Before weekend guests.'),

('00000000-0000-0000-0000-000000000007','00000000-0007-0000-0000-000000000001',
 'Weekend guests — Check-in x3','Multiple check-ins',
 date_trunc('week',now())+interval'4 days 15 hours', date_trunc('week',now())+interval'4 days 17 hours',
 'confirmed','Various','Rooms 1, 2, 3 all taken Fri–Sun. Full house.'),


-- ═══ b08 APEX PRINT & DESIGN ═════════════════════════════════════════════════

('00000000-0000-0000-0000-000000000008','00000000-0008-0000-0000-000000000002',
 'TechStart — Brand identity','Logo + brand guidelines',
 date_trunc('week',now())+interval'9 hours', date_trunc('week',now())+interval'12 hours',
 'confirmed','TechStart Ltd','3 logo concepts due today. Presentation at 2pm.'),

('00000000-0000-0000-0000-000000000008','00000000-0008-0000-0000-000000000003',
 'Vehicle wraps — Morrison fleet','Fleet wrap production',
 date_trunc('week',now())+interval'8 hours', date_trunc('week',now())+interval'17 hours',
 'confirmed','Morrison Logistics','3 Transits. Day 1 of 2. Wrap material laminated and ready.'),

('00000000-0000-0000-0000-000000000008','00000000-0008-0000-0000-000000000002',
 'TechStart — Client presentation','Brand review meeting',
 date_trunc('week',now())+interval'14 hours', date_trunc('week',now())+interval'15 hours',
 'confirmed','TechStart Ltd','Present 3 concepts. Zoom link on file.'),

('00000000-0000-0000-0000-000000000008','00000000-0008-0000-0000-000000000003',
 'Vehicle wraps — Morrison fleet','Fleet wrap production',
 date_trunc('week',now())+interval'1 day 8 hours', date_trunc('week',now())+interval'1 day 17 hours',
 'confirmed','Morrison Logistics','Day 2. Application and sign-off.'),

('00000000-0000-0000-0000-000000000008','00000000-0008-0000-0000-000000000001',
 'Morrison — Fleet handover','Vehicle wrap handover',
 date_trunc('week',now())+interval'1 day 15 hours', date_trunc('week',now())+interval'1 day 16 hours',
 'confirmed','Morrison Logistics','Client inspection + sign-off. Invoice on handover.'),

('00000000-0000-0000-0000-000000000008','00000000-0008-0000-0000-000000000002',
 'Pavilion Hotel — Exhibition','Exhibition stand design',
 date_trunc('week',now())+interval'2 days 9 hours', date_trunc('week',now())+interval'2 days 12 hours',
 'confirmed','Pavilion Hotel','5m pop-up for hospitality expo. Due end of week.'),

('00000000-0000-0000-0000-000000000008','00000000-0008-0000-0000-000000000003',
 'Flyer run — CityFit Gym','Flyer + leaflet print run',
 date_trunc('week',now())+interval'2 days 9 hours', date_trunc('week',now())+interval'2 days 14 hours',
 'confirmed','CityFit Gym','25,000 A5 flyers. Gloss laminate. Collect Thu.'),

('00000000-0000-0000-0000-000000000008','00000000-0008-0000-0000-000000000001',
 'New client — Print consult','New client consultation',
 date_trunc('week',now())+interval'3 days 10 hours', date_trunc('week',now())+interval'3 days 11 hours',
 'confirmed','Pinnacle Estate Agents','Wants full stationery suite + boards. Big potential account.'),

('00000000-0000-0000-0000-000000000008','00000000-0008-0000-0000-000000000003',
 'CityFit — Collect flyers','Customer collection',
 date_trunc('week',now())+interval'3 days 14 hours', date_trunc('week',now())+interval'3 days 14 hours 30 minutes',
 'confirmed','CityFit Gym','Boxed and labelled. 25k flyers.'),

('00000000-0000-0000-0000-000000000008','00000000-0008-0000-0000-000000000002',
 'Pavilion Hotel — Artwork sign-off','Final artwork approval',
 date_trunc('week',now())+interval'4 days 11 hours', date_trunc('week',now())+interval'4 days 12 hours',
 'confirmed','Pavilion Hotel','Print by Monday. Get approval today.'),


-- ═══ b09 NATIONWIDE RECRUITMENT ══════════════════════════════════════════════

('00000000-0000-0000-0000-000000000009','00000000-0009-0000-0000-000000000001',
 'BDG Group — Strategy call','Key account strategy call',
 date_trunc('week',now())+interval'9 hours', date_trunc('week',now())+interval'10 hours',
 'confirmed','BDG Group MD','Retained search brief. CFO replacement. Confidential.'),

('00000000-0000-0000-0000-000000000009','00000000-0009-0000-0000-000000000002',
 'Harrington Logistics — Interim brief','Interim ops manager brief',
 date_trunc('week',now())+interval'10 hours', date_trunc('week',now())+interval'11 hours',
 'confirmed','Harrington Logistics','Need someone in 2 weeks. Mat cover. £450/day budget.'),

('00000000-0000-0000-0000-000000000009','00000000-0009-0000-0000-000000000003',
 'Candidate — CTO interview prep','Interview coaching',
 date_trunc('week',now())+interval'11 hours', date_trunc('week',now())+interval'12 hours',
 'confirmed','James Park (candidate)','Final round at Nexus Tech tomorrow. Mock interview.'),

('00000000-0000-0000-0000-000000000009','00000000-0009-0000-0000-000000000004',
 'St Helens NHS — Framework review','NHS framework account review',
 date_trunc('week',now())+interval'9 hours', date_trunc('week',now())+interval'10 hours',
 'confirmed','St Helens NHS Trust','Quarterly review. Q3 placements up 22%.'),

('00000000-0000-0000-0000-000000000009','00000000-0009-0000-0000-000000000002',
 'Meridian — Finance director search','Retained exec search kickoff',
 date_trunc('week',now())+interval'1 day 10 hours', date_trunc('week',now())+interval'1 day 11 hours',
 'confirmed','Meridian Group','FD replacement. £120k base. Longlisting in 3 weeks.'),

('00000000-0000-0000-0000-000000000009','00000000-0009-0000-0000-000000000003',
 'Nexus Tech — Dev team expansion','Technical recruitment brief',
 date_trunc('week',now())+interval'1 day 14 hours', date_trunc('week',now())+interval'1 day 15 hours',
 'confirmed','Nexus Tech CTO','4 senior engineers needed. React + Node. Remote friendly.'),

('00000000-0000-0000-0000-000000000009','00000000-0009-0000-0000-000000000001',
 'Weekly team stand-up','Internal meeting',
 date_trunc('week',now())+interval'2 days 9 hours', date_trunc('week',now())+interval'2 days 9 hours 30 minutes',
 'confirmed','All team','Pipeline + placements review. Board pack due Fri.'),

('00000000-0000-0000-0000-000000000009','00000000-0009-0000-0000-000000000004',
 'Candidate — Band 7 nurse','Nursing candidate interview',
 date_trunc('week',now())+interval'2 days 10 hours', date_trunc('week',now())+interval'2 days 11 hours',
 'confirmed','Priya Rao (candidate)','ICU background. Placing at Wrightington. Start ASAP.'),

('00000000-0000-0000-0000-000000000009','00000000-0009-0000-0000-000000000002',
 'Board pack preparation','Internal — board reporting',
 date_trunc('week',now())+interval'4 days 14 hours', date_trunc('week',now())+interval'4 days 16 hours',
 'confirmed','Sam Taylor','Monthly board pack for Debbie. Revenue, placements, pipeline.'),


-- ═══ b10 JB SPORTS & FASHION ═════════════════════════════════════════════════

('00000000-0000-0000-0000-000000000010','00000000-0010-0000-0000-000000000002',
 'SportsDirect — Wholesale review','Key account meeting',
 date_trunc('week',now())+interval'10 hours', date_trunc('week',now())+interval'11 hours 30 minutes',
 'confirmed','SportsDirect Buying Team','AW25 range review. New football boot line to pitch.'),

('00000000-0000-0000-0000-000000000010','00000000-0010-0000-0000-000000000003',
 'Shenzhen factory — Supply call','Factory supply chain call',
 date_trunc('week',now())+interval'8 hours', date_trunc('week',now())+interval'9 hours',
 'confirmed','Golden Star Factory','Q4 order confirmation. Shipping timeline for Christmas stock.'),

('00000000-0000-0000-0000-000000000010','00000000-0010-0000-0000-000000000001',
 'Investor briefing','Investor relations update',
 date_trunc('week',now())+interval'1 day 14 hours', date_trunc('week',now())+interval'1 day 15 hours 30 minutes',
 'confirmed','Cornerstone Capital','H1 performance. Expansion plans to Germany.'),

('00000000-0000-0000-0000-000000000010','00000000-0010-0000-0000-000000000002',
 'JD Sports — New line pitch','Trade pitch meeting',
 date_trunc('week',now())+interval'1 day 10 hours', date_trunc('week',now())+interval'1 day 11 hours 30 minutes',
 'confirmed','JD Sports Buyer','AW25 lifestyle range. Potential 50k unit order.'),

('00000000-0000-0000-0000-000000000010','00000000-0010-0000-0000-000000000003',
 'QC — AW25 sample review','Quality control inspection',
 date_trunc('week',now())+interval'2 days 9 hours', date_trunc('week',now())+interval'2 days 12 hours',
 'confirmed','Marcus Webb','50 AW25 samples arrived. Size, colour, construction check.'),

('00000000-0000-0000-0000-000000000010','00000000-0010-0000-0000-000000000002',
 'Euro Trade Show — Planning','Trade show logistics meeting',
 date_trunc('week',now())+interval'3 days 10 hours', date_trunc('week',now())+interval'3 days 11 hours',
 'confirmed','Internal','ISPO Munich Feb. Stand design, samples, travel bookings.'),

('00000000-0000-0000-0000-000000000010','00000000-0010-0000-0000-000000000001',
 'Brand licensing — NDA review','Brand licensing meeting',
 date_trunc('week',now())+interval'3 days 14 hours', date_trunc('week',now())+interval'3 days 15 hours 30 minutes',
 'confirmed','ProActivewear LLC','US licensing deal. NDA signed. Terms to negotiate.'),

('00000000-0000-0000-0000-000000000010','00000000-0010-0000-0000-000000000003',
 'Warehouse — Stocktake','Half-year stocktake',
 date_trunc('week',now())+interval'4 days 8 hours', date_trunc('week',now())+interval'4 days 14 hours',
 'confirmed','Internal','Full stocktake before accounts close. All hands on deck.');


-- ═══════════════════════════════════════════════════════════════════
-- DONE — next step: update DemoContext.jsx and Calendar.jsx
-- ═══════════════════════════════════════════════════════════════════
