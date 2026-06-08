-- =====================================================================
-- QERXEL — Demo Staff Comprehensive Update
-- Replaces sparse staff with full realistic teams for all 10 businesses.
-- Does NOT touch calls, leads, referrals, businesses, or services.
-- Safe to re-run.
-- =====================================================================

-- Add direct_line column if it doesn't exist yet
ALTER TABLE demo_staff ADD COLUMN IF NOT EXISTS direct_line text;
ALTER TABLE demo_staff ADD COLUMN IF NOT EXISTS email text;

-- Wipe and re-seed staff only
DELETE FROM demo_staff;

INSERT INTO demo_staff (business_id, name, role, specialist_services, phone, direct_line, email, active) VALUES

-- ─── b01 Hargreaves Plumbing (Standard) ───────────────────────────────────────
('00000000-0000-0000-0000-000000000001',
 'Mike Hargreaves', 'Owner & Gas Safe Engineer',
 'Boiler installations, Gas safety certificates, Heating system design',
 '07700 100001', '0114 234 5671', 'mike@hargreavesplumbing.co.uk', true),

('00000000-0000-0000-0000-000000000001',
 'Lee Hargreaves', 'Qualified Plumber',
 'Bathroom installations, Tiling, General plumbing',
 '07700 100002', '0114 234 5672', 'lee@hargreavesplumbing.co.uk', true),

('00000000-0000-0000-0000-000000000001',
 'Gary Stubbs', 'Senior Plumber',
 'Emergency call-outs, Drain unblocking, Central heating',
 '07700 100003', '0114 234 5673', 'gary@hargreavesplumbing.co.uk', true),

('00000000-0000-0000-0000-000000000001',
 'Karen Hargreaves', 'Office Manager',
 'Bookings, Customer accounts, Scheduling',
 '07700 100004', '0114 234 5674', 'karen@hargreavesplumbing.co.uk', true),

-- ─── b02 Elegant Hair Design (Light) ─────────────────────────────────────────
('00000000-0000-0000-0000-000000000002',
 'Tracy Walsh', 'Owner & Senior Stylist',
 'Colour & balayage, Olaplex treatments, Bridal consultations',
 '07700 200001', '0113 345 6781', 'tracy@eleganthairdesign.co.uk', true),

('00000000-0000-0000-0000-000000000002',
 'Jade Morrison', 'Senior Stylist',
 'Highlights, Keratin treatments, Hair extensions',
 '07700 200002', '0113 345 6782', 'jade@eleganthairdesign.co.uk', true),

('00000000-0000-0000-0000-000000000002',
 'Paige Ellis', 'Stylist',
 'Cuts, Blow dry, Colour, Nail bar',
 '07700 200003', null, 'paige@eleganthairdesign.co.uk', true),

('00000000-0000-0000-0000-000000000002',
 'Chloe Marsh', 'Apprentice Stylist',
 'Blow dry, Treatments, Nail bar',
 '07700 200004', null, null, true),

-- ─── b03 Greenfield Landscape Gardening (Professional) ───────────────────────
('00000000-0000-0000-0000-000000000003',
 'James Greenfield', 'Owner & Lead Designer',
 'Garden design, Hard landscaping, Client consultations',
 '07700 300001', '0161 456 7891', 'james@greenfieldlandscape.co.uk', true),

('00000000-0000-0000-0000-000000000003',
 'Pete Walsh', 'Senior Groundsworker',
 'Patio & decking, Fencing, Heavy clearance, Turfing',
 '07700 300002', '0161 456 7892', 'pete@greenfieldlandscape.co.uk', true),

('00000000-0000-0000-0000-000000000003',
 'Rachel Drummond', 'Accounts & Contracts Manager',
 'Maintenance contracts, Client liaison, Scheduling',
 '07700 300003', '0161 456 7893', 'rachel@greenfieldlandscape.co.uk', true),

('00000000-0000-0000-0000-000000000003',
 'Billy Sharpe', 'Groundsworker',
 'Lawn care, Hedge trimming, Garden clearance',
 '07700 300004', null, null, true),

('00000000-0000-0000-0000-000000000003',
 'Tom Kaur', 'Groundsworker',
 'Planting, Lawn maintenance, Seasonal work',
 '07700 300005', null, null, true),

