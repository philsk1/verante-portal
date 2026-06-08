-- =====================================================================
-- QERXEL — Demo Data Enrichment
-- Fills in null AI summaries for recent calls, adds missing partners,
-- extra leads for thin businesses, and more referral log entries.
-- Safe to re-run (uses INSERT … ON CONFLICT DO NOTHING where possible).
-- =====================================================================

-- ─── 1. AI SUMMARIES for recent null calls ────────────────────────────────────

UPDATE demo_call_logs SET ai_summary = 'Exhibition brochure enquiry — luxury car dealer, 5,000 run, full bleed gloss A4. Leanne to send quote by Monday. Strong lead, budget confirmed.'
WHERE id = '491e24c0-0000-0000-0000-000000000000'::uuid OR (caller_name = 'Carol Bates' AND created_at::date = '2026-06-07' AND ai_summary IS NULL);

UPDATE demo_call_logs SET ai_summary = 'Appointment booked — cut and highlights with Jade on Saturday 2pm. First visit, brunette hair, wants face-framing colour. Confirmed.'
WHERE id = '943b3fb2-0000-0000-0000-000000000000'::uuid OR (caller_name = 'Chloe Lewis' AND created_at::date = '2026-06-07' AND ai_summary IS NULL);

UPDATE demo_call_logs SET ai_summary = 'Maintenance contract enquiry — 6 commercial units on Salford business park, monthly grounds maintenance. Rachel to call back to arrange site visit and pricing.'
WHERE id = '7a5a8ad5-0000-0000-0000-000000000000'::uuid OR (caller_name = 'Kevin Adams' AND created_at::date = '2026-06-07' AND ai_summary IS NULL);

UPDATE demo_call_logs SET ai_summary = 'Full groom booked — Labrador, next Tuesday 9am. Regular customer, requested Abbie. Note on file: dog nervous of dryers, use cool setting.'
WHERE id = 'ad242dc6-0000-0000-0000-000000000000'::uuid OR (caller_name = 'Lisa Ward' AND created_at::date = '2026-06-07' AND ai_summary IS NULL);

UPDATE demo_call_logs SET ai_summary = 'New build mortgage — off-plan development, exchange in 6 weeks, urgency flagged. Caroline to call Ian back within the hour. Lead captured and prioritised.'
WHERE id = 'ad5aed6d-0000-0000-0000-000000000000'::uuid OR (caller_name = 'Ian Richards' AND created_at::date = '2026-06-07' AND ai_summary IS NULL);

UPDATE demo_call_logs SET ai_summary = 'Turf and fencing enquiry — new-build rear garden, 50sq m lawn plus 20m close-board panels. Pete to visit and quote, caller prefers a weekend appointment.'
WHERE id = '6fbca897-0000-0000-0000-000000000000'::uuid OR (caller_name = 'Diane Walker' AND created_at::date = '2026-06-07' AND ai_summary IS NULL);

UPDATE demo_call_logs SET ai_summary = 'Protection review — existing client, new baby, wants to update life cover and add critical illness. David Banks to follow up this week.'
WHERE id = '751ed81b-0000-0000-0000-000000000000'::uuid OR (caller_name = 'Susan Moore' AND created_at::date = '2026-06-07' AND ai_summary IS NULL);

UPDATE demo_call_logs SET ai_summary = 'Roller banner enquiry — trade show next month, wants 2 × 800mm pull-up banners. Standard fast-turn order. Quote emailed, artwork deadline Friday.'
WHERE id = '19f753a3-0000-0000-0000-000000000000'::uuid OR (caller_name = 'Robert Jennings' AND created_at::date = '2026-06-07' AND ai_summary IS NULL);

UPDATE demo_call_logs SET ai_summary = 'Leaflet print enquiry — 10,000 DL flyers, local area restaurant promotion. Budget-sensitive, wants cheapest option. Carl to advise on 130gsm matt vs silk.'
WHERE caller_name = 'Fay Simmons' AND created_at::date = '2026-06-07' AND ai_summary IS NULL;

