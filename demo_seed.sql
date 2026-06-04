-- =====================================================================
-- VERRANTE — Demo Data Layer  (Session 1 of 3)
-- =====================================================================
-- Creates all demo_ tables and seeds 10 businesses with realistic data.
-- Safe to re-run — truncates demo data before re-inserting.
-- Run in Supabase SQL Editor.
--
-- Business IDs use pattern 00000000-0000-0000-0000-00000000000X
-- b01 Bella's Hair Studio     (standard)
-- b02 Fast Flow Plumbing      (professional)
-- b03 Bright Spark Electrical (light)
-- b04 Green Thumb Gardens     (standard)
-- b05 Pawfect Grooming        (light)
-- b06 Peak Performance PT     (standard)
-- b07 Clarity Accounting      (professional)
-- b08 Spotless Cleaning Co    (standard)
-- b09 Fresh Coat Decorating   (light)
-- b10 Restore Physiotherapy   (enterprise)
-- u01 demo@verrante.app       (sales rep)
-- =====================================================================


-- ═══════════════════════════════════════════════════════════════════
-- 1. CREATE TABLES
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
  included_minutes      integer default 150,
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
-- 2. TRUNCATE — safe re-run
-- ═══════════════════════════════════════════════════════════════════

TRUNCATE demo_sessions, demo_competitor_intelligence, demo_pricing_intelligence,
         demo_referral_log, demo_leads, demo_call_logs,
         demo_partners, demo_staff, demo_services CASCADE;
DELETE FROM demo_businesses;
DELETE FROM demo_users;


-- ═══════════════════════════════════════════════════════════════════
-- 3. DEMO BUSINESSES
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_businesses (
  id, business_name, business_type, tier,
  business_email, business_phone, lead_contact_name,
  booking_link, opening_hours, business_context,
  triage_mode, tone_register, business_outcome_type,
  greeting_message, included_minutes, credits_balance, referral_code
) VALUES

('00000000-0000-0000-0000-000000000001',
 'Bella''s Hair Studio', 'hair_salon', 'standard',
 'bella@bellashairstudio.co.uk', '0117 123 4567', 'Bella Marchetti',
 'https://booksy.com/bellas',
 'Mon–Sat 9am–6pm, Sun closed',
 'Award-winning hair salon in Bristol city centre. Specialists in colour, balayage and keratin treatments. 8 years serving the local community.',
 'balanced', 'warm', 'booking',
 'Hello, you''ve reached Bella''s Hair Studio! Bella is with a client right now but I can help you book an appointment or answer any questions.',
 150, 2, 'BELLA-1234'),

('00000000-0000-0000-0000-000000000002',
 'Fast Flow Plumbing', 'plumber', 'professional',
 'dave@fastflowplumbing.co.uk', '0117 234 5678', 'Dave Fletcher',
 'https://calendly.com/fastflow',
 'Mon–Fri 7am–6pm, Sat 8am–2pm',
 'Family-run plumbing business covering Bristol and surrounding areas. Emergency call-outs available. Boiler specialists, bathroom installations, central heating.',
 'balanced', 'warm', 'callback',
 'Hi there, you''ve reached Fast Flow Plumbing. Dave''s out on a job but I can take your details and arrange a callback.',
 250, 4, 'DAVE-5678'),

('00000000-0000-0000-0000-000000000003',
 'Bright Spark Electrical', 'electrician', 'light',
 'enquiries@brightsparkelectrical.co.uk', '0117 345 6789', 'Rob Higgins',
 null,
 'Mon–Fri 8am–5pm',
 'NICEIC-registered electrician covering South Bristol. Consumer unit upgrades, EV charger installation, garden lighting, PAT testing.',
 'strict', 'formal', 'quote',
 'Thank you for calling Bright Spark Electrical. Rob is on a job at the moment. I can take your details and arrange a quote callback.',
 60, 1, 'SPARK-9012'),

('00000000-0000-0000-0000-000000000004',
 'Green Thumb Gardens', 'landscape_gardener', 'standard',
 'mike@greenthumbgardens.co.uk', '0117 456 7890', 'Mike Thornton',
 'https://greenthumbgardens.co.uk/book',
 'Mon–Fri 7am–5pm, Sat 8am–1pm',
 'Professional garden maintenance and landscaping covering Bristol and North Somerset. Lawn care, hedge trimming, patio laying, garden clearance. Regular contracts welcome.',
 'balanced', 'warm', 'booking',
 'Hello, Green Thumb Gardens! Mike''s out in the gardens right now. Tell me what you need and I''ll make sure he gets back to you.',
 150, 3, 'GREEN-3456'),

('00000000-0000-0000-0000-000000000005',
 'Pawfect Grooming', 'dog_groomer', 'light',
 'hello@pawfectgrooming.co.uk', '0117 567 8901', 'Jess Hargreaves',
 'https://pawfectgrooming.co.uk/book',
 'Tue–Sat 9am–5pm',
 'Mobile dog grooming service covering North Bristol. All breeds welcome. Fully equipped van, stress-free approach. New puppy packages available.',
 'balanced', 'warm', 'booking',
 'Woof! You''ve reached Pawfect Grooming — Jess is busy with a very fluffy client right now! Leave your details and she''ll call you straight back.',
 60, 1, 'PAWFCT-7890'),

('00000000-0000-0000-0000-000000000006',
 'Peak Performance PT', 'personal_trainer', 'standard',
 'hello@peakperformancept.co.uk', '0117 678 9012', 'Connor Walsh',
 'https://peakperformancept.co.uk/book',
 'Mon–Fri 6am–8pm, Sat 7am–3pm',
 'Personal trainer in Bristol. Weight loss, strength training, sports performance. In-person and online coaching. Block bookings available.',
 'balanced', 'warm', 'booking',
 'Hey! You''ve reached Peak Performance PT. Connor''s in a session right now — tell me your fitness goals and I''ll make sure he gets back to you.',
 150, 2, 'PEAK-2345'),

('00000000-0000-0000-0000-000000000007',
 'Clarity Accounting', 'accountant', 'professional',
 'info@clarityaccounting.co.uk', '0117 789 0123', 'Christine Lawson',
 null,
 'Mon–Fri 9am–5pm',
 'Chartered accountancy practice in Bristol. Self-assessment, VAT returns, company accounts, bookkeeping, payroll. Serving small businesses and sole traders for 15 years.',
 'balanced', 'formal', 'quote',
 'Thank you for calling Clarity Accounting. Our team are with clients at the moment. I can take a message and arrange a callback at your convenience.',
 250, 5, 'CLRTY-6789'),

('00000000-0000-0000-0000-000000000008',
 'Spotless Cleaning Co', 'cleaning_company', 'standard',
 'maria@spotlesscleaning.co.uk', '0117 890 1234', 'Maria Santos',
 'https://spotlesscleaning.co.uk/book',
 'Mon–Sat 7am–6pm',
 'Professional cleaning services across Bristol and Bath. Domestic, commercial, end of tenancy and deep cleans. Fully insured, DBS-checked team.',
 'balanced', 'warm', 'booking',
 'Hi, you''ve reached Spotless Cleaning Co! Maria is out with the team today. I can get you booked in or take a message — what do you need?',
 150, 3, 'SPTLS-0123'),