-- ─── b04 Swift Electrical (Standard) ──────────────────────────────────────────
('00000000-0000-0000-0000-000000000004',
 'Dave Swift', 'Owner & Master Electrician',
 'Consumer unit upgrades, Full rewires, EV charger installation',
 '07700 400001', '0121 567 8901', 'dave@swiftelectrical.co.uk', true),

('00000000-0000-0000-0000-000000000004',
 'Ryan Cole', 'Qualified Electrician',
 'Commercial installations, PAT testing, CCTV & security',
 '07700 400002', '0121 567 8902', 'ryan@swiftelectrical.co.uk', true),

('00000000-0000-0000-0000-000000000004',
 'Jake Whitmore', 'Electrician',
 'Domestic installations, Garden lighting, Outdoor power',
 '07700 400003', '0121 567 8903', 'jake@swiftelectrical.co.uk', true),

('00000000-0000-0000-0000-000000000004',
 'Sandra Swift', 'Office & Accounts',
 'Quotes, Invoicing, Scheduling, Customer contact',
 '07700 400004', '0121 567 8904', 'office@swiftelectrical.co.uk', true),

-- ─── b05 Paws & Claws Dog Grooming (Light) ───────────────────────────────────
('00000000-0000-0000-0000-000000000005',
 'Sarah Chen', 'Owner & Senior Groomer',
 'All breeds, Anxiety-free approach, Puppy first grooms',
 '07700 500001', '0117 678 9012', 'sarah@pawsandclaws.co.uk', true),

('00000000-0000-0000-0000-000000000005',
 'Abbie Shaw', 'Qualified Groomer',
 'Full grooms, De-shedding treatments, Hand stripping',
 '07700 500002', '0117 678 9013', 'abbie@pawsandclaws.co.uk', true),

('00000000-0000-0000-0000-000000000005',
 'Molly Grant', 'Grooming Assistant',
 'Baths, Nail trims, Drying, Salon prep',
 '07700 500003', null, null, true),

-- ─── b06 Premier Mortgage Solutions (Professional) ───────────────────────────
('00000000-0000-0000-0000-000000000006',
 'Caroline Hughes', 'Senior Mortgage Advisor',
 'Residential mortgages, First time buyers, Remortgage, Self-employed cases',
 '07700 600001', '029 2034 5671', 'caroline@premiermortgage.co.uk', true),

('00000000-0000-0000-0000-000000000006',
 'David Banks', 'Protection Specialist',
 'Life insurance, Income protection, Critical illness, Buildings & contents',
 '07700 600002', '029 2034 5672', 'david@premiermortgage.co.uk', true),

('00000000-0000-0000-0000-000000000006',
 'Priya Nair', 'Mortgage Advisor',
 'Buy to let, Shared ownership, Help to buy, New build',
 '07700 600003', '029 2034 5673', 'priya@premiermortgage.co.uk', true),

('00000000-0000-0000-0000-000000000006',
 'Beth Carmichael', 'Client Services Manager',
 'Case management, Lender liaison, Client onboarding',
 '07700 600004', '029 2034 5674', 'beth@premiermortgage.co.uk', true),

-- ─── b07 Valley View B&B (Standard) ──────────────────────────────────────────
('00000000-0000-0000-0000-000000000007',
 'Paul Morris', 'Co-owner & Host',
 'Bookings, Local walking routes, Group activities, Breakfast service',
 '07700 700001', '01539 456 789', 'paul@valleyviewbnb.co.uk', true),

('00000000-0000-0000-0000-000000000007',
 'Janet Morris', 'Co-owner & Head Chef',
 'Breakfasts, Special dietary requirements, Evening meals by arrangement',
 '07700 700002', '01539 456 790', 'janet@valleyviewbnb.co.uk', true),

('00000000-0000-0000-0000-000000000007',
 'Amy Trent', 'Housekeeper',
 'Room servicing, Laundry, Guest queries',
 '07700 700003', null, null, true),

('00000000-0000-0000-0000-000000000007',
 'Ben Ashworth', 'Weekend Host',
 'Check-ins, Concierge, Breakfast cover',
 '07700 700004', null, null, true),