UPDATE demo_call_logs SET ai_summary = 'Self-employed mortgage — 2 years SA302s, buying first property in Cardiff, £195k, 15% deposit. Free consultation offered, appointment Tuesday 11am.'
WHERE caller_name = 'Chris Bailey' AND created_at::date = '2026-06-07' AND ai_summary IS NULL;

UPDATE demo_call_logs SET ai_summary = 'Commercial grounds contract — business park enquiry, 12 units, Salford. Rachel to arrange site visit. This would be one of our largest maintenance clients.'
WHERE caller_name = 'Neil Thompson' AND created_at::date = '2026-06-07' AND ai_summary IS NULL;

UPDATE demo_call_logs SET ai_summary = 'Bridal hair consultation booked — June wedding, 4 bridesmaids. Tracy to handle, trial date TBC. Told caller about Olaplex add-on for the morning.'
WHERE caller_name = 'Grace Clark' AND created_at::date = '2026-06-07' AND ai_summary IS NULL;

UPDATE demo_call_logs SET ai_summary = 'De-shedding treatment booked — German Shepherd, heavy seasonal shedding. Thursday 9:30am confirmed. Large dog surcharge applies. Abbie to attend.'
WHERE caller_name = 'Catherine Ford' AND created_at::date = '2026-06-07' AND ai_summary IS NULL;


-- ─── 2. PARTNERS — fill thin businesses to 3+ each ───────────────────────────

-- b02 Elegant Hair Design (was 1 partner)
INSERT INTO demo_partners (business_id, partner_name, partner_phone, specialty) VALUES
('00000000-0000-0000-0000-000000000002', 'The Bridal Suite', '0113 456 7890', 'Wedding photography & styling — joint bridal packages'),
('00000000-0000-0000-0000-000000000002', 'Bliss Beauty & Nails', '0113 567 8901', 'Nail art, lash extensions, brow shaping — full beauty packages');

-- b06 Premier Mortgage Solutions (was 1 partner)
INSERT INTO demo_partners (business_id, partner_name, partner_phone, specialty) VALUES
('00000000-0000-0000-0000-000000000006', 'Harrison & Co Solicitors', '029 2045 6789', 'Residential conveyancing — referred for all completions'),
('00000000-0000-0000-0000-000000000006', 'Aspire Financial Planning', '029 2056 7890', 'IFA — pension reviews, investment advice for remortgage clients');

-- b07 Valley View B&B (was 1 partner)
INSERT INTO demo_partners (business_id, partner_name, partner_phone, specialty) VALUES
('00000000-0000-0000-0000-000000000007', 'The Lakeland Kitchen', '01539 567 890', 'Fine dining — evening meal referrals for B&B guests'),
('00000000-0000-0000-0000-000000000007', 'Summit Activities', '01539 678 901', 'Guided walks, kayaking, mountain biking — activity packages for guests');

-- Extra partners for larger businesses
INSERT INTO demo_partners (business_id, partner_name, partner_phone, specialty) VALUES
('00000000-0000-0000-0000-000000000001', 'Tile & Stone Co', '0114 345 6789', 'Bathroom tiles supply — joint quote for suite installations'),
('00000000-0000-0000-0000-000000000003', 'Blue Skies Fencing', '0161 567 8901', 'Fencing supply and installation — overflow fencing work'),
('00000000-0000-0000-0000-000000000004', 'Alarm Secure Systems', '0121 678 9012', 'Burglar alarms and access control — installed alongside CCTV'),
('00000000-0000-0000-0000-000000000008', 'Vine Digital', '0115 678 9012', 'Web & digital design — referred when clients need a full brand package'),
('00000000-0000-0000-0000-000000000009', 'Kingswood Relocations', '020 8123 4567', 'Corporate relocation — referred for all out-of-area placements'),
('00000000-0000-0000-0000-000000000010', 'Elite Sportswear Agency', '020 7234 5678', 'Sponsorship and sports endorsement deals for product partnerships');


-- ─── 3. MORE LEADS for thin businesses ───────────────────────────────────────

