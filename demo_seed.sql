-- =====================================================================
-- QERXEL — Demo Data Seed  (Strategic Business Set)
-- =====================================================================
-- Creates all demo_ tables and seeds 10 strategic businesses.
-- Safe to re-run — truncates demo data before re-inserting.
-- Run in Supabase SQL Editor.
--
-- b01  Hargreaves Plumbing          (standard)
-- b02  Elegant Hair Design           (light)
-- b03  Greenfield Landscape          (professional)
-- b04  Swift Electrical              (standard)
-- b05  Paws & Claws Dog Grooming     (light)
-- b06  Premier Mortgage Solutions    (professional)
-- b07  Valley View B&B               (standard)
-- b08  Apex Print & Design           (professional)
-- b09  Nationwide Recruitment        (enterprise)
-- b10  JB Sports & Fashion           (enterprise)
-- u99  demo@qerxel.app             (sales rep)
-- =====================================================================


-- ═══════════════════════════════════════════════════════════════════
-- 1. CREATE TABLES (idempotent)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS demo_businesses (
  id                    uuid primary key,
  business_name         text not null,
  business_type         text,
  tier                  text default 'standard',
  business_email        text,
  business_phone        text,
  lead_contact_name     text,
  booking_link          text,
  opening_hours         text,
  business_context      text,
  triage_mode           text default 'balanced',
  tone_register         text default 'warm',
  business_outcome_type text default 'booking',
  greeting_message      text,
  included_minutes      integer default 250,
  credits_balance       integer default 0,
  referral_code         text,
  created_at            timestamptz default now()
);

CREATE TABLE IF NOT EXISTS demo_services (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid references demo_businesses(id) on delete cascade,
  service_name       text not null,
  is_partner_service boolean default false
);

CREATE TABLE IF NOT EXISTS demo_staff (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid references demo_businesses(id) on delete cascade,
  name                text not null,
  role                text,
  specialist_services text,
  phone               text,
  active              boolean default true
);

CREATE TABLE IF NOT EXISTS demo_partners (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references demo_businesses(id) on delete cascade,
  partner_name text not null,
  partner_phone text,
  specialty    text
);

CREATE TABLE IF NOT EXISTS demo_call_logs (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid references demo_businesses(id) on delete cascade,
  caller_name      text,
  caller_number    text,
  duration_seconds integer,
  call_outcome     text,
  triage_outcome   text,
  ai_summary       text,
  created_at       timestamptz default now()
);

CREATE TABLE IF NOT EXISTS demo_leads (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references demo_businesses(id) on delete cascade,
  caller_name  text,
  caller_number text,
  enquiry_type text,
  notes        text,
  status       text default 'new',
  created_at   timestamptz default now()
);

CREATE TABLE IF NOT EXISTS demo_referral_log (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid references demo_businesses(id) on delete cascade,
  partner_name      text,
  caller_name       text,
  service_requested text,
  created_at        timestamptz default now()
);

CREATE TABLE IF NOT EXISTS demo_pricing_intelligence (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid references demo_businesses(id) on delete cascade,
  service_name text,
  our_price    numeric,
  market_low   numeric,
  market_high  numeric,
  insight      text
);

CREATE TABLE IF NOT EXISTS demo_competitor_intelligence (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid references demo_businesses(id) on delete cascade,
  competitor_name text,
  mention_count   integer default 1,
  context         text
);

CREATE TABLE IF NOT EXISTS demo_users (
  id          uuid primary key,
  email       text unique not null,
  name        text,
  role        text default 'sales_rep',
  access_code text,
  created_at  timestamptz default now()
);

CREATE TABLE IF NOT EXISTS demo_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references demo_users(id),
  business_id uuid references demo_businesses(id),
  tier        text,
  started_at  timestamptz default now(),
  ended_at    timestamptz
);


-- ═══════════════════════════════════════════════════════════════════
-- 2. TRUNCATE (safe re-run)
-- ═══════════════════════════════════════════════════════════════════

TRUNCATE demo_sessions, demo_competitor_intelligence, demo_pricing_intelligence,
         demo_referral_log, demo_leads, demo_call_logs,
         demo_partners, demo_staff, demo_services CASCADE;
DELETE FROM demo_businesses;
DELETE FROM demo_users;


-- ═══════════════════════════════════════════════════════════════════
-- 3. DEMO USER
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_users (id, email, name, role, access_code) VALUES
('00000000-0000-0000-0000-000000000099', 'demo@qerxel.app', 'Demo User', 'sales_rep', 'QERXEL2026');


-- ═══════════════════════════════════════════════════════════════════
-- 4. DEMO BUSINESSES
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_businesses (
  id, business_name, business_type, tier,
  business_email, business_phone, lead_contact_name,
  booking_link, opening_hours, business_context,
  triage_mode, tone_register, business_outcome_type,
  greeting_message, included_minutes, credits_balance, referral_code
) VALUES

-- b01 Hargreaves Plumbing — Standard
('00000000-0000-0000-0000-000000000001',
 'Hargreaves Plumbing', 'plumber', 'standard',
 'mike@hargreavesplumbing.co.uk', '0114 234 5678', 'Mike Hargreaves',
 null,
 'Mon–Fri 7am–6pm, Sat 8am–1pm',
 'Family-run plumbing business serving Sheffield and South Yorkshire for 14 years. Emergency call-outs 7 days a week. Boiler specialists, bathroom installations, central heating, drain unblocking.',
 'balanced', 'warm', 'callback',
 'Hello, you''ve reached Hargreaves Plumbing. Mike''s out on a job right now — I can take your details and arrange a callback as soon as possible.',
 250, 3, 'HRG-1234'),

-- b02 Elegant Hair Design — Light
('00000000-0000-0000-0000-000000000002',
 'Elegant Hair Design', 'hair_salon', 'light',
 'tracy@eleganthairdesign.co.uk', '0113 345 6789', 'Tracy Walsh',
 'https://booksy.com/eleganthair',
 'Tue–Sat 9am–6pm, Sun & Mon closed',
 'Boutique hair salon in Leeds city centre. Specialists in colour, balayage, and Olaplex treatments. Tracy and her team have over 20 years of combined experience.',
 'balanced', 'warm', 'booking',
 'Hello, Elegant Hair Design! Tracy''s with a client right now — I can take a message or help you book an appointment.',
 120, 1, 'EHD-5678'),

-- b03 Greenfield Landscape Gardening — Professional
('00000000-0000-0000-0000-000000000003',
 'Greenfield Landscape Gardening', 'landscape_gardener', 'professional',
 'james@greenfieldlandscape.co.uk', '0161 456 7890', 'James Greenfield',
 'https://greenfieldlandscape.co.uk/quote',
 'Mon–Fri 7am–5pm, Sat 8am–12pm',
 'Award-winning landscaping and garden maintenance company in Manchester. Commercial and residential. Garden design, hard landscaping, ongoing maintenance contracts. RHS trained team.',
 'open', 'warm', 'quote',
 'Hello, you''ve reached Greenfield Landscape Gardening. James and the team are out in the gardens — tell me about your project and we''ll get back to you with a quote.',
 450, 5, 'GFL-9012'),

-- b04 Swift Electrical — Standard
('00000000-0000-0000-0000-000000000004',
 'Swift Electrical', 'electrician', 'standard',
 'dave@swiftelectrical.co.uk', '0121 567 8901', 'Dave Swift',
 null,
 'Mon–Fri 7:30am–5:30pm',
 'NICEIC-registered electrical contractor serving Birmingham and the West Midlands. Consumer unit upgrades, EV charger installation, rewiring, commercial installations, PAT testing.',
 'balanced', 'formal', 'quote',
 'Thank you for calling Swift Electrical. Dave is currently on a job — I can take your details and arrange a quote callback.',
 250, 2, 'SWF-3456'),

-- b05 Paws & Claws Dog Grooming — Light
('00000000-0000-0000-0000-000000000005',
 'Paws & Claws Dog Grooming', 'dog_groomer', 'light',
 'sarah@pawsandclaws.co.uk', '0117 678 9012', 'Sarah Chen',
 'https://pawsandclaws.co.uk/book',
 'Wed–Sun 9am–5pm',
 'Mobile and salon dog grooming service in Bristol. All breeds welcome. Full grooms, puppy packages, anxiety-free approach. Sarah is a City & Guilds qualified groomer.',
 'balanced', 'warm', 'booking',
 'Hi! You''ve reached Paws & Claws Dog Grooming. Sarah''s busy with a gorgeous client right now — leave your details and she''ll call you straight back!',
 120, 2, 'PNC-7890'),

-- b06 Premier Mortgage Solutions — Professional
('00000000-0000-0000-0000-000000000006',
 'Premier Mortgage Solutions', 'mortgage_broker', 'professional',
 'caroline@premiermortgage.co.uk', '029 2034 5678', 'Caroline Hughes',
 'https://calendly.com/premiermortgage',
 'Mon–Fri 9am–6pm, Sat 10am–2pm',
 'Independent whole-of-market mortgage broker based in Cardiff. First time buyers, remortgage, buy to let, equity release. FCA registered. Access to over 90 lenders. No broker fee.',
 'open', 'formal', 'callback',
 'Thank you for calling Premier Mortgage Solutions. Caroline is with a client — I can arrange a free initial consultation at a time that suits you.',
 450, 7, 'PMR-2345'),