('00000000-0000-0000-0000-000000000009',
 'Fresh Coat Decorating', 'painter_decorator', 'light',
 'andy@freshcoatdecorating.co.uk', '0117 901 2345', 'Andy Wells',
 null,
 'Mon–Fri 7am–4pm',
 'Experienced decorator covering Bristol. Interior and exterior painting, wallpapering, specialist finishes. Free quotes. Fully insured.',
 'balanced', 'warm', 'quote',
 'Hi, Andy from Fresh Coat here — I''m up a ladder right now! Leave your details and I''ll get back to you with a free quote.',
 60, 0, 'FRESH-4567'),

('00000000-0000-0000-0000-000000000010',
 'Restore Physiotherapy', 'physiotherapist', 'enterprise',
 'reception@restorephysio.co.uk', '0117 012 3456', 'Dr Sarah Okonkwo',
 'https://restorephysio.co.uk/book',
 'Mon–Fri 7am–8pm, Sat 8am–3pm',
 'Multi-practitioner physiotherapy clinic in Central Bristol. Sports injury, post-operative rehab, Clinical Pilates, remedial massage, acupuncture. GP and consultant referrals welcome.',
 'open', 'warm', 'booking',
 'Hello, you''ve reached Restore Physiotherapy. Our reception team are with patients at the moment. I can arrange a booking or take your details for a callback.',
 700, 7, 'RSTR-8901');


-- ═══════════════════════════════════════════════════════════════════
-- 4. SERVICES
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_services (business_id, service_name, is_partner_service) VALUES
-- Bella's Hair Studio
('00000000-0000-0000-0000-000000000001','Cut & Blow Dry',false),
('00000000-0000-0000-0000-000000000001','Colour',false),
('00000000-0000-0000-0000-000000000001','Highlights',false),
('00000000-0000-0000-0000-000000000001','Balayage',false),
('00000000-0000-0000-0000-000000000001','Keratin Treatment',false),
('00000000-0000-0000-0000-000000000001','Hair Extensions',false),
('00000000-0000-0000-0000-000000000001','Nail technician',true),
('00000000-0000-0000-0000-000000000001','Beauty therapy',true),
-- Fast Flow Plumbing
('00000000-0000-0000-0000-000000000002','Emergency plumbing',false),
('00000000-0000-0000-0000-000000000002','Boiler service & repair',false),
('00000000-0000-0000-0000-000000000002','Bathroom installation',false),
('00000000-0000-0000-0000-000000000002','Leak detection & repair',false),
('00000000-0000-0000-0000-000000000002','Drain clearance',false),
('00000000-0000-0000-0000-000000000002','Central heating',false),
('00000000-0000-0000-0000-000000000002','Electrical work',true),
('00000000-0000-0000-0000-000000000002','Tiling',true),
('00000000-0000-0000-0000-000000000002','Plastering',true),
-- Bright Spark Electrical
('00000000-0000-0000-0000-000000000003','Consumer unit upgrade',false),
('00000000-0000-0000-0000-000000000003','Socket & switch installation',false),
('00000000-0000-0000-0000-000000000003','Garden lighting',false),
('00000000-0000-0000-0000-000000000003','EV charger installation',false),
('00000000-0000-0000-0000-000000000003','PAT testing',false),
('00000000-0000-0000-0000-000000000003','Plumbing',true),
('00000000-0000-0000-0000-000000000003','Building & plastering',true),
-- Green Thumb Gardens
('00000000-0000-0000-0000-000000000004','Lawn mowing',false),
('00000000-0000-0000-0000-000000000004','Hedge trimming',false),
('00000000-0000-0000-0000-000000000004','Garden clearance',false),
('00000000-0000-0000-0000-000000000004','Patio laying',false),
('00000000-0000-0000-0000-000000000004','Planting & landscaping',false),
('00000000-0000-0000-0000-000000000004','Tree surgery',true),
('00000000-0000-0000-0000-000000000004','Fencing & decking',true),
-- Pawfect Grooming
('00000000-0000-0000-0000-000000000005','Full groom',false),
('00000000-0000-0000-0000-000000000005','Bath & brush',false),
('00000000-0000-0000-0000-000000000005','Nail clip',false),
('00000000-0000-0000-0000-000000000005','Puppy first groom',false),
('00000000-0000-0000-0000-000000000005','De-shedding treatment',false),
('00000000-0000-0000-0000-000000000005','Dog training',true),
('00000000-0000-0000-0000-000000000005','Veterinary referral',true),
-- Peak Performance PT
('00000000-0000-0000-0000-000000000006','1-to-1 personal training',false),
('00000000-0000-0000-0000-000000000006','Nutrition coaching',false),
('00000000-0000-0000-0000-000000000006','Online coaching',false),
('00000000-0000-0000-0000-000000000006','Group sessions',false),
('00000000-0000-0000-0000-000000000006','Sports physiotherapy',true),
('00000000-0000-0000-0000-000000000006','Sports massage',true),
-- Clarity Accounting
('00000000-0000-0000-0000-000000000007','Self-assessment tax return',false),
('00000000-0000-0000-0000-000000000007','VAT returns',false),
('00000000-0000-0000-0000-000000000007','Bookkeeping',false),
('00000000-0000-0000-0000-000000000007','Company accounts',false),
('00000000-0000-0000-0000-000000000007','Payroll',false),
('00000000-0000-0000-0000-000000000007','Financial planning',true),
('00000000-0000-0000-0000-000000000007','Legal services',true),
-- Spotless Cleaning Co
('00000000-0000-0000-0000-000000000008','Regular domestic clean',false),
('00000000-0000-0000-0000-000000000008','End of tenancy clean',false),
('00000000-0000-0000-0000-000000000008','Office cleaning',false),
('00000000-0000-0000-0000-000000000008','Deep clean',false),
('00000000-0000-0000-0000-000000000008','Post-build clean',false),
('00000000-0000-0000-0000-000000000008','Window cleaning',true),
('00000000-0000-0000-0000-000000000008','Carpet cleaning',true),
-- Fresh Coat Decorating
('00000000-0000-0000-0000-000000000009','Interior painting',false),
('00000000-0000-0000-0000-000000000009','Exterior painting',false),
('00000000-0000-0000-0000-000000000009','Wallpaper hanging',false),
('00000000-0000-0000-0000-000000000009','Coving & cornices',false),
('00000000-0000-0000-0000-000000000009','Plastering',true),
('00000000-0000-0000-0000-000000000009','Carpentry',true),
-- Restore Physiotherapy
('00000000-0000-0000-0000-000000000010','Sports injury physio',false),
('00000000-0000-0000-0000-000000000010','Remedial massage',false),
('00000000-0000-0000-0000-000000000010','Acupuncture',false),
('00000000-0000-0000-0000-000000000010','Clinical Pilates',false),
('00000000-0000-0000-0000-000000000010','Dry needling',false),
('00000000-0000-0000-0000-000000000010','Post-operative rehab',false),
('00000000-0000-0000-0000-000000000010','Podiatry',true),
('00000000-0000-0000-0000-000000000010','Chiropractic',true);