-- ─── b08 Apex Print & Design (Professional) ──────────────────────────────────
('00000000-0000-0000-0000-000000000008',
 'Mark Dobson', 'Owner & Print Director',
 'Large format, Vehicle wraps, Production management, Client strategy',
 '07700 800001', '0115 567 8901', 'mark@apexprintdesign.co.uk', true),

('00000000-0000-0000-0000-000000000008',
 'Fiona Chen', 'Senior Designer',
 'Brand identity, Marketing design, Exhibition graphics, Creative direction',
 '07700 800002', '0115 567 8902', 'fiona@apexprintdesign.co.uk', true),

('00000000-0000-0000-0000-000000000008',
 'Carl Bridge', 'Print Technician',
 'Digital print, Finishing & binding, Large format output, Pre-press',
 '07700 800003', '0115 567 8903', 'carl@apexprintdesign.co.uk', true),

('00000000-0000-0000-0000-000000000008',
 'Leanne Fox', 'Account Manager',
 'Client liaison, Quotes, Project management, Repeat accounts',
 '07700 800004', '0115 567 8904', 'leanne@apexprintdesign.co.uk', true),

-- ─── b09 Nationwide Recruitment (Enterprise) ─────────────────────────────────
('00000000-0000-0000-0000-000000000009',
 'Debbie Walsh', 'Managing Director',
 'Executive search, Strategic accounts, Board-level placements',
 '07700 900001', '0161 678 9001', 'debbie@nationwiderecruitment.co.uk', true),

('00000000-0000-0000-0000-000000000009',
 'Sam Taylor', 'Head of Commercial',
 'Commercial, Finance, Operations, Supply chain placements',
 '07700 900002', '0161 678 9002', 'sam@nationwiderecruitment.co.uk', true),

('00000000-0000-0000-0000-000000000009',
 'Andy Jones', 'Head of Technology',
 'IT, Digital, Engineering, Data & analytics placements',
 '07700 900003', '0161 678 9003', 'andy@nationwiderecruitment.co.uk', true),

('00000000-0000-0000-0000-000000000009',
 'Rebecca Flynn', 'Senior Consultant — HR & Operations',
 'HR Director, People & Culture, Operations Manager placements',
 '07700 900004', '0161 678 9004', 'rebecca@nationwiderecruitment.co.uk', true),

('00000000-0000-0000-0000-000000000009',
 'Tom Gill', 'Consultant — Finance',
 'CFO, FD, Management Accountant, Financial Controller placements',
 '07700 900005', '0161 678 9005', 'tom@nationwiderecruitment.co.uk', true),

('00000000-0000-0000-0000-000000000009',
 'Nadia Patel', 'Resourcer',
 'Candidate sourcing, Database management, LinkedIn search',
 '07700 900006', null, 'nadia@nationwiderecruitment.co.uk', true),

-- ─── b10 JB Sports & Fashion (Enterprise) ────────────────────────────────────
('00000000-0000-0000-0000-000000000010',
 'Marcus Reid', 'Commercial Director',
 'Wholesale partnerships, Key accounts, Trading terms, National chains',
 '07700 100101', '020 7123 4561', 'marcus.reid@jbsportsfashion.co.uk', true),

('00000000-0000-0000-0000-000000000010',
 'Nina Patel', 'Head of Wholesale',
 'Wholesale enquiries, Trade accounts, Buying relationships, Pricing',
 '07700 100102', '020 7123 4562', 'nina.patel@jbsportsfashion.co.uk', true),

('00000000-0000-0000-0000-000000000010',
 'James Cole', 'Press & Media Manager',
 'Press enquiries, Sponsorship, Brand partnerships, PR',
 '07700 100103', '020 7123 4563', 'press@jbsportsfashion.co.uk', true),

('00000000-0000-0000-0000-000000000010',
 'Claire Drummond', 'Franchise Development Manager',
 'Franchise enquiries, Site selection, Franchise onboarding',
 '07700 100104', '020 7123 4564', 'franchise@jbsportsfashion.co.uk', true),

('00000000-0000-0000-0000-000000000010',
 'Ravi Sharma', 'Head of IT & Systems',
 'Technology partnerships, Integration enquiries, ERP & EPOS',
 '07700 100105', '020 7123 4565', 'it@jbsportsfashion.co.uk', true);