-- b07 Valley View B&B — Standard
('00000000-0000-0000-0000-000000000007',
 'Valley View B&B', 'bed_and_breakfast', 'standard',
 'hello@valleyviewbnb.co.uk', '01539 456 789', 'Paul & Janet Morris',
 'https://valleyviewbnb.co.uk/book',
 'Reception open 8am–9pm daily',
 'Family-run bed and breakfast in the heart of the Lake District, Ambleside. 6 en-suite rooms, home-cooked breakfasts, stunning fell views. Dog friendly. Walkers and cyclists welcome.',
 'balanced', 'warm', 'booking',
 'Hello, Valley View B&B! Paul or Janet will be with you shortly — I can take your enquiry or help check availability.',
 250, 4, 'VVB-6789'),

-- b08 Apex Print & Design — Professional
('00000000-0000-0000-0000-000000000008',
 'Apex Print & Design', 'print_design', 'professional',
 'mark@apexprintdesign.co.uk', '0115 567 8901', 'Mark Dobson',
 'https://apexprintdesign.co.uk/quote',
 'Mon–Fri 8am–5:30pm',
 'Full service print and design studio in Nottingham city centre. Business stationery, marketing materials, large format print, exhibition stands, vehicle graphics. 20 years in print.',
 'balanced', 'warm', 'quote',
 'Hello, Apex Print and Design! Mark and the studio team are in production — tell me what you need printing and we''ll get a quote over to you.',
 450, 6, 'APX-0123'),

-- b09 Nationwide Recruitment — Enterprise
('00000000-0000-0000-0000-000000000009',
 'Nationwide Recruitment', 'recruitment_agency', 'enterprise',
 'enquiries@nationwiderecruitment.co.uk', '0161 678 9012', 'Debbie Walsh',
 'https://nationwiderecruitment.co.uk/contact',
 'Mon–Fri 8am–6pm',
 'Leading UK recruitment agency specialising in professional and executive placements across commercial, finance, HR, and operations. Offices in Manchester, London, and Birmingham. Est. 2008.',
 'open', 'formal', 'callback',
 'Thank you for calling Nationwide Recruitment. Our team are busy with clients — I can take your details and connect you with the right consultant.',
 1000, 9, 'NWR-4567'),

-- b10 JB Sports & Fashion — Enterprise
('00000000-0000-0000-0000-000000000010',
 'JB Sports & Fashion', 'retail', 'enterprise',
 'headoffice@jbsportsfashion.co.uk', '020 7123 4567', 'Head Office',
 'https://jbsportsfashion.co.uk',
 'Mon–Sat 9am–6pm, Sun 11am–5pm',
 'National sports and fashion retailer with 40 stores across the UK. Head office enquiry line for wholesale, press, and commercial partnerships. Not a customer service line.',
 'strict', 'formal', 'callback',
 'Thank you for calling JB Sports & Fashion head office. Our team handles wholesale, press, and commercial enquiries — please tell me the nature of your call.',
 1000, 12, 'JBS-8901');


-- ═══════════════════════════════════════════════════════════════════
-- 5. SERVICES
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_services (business_id, service_name, is_partner_service) VALUES
-- Hargreaves Plumbing
('00000000-0000-0000-0000-000000000001','Boiler service & repair',false),
('00000000-0000-0000-0000-000000000001','Emergency call-out',false),
('00000000-0000-0000-0000-000000000001','Bathroom installation',false),
('00000000-0000-0000-0000-000000000001','Central heating',false),
('00000000-0000-0000-0000-000000000001','Drain unblocking',false),
('00000000-0000-0000-0000-000000000001','Power flush',false),
('00000000-0000-0000-0000-000000000001','EV charger installation',true),
('00000000-0000-0000-0000-000000000001','Garden electrical',true),

-- Elegant Hair Design
('00000000-0000-0000-0000-000000000002','Cut & blow dry',false),
('00000000-0000-0000-0000-000000000002','Colour & highlights',false),
('00000000-0000-0000-0000-000000000002','Balayage',false),
('00000000-0000-0000-0000-000000000002','Keratin treatment',false),
('00000000-0000-0000-0000-000000000002','Bridal hair',false),
('00000000-0000-0000-0000-000000000002','Hair extensions',false),

-- Greenfield Landscape
('00000000-0000-0000-0000-000000000003','Garden design',false),
('00000000-0000-0000-0000-000000000003','Lawn care & maintenance',false),
('00000000-0000-0000-0000-000000000003','Hedge trimming',false),
('00000000-0000-0000-0000-000000000003','Patio & decking',false),
('00000000-0000-0000-0000-000000000003','Fencing & boundary work',false),
('00000000-0000-0000-0000-000000000003','Garden clearance',false),
('00000000-0000-0000-0000-000000000003','Outdoor electrical',true),
('00000000-0000-0000-0000-000000000003','Outdoor plumbing',true),

-- Swift Electrical
('00000000-0000-0000-0000-000000000004','Consumer unit upgrade',false),
('00000000-0000-0000-0000-000000000004','EV charger installation',false),
('00000000-0000-0000-0000-000000000004','Full rewire',false),
('00000000-0000-0000-0000-000000000004','Garden & outdoor lighting',false),
('00000000-0000-0000-0000-000000000004','CCTV & security',false),
('00000000-0000-0000-0000-000000000004','PAT testing',false),
('00000000-0000-0000-0000-000000000004','Boiler & heating',true),
('00000000-0000-0000-0000-000000000004','Bathroom plumbing',true),

-- Paws & Claws
('00000000-0000-0000-0000-000000000005','Full groom',false),
('00000000-0000-0000-0000-000000000005','Bath & brush',false),
('00000000-0000-0000-0000-000000000005','Puppy first groom',false),
('00000000-0000-0000-0000-000000000005','Nail trim & tidy',false),
('00000000-0000-0000-0000-000000000005','De-shedding treatment',false),

-- Premier Mortgage
('00000000-0000-0000-0000-000000000006','First time buyer mortgage',false),
('00000000-0000-0000-0000-000000000006','Remortgage advice',false),
('00000000-0000-0000-0000-000000000006','Buy to let mortgage',false),
('00000000-0000-0000-0000-000000000006','Equity release',false),
('00000000-0000-0000-0000-000000000006','Protection insurance',false),
('00000000-0000-0000-0000-000000000006','Bridging finance',false),

-- Valley View B&B
('00000000-0000-0000-0000-000000000007','Bed & breakfast',false),
('00000000-0000-0000-0000-000000000007','Self-catering cottage',false),
('00000000-0000-0000-0000-000000000007','Group bookings',false),
('00000000-0000-0000-0000-000000000007','Walking & cycling packages',false),

-- Apex Print & Design
('00000000-0000-0000-0000-000000000008','Business stationery',false),
('00000000-0000-0000-0000-000000000008','Flyers & leaflets',false),
('00000000-0000-0000-0000-000000000008','Large format banners',false),
('00000000-0000-0000-0000-000000000008','Exhibition stands',false),
('00000000-0000-0000-0000-000000000008','Vehicle wraps',false),
('00000000-0000-0000-0000-000000000008','Branded merchandise',false),

-- Nationwide Recruitment
('00000000-0000-0000-0000-000000000009','Permanent placement',false),
('00000000-0000-0000-0000-000000000009','Temporary staffing',false),
('00000000-0000-0000-0000-000000000009','Executive search',false),
('00000000-0000-0000-0000-000000000009','HR consulting',false),
('00000000-0000-0000-0000-000000000009','Payroll services',false),

-- JB Sports & Fashion
('00000000-0000-0000-0000-000000000010','Wholesale enquiries',false),
('00000000-0000-0000-0000-000000000010','Press & media',false),
('00000000-0000-0000-0000-000000000010','Commercial partnerships',false),
('00000000-0000-0000-0000-000000000010','Franchise enquiries',false);


-- ═══════════════════════════════════════════════════════════════════
-- 6. STAFF  (Professional and Enterprise only)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_staff (business_id, name, role, specialist_services, phone, active) VALUES
-- Greenfield Landscape (professional)
('00000000-0000-0000-0000-000000000003','James Greenfield','Owner & Lead Designer','Garden design, Hard landscaping, Client consultations','07700 123456',true),
('00000000-0000-0000-0000-000000000003','Pete Walsh','Senior Groundsworker','Patio & decking, Fencing, Heavy clearance','07811 234567',true),
-- Premier Mortgage (professional)
('00000000-0000-0000-0000-000000000006','Caroline Hughes','Senior Mortgage Advisor','Residential, First time buyers, Remortgage','07600 345678',true),
('00000000-0000-0000-0000-000000000006','David Banks','Protection Specialist','Life insurance, Income protection, Critical illness','07711 456789',true),
-- Apex Print (professional)
('00000000-0000-0000-0000-000000000008','Mark Dobson','Owner & Print Director','Large format, Vehicle wraps, Production','07500 567890',true),
('00000000-0000-0000-0000-000000000008','Fiona Chen','Senior Designer','Brand identity, Design, Creative direction','07611 678901',true),
-- Nationwide Recruitment (enterprise)
('00000000-0000-0000-0000-000000000009','Debbie Walsh','Managing Director','Executive search, Strategic accounts','07700 789012',true),
('00000000-0000-0000-0000-000000000009','Sam Taylor','Head of Commercial','Commercial, Finance, Operations placements','07811 890123',true),
('00000000-0000-0000-0000-000000000009','Andy Jones','Head of Technology','IT, Digital, Engineering placements','07922 901234',true),
-- JB Sports (enterprise)
('00000000-0000-0000-0000-000000000010','Head Office Team','Commercial','Wholesale, Partnerships, Press','020 7123 4567',true);