-- ═══════════════════════════════════════════════════════════════════
-- 5. STAFF  (businesses with employees: b01, b02, b04, b07, b08, b10)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_staff (business_id, name, role, specialist_services, phone, active) VALUES
('00000000-0000-0000-0000-000000000001','Bella Marchetti','Owner / Senior Stylist','Balayage, Colour, Keratin Treatment','07712 334400',true),
('00000000-0000-0000-0000-000000000001','Sophie Patel','Junior Stylist','Cut & Blow Dry, Highlights','07823 445500',true),
('00000000-0000-0000-0000-000000000002','Dave Fletcher','Owner / Lead Plumber','Emergency repairs, Boiler service, Bathroom installation','07611 223300',true),
('00000000-0000-0000-0000-000000000002','Lee Okafor','Apprentice Plumber','Leak detection, Drain clearance','07724 334400',true),
('00000000-0000-0000-0000-000000000004','Mike Thornton','Owner / Lead Gardener','Landscaping, Patio laying, Garden design','07700 445500',true),
('00000000-0000-0000-0000-000000000004','Tom Briggs','Gardener','Lawn care, Hedge trimming, Planting','07811 556600',true),
('00000000-0000-0000-0000-000000000007','Christine Lawson','Director / Chartered Accountant','Company accounts, VAT returns, Self-assessment','07500 556600',true),
('00000000-0000-0000-0000-000000000007','Aiden Park','Accounts Manager','Bookkeeping, Payroll','07611 667700',true),
('00000000-0000-0000-0000-000000000008','Maria Santos','Owner / Lead Cleaner','End of tenancy, Deep clean, Post-build','07700 667700',true),
('00000000-0000-0000-0000-000000000010','Dr Sarah Okonkwo','Clinic Director / Physiotherapist','Sports injury, Post-operative rehab, Assessment','07500 223300',true),
('00000000-0000-0000-0000-000000000010','James Hartley','Senior Physiotherapist','Sports physio, Dry needling, Acupuncture','07611 334400',true),
('00000000-0000-0000-0000-000000000010','Emma Chen','Massage Therapist','Remedial massage, Sports massage','07722 445500',true),
('00000000-0000-0000-0000-000000000010','Priya Singh','Pilates Instructor','Clinical Pilates, Rehabilitation Pilates','07833 556600',true);


-- ═══════════════════════════════════════════════════════════════════
-- 6. PARTNERS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_partners (business_id, partner_name, partner_phone, specialty) VALUES
('00000000-0000-0000-0000-000000000001','Nails by Nikki','07712 334455','Nail technician, Gel nails, Nail art'),
('00000000-0000-0000-0000-000000000001','The Beauty Room','07823 445566','Beauty therapy, Eyebrow threading, Lash extensions'),
('00000000-0000-0000-0000-000000000002','Sparks Electrical','07611 223344','Domestic and commercial electrical work, EV chargers'),
('00000000-0000-0000-0000-000000000002','Pro-Tile','07724 556677','Tiling, Bathrooms, Kitchens, Wetrooms'),
('00000000-0000-0000-0000-000000000002','Perfect Finish Plastering','07835 667788','Plastering, Rendering, Dry lining'),
('00000000-0000-0000-0000-000000000003','City Plumbing','07500 112233','Plumbing, Boilers, Bathrooms'),
('00000000-0000-0000-0000-000000000003','R&B Builders','07600 223344','General building, Extensions, Plastering'),
('00000000-0000-0000-0000-000000000004','Summit Tree Services','07900 445566','Tree surgery, Stump removal, Crown reduction'),
('00000000-0000-0000-0000-000000000004','Border Fencing','07811 556677','Fencing, Decking, Gates, Pergolas'),
('00000000-0000-0000-0000-000000000005','Happy Hounds Training','07700 334455','Dog obedience training, Puppy classes, 1-to-1'),
('00000000-0000-0000-0000-000000000005','Riverdale Vets','07812 445566','Veterinary care, Vaccinations, Health checks'),
('00000000-0000-0000-0000-000000000006','Summit Physio','07611 667788','Sports physiotherapy, Injury rehabilitation'),
('00000000-0000-0000-0000-000000000006','City Sports Massage','07722 778899','Sports massage, Deep tissue massage, Stretching'),
('00000000-0000-0000-0000-000000000007','Bridge Financial Planning','07500 556677','Financial planning, Investments, Mortgages, Pensions'),
('00000000-0000-0000-0000-000000000007','Lawton Solicitors','07611 667788','Business law, Contracts, Employment, Property'),
('00000000-0000-0000-0000-000000000008','Crystal Windows','07700 445566','Window cleaning, Conservatory cleaning, Pressure washing'),
('00000000-0000-0000-0000-000000000008','Premier Carpets','07811 556677','Carpet cleaning, Upholstery cleaning, Stain removal'),
('00000000-0000-0000-0000-000000000009','Smooth Finish Plastering','07600 334455','Plastering, Rendering, Coving, Artex removal'),
('00000000-0000-0000-0000-000000000009','Oak Carpentry','07711 445566','Carpentry, Skirting boards, Door fitting, Built-in furniture'),
('00000000-0000-0000-0000-000000000010','City Podiatry','07500 223344','Podiatry, Orthotics, Biomechanics, Foot health'),
('00000000-0000-0000-0000-000000000010','Align Chiropractic','07611 334455','Chiropractic, Spinal adjustment, Joint pain, Posture');


-- ═══════════════════════════════════════════════════════════════════
-- 7. TODAY'S CALLS  (explicit — ensures dashboard shows activity)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at) VALUES

-- Bella's Hair Studio
('00000000-0000-0000-0000-000000000001','Sarah Johnson','07711 345678',195,'lead_captured','lead_captured','New customer enquiring about balayage. Gave pricing overview and timeline — very interested. Name and number captured for callback.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000001','Emma Williams','07822 456789',85,'filtered','filtered','Caller asking about walk-in availability today — advised fully booked, offered cancellation list. No follow-up required.',NOW() - interval '45 minutes'),
('00000000-0000-0000-0000-000000000001','Lucy Davies','07933 567890',240,'booked','booked','Appointment booked for cut and blow dry — Saturday 10am confirmed. Regular client.',NOW() - interval '15 minutes'),

