-- =====================================================================
-- Demo patch: add referral partners + referral log entries for JB Sports
-- Safe to re-run (DELETE before INSERT uses specific partner names)
-- Run in Supabase SQL Editor after demo_seed.sql
-- =====================================================================

DELETE FROM demo_partners
 WHERE business_id = '00000000-0000-0000-0000-000000000010';

DELETE FROM demo_referral_log
 WHERE business_id = '00000000-0000-0000-0000-000000000010';

-- Partners for JB Sports head office
INSERT INTO demo_partners (business_id, partner_name, partner_phone, specialty) VALUES
('00000000-0000-0000-0000-000000000010',
 'Apex Print & Design', '0115 567 8901',
 'Branded retail displays, merchandise, point of sale, exhibition stands'),
('00000000-0000-0000-0000-000000000010',
 'Nationwide Recruitment', '0161 678 9012',
 'Head office hires — commercial, operations, and finance talent');

-- Referral log entries for JB Sports
INSERT INTO demo_referral_log (business_id, partner_name, caller_name, service_requested, created_at) VALUES
('00000000-0000-0000-0000-000000000010',
 'Apex Print & Design', 'Patricia Green',
 'Branded kit + point-of-sale for corporate sports day',
 NOW() - interval '4 hours'),
('00000000-0000-0000-0000-000000000010',
 'Nationwide Recruitment', 'Linda Hatch',
 'Regional operations manager vacancy — store network',
 NOW() - interval '5.5 hours'),
('00000000-0000-0000-0000-000000000010',
 'Apex Print & Design', 'Marcus Webb',
 'Trade show exhibition stand — Spring Fair Birmingham',
 NOW() - interval '2 days');