-- ═══════════════════════════════════════════════════════════════════
-- 7. PARTNERS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_partners (business_id, partner_name, partner_phone, specialty) VALUES
-- Hargreaves Plumbing
('00000000-0000-0000-0000-000000000001','Swift Electrical','0121 567 8901','Electrical work — consumer units, rewiring, EV chargers'),
('00000000-0000-0000-0000-000000000001','Greenfield Landscape','0161 456 7890','Garden drainage, outdoor water features'),
-- Swift Electrical
('00000000-0000-0000-0000-000000000004','Hargreaves Plumbing','0114 234 5678','All plumbing and heating work'),
('00000000-0000-0000-0000-000000000004','Greenfield Landscape','0161 456 7890','Garden design when outdoor lighting is installed'),
-- Greenfield Landscape
('00000000-0000-0000-0000-000000000003','Hargreaves Plumbing','0114 234 5678','Outdoor water, irrigation, tap installation'),
('00000000-0000-0000-0000-000000000003','Swift Electrical','0121 567 8901','Garden lighting, outdoor power'),
-- Elegant Hair Design
('00000000-0000-0000-0000-000000000002','Paws & Claws Dog Grooming','0117 678 9012','Dog grooming — for clients with pets'),
-- Paws & Claws
('00000000-0000-0000-0000-000000000005','Valley View B&B','01539 456 789','Dog-friendly accommodation in the Lakes'),
('00000000-0000-0000-0000-000000000005','Elegant Hair Design','0113 345 6789','Grooming for the owners too!'),
-- Valley View B&B
('00000000-0000-0000-0000-000000000007','Paws & Claws Dog Grooming','0117 678 9012','Dog grooming for guests visiting with dogs'),
-- Premier Mortgage
('00000000-0000-0000-0000-000000000006','Nationwide Recruitment','0161 678 9012','Career changes often trigger remortgage needs'),
-- Nationwide Recruitment
('00000000-0000-0000-0000-000000000009','Premier Mortgage Solutions','029 2034 5678','Relocating candidates often need mortgage advice'),
('00000000-0000-0000-0000-000000000009','Apex Print & Design','0115 567 8901','Branded recruitment materials, candidate packs'),
-- Apex Print & Design
('00000000-0000-0000-0000-000000000008','Nationwide Recruitment','0161 678 9012','Studio hiring — designers and print managers'),
('00000000-0000-0000-0000-000000000008','JB Sports & Fashion','020 7123 4567','Branded merchandise and retail display materials');


-- ═══════════════════════════════════════════════════════════════════
-- 8. TODAY'S CALLS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at) VALUES