-- Fast Flow Plumbing
('00000000-0000-0000-0000-000000000002','James Fletcher','07611 234567',180,'lead_captured','lead_captured','Emergency boiler breakdown — Clifton address, no heating or hot water. Urgent callback needed. Lead captured, Dave to call within 30 mins.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000002','Carol Stevens','07722 345678',300,'booked','booked','Full bathroom installation — 3-bed semi in Redland. Site visit booked for Thursday 10am to quote.',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000002','Paul Harrison','07833 456789',210,'escalated','escalated','Burst pipe in kitchen — active water leak. Immediate call-out arranged. Escalated to Dave directly.',NOW() - interval '20 minutes'),

-- Bright Spark Electrical
('00000000-0000-0000-0000-000000000003','Chris Martin','07500 123456',165,'lead_captured','lead_captured','Consumer unit upgrade enquiry — 1970s property in Totterdown. Quote callback scheduled for Friday afternoon.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000003','Karen Hughes','07611 234567',90,'referred_out','referred_out','Caller needing boiler repair — outside scope. Referred to City Plumbing on 07500 112233.',NOW() - interval '1 hour'),

-- Green Thumb Gardens
('00000000-0000-0000-0000-000000000004','David Thompson','07700 234567',225,'booked','booked','Garden clearance booked — large overgrown rear garden in Bishopston. Thursday morning confirmed.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000004','Helen Morrison','07811 345678',185,'lead_captured','lead_captured','Regular maintenance enquiry — weekly lawn mow and monthly hedges for large Victorian garden. Lead captured.',NOW() - interval '50 minutes'),

-- Pawfect Grooming
('00000000-0000-0000-0000-000000000005','Lisa Walker','07600 345678',150,'booked','booked','Golden retriever — full groom. Saturday 9am slot confirmed.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000005','Emma Price','07711 456789',110,'lead_captured','lead_captured','New puppy enquiry — Cockapoo, 16 weeks old. Puppy first groom package explained in full. Lead captured.',NOW() - interval '30 minutes'),

-- Peak Performance PT
('00000000-0000-0000-0000-000000000006','Tom Bradley','07500 456789',195,'lead_captured','lead_captured','Weight loss goal — wants 3 sessions per week, has tried gyms before with no results. Very motivated. Lead captured, Connor to call back.',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000006','Jake Harrison','07611 567890',240,'booked','booked','Block of 10 sessions booked — Monday, Wednesday, Friday mornings at 7am. Starts next week.',NOW() - interval '40 minutes'),

-- Clarity Accounting
('00000000-0000-0000-0000-000000000007','Richard Foster','07700 567890',255,'lead_captured','lead_captured','Self-assessment for first year as sole trader — landscape gardener, unsure about expenses. Quote callback arranged for Tuesday. Lead captured.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000007','Margaret Holt','07811 678901',195,'lead_captured','lead_captured','VAT registration assistance — small catering business approaching £85k threshold. Callback with Christine arranged for Thursday.',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000007','Steven Black','07922 789012',120,'spam','spam','Cold sales call from software company — politely declined and ended.',NOW() - interval '20 minutes'),

-- Spotless Cleaning Co
('00000000-0000-0000-0000-000000000008','Jennifer Adams','07600 678901',210,'booked','booked','End of tenancy clean — 2-bed flat in Clifton, move-out this Friday. Booked and confirmed.',NOW() - interval '150 minutes'),
('00000000-0000-0000-0000-000000000008','Mark Thompson','07711 789012',175,'booked','booked','Regular weekly domestic clean — 3 hours, start next Monday morning. Booking confirmed.',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000008','Alison Green','07822 890123',150,'lead_captured','lead_captured','Office cleaning enquiry — 10-desk studio, twice weekly. Quote callback arranged for this week.',NOW() - interval '25 minutes'),

-- Fresh Coat Decorating
('00000000-0000-0000-0000-000000000009','Tony Walsh','07500 789012',195,'lead_captured','lead_captured','Interior painting quote — living room, hallway and stairs in Knowle. Site visit arranged for Thursday morning. Lead captured.',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000009','Sandra Davies','07611 890123',120,'lead_captured','lead_captured','Exterior painting enquiry — 3-bed semi, last done 6 years ago. Andy to quote next week. Lead captured.',NOW() - interval '90 minutes'),

-- Restore Physiotherapy
('00000000-0000-0000-0000-000000000010','Marcus Johnson','07700 890123',420,'booked','booked','Sports knee injury — marathon runner, race in 8 weeks. Assessment with James Hartley booked for Monday 8am.',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000010','Priya Sharma','07811 901234',360,'booked','booked','GP referral for lower back pain — office worker, pain for 3 months. Twice weekly sessions booked with James starting Wednesday.',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000010','Oliver Bennett','07922 012345',480,'booked','booked','Post-operative shoulder rehab — 6 weeks post rotator cuff surgery, consultant referred. Urgent assessment with Dr Okonkwo booked tomorrow.',NOW() - interval '45 minutes'),
('00000000-0000-0000-0000-000000000010','Fiona Campbell','07533 123456',300,'lead_captured','lead_captured','Clinical Pilates enquiry — lower back issues, GP suggested Pilates. Beginner class explained, interested. Lead captured.',NOW() - interval '10 minutes');


-- ═══════════════════════════════════════════════════════════════════
-- 8. HISTORICAL CALLS  (generate_series, last 26 days)
-- ═══════════════════════════════════════════════════════════════════
-- Outcome cycle (20 elements) is tuned per business type.
-- Timestamp formula spreads calls evenly from 26 days ago to yesterday.
-- ═══════════════════════════════════════════════════════════════════

-- ── Bella's Hair Studio (47 historical calls, avg ~3min) ──
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001',
  (ARRAY['Rachel Brown','Hannah Wilson','Amy Taylor','Jessica Moore','Olivia Clark','Sophie Lewis','Charlotte Hall','Georgia Young','Mia Walker','Kate Turner'])[(s % 10) + 1],
  '07' || lpad(((s * 37 + 123) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[180,240,195,150,120,210,165,90,175,140,200,75,160,220,185,130,250,45,170,155])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY[
    'Appointment booked for cut and blow dry — confirmed next week.',
    'New customer enquiring about balayage. Gave pricing overview. Interested — name and number captured.',
    'Existing client rescheduling colour appointment — moved to Thursday 2pm.',
    'Bridal hair enquiry — wedding September 2026. Lead captured, callback to discuss full package.',
    'Caller asking about nail services — referred to Nails by Nikki on 07712 334455.',
    'General enquiry about prices and availability. Information provided, considering booking.'
  ])[(s % 6) + 1],
  NOW() - interval '1 day' * (46 - s)::numeric / 47 * 26 - interval '1 hour' * (9 + s % 9)
FROM generate_series(0, 46) s;

-- ── Fast Flow Plumbing (65 historical calls, avg ~3.5min) ──
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT
  '00000000-0000-0000-0000-000000000002',
  (ARRAY['Kevin Murphy','Gary Thompson','Sharon Kent','Dan Cooper','Steve Rogers','Linda Bailey','Neil Watson','Diane Fletcher','Frank Hughes','Barbara Morton'])[(s % 10) + 1],
  '07' || lpad(((s * 37 + 456) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[210,180,300,150,240,195,120,270,165,225,90,315,140,250,175,75,200,185,45,230])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','escalated','escalated','escalated','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','escalated','escalated','escalated','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY[
    'Annual boiler service booked — confirmed for next available slot.',
    'Emergency plumbing enquiry — boiler breakdown. Callback arranged. Lead captured.',
    'Bathroom installation quote — 3-bed house, full refurb. Dave to call back to discuss spec.',
    'Tiling enquiry — outside our scope. Referred to Pro-Tile on 07724 556677.',
    'Leak under kitchen sink — urgent callback requested. Lead escalated to Dave.',
    'Cold sales call from a supplier — politely ended.'
  ])[(s % 6) + 1],
  NOW() - interval '1 day' * (64 - s)::numeric / 65 * 26 - interval '1 hour' * (9 + s % 9)
FROM generate_series(0, 64) s;

-- ── Bright Spark Electrical (20 historical calls, avg ~2.5min) ──
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT
  '00000000-0000-0000-0000-000000000003',
  (ARRAY['Tony Evans','Debbie Roberts','Mike Clarke','Anne Turner','Rob Lewis','Fiona King','Pete Davis','Sandra Wright','John Webb','Carla Fox'])[(s % 10) + 1],
  '07' || lpad(((s * 37 + 789) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[150,180,120,195,90,210,75,165,130,95,180,60,145,175,110,200,50,140,190,85])[(s % 20) + 1],
  (ARRAY['booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','spam','hard_close'])[(s % 20) + 1],
  (ARRAY['booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','spam','hard_close'])[(s % 20) + 1],
  (ARRAY[
    'PAT testing booked for small office — 12 items, confirmed date next month.',
    'EV charger installation enquiry — single phase supply confirmed. Quote callback scheduled.',
    'Consumer unit upgrade quote — older property, fuse board needs replacing. Lead captured.',
    'Plumbing enquiry — outside scope. Referred to City Plumbing on 07500 112233.',
    'Socket installation enquiry — information provided, caller considering.',
    'Unsolicited marketing call — ended promptly.'
  ])[(s % 6) + 1],
  NOW() - interval '1 day' * (19 - s)::numeric / 20 * 26 - interval '1 hour' * (9 + s % 9)
FROM generate_series(0, 19) s;

-- ── Green Thumb Gardens (46 historical calls, avg ~3min) ──
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT
  '00000000-0000-0000-0000-000000000004',
  (ARRAY['Brian Walsh','Janet Cooper','Alan Richardson','Sue Patterson','Keith Simmons','Diane Fletcher','Ray Thornton','Carol Briggs','Eric Moore','Judith Hawkins'])[(s % 10) + 1],
  '07' || lpad(((s * 37 + 234) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[180,220,150,195,130,240,90,170,200,160,110,250,175,145,185,75,195,130,45,165])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY[
    'Garden clearance booked — large overgrown plot, confirmed Thursday slot.',
    'Regular lawn mowing contract discussed — fortnightly visit. Lead captured, Mike to call back.',
    'Patio laying quote — 30sqm rear garden. Site visit arranged.',
    'Tree surgery enquiry — outside scope. Referred to Summit Tree Services on 07900 445566.',
    'One-off hedge trim enquiry — information and pricing provided.',
    'Cold call from garden supplies company — declined.'
  ])[(s % 6) + 1],
  NOW() - interval '1 day' * (45 - s)::numeric / 46 * 26 - interval '1 hour' * (9 + s % 9)
FROM generate_series(0, 45) s;

-- ── Pawfect Grooming (18 historical calls, avg ~2.75min) ──
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT
  '00000000-0000-0000-0000-000000000005',
  (ARRAY['Rebecca Jones','Natalie Wood','Gemma Richards','Amy Collins','Kate Harris','Jodie Bell','Nikki Owen','Claire Mason','Vicky Shaw','Tara Burns'])[(s % 10) + 1],
  '07' || lpad(((s * 37 + 567) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[165,140,180,120,195,150,210,90,175,130,160,200,75,185,145,170,45,155])[(s % 18) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','filtered','filtered','spam'])[(s % 18) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','filtered','filtered','spam'])[(s % 18) + 1],
  (ARRAY[
    'Full groom booking confirmed — Labrador, Saturday slot.',
    'New customer — Cockerpoo enquiry. Puppy package explained. Booked for next week.',
    'Dog training enquiry — outside scope. Referred to Happy Hounds on 07700 334455.',
    'Regular client rebooking — de-shedding treatment for Husky confirmed.',
    'Caller asking about cat grooming — explained dogs only. Advised to search local cat groomers.',
    'Spam call — ended.'
  ])[(s % 6) + 1],
  NOW() - interval '1 day' * (17 - s)::numeric / 18 * 26 - interval '1 hour' * (9 + s % 9)
FROM generate_series(0, 17) s;

-- ── Peak Performance PT (40 historical calls, avg ~3.5min) ──
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT
  '00000000-0000-0000-0000-000000000006',
  (ARRAY['Matt Wilson','Chris Davies','Ryan Cooper','Sam Murphy','Luke Evans','Ben Taylor','Jack Roberts','Dan Clark','Liam Foster','Owen Price'])[(s % 10) + 1],
  '07' || lpad(((s * 37 + 890) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[210,185,240,150,195,175,120,250,165,225,90,200,140,270,180,60,215,170,45,195])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY[
    'Personal training block booked — 10 sessions, starts Monday morning.',
    'New client enquiry — weight loss goal, 3 sessions/week. Very motivated. Lead captured.',
    'Sports physio enquiry — outside scope. Referred to Summit Physio on 07611 667788.',
    'Online coaching enquiry — nutrition plan + weekly check-ins. Interested, lead captured.',
    'Existing client asking about additional morning slot — Tuesday 6:30am confirmed.',
    'Supplier cold call — declined.'
  ])[(s % 6) + 1],
  NOW() - interval '1 day' * (39 - s)::numeric / 40 * 26 - interval '1 hour' * (9 + s % 9)
FROM generate_series(0, 39) s;

-- ── Clarity Accounting (57 historical calls, avg ~4min) ──
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT
  '00000000-0000-0000-0000-000000000007',
  (ARRAY['Patricia Shaw','Andrew Brooks','Julia Hammond','Graham Spencer','Caroline Hill','Derek Watson','Frances Ellis','Howard Marsh','Sylvia Knight','Peter Griffiths'])[(s % 10) + 1],
  '07' || lpad(((s * 37 + 345) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[240,210,270,180,300,195,150,255,225,285,120,240,165,195,210,90,270,180,45,230])[(s % 20) + 1],
  (ARRAY['booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY['booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY[
    'Consultation booked — company accounts for small Ltd, 2 directors.',
    'Self-assessment enquiry — first year sole trader. Quote callback arranged. Lead captured.',
    'VAT return assistance — quarterly filing, behind on submissions. Callback with Christine arranged.',
    'Financial planning enquiry — outside scope. Referred to Bridge Financial Planning on 07500 556677.',
    'Payroll enquiry for 4 employees — monthly service. Quote arranged.',
    'Cold call — software subscription sales. Declined and ended.'
  ])[(s % 6) + 1],
  NOW() - interval '1 day' * (56 - s)::numeric / 57 * 26 - interval '1 hour' * (9 + s % 9)
FROM generate_series(0, 56) s;

-- ── Spotless Cleaning Co (49 historical calls, avg ~3min) ──
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT
  '00000000-0000-0000-0000-000000000008',
  (ARRAY['Peter Cox','Sandra Hayes','Robert Blake','Janet Morrison','Wayne Fisher','Karen Patel','Brian Thomas','Denise Sharp','Colin Ward','Maria White'])[(s % 10) + 1],
  '07' || lpad(((s * 37 + 678) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[175,210,145,190,160,240,120,200,155,220,90,185,170,235,140,75,195,165,45,210])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','filtered','filtered','filtered','spam','hard_close'])[(s % 20) + 1],
  (ARRAY[
    'End of tenancy clean booked — 2-bed flat, confirmed date.',
    'Regular weekly domestic clean booked — 3 hours, starting next week.',
    'Deep clean enquiry — 5-bed house pre-sale. Lead captured, Maria to quote.',
    'Carpet cleaning enquiry — outside scope. Referred to Premier Carpets on 07811 556677.',
    'Office cleaning quote requested — 8-desk office, twice weekly. Callback arranged.',
    'Nuisance call — ended.'
  ])[(s % 6) + 1],
  NOW() - interval '1 day' * (48 - s)::numeric / 49 * 26 - interval '1 hour' * (9 + s % 9)
FROM generate_series(0, 48) s;

-- ── Fresh Coat Decorating (16 historical calls, avg ~3min) ──
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT
  '00000000-0000-0000-0000-000000000009',
  (ARRAY['Keith Robbins','Julie Massey','Ray Hammond','Debbie Turner','Paul Fletcher','Tracy Brown','Alan Cartwright','Sharon King','Cliff Waters','Brenda Nash'])[(s % 10) + 1],
  '07' || lpad(((s * 37 + 901) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[180,210,150,195,160,220,90,175,200,130,240,120,185,165,195,75])[(s % 16) + 1],
  (ARRAY['booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','filtered','filtered','spam','hard_close'])[(s % 16) + 1],
  (ARRAY['booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','filtered','filtered','spam','hard_close'])[(s % 16) + 1],
  (ARRAY[
    'Wallpaper booking confirmed — feature wall bedroom, Thursday agreed.',
    'Interior painting quote — living room and kitchen. Andy to visit and quote. Lead captured.',
    'Exterior painting enquiry — detached house, last done 5 years ago. Lead captured.',
    'Plastering enquiry — outside scope. Referred to Smooth Finish Plastering on 07600 334455.',
    'General pricing enquiry — information provided. Will call back.',
    'Cold call — paint supplier. Declined.'
  ])[(s % 6) + 1],
  NOW() - interval '1 day' * (15 - s)::numeric / 16 * 26 - interval '1 hour' * (9 + s % 9)
FROM generate_series(0, 15) s;

-- ── Restore Physiotherapy (76 historical calls, avg ~7.5min) ──
INSERT INTO demo_call_logs (business_id, caller_name, caller_number, duration_seconds, call_outcome, triage_outcome, ai_summary, created_at)
SELECT
  '00000000-0000-0000-0000-000000000010',
  (ARRAY['Daniel Mitchell','Sophie Reynolds','James Okafor','Laura Armstrong','Tom Richardson','Alice Cooper','Raj Patel','Claire Moss','Nathan Burns','Helen Gray'])[(s % 10) + 1],
  '07' || lpad(((s * 37 + 12) % 900000000 + 100000000)::text, 9, '0'),
  (ARRAY[480,360,420,540,300,510,390,450,420,330,480,270,510,360,420,540,300,480,360,450])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','escalated','escalated','escalated','filtered','spam'])[(s % 20) + 1],
  (ARRAY['booked','booked','booked','booked','booked','booked','booked','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','referred_out','referred_out','referred_out','escalated','escalated','escalated','filtered','spam'])[(s % 20) + 1],
  (ARRAY[
    'Sports injury assessment booked — quad strain, runner. James Hartley confirmed.',
    'GP referral — chronic lower back pain. Twice weekly sessions booked.',
    'Remedial massage booking — shoulder tension from desk work. Emma Chen confirmed.',
    'Post-surgical rehab enquiry — hip replacement, 10 weeks post-op. Lead captured, Sarah to call.',
    'Podiatry enquiry — outside scope. Referred to City Podiatry on 07500 223344.',
    'Acute neck pain — urgent escalation. Sarah called back immediately.'
  ])[(s % 6) + 1],
  NOW() - interval '1 day' * (75 - s)::numeric / 76 * 26 - interval '1 hour' * (9 + s % 9)
FROM generate_series(0, 75) s;


-- ═══════════════════════════════════════════════════════════════════
-- 9. LEADS
-- ═══════════════════════════════════════════════════════════════════
-- Mix: 'new' (actionable, recent) + 'contacted' + 'converted' + 'lost'
-- Each business has 2-3 'new' leads from the last 7 days.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_leads (business_id, caller_name, caller_number, enquiry_type, notes, status, created_at) VALUES

-- Bella's Hair Studio
('00000000-0000-0000-0000-000000000001','Sarah Johnson','07711 345678','Balayage','Interested in balayage and gloss. Prefers afternoon appointments. Budget around £150.','new',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000001','Sophie Lewis','07733 445566','Bridal hair trial','Wedding in September 2026. Wants a trial 8 weeks before. Flexible budget, wants the full look.','new',NOW() - interval '1 day'),
('00000000-0000-0000-0000-000000000001','Charlotte Hall','07611 556677','Colour + cut','First-time customer — colour refresh and trim. Mentioned seeing Bella''s Instagram.','contacted',NOW() - interval '3 days'),
('00000000-0000-0000-0000-000000000001','Georgia Young','07822 667788','Keratin treatment','Wants frizz control. Has had it done before elsewhere. Wants a quote.','converted',NOW() - interval '10 days'),
('00000000-0000-0000-0000-000000000001','Mia Walker','07933 778899','Extensions','Wants tape-in extensions for a holiday in 6 weeks. Price-checking multiple salons.','lost',NOW() - interval '18 days'),

-- Fast Flow Plumbing
('00000000-0000-0000-0000-000000000002','James Fletcher','07611 234567','Boiler breakdown','No heating or hot water. Combi boiler 12 years old. Wants same-day if possible.','new',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000002','Carol Stevens','07722 345678','Bathroom installation','Full bathroom refurb — 3-bed semi. Budget £8-12k. Wants to start within 2 months.','new',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000002','Sharon Kent','07833 456789','Boiler service','Annual service overdue by 6 months. Worcester Bosch combi. Happy with morning slot.','contacted',NOW() - interval '4 days'),
('00000000-0000-0000-0000-000000000002','Dan Cooper','07944 567890','Leak repair','Dripping tap in bathroom, small leak under kitchen sink. Not urgent but wants fixing.','converted',NOW() - interval '12 days'),
('00000000-0000-0000-0000-000000000002','Kevin Murphy','07555 678901','Central heating','Radiators not heating evenly — possibly needs power flush. Large 4-bed house.','converted',NOW() - interval '20 days'),

-- Bright Spark Electrical
('00000000-0000-0000-0000-000000000003','Chris Martin','07500 123456','Consumer unit','1970s fuse box — wants full upgrade to MCB. Also wants a quote for garden sockets.','new',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000003','Tony Evans','07611 234567','EV charger','Tesla Model 3 arriving next month. Single phase, driveway install. Wants grant info.','new',NOW() - interval '2 days'),
('00000000-0000-0000-0000-000000000003','Debbie Roberts','07722 345678','Garden lighting','New patio, wants outdoor lights and sockets. Has some idea of layout.','contacted',NOW() - interval '5 days'),
('00000000-0000-0000-0000-000000000003','Mike Clarke','07833 456789','PAT testing','Dental surgery, 18 items. Needs certificate for insurance renewal.','converted',NOW() - interval '14 days'),

-- Green Thumb Gardens
('00000000-0000-0000-0000-000000000004','David Thompson','07700 234567','Garden clearance','Large overgrown rear garden. Multiple skips worth. Wants clear before putting house on market.','new',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000004','Helen Morrison','07811 345678','Regular maintenance','Weekly lawn and monthly hedges. Large Victorian garden. Can start immediately.','new',NOW() - interval '50 minutes'),
('00000000-0000-0000-0000-000000000004','Janet Cooper','07922 456789','Patio laying','25sqm rear patio — wants Indian sandstone. Has planning, just needs contractor.','contacted',NOW() - interval '3 days'),
('00000000-0000-0000-0000-000000000004','Brian Walsh','07533 567890','Landscaping','Full garden redesign — new planting scheme, lawn edging. Budget £3-5k.','converted',NOW() - interval '15 days'),
('00000000-0000-0000-0000-000000000004','Alan Richardson','07644 678901','Hedge trimming','Long beech hedge boundary — both sides accessible. Annual contract preferred.','converted',NOW() - interval '22 days'),

-- Pawfect Grooming
('00000000-0000-0000-0000-000000000005','Lisa Walker','07600 345678','Full groom','Golden retriever, needs regular grooming. Last groomed 3 months ago, quite matted.','new',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000005','Emma Price','07711 456789','Puppy groom','Cockapoo, 16 weeks. First professional groom — a bit nervous. Wants gentle approach.','new',NOW() - interval '30 minutes'),
('00000000-0000-0000-0000-000000000005','Rebecca Jones','07822 567890','De-shedding','Siberian Husky shedding heavily. Needs de-shedding treatment and bath.','contacted',NOW() - interval '4 days'),
('00000000-0000-0000-0000-000000000005','Natalie Wood','07933 678901','Regular grooming','Miniature schnauzer, every 6-8 weeks. Wants reliable slot.','converted',NOW() - interval '16 days'),

-- Peak Performance PT
('00000000-0000-0000-0000-000000000006','Tom Bradley','07500 456789','Weight loss','Wants 3 sessions per week. Has tried gyms before. Needs accountability and structure.','new',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000006','Jake Harrison','07611 567890','Strength training','Wants to build muscle and improve posture. Works desk job. Mornings preferred.','new',NOW() - interval '40 minutes'),
('00000000-0000-0000-0000-000000000006','Matt Wilson','07722 678901','Sports performance','Club rugby player, wants speed and strength work in off-season.','contacted',NOW() - interval '5 days'),
('00000000-0000-0000-0000-000000000006','Chris Davies','07833 789012','Online coaching','Relocating out of Bristol next month, wants to continue coaching remotely.','converted',NOW() - interval '18 days'),

-- Clarity Accounting
('00000000-0000-0000-0000-000000000007','Richard Foster','07700 567890','Self-assessment','First year sole trader — landscaper. Unsure about what expenses he can claim.','new',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000007','Margaret Holt','07811 678901','VAT registration','Catering business approaching £85k threshold. Needs help with registration and first return.','new',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000007','Patricia Shaw','07922 789012','Company accounts','Ltd company, 2 directors, second year trading. Looking to switch accountant.','contacted',NOW() - interval '4 days'),
('00000000-0000-0000-0000-000000000007','Andrew Brooks','07533 890123','Bookkeeping','Retail business, monthly bookkeeping needed. Currently doing it herself but struggling.','converted',NOW() - interval '12 days'),
('00000000-0000-0000-0000-000000000007','Julia Hammond','07644 901234','Payroll','Took on 3 staff — needs monthly payroll and RTI filings set up properly.','converted',NOW() - interval '21 days'),

-- Spotless Cleaning Co
('00000000-0000-0000-0000-000000000008','Jennifer Adams','07600 678901','End of tenancy','2-bed flat — landlord inspection in 5 days. Needs to be spotless to get deposit back.','new',NOW() - interval '150 minutes'),
('00000000-0000-0000-0000-000000000008','Mark Thompson','07711 789012','Regular domestic','3-bed house, young family. Wants weekly 3-hour clean starting ASAP.','new',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000008','Alison Green','07822 890123','Office cleaning','10-desk design studio, twice weekly. Needs DBS-checked staff for security reasons.','new',NOW() - interval '25 minutes'),
('00000000-0000-0000-0000-000000000008','Peter Cox','07933 901234','Deep clean','5-bed house being put on market. Wants full deep clean, 2 teams if needed.','contacted',NOW() - interval '3 days'),
('00000000-0000-0000-0000-000000000008','Sandra Hayes','07544 012345','Post-build clean','Extension just finished — builder dust everywhere. Wants a thorough clean before moving back.','converted',NOW() - interval '11 days'),

-- Fresh Coat Decorating
('00000000-0000-0000-0000-000000000009','Tony Walsh','07500 789012','Interior painting','Living room, hallway and stairs. Wants neutral tones. Needs done before Christmas.','new',NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000009','Sandra Davies','07611 890123','Exterior painting','3-bed semi, render painted 6 years ago. Fading badly. Wants a quote this week.','new',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000009','Keith Robbins','07722 901234','Wallpaper','Feature wall in master bedroom — has the paper already, just needs hanging.','contacted',NOW() - interval '6 days'),
('00000000-0000-0000-0000-000000000009','Julie Massey','07833 012345','Interior painting','Full 4-bed house redecoration. Not in a rush but wants a reliable decorator.','converted',NOW() - interval '19 days'),

-- Restore Physiotherapy
('00000000-0000-0000-0000-000000000010','Marcus Johnson','07700 890123','Sports physio','Knee injury — marathon runner. Race in 8 weeks, wants intensive rehab plan.','new',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000010','Priya Sharma','07811 901234','Back pain (GP referral)','GP referred — chronic lower back pain, 3 months. Desk job, sits 9 hours a day.','new',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000010','Fiona Campbell','07922 012345','Clinical Pilates','Lower back issues, GP suggested Pilates. Complete beginner, slightly nervous.','new',NOW() - interval '10 minutes'),
('00000000-0000-0000-0000-000000000010','Daniel Mitchell','07533 123456','Post-op rehab','Shoulder reconstruction — 6 weeks post-op, consultant discharged. Needs rehab to return to sport.','contacted',NOW() - interval '2 days'),
('00000000-0000-0000-0000-000000000010','Sophie Reynolds','07644 234567','Remedial massage','Shoulder and neck tension from long-haul driving job. Wants fortnightly sessions.','converted',NOW() - interval '9 days'),
('00000000-0000-0000-0000-000000000010','James Okafor','07755 345678','Acupuncture','Migraine management — tried medication, wants alternative approach. 2 sessions per month.','converted',NOW() - interval '17 days');


-- ═══════════════════════════════════════════════════════════════════
-- 10. REFERRAL LOG
-- ═══════════════════════════════════════════════════════════════════
-- Spread over 30 days, with a few entries today for each active business.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_referral_log (business_id, partner_name, caller_name, service_requested, created_at) VALUES

-- Bella's Hair Studio (today + history)
('00000000-0000-0000-0000-000000000001','Nails by Nikki','Rachel Brown','Gel nail set',NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000001','The Beauty Room','Hannah Wilson','Eyebrow threading',NOW() - interval '5 days'),
('00000000-0000-0000-0000-000000000001','Nails by Nikki','Amy Taylor','Acrylic nails',NOW() - interval '9 days'),
('00000000-0000-0000-0000-000000000001','The Beauty Room','Jessica Moore','Lash extensions',NOW() - interval '15 days'),
('00000000-0000-0000-0000-000000000001','Nails by Nikki','Olivia Clark','Nail removal and new set',NOW() - interval '22 days'),

-- Fast Flow Plumbing (today + history)
('00000000-0000-0000-0000-000000000002','Sparks Electrical','Gary Thompson','New sockets in kitchen extension',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000002','Pro-Tile','Sharon Kent','New bathroom tiling',NOW() - interval '4 days'),
('00000000-0000-0000-0000-000000000002','Sparks Electrical','Dan Cooper','Consumer unit upgrade',NOW() - interval '8 days'),
('00000000-0000-0000-0000-000000000002','Perfect Finish Plastering','Kevin Murphy','Bathroom plasterwork',NOW() - interval '13 days'),
('00000000-0000-0000-0000-000000000002','Pro-Tile','Neil Watson','Kitchen splashback tiles',NOW() - interval '19 days'),
('00000000-0000-0000-0000-000000000002','Sparks Electrical','Linda Bailey','Garden lighting install',NOW() - interval '25 days'),

-- Bright Spark Electrical (history only)
('00000000-0000-0000-0000-000000000003','City Plumbing','Anne Turner','Boiler service',NOW() - interval '6 days'),
('00000000-0000-0000-0000-000000000003','R&B Builders','Fiona King','Extension electrical prep',NOW() - interval '16 days'),
('00000000-0000-0000-0000-000000000003','City Plumbing','Pete Davis','Bathroom renovation plumbing',NOW() - interval '24 days'),

-- Green Thumb Gardens (today + history)
('00000000-0000-0000-0000-000000000004','Summit Tree Services','David Thompson','Large ash tree removal',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000004','Border Fencing','Janet Cooper','New rear garden fence and gate',NOW() - interval '7 days'),
('00000000-0000-0000-0000-000000000004','Summit Tree Services','Brian Walsh','Crown reduction on oak',NOW() - interval '14 days'),
('00000000-0000-0000-0000-000000000004','Border Fencing','Alan Richardson','Decking installation',NOW() - interval '20 days'),

-- Pawfect Grooming (history)
('00000000-0000-0000-0000-000000000005','Happy Hounds Training','Gemma Richards','Puppy obedience classes',NOW() - interval '10 days'),
('00000000-0000-0000-0000-000000000005','Riverdale Vets','Amy Collins','Annual vaccinations overdue',NOW() - interval '21 days'),

-- Peak Performance PT (history)
('00000000-0000-0000-0000-000000000006','Summit Physio','Chris Davies','Knee pain assessment',NOW() - interval '8 days'),
('00000000-0000-0000-0000-000000000006','City Sports Massage','Ryan Cooper','Deep tissue post-training',NOW() - interval '17 days'),
('00000000-0000-0000-0000-000000000006','Summit Physio','Sam Murphy','Shoulder injury rehab',NOW() - interval '25 days'),

-- Clarity Accounting (today + history)
('00000000-0000-0000-0000-000000000007','Bridge Financial Planning','Graham Spencer','Pension review',NOW() - interval '90 minutes'),
('00000000-0000-0000-0000-000000000007','Lawton Solicitors','Caroline Hill','Business partnership agreement',NOW() - interval '6 days'),
('00000000-0000-0000-0000-000000000007','Bridge Financial Planning','Derek Watson','Investment review',NOW() - interval '14 days'),
('00000000-0000-0000-0000-000000000007','Lawton Solicitors','Frances Ellis','Employment contract advice',NOW() - interval '23 days'),

-- Spotless Cleaning Co (today + history)
('00000000-0000-0000-0000-000000000008','Crystal Windows','Robert Blake','External window clean',NOW() - interval '2 hours'),
('00000000-0000-0000-0000-000000000008','Premier Carpets','Janet Morrison','Living room and stairs carpets',NOW() - interval '5 days'),
('00000000-0000-0000-0000-000000000008','Crystal Windows','Wayne Fisher','Conservatory roof and windows',NOW() - interval '12 days'),
('00000000-0000-0000-0000-000000000008','Premier Carpets','Karen Patel','Upholstery cleaning — sofa set',NOW() - interval '20 days'),

-- Fresh Coat Decorating (history)
('00000000-0000-0000-0000-000000000009','Smooth Finish Plastering','Ray Hammond','Hall ceiling skim before painting',NOW() - interval '11 days'),
('00000000-0000-0000-0000-000000000009','Oak Carpentry','Debbie Turner','New skirting boards before decorating',NOW() - interval '22 days'),

-- Restore Physiotherapy (today + history)
('00000000-0000-0000-0000-000000000010','City Podiatry','Marcus Johnson','Biomechanical assessment — overpronation',NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000010','Align Chiropractic','Laura Armstrong','Lower back — chiropractic opinion',NOW() - interval '4 days'),
('00000000-0000-0000-0000-000000000010','City Podiatry','Tom Richardson','Orthotics fitting',NOW() - interval '11 days'),
('00000000-0000-0000-0000-000000000010','Align Chiropractic','Alice Cooper','Neck and shoulder assessment',NOW() - interval '18 days'),
('00000000-0000-0000-0000-000000000010','City Podiatry','Raj Patel','Plantar fasciitis assessment',NOW() - interval '25 days');


-- ═══════════════════════════════════════════════════════════════════
-- 11. PRICING INTELLIGENCE  (Restore Physiotherapy — enterprise only)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_pricing_intelligence (business_id, service_name, our_price, market_low, market_high, insight) VALUES
('00000000-0000-0000-0000-000000000010','Initial assessment',85,65,95,'Priced at mid-market. Callers mention competitor rates of £65–£70. Premium positioning justified by multi-practitioner setup.'),
('00000000-0000-0000-0000-000000000010','Follow-up session',65,50,75,'Competitive. Three callers mentioned paying £55 elsewhere — our quality reputation supports £65 without pushback.'),
('00000000-0000-0000-0000-000000000010','Remedial massage (60 min)',60,45,70,'Strong position. Callers expecting £45–£55 from standalone massage studios; clinic setting supports premium.'),
('00000000-0000-0000-0000-000000000010','Clinical Pilates (class)',18,12,22,'Below market for a clinic setting. Consider moving to £20–22 at next review — caller expectations suggest this is acceptable.'),
('00000000-0000-0000-0000-000000000010','Sports injury package (6 sessions)',340,280,390,'Good value perception. Callers respond well to the package framing vs. per-session pricing.');


-- ═══════════════════════════════════════════════════════════════════
-- 12. COMPETITOR INTELLIGENCE  (Restore Physiotherapy — enterprise only)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_competitor_intelligence (business_id, competitor_name, mention_count, context) VALUES
('00000000-0000-0000-0000-000000000010','Bristol Physio & Sports Clinic',8,'Most frequently mentioned. Callers compare wait times — we are consistently faster. Price parity on initial assessments.'),
('00000000-0000-0000-0000-000000000010','Clifton Physiotherapy',5,'Callers mention Clifton Physio when price-shopping. Our multi-practitioner offer seen as stronger for complex cases.'),
('00000000-0000-0000-0000-000000000010','The Physio Room',3,'Mentioned mainly by sports injury callers — smaller studio, lower price point. Our post-op rehab capability differentiates strongly.'),
('00000000-0000-0000-0000-000000000010','NHS Physiotherapy (referral)',6,'Callers citing NHS wait times as reason for seeking private — average 14-week wait mentioned. Reinforce speed-to-treatment messaging.');


-- ═══════════════════════════════════════════════════════════════════
-- 13. DEMO USERS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO demo_users (id, email, name, role, access_code) VALUES
('00000000-0000-0000-0000-000000000099',
 'demo@verrante.app',
 'Alex (Sales)',
 'sales_rep',
 'VERRANTE2026');


-- ═══════════════════════════════════════════════════════════════════
-- DONE — verify with:
--   SELECT business_name, tier FROM demo_businesses ORDER BY tier;
--   SELECT business_id, COUNT(*) calls FROM demo_call_logs GROUP BY 1;
--   SELECT business_id, COUNT(*) leads FROM demo_leads GROUP BY 1;
--   SELECT business_id, COUNT(*) refs FROM demo_referral_log GROUP BY 1;
--   SELECT * FROM demo_users;
-- ═══════════════════════════════════════════════════════════════════