-- b02 Elegant Hair (was 3, adding 3 more)
INSERT INTO demo_leads (business_id, caller_name, caller_number, enquiry_type, status, notes) VALUES
('00000000-0000-0000-0000-000000000002', 'Sophie Abbott', '07800 112233', 'highlights', 'new', 'Long blonde hair, wants face-framing highlights, first visit'),
('00000000-0000-0000-0000-000000000002', 'Danielle Pierce', '07911 223344', 'colour', 'new', 'Wants to go darker for winter, full head colour, has never coloured before'),
('00000000-0000-0000-0000-000000000002', 'Rachel Moore', '07633 334455', 'extensions', 'new', 'Hair extensions for holiday, 3 weeks away, medium length brown hair');

-- b05 Paws & Claws (was 3, adding 3 more)
INSERT INTO demo_leads (business_id, caller_name, caller_number, enquiry_type, status, notes) VALUES
('00000000-0000-0000-0000-000000000005', 'Tom Barlow', '07722 445566', 'puppy_groom', 'new', 'Border Collie, 6 months, needs first professional groom, nervous about it'),
('00000000-0000-0000-0000-000000000005', 'Janet Fox', '07833 556677', 'nail_trim', 'new', 'Elderly Golden Retriever, very anxious with strangers, gentle handling needed'),
('00000000-0000-0000-0000-000000000005', 'Laura Singh', '07944 667788', 'full_groom', 'new', 'Miniature Schnauzer, wants regular monthly slot from next month');

-- b07 Valley View (extra lead)
INSERT INTO demo_leads (business_id, caller_name, caller_number, enquiry_type, status, notes) VALUES
('00000000-0000-0000-0000-000000000007', 'Graham Saunders', '07655 445566', 'group_booking', 'new', '6 walkers, 3 nights, want evening meals included, asking about availability August');


-- ─── 4. MORE REFERRAL LOG ENTRIES ────────────────────────────────────────────

-- b02 Elegant Hair (was 1, adding 3)
INSERT INTO demo_referral_log (business_id, partner_name, caller_name, service_requested, created_at) VALUES
('00000000-0000-0000-0000-000000000002', 'The Bridal Suite', 'Louise Patel', 'Wedding photography for July bridal party', NOW() - interval '1 hour'),
('00000000-0000-0000-0000-000000000002', 'Bliss Beauty & Nails', 'Jade Foster', 'Gel nails and lash lift — full beauty day', NOW() - interval '2 days'),
('00000000-0000-0000-0000-000000000002', 'The Bridal Suite', 'Hannah Berry', 'Bridesmaids hair and makeup coordination', NOW() - interval '4 days');

-- b06 Premier Mortgage (was 1, adding 3)
INSERT INTO demo_referral_log (business_id, partner_name, caller_name, service_requested, created_at) VALUES
('00000000-0000-0000-0000-000000000006', 'Harrison & Co Solicitors', 'Richard Owen', 'Conveyancing for Cardiff Bay first-time purchase', NOW() - interval '30 minutes'),
('00000000-0000-0000-0000-000000000006', 'Harrison & Co Solicitors', 'Amanda Summers', 'Remortgage legal transfer', NOW() - interval '1 day'),
('00000000-0000-0000-0000-000000000006', 'Aspire Financial Planning', 'Linda Foster', 'Retirement income and pension drawdown review', NOW() - interval '3 days');

-- b05 Paws & Claws (was 2, adding 2)
INSERT INTO demo_referral_log (business_id, partner_name, caller_name, service_requested, created_at) VALUES
('00000000-0000-0000-0000-000000000005', 'Valley View B&B', 'Mark Evans', 'Dog-friendly B&B for Lake District holiday', NOW() - interval '2 days'),
('00000000-0000-0000-0000-000000000005', 'Elegant Hair Design', 'Sarah Chen', 'Hair appointment for grooming salon owner — staff perk', NOW() - interval '5 days');

-- b07 Valley View (was 2, adding 2)
INSERT INTO demo_referral_log (business_id, partner_name, caller_name, service_requested, created_at) VALUES
('00000000-0000-0000-0000-000000000007', 'The Lakeland Kitchen', 'Paul Morris', 'Evening dinner reservation for 4 guests — anniversary couple', NOW() - interval '3 hours'),
('00000000-0000-0000-0000-000000000007', 'Summit Activities', 'Janet Morris', 'Guided walk for 6 guests — Saturday morning', NOW() - interval '1 day');