-- Hargreaves Plumbing (10 calls today)
('00000000-0000-0000-0000-000000000001','Sharon Whitfield','07711 234567',225,'lead_captured','lead_captured','New bathroom installation enquiry — 3-bed semi in Hillsborough, full suite replacement. Quote callback arranged for Thursday. Lead captured.',NOW() - interval '30 minutes'),
('00000000-0000-0000-0000-000000000001','Jim Barker','07822 345678',180,'booked','booked','Annual boiler service — existing customer, same address Broomhill. Tuesday 10am confirmed.',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000001','Claire Robinson','07933 456789',300,'escalated','escalated','No heating or hot water — elderly resident, temperature dropping. Escalated as urgent. Mike to call within 20 minutes.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000001','Derek Shaw','07500 567890',90,'referred_out','referred_out','Caller needed CCTV installation — outside scope. Referred to Swift Electrical on 0121 567 8901.',NOW() - interval '2.5 hours'),
('00000000-0000-0000-0000-000000000001','Pat Holland','07611 678901',195,'lead_captured','lead_captured','Power flush enquiry — old radiators not heating through, 1930s terrace. Mike to call Thursday with pricing. Lead captured.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000001','Steven Price','07722 789012',60,'filtered','filtered','Sales call from a boiler manufacturer — declined and closed politely.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000001','Nicola Grant','07833 890123',240,'booked','booked','Leak under kitchen sink — emergency call-out booked for this afternoon. Address captured.',NOW() - interval '5 hours'),
('00000000-0000-0000-0000-000000000001','Graham West','07944 901234',175,'lead_captured','lead_captured','Central heating upgrade — moving from back boiler to combi. Site visit to quote next week. Lead captured.',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000001','Angela Ford','07555 012345',45,'spam','spam','Automated call detected and filtered.',NOW() - interval '7 hours'),
('00000000-0000-0000-0000-000000000001','Robert Marsh','07666 123456',210,'lead_captured','lead_captured','Drain unblocking — commercial kitchen drain, restaurant in town centre. Urgency flagged, callback within 2 hours. Lead captured.',NOW() - interval '8 hours'),

-- Elegant Hair Design (5 calls today — light tier)
('00000000-0000-0000-0000-000000000002','Gemma Riley','07700 234567',150,'booked','booked','Cut and colour appointment — Saturday 11am with Tracy. Consultation for brunette to blonde balayage confirmed.',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000002','Louise Patel','07811 345678',95,'lead_captured','lead_captured','Bridal hair enquiry — wedding in July, 4 bridesmaids. Trial date discussed. Lead captured for quote.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000002','Carol Jennings','07922 456789',75,'booked','booked','Regular cut and blow dry — Thursday 2pm rebooked.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000002','Michelle Park','07533 567890',45,'filtered','filtered','Caller asking for product stockist — referred to website, no appointment needed.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000002','Rebecca Stone','07644 678901',185,'lead_captured','lead_captured','Keratin treatment enquiry — frizzy hair, first time. Treatment explained, pricing given. Lead captured.',NOW() - interval '5 hours'),

-- Greenfield Landscape (14 calls today — professional)
('00000000-0000-0000-0000-000000000003','Andrew Palmer','07700 789012',280,'lead_captured','lead_captured','Full garden redesign — large detached property in Altrincham, 80ft rear garden. Design consultation arranged for Saturday morning.',NOW() - interval '30 minutes'),
('00000000-0000-0000-0000-000000000003','Susan Morley','07811 890123',195,'booked','booked','Weekly maintenance contract — lawn mow, edging, hedge tidy. Starting Monday, confirmed.',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000003','Brian Collins','07922 901234',240,'lead_captured','lead_captured','Patio installation — 40sq metre, Indian stone. Quote visit booked for Wednesday afternoon.',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000003','Wendy Harris','07533 012345',90,'referred_out','referred_out','Outdoor tap installation — referred to Hargreaves Plumbing on 0114 234 5678. Left message with details.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000003','Neil Thompson','07644 123456',315,'lead_captured','lead_captured','Commercial contract enquiry — business park in Salford, 12 units, communal areas. Meeting with James arranged for next Monday.',NOW() - interval '2.5 hours'),
('00000000-0000-0000-0000-000000000003','Diane Walker','07755 234567',175,'booked','booked','Garden clearance — 3 years of growth, large rear garden. Friday 8am, 2-man team confirmed.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000003','Kevin Adams','07866 345678',60,'filtered','filtered','Autodialler detected — filtered before reaching voicemail.',NOW() - interval '3.5 hours'),
('00000000-0000-0000-0000-000000000003','Janet Morrison','07977 456789',220,'lead_captured','lead_captured','Fence replacement — 20m of fence panels and posts blown down in storm. Quote callback tomorrow. Lead captured.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000003','Phil Ward','07588 567890',195,'lead_captured','lead_captured','Annual maintenance contract renewal enquiry — current customer, 2 years. Pricing discussed, James to confirm. Lead captured.',NOW() - interval '4.5 hours'),
('00000000-0000-0000-0000-000000000003','Carol Shaw','07699 678901',155,'booked','booked','One-off autumn tidy — lawns, hedges, leaf clearing. Thursday afternoon booked.',NOW() - interval '5 hours'),
('00000000-0000-0000-0000-000000000003','Tim Barker','07700 789012',45,'spam','spam','Recognised spam number — filtered and blocked.',NOW() - interval '5.5 hours'),
('00000000-0000-0000-0000-000000000003','Fiona Grant','07811 890123',265,'lead_captured','lead_captured','Decking installation — composite, approx 30sq metres with steps. Quote visit Friday morning. Lead captured.',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000003','Mark Robinson','07922 901234',185,'referred_out','referred_out','Garden lighting installation — outside scope. Referred to Swift Electrical on 0121 567 8901.',NOW() - interval '7 hours'),
('00000000-0000-0000-0000-000000000003','Helen Price','07533 012345',230,'lead_captured','lead_captured','Japanese garden redesign enquiry — specialist project, Hale Barns. James to call to discuss design approach. Lead captured.',NOW() - interval '8 hours'),

-- Swift Electrical (10 calls today)
('00000000-0000-0000-0000-000000000004','Paul Freeman','07644 123456',255,'lead_captured','lead_captured','Consumer unit upgrade — 1960s property, old fuse box. Quote arranged for Thursday. Dave to attend. Lead captured.',NOW() - interval '45 minutes'),
('00000000-0000-0000-0000-000000000004','Janice Cook','07755 234567',180,'lead_captured','lead_captured','EV charger installation — home charge point, new electric car arriving next week. Survey booked for Wednesday.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000004','Tony Mason','07866 345678',300,'booked','booked','Full rewire — 1930s semi, extension recently added, EICR required. Site visit Monday 9am confirmed.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000004','Sandra Booth','07977 456789',90,'referred_out','referred_out','Boiler fault — not electrical, referred to Hargreaves Plumbing on 0114 234 5678.',NOW() - interval '3.5 hours'),
('00000000-0000-0000-0000-000000000004','Colin Hardy','07588 567890',195,'lead_captured','lead_captured','Commercial PAT testing — 40-desk office, annual requirement. Quote to follow. Lead captured.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000004','Margaret Bell','07699 678901',45,'filtered','filtered','Sales call from cable supplier — filtered and declined.',NOW() - interval '5 hours'),
('00000000-0000-0000-0000-000000000004','Wayne Foster','07700 789012',225,'lead_captured','lead_captured','CCTV system — retail unit in city centre, 8 cameras required. Quote visit arranged for Friday afternoon.',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000004','Ruth Pearson','07811 890123',175,'booked','booked','Outdoor lighting — front of property, spotlights and PIR sensor. Booked for Saturday morning.',NOW() - interval '7 hours'),
('00000000-0000-0000-0000-000000000004','Steve Walsh','07922 901234',60,'spam','spam','Autodialler detected and filtered.',NOW() - interval '7.5 hours'),
('00000000-0000-0000-0000-000000000004','Dawn Clarke','07533 012345',240,'lead_captured','lead_captured','Extension electrical — new kitchen extension, first fix and second fix required. Dave to quote next week.',NOW() - interval '8 hours'),

-- Paws & Claws (5 calls today — light tier)
('00000000-0000-0000-0000-000000000005','Sophie Turner','07644 123456',140,'booked','booked','Full groom for Labrador — Saturday 10am confirmed.',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000005','Mark Evans','07755 234567',95,'lead_captured','lead_captured','Puppy enquiry — 14-week Dachshund, first grooming experience. Puppy package explained. Lead captured.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000005','Helen Griffiths','07866 345678',65,'filtered','filtered','Asking about boarding — outside scope, referred to local kennels.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000005','James Bowen','07977 456789',165,'booked','booked','Monthly groom for Bichon — last Friday of every month, standing appointment.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000005','Catherine Ford','07588 567890',120,'lead_captured','lead_captured','De-shedding treatment for German Shepherd — seasonal, shedding heavily. Lead captured.',NOW() - interval '5 hours'),

-- Premier Mortgage (14 calls today — professional)
('00000000-0000-0000-0000-000000000006','Richard Owen','07699 678901',380,'lead_captured','lead_captured','First time buyer — 2-bed flat in Cardiff Bay, £220k, 10% deposit. Free consultation booked with Caroline for Thursday.',NOW() - interval '30 minutes'),
('00000000-0000-0000-0000-000000000006','Amanda Summers','07700 789012',295,'lead_captured','lead_captured','Remortgage enquiry — fixed rate ending April, want to review options. Whole-of-market comparison offered. Consultation Tuesday.',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000006','Gary Patterson','07811 890123',420,'escalated','escalated','Complex buy-to-let scenario — 4 properties, HMO conversion planned. Escalated to Caroline directly, complex case.',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000006','Linda Foster','07922 901234',245,'lead_captured','lead_captured','Equity release — 68 years old, wants to unlock value in family home for retirement income. Callback with David booked.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000006','Chris Bailey','07533 012345',180,'lead_captured','lead_captured','Self-employed mortgage — 2-years trading, SA302s available. Reassured lenders available. Consultation booked.',NOW() - interval '2.5 hours'),
('00000000-0000-0000-0000-000000000006','Susan Moore','07644 123456',90,'filtered','filtered','PPI claims cold call — declined and filtered.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000006','Ian Richards','07755 234567',335,'lead_captured','lead_captured','Mortgage for new build — off-plan purchase, exchange in 6 weeks. Fast-tracked consultation arranged.',NOW() - interval '3.5 hours'),
('00000000-0000-0000-0000-000000000006','Joyce Whitehead','07866 345678',265,'lead_captured','lead_captured','Protection insurance — client bought home 2 years ago, not yet reviewed protection. David to call Thursday.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000006','Peter Hall','07977 456789',195,'lead_captured','lead_captured','Shared ownership scheme — NHS worker, wants to understand options. Caroline to call with overview.',NOW() - interval '4.5 hours'),
('00000000-0000-0000-0000-000000000006','Donna Wright','07588 567890',45,'spam','spam','Automated marketing call detected and filtered.',NOW() - interval '5 hours'),
('00000000-0000-0000-0000-000000000006','Trevor Blake','07699 678901',310,'escalated','escalated','Urgent bridging loan — property chain collapsing, needs bridging within 10 days. Escalated to Caroline immediately.',NOW() - interval '5.5 hours'),
('00000000-0000-0000-0000-000000000006','Karen Long','07700 789012',220,'lead_captured','lead_captured','Portfolio remortgage — 3 buy-to-lets, all fixed rates expiring same month. Callback with Caroline next week.',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000006','Dennis Marsh','07811 890123',155,'referred_out','referred_out','Commercial property finance — outside residential scope. Referred to commercial broker partner.',NOW() - interval '7 hours'),
('00000000-0000-0000-0000-000000000006','Frances Cooper','07922 901234',285,'lead_captured','lead_captured','Help to buy equity loan query — wants to understand government scheme before buying. Consultation arranged.',NOW() - interval '8 hours'),

-- Valley View B&B (10 calls today)
('00000000-0000-0000-0000-000000000007','Robert Yates','07533 012345',175,'booked','booked','Weekend break — 2 nights, double en-suite, arriving Friday. Booked and deposit confirmed.',NOW() - interval '30 minutes'),
('00000000-0000-0000-0000-000000000007','Claire Parson','07644 123456',145,'lead_captured','lead_captured','Walking holiday enquiry — week in August, 2 adults plus dog, want fell walking access. Lead captured, availability to confirm.',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000007','Patrick Holt','07755 234567',220,'booked','booked','Group booking — 6 walkers, 3 rooms, October half term. All rooms confirmed.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000007','Barbara Kent','07866 345678',95,'referred_out','referred_out','Caller enquiring about pet boarding during stay — referred to Paws & Claws dog grooming locally.',NOW() - interval '2.5 hours'),
('00000000-0000-0000-0000-000000000007','Frank Gibson','07977 456789',195,'lead_captured','lead_captured','Anniversary stay — special occasion, want something romantic, lake view. Availability checking, lead captured.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000007','Olive Jordan','07588 567890',60,'filtered','filtered','Asking for local taxi number only — no booking intent, details provided and call ended.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000007','Malcolm Price','07699 678901',240,'booked','booked','Self-catering cottage — 5 nights in November, family of 4. Cottage confirmed, deposit taken.',NOW() - interval '5 hours'),
('00000000-0000-0000-0000-000000000007','Geraldine Fox','07700 789012',175,'lead_captured','lead_captured','Christmas availability — want to book Christmas week 2025. Enquiry captured, Paul to confirm Christmas tariff.',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000007','Colin Marsh','07811 890123',45,'spam','spam','Automated sales call detected and ended.',NOW() - interval '7 hours'),
('00000000-0000-0000-0000-000000000007','Alice Lambert','07922 901234',185,'booked','booked','Last minute 2-night booking — arriving tomorrow. Room confirmed, directions sent.',NOW() - interval '8 hours'),

-- Apex Print & Design (14 calls today)
('00000000-0000-0000-0000-000000000008','Helen Carter','07533 012345',255,'lead_captured','lead_captured','Exhibition stand enquiry — 3m × 3m shell scheme, national trade show in 6 weeks. Design brief discussed, quote to follow.',NOW() - interval '45 minutes'),
('00000000-0000-0000-0000-000000000008','Dave Morgan','07644 123456',195,'lead_captured','lead_captured','Vehicle wrap — van fleet of 4, full wrap with company branding. Site visit for measurements booked.',NOW() - interval '1.5 hours'),
('00000000-0000-0000-0000-000000000008','Sarah King','07755 234567',145,'booked','booked','Business cards reorder — same artwork, 2000 single-sided, production to start today.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000008','Neil Chambers','07866 345678',225,'lead_captured','lead_captured','Corporate brochure — 16-page A4, quarterly publication, 500 copies. Design and print quoted. Lead captured.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000008','Fay Simmons','07977 456789',90,'filtered','filtered','Cold call from paper supplier — outside scope, declined.',NOW() - interval '3.5 hours'),
('00000000-0000-0000-0000-000000000008','Robert Jennings','07588 567890',310,'lead_captured','lead_captured','Restaurant menu redesign — new seasonal menu, 200 copies, DL and A3 sizes. Fiona to create brief. Lead captured.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000008','Carol Bates','07699 678901',175,'booked','booked','Flyer run — 5000 A5 double-sided, next day production. Order placed.',NOW() - interval '5 hours'),
('00000000-0000-0000-0000-000000000008','Ian Stewart','07700 789012',240,'lead_captured','lead_captured','Branded merchandise — 100 mugs, 200 tote bags, company event next month. Sourcing and pricing to follow.',NOW() - interval '5.5 hours'),
('00000000-0000-0000-0000-000000000008','Wendy Cole','07811 890123',195,'lead_captured','lead_captured','Shop signage — retail unit rebranding, window graphics and interior signage. Mark to attend site.',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000008','Gary Hunt','07922 901234',45,'spam','spam','Spam number detected and filtered.',NOW() - interval '6.5 hours'),
('00000000-0000-0000-0000-000000000008','Paula Grant','07533 012345',275,'lead_captured','lead_captured','Charity annual report — 28-page A4, design and print, 300 copies, trustees meet in 8 weeks. Lead captured.',NOW() - interval '7 hours'),
('00000000-0000-0000-0000-000000000008','Martin Cross','07644 123456',165,'booked','booked','PVC banner reorder — same spec, 2m × 1m, 3 copies. In production tomorrow.',NOW() - interval '7.5 hours'),
('00000000-0000-0000-0000-000000000008','Sandra Peel','07755 234567',220,'lead_captured','lead_captured','Stationery pack — letterheads, compliment slips, business cards. 3 employees. Full brand setup quoted.',NOW() - interval '8 hours'),
('00000000-0000-0000-0000-000000000008','Philip Stone','07866 345678',185,'referred_out','referred_out','Website design request — outside scope, referred to local agency partner.',NOW() - interval '9 hours'),

-- Nationwide Recruitment (18 calls today — enterprise)
('00000000-0000-0000-0000-000000000009','Katherine Bell','07977 456789',325,'lead_captured','lead_captured','Operations Director vacancy — manufacturing company, £80k role, need someone within 6 weeks. Debbie to call to brief.',NOW() - interval '20 minutes'),
('00000000-0000-0000-0000-000000000009','Marcus Fields','07588 567890',290,'lead_captured','lead_captured','Candidate registration — senior finance professional, relocating from London. Sam to call for registration interview.',NOW() - interval '45 minutes'),
('00000000-0000-0000-0000-000000000009','Joanne Harding','07699 678901',195,'escalated','escalated','Urgent temp cover — receptionist off sick, need someone tomorrow morning. Escalated to Sam immediately.',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000009','Derek Lane','07700 789012',245,'lead_captured','lead_captured','HR Manager role — 300-person SME going through growth phase. Debbie to brief and start search. Lead captured.',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000009','Christine Ball','07811 890123',175,'lead_captured','lead_captured','Candidate enquiry — marketing manager, 8 years experience, open to new opportunities. Registration interview with Sam booked.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000009','Kevin Walsh','07922 901234',90,'filtered','filtered','Wrong department call — looking for payroll query on existing placement, redirected.',NOW() - interval '2.5 hours'),
('00000000-0000-0000-0000-000000000009','Lynda Shaw','07533 012345',340,'lead_captured','lead_captured','Technology Director — fast-growth SaaS company, £120k package. Executive search brief. Debbie to call to confirm.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000009','Barry Connell','07644 123456',265,'lead_captured','lead_captured','Batch hire — 12 customer service roles for new contact centre opening. Account management call booked.',NOW() - interval '3.5 hours'),
('00000000-0000-0000-0000-000000000009','Yvonne Park','07755 234567',195,'lead_captured','lead_captured','Candidate registration — procurement specialist, 10 years, seeking director-level. Andy to call.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000009','James Birch','07866 345678',45,'spam','spam','Automated call detected and filtered.',NOW() - interval '4.5 hours'),
('00000000-0000-0000-0000-000000000009','Gloria Nash','07977 456789',310,'escalated','escalated','CFO search — board level, private equity backed business, retained assignment. Urgent call back from Debbie.',NOW() - interval '5 hours'),
('00000000-0000-0000-0000-000000000009','Terry Ford','07588 567890',220,'lead_captured','lead_captured','Temporary logistics staff — warehouse peak season, 20 workers needed in 2 weeks. Sam to call with availability.',NOW() - interval '5.5 hours'),
('00000000-0000-0000-0000-000000000009','Patricia Webb','07699 678901',185,'lead_captured','lead_captured','Candidate registering — recently made redundant, senior project manager, 15 years experience.',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000009','Simon Rhodes','07700 789012',155,'referred_out','referred_out','IT contractor looking for agency — outside permanent scope. Referred to specialist IT contractor partner.',NOW() - interval '6.5 hours'),
('00000000-0000-0000-0000-000000000009','Hannah Cross','07811 890123',275,'lead_captured','lead_captured','Sales Director vacancy — national account management, £95k. Andy to take initial brief. Lead captured.',NOW() - interval '7 hours'),
('00000000-0000-0000-0000-000000000009','Roger Hyde','07922 901234',195,'lead_captured','lead_captured','Graduate scheme intake — 6 commercial trainees, September start, structured programme. Brief with Debbie.',NOW() - interval '7.5 hours'),
('00000000-0000-0000-0000-000000000009','Stephanie Young','07533 012345',90,'filtered','filtered','Spam marketing call — filtered.',NOW() - interval '8 hours'),
('00000000-0000-0000-0000-000000000009','Alan Grant','07644 123456',340,'lead_captured','lead_captured','Multi-site manager role — national retailer, 4 locations, P&L responsibility, £65k. Lead captured.',NOW() - interval '9 hours'),

-- JB Sports & Fashion (18 calls today — enterprise)
('00000000-0000-0000-0000-000000000010','Maria Santos','07755 234567',285,'lead_captured','lead_captured','Wholesale enquiry — independent sports retailer, 12 stores, interested in branded range. Commercial team to follow up.',NOW() - interval '30 minutes'),
('00000000-0000-0000-0000-000000000010','James Holloway','07866 345678',195,'lead_captured','lead_captured','Press enquiry — sports journalist, requesting brand statement on new kit range. Press team to respond.',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000010','Chloe Barnes','07977 456789',345,'lead_captured','lead_captured','Partnership proposal — fitness influencer, 280k followers, wants collaboration deal. Commercial to call.',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000010','Daniel West','07588 567890',90,'filtered','filtered','Customer service query — wrong number, redirected to retail line.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000010','Rebecca Holt','07699 678901',255,'lead_captured','lead_captured','School sports kit tender — academy trust, 800 pupils, annual contract. Commercial team briefed.',NOW() - interval '2.5 hours'),
('00000000-0000-0000-0000-000000000010','Andrew Marsh','07700 789012',195,'escalated','escalated','National press — Sport Weekly magazine, feature piece deadline today. Escalated to press team.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000010','Susan Blake','07811 890123',165,'lead_captured','lead_captured','Franchise enquiry — experienced retailer, wants to open JB franchise in Scotland. Franchise pack requested.',NOW() - interval '3.5 hours'),
('00000000-0000-0000-0000-000000000010','Michael Turner','07922 901234',45,'spam','spam','Automated marketing call detected.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000010','Patricia Green','07533 012345',290,'lead_captured','lead_captured','Corporate sports kit — FTSE 250 company, team building events, 200 employees. Commercial partnership enquiry.',NOW() - interval '4.5 hours'),
('00000000-0000-0000-0000-000000000010','Kevin Archer','07644 123456',220,'lead_captured','lead_captured','Supplier enquiry — UK manufacturer looking to supply technical fabrics. Procurement to respond.',NOW() - interval '5 hours'),
('00000000-0000-0000-0000-000000000010','Linda Hatch','07755 234567',175,'filtered','filtered','Complaint call — wrong department, no action from head office line.',NOW() - interval '5.5 hours'),
('00000000-0000-0000-0000-000000000010','Colin Ramsey','07866 345678',310,'lead_captured','lead_captured','Stadium sponsorship proposal — League One football club, kit and signage deal. Commercial director to review.',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000010','Janet Fox','07977 456789',195,'lead_captured','lead_captured','Charity partnership enquiry — national youth sport charity, fundraising kit deal. Press & community team to respond.',NOW() - interval '6.5 hours'),
('00000000-0000-0000-0000-000000000010','Steve Moody','07588 567890',90,'filtered','filtered','Wrong department — store customer complaint, redirected to retail support.',NOW() - interval '7 hours'),
('00000000-0000-0000-0000-000000000010','Claire Abbott','07699 678901',265,'lead_captured','lead_captured','International distribution enquiry — UAE sports retailer wants UK branded range. Export team to follow up.',NOW() - interval '7.5 hours'),
('00000000-0000-0000-0000-000000000010','Darren Fox','07700 789012',45,'spam','spam','Spam call filtered.',NOW() - interval '8 hours'),
('00000000-0000-0000-0000-000000000010','Michelle Stone','07811 890123',340,'lead_captured','lead_captured','TV production enquiry — reality sport show wants brand partnership, ITV commission. Commercial urgent response.',NOW() - interval '8.5 hours'),
('00000000-0000-0000-0000-000000000010','Barry Cross','07922 901234',195,'lead_captured','lead_captured','Sports academy enquiry — county cricket academy, equipment supply deal. Commercial team to brief.',NOW() - interval '9 hours');


-- ═══════════════════════════════════════════════════════════════════
-- 9. HISTORICAL CALLS  (generate_series — last 26 days)
-- ═══════════════════════════════════════════════════════════════════

-- Hargreaves Plumbing — 60 historical (standard, callback/emergency focus)
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT '00000000-0000-0000-0000-000000000001',
  (ARRAY['Susan Bradley','Mike Collins','Ann Walsh','John Fisher','Diane Harris','Tom Shaw','Paula Grant','Steve Marsh','Carol Price','Dave Sutton'])[(s % 10) + 1],
  '07' || lpad(((s * 41 + 200) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[195,240,180,300,120,210,165,90,350,140,200,75,280,220,185,130,250,45,170,155])[(s % 20) + 1],
  (ARRAY['booked','lead_captured','booked','escalated','referred_out','booked','lead_captured','filtered','booked','lead_captured','booked','spam','booked','lead_captured','escalated','booked','referred_out','filtered','booked','lead_captured'])[(s % 20) + 1],
  (ARRAY['booked','lead_captured','booked','escalated','referred_out','booked','lead_captured','filtered','booked','lead_captured','booked','spam','booked','lead_captured','escalated','booked','referred_out','filtered','booked','lead_captured'])[(s % 20) + 1],
  NULL,
  NOW() - interval '26 days' + (s * interval '10 hours')
FROM generate_series(1, 60) AS s;

-- Elegant Hair Design — 35 historical (light, booking focus)
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT '00000000-0000-0000-0000-000000000002',
  (ARRAY['Katie Brown','Sophie Wilson','Emma Taylor','Alice Moore','Grace Clark','Chloe Lewis','Beth Hall','Lucy Young','Anna Walker','Mia Turner'])[(s % 10) + 1],
  '07' || lpad(((s * 37 + 300) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[150,195,120,85,210,165,90,175,240,130,160,75,200,220,145])[(s % 15) + 1],
  (ARRAY['booked','booked','lead_captured','booked','filtered','booked','booked','lead_captured','booked','spam','booked','booked','filtered','booked','lead_captured'])[(s % 15) + 1],
  (ARRAY['booked','booked','lead_captured','booked','filtered','booked','booked','lead_captured','booked','spam','booked','booked','filtered','booked','lead_captured'])[(s % 15) + 1],
  NULL,
  NOW() - interval '26 days' + (s * interval '18 hours')
FROM generate_series(1, 35) AS s;

-- Greenfield Landscape — 90 historical (professional, quote focus)
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT '00000000-0000-0000-0000-000000000003',
  (ARRAY['Andrew Palmer','Susan Morley','Brian Collins','Wendy Harris','Neil Thompson','Diane Walker','Kevin Adams','Janet Morrison','Phil Ward','Carol Shaw','Tim Barker','Fiona Grant'])[(s % 12) + 1],
  '07' || lpad(((s * 43 + 400) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[280,195,240,90,315,175,60,220,195,155,45,265,185,230,300])[(s % 15) + 1],
  (ARRAY['lead_captured','booked','lead_captured','referred_out','lead_captured','booked','filtered','lead_captured','booked','booked','spam','lead_captured','referred_out','lead_captured','booked'])[(s % 15) + 1],
  (ARRAY['lead_captured','booked','lead_captured','referred_out','lead_captured','booked','filtered','lead_captured','booked','booked','spam','lead_captured','referred_out','lead_captured','booked'])[(s % 15) + 1],
  NULL,
  NOW() - interval '26 days' + (s * interval '7 hours')
FROM generate_series(1, 90) AS s;

-- Swift Electrical — 60 historical (standard, quote focus)
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT '00000000-0000-0000-0000-000000000004',
  (ARRAY['Paul Freeman','Janice Cook','Tony Mason','Sandra Booth','Colin Hardy','Margaret Bell','Wayne Foster','Ruth Pearson','Steve Walsh','Dawn Clarke'])[(s % 10) + 1],
  '07' || lpad(((s * 47 + 500) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[255,180,300,90,195,45,225,175,60,240,195,150,280,120,210])[(s % 15) + 1],
  (ARRAY['lead_captured','lead_captured','booked','referred_out','lead_captured','filtered','lead_captured','booked','spam','lead_captured','booked','lead_captured','lead_captured','filtered','booked'])[(s % 15) + 1],
  (ARRAY['lead_captured','lead_captured','booked','referred_out','lead_captured','filtered','lead_captured','booked','spam','lead_captured','booked','lead_captured','lead_captured','filtered','booked'])[(s % 15) + 1],
  NULL,
  NOW() - interval '26 days' + (s * interval '10 hours')
FROM generate_series(1, 60) AS s;

-- Paws & Claws — 35 historical (light, booking focus)
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT '00000000-0000-0000-0000-000000000005',
  (ARRAY['Sophie Turner','Mark Evans','Helen Griffiths','James Bowen','Catherine Ford','Lisa Ward','Emma Price','Tom Bailey','Sally Hunt','Chris Ford'])[(s % 10) + 1],
  '07' || lpad(((s * 53 + 600) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[140,95,65,165,120,100,75,155,90,135])[(s % 10) + 1],
  (ARRAY['booked','lead_captured','filtered','booked','lead_captured','booked','filtered','booked','spam','booked'])[(s % 10) + 1],
  (ARRAY['booked','lead_captured','filtered','booked','lead_captured','booked','filtered','booked','spam','booked'])[(s % 10) + 1],
  NULL,
  NOW() - interval '26 days' + (s * interval '18 hours')
FROM generate_series(1, 35) AS s;

-- Premier Mortgage — 90 historical (professional, lead capture focus)
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT '00000000-0000-0000-0000-000000000006',
  (ARRAY['Richard Owen','Amanda Summers','Gary Patterson','Linda Foster','Chris Bailey','Susan Moore','Ian Richards','Joyce Whitehead','Peter Hall','Donna Wright','Trevor Blake','Karen Long'])[(s % 12) + 1],
  '07' || lpad(((s * 59 + 700) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[380,295,420,245,180,90,335,265,195,45,310,220,285,155,310])[(s % 15) + 1],
  (ARRAY['lead_captured','lead_captured','escalated','lead_captured','lead_captured','filtered','lead_captured','lead_captured','lead_captured','spam','escalated','lead_captured','lead_captured','referred_out','lead_captured'])[(s % 15) + 1],
  (ARRAY['lead_captured','lead_captured','escalated','lead_captured','lead_captured','filtered','lead_captured','lead_captured','lead_captured','spam','escalated','lead_captured','lead_captured','referred_out','lead_captured'])[(s % 15) + 1],
  NULL,
  NOW() - interval '26 days' + (s * interval '7 hours')
FROM generate_series(1, 90) AS s;

-- Valley View B&B — 60 historical (standard, booking focus)
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT '00000000-0000-0000-0000-000000000007',
  (ARRAY['Robert Yates','Claire Parson','Patrick Holt','Barbara Kent','Frank Gibson','Olive Jordan','Malcolm Price','Geraldine Fox','Colin Marsh','Alice Lambert'])[(s % 10) + 1],
  '07' || lpad(((s * 61 + 800) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[175,145,220,95,195,60,240,175,45,185,200,130,215,165,190])[(s % 15) + 1],
  (ARRAY['booked','lead_captured','booked','referred_out','lead_captured','filtered','booked','lead_captured','spam','booked','booked','lead_captured','booked','booked','referred_out'])[(s % 15) + 1],
  (ARRAY['booked','lead_captured','booked','referred_out','lead_captured','filtered','booked','lead_captured','spam','booked','booked','lead_captured','booked','booked','referred_out'])[(s % 15) + 1],
  NULL,
  NOW() - interval '26 days' + (s * interval '10 hours')
FROM generate_series(1, 60) AS s;

-- Apex Print & Design — 90 historical (professional, lead/quote focus)
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT '00000000-0000-0000-0000-000000000008',
  (ARRAY['Helen Carter','Dave Morgan','Sarah King','Neil Chambers','Fay Simmons','Robert Jennings','Carol Bates','Ian Stewart','Wendy Cole','Gary Hunt','Paula Grant','Martin Cross'])[(s % 12) + 1],
  '07' || lpad(((s * 67 + 900) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[255,195,145,225,90,310,175,240,195,45,275,165,220,185,195])[(s % 15) + 1],
  (ARRAY['lead_captured','lead_captured','booked','lead_captured','filtered','lead_captured','booked','lead_captured','lead_captured','spam','lead_captured','booked','lead_captured','referred_out','booked'])[(s % 15) + 1],
  (ARRAY['lead_captured','lead_captured','booked','lead_captured','filtered','lead_captured','booked','lead_captured','lead_captured','spam','lead_captured','booked','lead_captured','referred_out','booked'])[(s % 15) + 1],
  NULL,
  NOW() - interval '26 days' + (s * interval '7 hours')
FROM generate_series(1, 90) AS s;

-- Nationwide Recruitment — 120 historical (enterprise, lead capture / escalation)
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT '00000000-0000-0000-0000-000000000009',
  (ARRAY['Katherine Bell','Marcus Fields','Joanne Harding','Derek Lane','Christine Ball','Kevin Walsh','Lynda Shaw','Barry Connell','Yvonne Park','James Birch','Gloria Nash','Terry Ford'])[(s % 12) + 1],
  '07' || lpad(((s * 71 + 1000) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[325,290,195,245,175,90,340,265,195,45,310,220,275,155,185])[(s % 15) + 1],
  (ARRAY['lead_captured','lead_captured','escalated','lead_captured','lead_captured','filtered','lead_captured','lead_captured','lead_captured','spam','escalated','lead_captured','lead_captured','referred_out','lead_captured'])[(s % 15) + 1],
  (ARRAY['lead_captured','lead_captured','escalated','lead_captured','lead_captured','filtered','lead_captured','lead_captured','lead_captured','spam','escalated','lead_captured','lead_captured','referred_out','lead_captured'])[(s % 15) + 1],
  NULL,
  NOW() - interval '26 days' + (s * interval '5 hours')
FROM generate_series(1, 120) AS s;

-- JB Sports & Fashion — 120 historical (enterprise, lead capture focus)
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT '00000000-0000-0000-0000-000000000010',
  (ARRAY['Maria Santos','James Holloway','Chloe Barnes','Daniel West','Rebecca Holt','Andrew Marsh','Susan Blake','Michael Turner','Patricia Green','Kevin Archer','Linda Hatch','Colin Ramsey'])[(s % 12) + 1],
  '07' || lpad(((s * 73 + 1100) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[285,195,345,90,255,195,165,45,290,220,175,310,265,195,340])[(s % 15) + 1],
  (ARRAY['lead_captured','lead_captured','lead_captured','filtered','lead_captured','escalated','lead_captured','spam','lead_captured','lead_captured','filtered','lead_captured','lead_captured','lead_captured','lead_captured'])[(s % 15) + 1],
  (ARRAY['lead_captured','lead_captured','lead_captured','filtered','lead_captured','escalated','lead_captured','spam','lead_captured','lead_captured','filtered','lead_captured','lead_captured','lead_captured','lead_captured'])[(s % 15) + 1],
  NULL,
  NOW() - interval '26 days' + (s * interval '5 hours')
FROM generate_series(1, 120) AS s;


-- ═══════════════════════════════════════════════════════════════════
-- 10. LEADS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_leads (business_id, caller_name, caller_number, enquiry_type, notes, status, created_at) VALUES
-- Hargreaves Plumbing
('00000000-0000-0000-0000-000000000001','Sharon Whitfield','07711 234567','bathroom_installation','3-bed semi Hillsborough, full suite replacement','new',NOW() - interval '30 minutes'),
('00000000-0000-0000-0000-000000000001','Pat Holland','07611 678901','power_flush','Old radiators Hillsborough terrace','new',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000001','Graham West','07944 901234','heating_upgrade','Back boiler to combi conversion','new',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000001','Robert Marsh','07666 123456','drain_unblocking','Commercial kitchen, restaurant','contacted',NOW() - interval '2 days'),
('00000000-0000-0000-0000-000000000001','Karen Hughes','07811 234567','boiler_repair','Annual service overdue, elderly customer','converted',NOW() - interval '5 days'),
('00000000-0000-0000-0000-000000000001','Ben Sutton','07922 345678','bathroom_installation','En-suite addition, 4-bed detached','converted',NOW() - interval '10 days'),
-- Elegant Hair Design
('00000000-0000-0000-0000-000000000002','Louise Patel','07811 345678','bridal_hair','Wedding July, 4 bridesmaids, needs trial','new',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000002','Rebecca Stone','07644 678901','keratin_treatment','First time, frizzy hair','new',NOW() - interval '5 hours'),
('00000000-0000-0000-0000-000000000002','Natalie Ford','07533 456789','balayage','Brunette to blonde, wants consultation','contacted',NOW() - interval '3 days'),
-- Greenfield Landscape
('00000000-0000-0000-0000-000000000003','Andrew Palmer','07700 789012','garden_redesign','Large detached Altrincham, 80ft garden','new',NOW() - interval '30 minutes'),
('00000000-0000-0000-0000-000000000003','Brian Collins','07922 901234','patio_installation','40sq metre Indian stone','new',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000003','Neil Thompson','07644 123456','commercial_contract','Business park Salford, 12 units','new',NOW() - interval '2.5 hours'),
('00000000-0000-0000-0000-000000000003','Janet Morrison','07977 456789','fence_replacement','Storm damage, 20m','new',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000003','Fiona Grant','07811 890123','decking','Composite decking, 30sq m with steps','new',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000003','Helen Price','07533 012345','garden_redesign','Japanese garden specialist project','contacted',NOW() - interval '2 days'),
('00000000-0000-0000-0000-000000000003','Paul Jennings','07644 234567','maintenance_contract','Monthly contract, large Victorian garden','converted',NOW() - interval '8 days'),
-- Swift Electrical
('00000000-0000-0000-0000-000000000004','Paul Freeman','07644 123456','consumer_unit','1960s property Edgbaston','new',NOW() - interval '45 minutes'),
('00000000-0000-0000-0000-000000000004','Janice Cook','07755 234567','ev_charger','Home charge point, new car next week','new',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000004','Colin Hardy','07866 345678','pat_testing','40-desk office, annual requirement','new',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000004','Wayne Foster','07977 456789','cctv','Retail unit city centre, 8 cameras','new',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000004','Dawn Clarke','07533 012345','rewire','Extension electrical first and second fix','contacted',NOW() - interval '2 days'),
-- Paws & Claws
('00000000-0000-0000-0000-000000000005','Mark Evans','07755 234567','puppy_groom','14-week Dachshund, first groom','new',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000005','Catherine Ford','07588 567890','deshedding','German Shepherd, heavy shedding','new',NOW() - interval '5 hours'),
('00000000-0000-0000-0000-000000000005','Alice Marsh','07699 678901','full_groom','New customer, Cocker Spaniel','contacted',NOW() - interval '4 days'),
-- Premier Mortgage
('00000000-0000-0000-0000-000000000006','Richard Owen','07699 678901','first_time_buyer','Cardiff Bay, £220k, 10% deposit','new',NOW() - interval '30 minutes'),
('00000000-0000-0000-0000-000000000006','Amanda Summers','07700 789012','remortgage','Fixed rate ending April','new',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000006','Linda Foster','07922 901234','equity_release','68 years old, retirement income','new',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000006','Chris Bailey','07533 012345','self_employed','2 years trading, SA302s available','new',NOW() - interval '2.5 hours'),
('00000000-0000-0000-0000-000000000006','Ian Richards','07755 234567','new_build','Off-plan, exchange in 6 weeks','new',NOW() - interval '3.5 hours'),
('00000000-0000-0000-0000-000000000006','Joyce Whitehead','07866 345678','protection_insurance','Bought 2 years ago, no protection','new',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000006','Karen Long','07700 789012','portfolio_remortgage','3 buy-to-lets same expiry month','contacted',NOW() - interval '3 days'),
('00000000-0000-0000-0000-000000000006','Frances Cooper','07922 901234','help_to_buy','Government scheme enquiry','converted',NOW() - interval '7 days'),
-- Valley View B&B
('00000000-0000-0000-0000-000000000007','Claire Parson','07644 123456','walking_holiday','Week August, 2 adults + dog','new',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000007','Frank Gibson','07977 456789','anniversary_stay','Special occasion, lake view','new',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000007','Geraldine Fox','07700 789012','christmas_booking','Christmas week 2025','new',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000007','Susan Ward','07811 123456','group_booking','Walking group, 8 walkers, 4 rooms','contacted',NOW() - interval '5 days'),
-- Apex Print & Design
('00000000-0000-0000-0000-000000000008','Helen Carter','07533 012345','exhibition_stand','3m × 3m, trade show 6 weeks','new',NOW() - interval '45 minutes'),
('00000000-0000-0000-0000-000000000008','Dave Morgan','07644 123456','vehicle_wrap','Van fleet of 4, full wrap','new',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000008','Neil Chambers','07866 345678','corporate_brochure','16-page quarterly, 500 copies','new',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000008','Robert Jennings','07977 456789','menu_design','Restaurant seasonal menu, 200 copies','new',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000008','Ian Stewart','07700 789012','branded_merchandise','Mugs and tote bags, company event','contacted',NOW() - interval '2 days'),
('00000000-0000-0000-0000-000000000008','Paula Grant','07533 012345','charity_report','28-page annual report, 300 copies','converted',NOW() - interval '6 days'),
-- Nationwide Recruitment
('00000000-0000-0000-0000-000000000009','Katherine Bell','07977 456789','client_vacancy','Operations Director, £80k, 6 weeks','new',NOW() - interval '20 minutes'),
('00000000-0000-0000-0000-000000000009','Marcus Fields','07588 567890','candidate_registration','Senior finance, relocating from London','new',NOW() - interval '45 minutes'),
('00000000-0000-0000-0000-000000000009','Derek Lane','07700 789012','client_vacancy','HR Manager, 300-person SME','new',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000009','Christine Ball','07811 890123','candidate_registration','Marketing manager, 8 years experience','new',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000009','Lynda Shaw','07533 012345','client_vacancy','Technology Director, £120k SaaS','new',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000009','Barry Connell','07644 123456','client_vacancy','12 customer service roles, contact centre','new',NOW() - interval '3.5 hours'),
('00000000-0000-0000-0000-000000000009','Terry Ford','07588 567890','temp_staff','Warehouse peak, 20 workers 2 weeks','contacted',NOW() - interval '2 days'),
('00000000-0000-0000-0000-000000000009','Hannah Cross','07811 890123','client_vacancy','Sales Director, £95k national accounts','converted',NOW() - interval '5 days'),
-- JB Sports & Fashion
('00000000-0000-0000-0000-000000000010','Maria Santos','07755 234567','wholesale_enquiry','Independent retailer, 12 stores','new',NOW() - interval '30 minutes'),
('00000000-0000-0000-0000-000000000010','Chloe Barnes','07977 456789','partnership','Influencer collaboration, 280k followers','new',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000010','Rebecca Holt','07699 678901','tender','School sports kit, academy trust 800 pupils','new',NOW() - interval '2.5 hours'),
('00000000-0000-0000-0000-000000000010','Susan Blake','07811 890123','franchise_enquiry','Scotland franchise, experienced retailer','new',NOW() - interval '3.5 hours'),
('00000000-0000-0000-0000-000000000010','Colin Ramsey','07866 345678','sponsorship','League One football club, kit and signage','new',NOW() - interval '6 hours'),
('00000000-0000-0000-0000-000000000010','Claire Abbott','07699 678901','international','UAE sports retailer, UK branded range','contacted',NOW() - interval '2 days'),
('00000000-0000-0000-0000-000000000010','Michelle Stone','07811 890123','tv_partnership','Reality sport show ITV, brand partnership','converted',NOW() - interval '4 days');


-- ═══════════════════════════════════════════════════════════════════
-- 11. REFERRAL LOG
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_referral_log (business_id, partner_name, caller_name, service_requested, created_at) VALUES
-- Hargreaves Plumbing referrals out
('00000000-0000-0000-0000-000000000001','Swift Electrical','Derek Shaw','CCTV installation',NOW() - interval '2.5 hours'),
('00000000-0000-0000-0000-000000000001','Swift Electrical','Barbara Ford','EV charger installation',NOW() - interval '1 day'),
('00000000-0000-0000-0000-000000000001','Greenfield Landscape','Andrew Palmer','Garden drainage',NOW() - interval '3 days'),
('00000000-0000-0000-0000-000000000001','Swift Electrical','Carol Manning','Consumer unit upgrade',NOW() - interval '6 days'),
-- Swift Electrical referrals out
('00000000-0000-0000-0000-000000000004','Hargreaves Plumbing','Sandra Booth','Boiler fault repair',NOW() - interval '3.5 hours'),
('00000000-0000-0000-0000-000000000004','Hargreaves Plumbing','Craig Simmons','Bathroom plumbing',NOW() - interval '2 days'),
('00000000-0000-0000-0000-000000000004','Greenfield Landscape','Tony Hopkins','Garden design after lighting',NOW() - interval '4 days'),
-- Greenfield referrals out
('00000000-0000-0000-0000-000000000003','Hargreaves Plumbing','Wendy Harris','Outdoor tap and irrigation',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000003','Swift Electrical','Mark Robinson','Garden lighting installation',NOW() - interval '7 hours'),
('00000000-0000-0000-0000-000000000003','Swift Electrical','David Collins','Exterior power points',NOW() - interval '3 days'),
-- Elegant Hair Design referrals out
('00000000-0000-0000-0000-000000000002','Paws & Claws Dog Grooming','Sophie Williams','Dog grooming for her Poodle',NOW() - interval '1 day'),
-- Paws & Claws referrals out
('00000000-0000-0000-0000-000000000005','Valley View B&B','James Bowen','Dog-friendly Lake District break',NOW() - interval '2 days'),
('00000000-0000-0000-0000-000000000005','Elegant Hair Design','Lisa Walker','Grooming salon nearby',NOW() - interval '5 days'),
-- Valley View B&B referrals out
('00000000-0000-0000-0000-000000000007','Paws & Claws Dog Grooming','Barbara Kent','Dog grooming during Lakes visit',NOW() - interval '2.5 hours'),
('00000000-0000-0000-0000-000000000007','Paws & Claws Dog Grooming','Philip Watson','Guest dog needed grooming',NOW() - interval '4 days'),
-- Premier Mortgage referrals out
('00000000-0000-0000-0000-000000000006','Nationwide Recruitment','Trevor Blake','Career change alongside remortgage',NOW() - interval '5.5 hours'),
-- Nationwide Recruitment referrals out
('00000000-0000-0000-0000-000000000009','Premier Mortgage Solutions','Simon Rhodes','Relocating candidate needs mortgage advice',NOW() - interval '6.5 hours'),
('00000000-0000-0000-0000-000000000009','Apex Print & Design','Barry Connell','Branded candidate packs for contact centre',NOW() - interval '2 days'),
-- Apex Print referrals out
('00000000-0000-0000-0000-000000000008','Nationwide Recruitment','Paula Grant','Studio hiring a senior designer',NOW() - interval '7 hours'),
('00000000-0000-0000-0000-000000000008','Nationwide Recruitment','Sandra Peel','Office admin hire for growing studio',NOW() - interval '3 days');


-- ═══════════════════════════════════════════════════════════════════
-- 12. PRICING INTELLIGENCE  (Enterprise only)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_pricing_intelligence (business_id, service_name, our_price, market_low, market_high, insight) VALUES
-- Nationwide Recruitment (enterprise)
('00000000-0000-0000-0000-000000000009','Permanent placement (commercial)',NULL,12.5,18.5,'Caller mentioned rival agency charging 14% on £40k base. Our rate is 15% — within market but worth reviewing for volume clients.'),
('00000000-0000-0000-0000-000000000009','Executive search (£80k+)',NULL,20.0,30.0,'Two callers mentioned headhunters quoting 25–28% retained. Our 20% clearly below market for senior roles.'),
('00000000-0000-0000-0000-000000000009','Temporary staffing (daily rate)',NULL,18.0,26.0,'Agency margin context from caller: previous agency charging 22% uplift. Our 20% competitive.'),
-- JB Sports & Fashion (enterprise)
('00000000-0000-0000-0000-000000000010','Wholesale margin (independent)',NULL,35.0,50.0,'Wholesale enquiry caller mentioned competitor offering 38% margin. Standard industry is 40–45%.'),
('00000000-0000-0000-0000-000000000010','Sponsorship package (tier 1)',NULL,15000.0,80000.0,'League One club enquiry gives benchmark: expect £20–40k for kit and ground signage at that level.');


-- ═══════════════════════════════════════════════════════════════════
-- 13. COMPETITOR INTELLIGENCE  (Enterprise only)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_competitor_intelligence (business_id, competitor_name, mention_count, context) VALUES
-- Nationwide Recruitment
('00000000-0000-0000-0000-000000000009','Hays Recruitment',8,'Most frequently mentioned — clients comparing fees and speed. Hays perceived as slower on senior roles.'),
('00000000-0000-0000-0000-000000000009','Michael Page',5,'Mentioned by 5 candidates as having registered with them. Seen as strong on finance and commercial.'),
('00000000-0000-0000-0000-000000000009','Reed Recruitment',3,'3 client mentions — primarily for temp and volume hiring comparisons.'),
('00000000-0000-0000-0000-000000000009','Robert Half',2,'Mentioned by 2 callers for finance director searches specifically.'),
-- JB Sports & Fashion
('00000000-0000-0000-0000-000000000010','JD Sports',12,'Most common caller comparison — "I approached JD Sports first." Our pricing and deal terms directly compared.'),
('00000000-0000-0000-0000-000000000010','Sports Direct',6,'6 mentions — typically wholesale and franchise conversations. Callers use SD as a benchmark on margin.'),
('00000000-0000-0000-0000-000000000010','Decathlon',4,'Mentioned in school and community sport contexts. Seen as price-competitive on kit.'),
('00000000-0000-0000-0000-000000000010','Foot Locker',3,'3 influencer partnership callers mentioned Foot Locker deals as context for what they expect.');
