// Ground Zero — reset one demo tenant's calendar data to canonical state.
// POST { tenantId, ownerEmail } → delete catalogue + appointments, reseed from config, return counts.
// Owner-only endpoint.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://kkrsvkxkefijmtbwykzv.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY)
const OWNER_EMAIL = 'finsolsoffice@gmail.com'

const uid = () => crypto.randomUUID()
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ── SERVICE TEMPLATES [name, duration_mins, price_from, price_to, category] ──
const SVC = {
  hair: [
    ['Cut & Style', 60, 38, 55, 'Cuts'],['Blow Dry', 30, 22, 32, 'Styling'],["Men's Cut", 30, 20, 28, 'Cuts'],
    ['Full Colour', 90, 65, 85, 'Colour'],['Full Highlights', 120, 88, 120, 'Colour'],['Balayage', 150, 115, 165, 'Colour'],
    ['Colour & Tone', 90, 68, 85, 'Colour'],['Root Touch-Up', 60, 48, 62, 'Colour'],['Deep Conditioning', 45, 32, 45, 'Treatments'],
    ['Brazilian Blow Dry', 90, 120, 180, 'Treatments'],['Scalp Treatment', 45, 38, 52, 'Treatments'],['Extensions Consultation', 30, 0, 0, 'Consultations'],
  ],
  nail_beauty: [
    ['Classic Manicure', 45, 25, 35, 'Nails'],['Gel Manicure', 60, 35, 48, 'Nails'],['Classic Pedicure', 60, 30, 42, 'Nails'],
    ['Gel Pedicure', 75, 40, 55, 'Nails'],['Acrylic Full Set', 90, 45, 65, 'Nails'],['Nail Infill', 60, 30, 42, 'Nails'],
    ['Eyebrow Wax & Shape', 20, 12, 18, 'Brows'],['Eyelash Tint & Lift', 60, 45, 62, 'Lashes'],['Facial', 60, 45, 65, 'Skin'],['Spray Tan', 30, 25, 35, 'Tanning'],
  ],
  beauty_clinic: [
    ['Facial', 60, 55, 80, 'Skin'],['Microdermabrasion', 60, 75, 100, 'Skin'],['Chemical Peel', 45, 65, 90, 'Skin'],
    ['LED Light Therapy', 30, 45, 60, 'Skin'],['Dermaplaning', 45, 60, 80, 'Skin'],['Classic Manicure', 45, 28, 38, 'Nails'],
    ['Gel Manicure', 60, 38, 52, 'Nails'],['Waxing — Full Leg', 45, 32, 45, 'Waxing'],['Waxing — Half Leg', 30, 20, 28, 'Waxing'],
    ['Lash Extensions — Full Set', 90, 65, 90, 'Lashes'],['Lash Infill', 60, 40, 55, 'Lashes'],['Brow Lamination', 45, 45, 60, 'Brows'],
  ],
  cleaning: [
    ['Regular Contract Clean', 120, 95, 150, 'Contract'],['Office Deep Clean', 180, 180, 320, 'Deep Clean'],
    ['End of Tenancy Clean', 240, 220, 480, 'Specialist'],['Carpet Steam Clean', 120, 90, 160, 'Specialist'],
    ['Window Cleaning', 90, 55, 95, 'External'],['Industrial Floor Clean', 240, 200, 380, 'Industrial'],
    ['Post-Construction Clean', 300, 280, 550, 'Specialist'],['Site Survey & Quote', 60, 0, 0, 'Admin'],
  ],
  electrical: [
    ['Electrical Safety Certificate (EICR)', 120, 145, 220, 'Certification'],['Consumer Unit Replacement', 240, 380, 520, 'Installation'],
    ['EV Charger Installation', 180, 650, 950, 'Installation'],['Socket & Switch Installation', 60, 85, 130, 'Installation'],
    ['Lighting Installation', 90, 110, 180, 'Installation'],['Fault Finding & Repair', 90, 95, 160, 'Repair'],
    ['PAT Testing', 60, 75, 120, 'Testing'],['Emergency Callout', 60, 150, 250, 'Emergency'],
    ['Rewire (Full)', 480, 2800, 4500, 'Major Works'],['Solar Panel Survey', 90, 0, 0, 'Consultations'],
  ],
  plumbing: [
    ['Boiler Service', 90, 90, 130, 'Boiler'],['Gas Safety Certificate', 60, 70, 95, 'Certification'],
    ['Boiler Repair', 90, 110, 200, 'Boiler'],['Combi Boiler Installation', 360, 1600, 2600, 'Boiler'],
    ['Radiator Installation', 120, 160, 260, 'Heating'],['Leak Repair', 60, 85, 150, 'Repair'],
    ['Drain Unblocking', 60, 80, 140, 'Drainage'],['Bathroom Installation', 480, 900, 2200, 'Installation'],
    ['Emergency Callout', 60, 140, 220, 'Emergency'],['Power Flush', 240, 280, 420, 'Heating'],
  ],
  dental: [
    ['Check-up & Scale', 30, 60, 85, 'General'],['Hygienist Appointment', 45, 70, 95, 'Hygiene'],
    ['Composite Filling', 45, 95, 160, 'Restorative'],['Tooth Extraction', 30, 85, 160, 'Oral Surgery'],
    ['Crown Fitting', 90, 450, 650, 'Restorative'],['Root Canal Treatment', 90, 370, 520, 'Endodontic'],
    ['Teeth Whitening', 90, 220, 380, 'Cosmetic'],['Dental X-Rays', 20, 30, 55, 'Diagnostic'],
    ['Invisalign Consultation', 60, 0, 0, 'Orthodontics'],['Denture Fitting', 60, 580, 900, 'Prosthetics'],['Emergency Appointment', 30, 65, 95, 'Emergency'],
  ],
  physio: [
    ['Initial Assessment', 60, 75, 95, 'Assessment'],['Follow-up Treatment', 45, 60, 80, 'Treatment'],
    ['Sports Massage', 60, 55, 75, 'Massage'],['Dry Needling', 45, 60, 80, 'Specialist'],
    ['Ultrasound Therapy', 30, 45, 65, 'Therapy'],['Kinesiology Taping', 30, 40, 55, 'Taping'],
    ['Hydrotherapy', 60, 70, 90, 'Therapy'],['Post-Op Rehabilitation', 60, 75, 95, 'Rehab'],['Postural Assessment', 45, 60, 80, 'Assessment'],
  ],
  wellness: [
    ['1-2-1 Personal Training', 60, 50, 70, 'Training'],['Nutrition Consultation', 60, 60, 85, 'Nutrition'],
    ['Sports Massage', 60, 50, 70, 'Massage'],['Hot Stone Massage', 75, 65, 90, 'Massage'],
    ['Yoga Class', 60, 12, 18, 'Classes'],['Pilates Session', 60, 14, 20, 'Classes'],
    ['Meditation & Mindfulness', 45, 10, 15, 'Wellbeing'],['Reiki Healing', 60, 55, 75, 'Holistic'],['Indian Head Massage', 45, 42, 58, 'Massage'],
  ],
  fitness: [
    ['Personal Training — 1hr', 60, 45, 65, 'Training'],['Personal Training — 30min', 30, 28, 40, 'Training'],
    ['Fitness Assessment', 60, 35, 55, 'Assessment'],['Group Circuit Class', 45, 10, 15, 'Classes'],
    ['Spin Class', 45, 10, 14, 'Classes'],['Nutrition Coaching', 60, 55, 80, 'Nutrition'],
    ['Body Composition Analysis', 30, 30, 45, 'Assessment'],['Boxing/Pad Work', 60, 45, 65, 'Training'],
  ],
  recruitment: [
    ['Candidate Registration & Assessment', 60, 0, 0, 'Candidate'],['Client Discovery Meeting', 90, 0, 0, 'Client'],
    ['Interview Preparation', 45, 0, 0, 'Candidate'],['CV & Profile Review', 30, 0, 0, 'Candidate'],
    ['Salary Negotiation Briefing', 30, 0, 0, 'Candidate'],['Compliance & Reference Check', 60, 0, 0, 'Compliance'],
    ['Skills Assessment', 60, 0, 0, 'Assessment'],['Job Offer Debrief', 30, 0, 0, 'Candidate'],
  ],
  mortgage: [
    ['Initial Mortgage Consultation', 60, 0, 0, 'Consultation'],['Mortgage Application Meeting', 90, 495, 995, 'Application'],
    ['Remortgage Review', 60, 295, 495, 'Remortgage'],['First-Time Buyer Session', 90, 0, 0, 'Consultation'],
    ['Buy-to-Let Consultation', 60, 295, 495, 'BTL'],['Protection Insurance Review', 45, 0, 0, 'Protection'],['Annual Mortgage Review', 45, 0, 0, 'Review'],
  ],
  legal: [
    ['Initial Consultation', 60, 175, 250, 'Consultation'],['Contract Drafting — Review', 90, 280, 480, 'Commercial'],
    ['Conveyancing — Buyer Meeting', 90, 950, 1800, 'Property'],['Employment Dispute — Initial', 60, 180, 280, 'Employment'],
    ['Will & Lasting Power of Attorney', 90, 320, 550, 'Private Client'],['Landlord & Tenant Advice', 60, 175, 250, 'Property'],
    ['Business Formation', 60, 280, 450, 'Commercial'],['Dispute Resolution Briefing', 60, 195, 295, 'Litigation'],
  ],
  property: [
    ['Valuation Appointment', 60, 0, 0, 'Valuations'],['Buyer Viewing', 60, 0, 0, 'Sales'],
    ['Rental Viewing', 45, 0, 0, 'Lettings'],['Landlord Instruction Meeting', 60, 0, 0, 'Lettings'],
    ['Vendor Market Appraisal', 75, 0, 0, 'Sales'],['Tenancy Sign-Up', 60, 0, 0, 'Lettings'],
    ['Property Management Review', 45, 0, 0, 'Management'],['Investment Portfolio Review', 90, 0, 0, 'Investment'],
  ],
  landscaping: [
    ['Garden Design Consultation', 90, 120, 200, 'Design'],['Regular Lawn Maintenance', 120, 55, 90, 'Maintenance'],
    ['Garden Clearance', 240, 180, 350, 'Clearance'],['Hedge Trimming', 120, 65, 130, 'Maintenance'],
    ['Patio Design & Quote', 60, 0, 0, 'Design'],['Planting & Borders', 180, 150, 300, 'Planting'],
    ['Artificial Turf Installation', 480, 800, 2200, 'Installation'],['Tree Surgery Consultation', 60, 0, 0, 'Trees'],['Irrigation System Install', 240, 450, 900, 'Installation'],
  ],
  print_design: [
    ['Brand Design Consultation', 60, 85, 150, 'Design'],['Print Briefing', 90, 0, 0, 'Print'],
    ['Logo Design Session', 90, 180, 380, 'Design'],['Brochure Design & Proof', 60, 120, 280, 'Design'],
    ['Signage & Display Consultation', 60, 0, 0, 'Signage'],['Business Card Design', 45, 60, 120, 'Print'],
    ['Marketing Campaign Brief', 90, 0, 0, 'Marketing'],['Photography Brief', 60, 0, 0, 'Photography'],
  ],
  retail: [
    ['Personal Styling Session', 90, 0, 0, 'Styling'],['Kit Fitting & Measurement', 45, 0, 0, 'Fittings'],
    ['Team Kit Consultation', 90, 0, 0, 'Teams'],['Custom Order Appointment', 60, 0, 0, 'Custom'],
    ['Alteration Fitting', 30, 0, 0, 'Alterations'],['Sportswear Consultation', 60, 0, 0, 'Styling'],
  ],
  grooming: [
    ['Full Groom — Small Dog', 90, 35, 50, 'Grooming'],['Full Groom — Medium Dog', 120, 50, 70, 'Grooming'],
    ['Full Groom — Large Dog', 150, 65, 90, 'Grooming'],['Bath & Dry — Small', 60, 22, 32, 'Bathing'],
    ['Bath & Dry — Medium', 75, 30, 42, 'Bathing'],['Nail Trim', 20, 10, 15, 'Nails'],['Ear Cleaning', 20, 10, 15, 'Health'],['Puppy Introduction', 45, 20, 28, 'Puppy'],
  ],
  therapy: [
    ['Initial Assessment', 60, 80, 110, 'Assessment'],['CBT Session', 60, 80, 110, 'Therapy'],
    ['EMDR Session', 60, 90, 120, 'Therapy'],['Couples Counselling', 90, 120, 160, 'Therapy'],
    ['Anxiety & Stress Management', 60, 80, 110, 'Therapy'],['Bereavement Support', 60, 75, 100, 'Therapy'],['Child & Adolescent Therapy', 50, 75, 100, 'Therapy'],
  ],
  osteopathy: [
    ['Initial Assessment & Treatment', 60, 75, 95, 'Assessment'],['Follow-up Treatment', 45, 60, 78, 'Treatment'],
    ['Back Pain Consultation', 60, 75, 95, 'Specialist'],['Sports Injury Assessment', 60, 75, 95, 'Sports'],
    ['Pregnancy Osteopathy', 45, 65, 85, 'Specialist'],['Cranial Osteopathy', 45, 65, 85, 'Specialist'],
  ],
  locksmith: [
    ['Lock Replacement', 60, 80, 150, 'Security'],['Emergency Entry', 60, 120, 200, 'Emergency'],
    ['UPVC Door Lock Repair', 90, 100, 180, 'Repair'],['Key Cutting', 15, 8, 20, 'Keys'],
    ['Security Survey', 60, 0, 0, 'Survey'],['Safe Installation', 120, 200, 450, 'Security'],['Access Control Install', 180, 350, 800, 'Security'],
  ],
  restoration: [
    ['Damage Assessment', 90, 0, 0, 'Assessment'],['Water Damage Restoration', 480, 800, 3500, 'Water'],
    ['Fire Damage Assessment', 120, 0, 0, 'Fire'],['Mould Remediation', 240, 350, 1200, 'Remediation'],
    ['Structural Drying', 240, 450, 2000, 'Drying'],['Contents Restoration', 180, 300, 1500, 'Contents'],['Insurance Scope Meeting', 60, 0, 0, 'Admin'],
  ],
  bnb: [
    ['Check-In Appointment', 30, 0, 0, 'Operations'],['Room Consultation', 30, 0, 0, 'Operations'],
    ['Event Enquiry Meeting', 60, 0, 0, 'Events'],['Wedding Party Walkthrough', 90, 0, 0, 'Events'],
  ],
  finance: [
    ['Initial Financial Review', 60, 0, 0, 'Consultation'],['Investment Portfolio Meeting', 90, 0, 0, 'Investment'],
    ['Tax Planning Session', 60, 200, 400, 'Tax'],['Pension Review', 60, 0, 0, 'Pension'],
    ['Protection Needs Analysis', 45, 0, 0, 'Protection'],['Annual Client Review', 60, 0, 0, 'Review'],
  ],
  bridal: [
    ['Bridal Fitting — First', 90, 0, 0, 'Fittings'],['Bridal Fitting — Second', 60, 0, 0, 'Fittings'],
    ['Final Fitting', 45, 0, 0, 'Fittings'],['Bridesmaid Fitting', 60, 0, 0, 'Fittings'],
    ['Alteration Consultation', 45, 0, 0, 'Consultation'],['Veil & Accessories Fitting', 30, 0, 0, 'Accessories'],
  ],
  restaurant: [
    ['Private Dining Consultation', 60, 0, 0, 'Events'],['Birthday Party Booking', 45, 0, 0, 'Events'],
    ['Corporate Lunch Meeting', 60, 0, 0, 'Events'],['Tasting Session', 90, 0, 0, 'Tasting'],
  ],
}

const PROD = {
  hair: [
    ['Olaplex No.3 Hair Perfector 100ml','OLPX-3',28,14,'Treatments'],['Olaplex No.4 Bond Maintenance Shampoo','OLPX-4',26,13,'Shampoo'],
    ['Olaplex No.5 Bond Maintenance Conditioner','OLPX-5',26,13,'Conditioner'],['Kerastase Nutritive Masque 200ml','KER-NM',38,19,'Treatments'],
    ['Wella Colour Protect Shampoo 250ml','WEL-CP',18,8,'Shampoo'],['GHD Straight & Smooth Spray','GHD-SS',22,10,'Styling'],
    ['Schwarzkopf BC Moisture Kick Conditioner','SWK-MK',20,9,'Conditioner'],['Label.M Texturising Sea Salt Spray','LBL-SS',16,7,'Styling'],
    ['Tigi Bed Head Recovery Shampoo','TIGI-RS',14,6,'Shampoo'],['American Crew Pomade 85g','AC-PM',17,7,'Styling'],
  ],
  nail_beauty: [
    ['OPI Nail Polish — Classic Red','OPI-CR',14,6,'Nail Polish'],['Gelish Soak-Off Gel — Nude','GEL-NU',16,7,'Gel Polish'],
    ['CND Vinylux Weekly Polish','CND-VP',12,5,'Nail Polish'],['Sally Hansen Nail Hardener','SH-NH',9,4,'Nail Care'],
    ['Cuticle Oil Pen','CO-PEN',8,3,'Nail Care'],['Tanning Mitt & Solution Kit','TAN-KT',24,10,'Tanning'],['Tweezerman Brow Kit','TWZ-BK',28,12,'Brows'],
  ],
  beauty_clinic: [
    ['Dermalogica Skin Smoothing Cream','DML-SS',55,25,'Skincare'],['SkinCeuticals C E Ferulic Serum 30ml','SC-CEF',145,65,'Skincare'],
    ['Neostrata Gel Plus 6 AHA','NEO-GP',42,18,'Skincare'],['Aspect Dr Active C Serum','ASP-AC',68,30,'Skincare'],
    ['Crystal Clear Hydra Silk Moisturiser','CC-HS',38,16,'Skincare'],['Jane Iredale Pressed Powder','JI-PP',45,20,'Makeup'],
    ['Brow Shaping Kit','BRW-SK',22,9,'Brows'],['OPI Nail Polish Set — 4 Pack','OPI-4P',45,20,'Nails'],
  ],
  wellness: [
    ['Protein Shake — Vanilla 1kg','PRO-V1',28,14,'Nutrition'],['Essential Amino Acids 300g','EAA-300',24,11,'Nutrition'],
    ['Magnesium Glycinate 90 caps','MAG-GK',18,8,'Supplements'],['Yoga Mat — Non-Slip 6mm','YM-NS6',45,20,'Equipment'],
    ['Resistance Bands Set','RBS-3',16,7,'Equipment'],['Recovery Foam Roller','FR-REC',22,10,'Recovery'],
  ],
  fitness: [
    ['Whey Protein — Chocolate 2kg','WP-CH2',45,22,'Nutrition'],['Creatine Monohydrate 500g','CRE-500',18,8,'Supplements'],
    ['Pre-Workout Formula 300g','PWO-300',28,13,'Supplements'],['Gym Gloves — Medium','GG-M',14,6,'Accessories'],
    ['Resistance Bands Set of 5','RB-5',18,8,'Equipment'],['Foam Roller — High Density','FR-HD',24,10,'Recovery'],
    ['Protein Bars — Box of 12','PB-12',24,11,'Nutrition'],['Shaker Bottle 700ml','SHK-700',8,3,'Accessories'],
  ],
  grooming: [
    ['Pro Pet Shampoo — Sensitive 500ml','PPS-SN',14,6,'Shampoo'],['Finishing Spray — Glossy Coat','FS-GC',12,5,'Styling'],
    ['Nail File & Buffer Kit','NFB-KT',8,3,'Nail Care'],['Dog Cologne — Fresh Cotton','DC-FC',10,4,'Fragrance'],
    ['Ear Cleaning Drops 50ml','ECD-50',9,4,'Health'],['Deshedding Brush — Medium','DSH-M',18,8,'Brushes'],
  ],
  dental: [
    ['Philips Sonicare DiamondClean Heads x4','SON-H4',24,11,'Oral Care'],['Oral-B Pro Replacement Heads x4','OB-H4',18,8,'Oral Care'],
    ['Corsodyl Mouthwash 500ml','COR-MW',9,4,'Mouthwash'],['Arm & Hammer Whitening Paste','AH-WP',6,2,'Toothpaste'],
    ['TePe Interdental Brushes — Mixed Pack','TEP-MX',7,3,'Cleaning'],['Whitening Strips — 14 Day','WS-14',32,14,'Whitening'],
  ],
}

const CLIENTS = {
  hair: ['Sophie Hawkins','Emma Richardson','Natalie Booth','Charlotte Price','Lauren Simmons','Olivia Marshall','Chloe Evans','Grace Bennett','Megan Clarke','Rebecca Foster','Hannah Wright','Lucy Harrison','Sarah Thompson','Amy Collins','Kate Morrison','Laura Hughes','Zara Ahmed','Isla McKenzie','Fiona Baxter','Diana Romano'],
  nail_beauty: ['Sophie Hawkins','Emma Watson','Natalie Cole','Charlotte Moss','Lauren Scott','Olivia King','Chloe Green','Grace Owen','Megan Turner','Rebecca Hall','Hannah Fox','Lucy Hart','Sarah James','Amy Blake','Kate Day'],
  beauty_clinic: ['Victoria Chen','Amelia Stone','Isabelle Park','Natasha Grey','Jennifer Walsh','Caroline Hunt','Harriet Reed','Rosalind Shaw','Constance Bell','Philippa Dean','Arabella Cross','Serena Flynn','Penelope Ward','Clarissa Hope','Beatrice Fields'],
  cleaning: ['BrightSpace Properties','Metro Office Management','Thornton Holdings','Apex Commercial Ltd','Oakfield Investments','Central Business Park','Phoenix Estates','Landmark Offices Ltd','City Centre Developments','Riverside Business Centre','Enterprise House Ltd','Summit Commercial','Parkview Offices','Midlands Business Hub','Citygate Properties'],
  electrical: ['Harrington Construction','Oakfield Properties','Metro Developments','Thornton Build Ltd','Premier Contractors','Citygate Commercial','Apex Holdings','Summit Projects','Central Developments','Landmark Build','Phoenix Construction','Urban Developments Ltd','Heritage Properties','Milestone Construction','Gateway Projects'],
  plumbing: ['Mark Davidson','Paul Hendricks','Andrew Morrison','Brian Collins','Kevin Stewart','Mike Farrell','Jonathan Blake','Richard Owen','Thomas Hughes','Gary Preston','Neil Barker','Chris Morton','Alan Webb','Barry Fletcher','Simon Hayes'],
  dental: ['Emma Clarke','James Patel','Sarah Johnson','Michael Brown','Chloe Davies','David Wilson','Lucy Anderson','Robert Taylor','Hannah White','George Martin','Poppy Harris','William Jones','Lily Thompson','Harry Evans','Amelia Roberts','Oliver Hughes','Sophie Turner','Noah Walker','Charlotte Mitchell','Ethan Phillips'],
  physio: ['James Lawson','Sarah Park','Michael Torres','Emma Briggs','Daniel Frost','Rebecca Saunders','Chris Barlow','Natasha Cole','Steve Fletcher','Diana Holt','Paul Quinn','Laura Sherwood','Tom Rigby','Jessica Wren','Mark Stafford','Anita Mehta'],
  wellness: ['Sophie Adams','Tom Barker','Emma Carey','James Dixon','Natalie Ellis','Luke Foster','Grace Harris','Ben Jackson','Lucy King','Matt Lewis','Chloe Miller','Jack Newton','Olivia Park','Ryan Quinn','Ava Reid','Sam Stone','Zoe Turner','Alex Webb','Isla Young','Daniel Zane'],
  fitness: ['Jake Harrison','Connor Walsh','Liam O\'Brien','Ryan Matthews','Josh Perkins','Tom Sinclair','Ben Wheeler','Kieran Fox','Sam Collins','Dan Murphy','Luke Patterson','Chris Rhodes','Alex Stone','Owen Taylor','Harry Ward','Ben Williamson'],
  recruitment: ['Marcus Flynn','Sarah Okafor','Daniel Hughes','Rebecca Morris','James Park','Natasha Lawson','Owen Davis','Fiona Cheng','Philip Watson','Kezia Ahmed','Christopher Reed','Helen Burke','Steven Lam','Diana Sloane','Trevor Cole','Amanda Forsyth'],
  mortgage: ['Sarah & David Collins','James & Emma Wright','Tom & Lucy Hargreaves','Mr & Mrs Pemberton','Daniel Thompson','Rebecca & Paul Marsh','Owen & Claire Foster','Michelle Kaur','Gary & Susan Taylor','Ian Patterson','Rachel & Steve Morris','Karen & Phil Newton'],
  legal: ['Harrison Logistics Ltd','Thornton & Sons Ltd','Mrs Patricia Wren','Apex Ventures Ltd','Daniel Forsyth','Crown Investments Ltd','Rebecca Hartley','Midlands Property Group','Scott & Partners','Citygate Holdings','Pemberton Estate','Taylor Industrial Ltd'],
  property: ['James & Sarah Cavendish','Owen Fletcher','Apex Investments Ltd','Mr & Mrs Davidson','Thornton Holdings','Rebecca Park','Central Property Fund','Matt & Claire Harrison','Urban Ventures Ltd','Philip Stone','Landmark Estates','Sarah Walsh'],
  landscaping: ['Mr A Davidson','Mrs P Sherwood','Dr J Walsh','Mr & Mrs Fletcher','Mr B Harrison','Mrs K Moore','Mr T Griffiths','Mrs S Cole','Mr G Barker','Mrs L Hammond','Mr R Adams','Mrs F Wilson','Mr A Taylor','Mrs C Jones','Mr S Park'],
  print_design: ['Apex Brands Ltd','Morrison & Co','Sunrise Events','Thornton Property','Peak Performance Ltd','Citygate Marketing','Heritage Foods','Atlas Logistics','Premier Build Ltd','Venture Capital UK'],
  retail: ['Apex FC','Thornton Athletic Club','Morrison Schools Ltd','City Basketball Club','Peak CrossFit','Sunrise Sports Academy','Urban Running Club','Premier Cycling','Local Cricket Club','Regional Hockey Federation'],
  grooming: ['Bella (Cockapoo)','Max (Golden Retriever)','Poppy (Labradoodle)','Charlie (Spaniel)','Daisy (Bichon Frise)','Buddy (Dachshund)','Molly (Schnauzer)','Archie (Border Collie)','Rosie (French Bulldog)','Oscar (Shih Tzu)','Luna (Maltese)','Bruno (Boxer)','Tilly (Poodle)','Monty (Beagle)','Lola (Yorkshire Terrier)'],
  therapy: ['J.W.','M.T.','K.R.','L.B.','P.H.','A.S.','D.F.','C.N.','E.M.','R.O.','H.K.','B.L.','G.P.','V.D.','T.W.'],
  osteopathy: ['Daniel Morris','Sarah Hall','James Tucker','Emma Collins','Robert Kay','Natasha Bright','Chris Evans','Julie Slade','Mark Bennett','Helen Cross','Tom Wren','Lisa Moore','Paul Dobson','Chloe Hammond'],
  locksmith: ['Mrs P Holden','Mr T Davies','Apex Offices Ltd','Mrs A Chen','Mr B Morton','Thornton Properties','Mrs C Grant','Mr D Walton','Heritage Hotel Ltd','Mrs E Brooks','Mr F Harris','Citygate Flats Ltd'],
  restoration: ['Mr D Holden Insurance Claim','Mrs A Barker — Water','Premier Properties Ltd','Thornton Holdings Fire','Mrs C Walsh — Flood','Apex Commercial — Water','Heritage Hotel — Mould','Mrs E Park — Flood','Mr G Stone — Fire','Citygate Ltd — Water'],
  bnb: ['Mr & Mrs Bennett','Smith Family','The Williams Party','Miss K Chandra','Corporate Booking — Apex','Mr & Mrs Park','The Johnson Family','Miss P Santos','Mr A Davies','Corporate — Citygate Ltd'],
  finance: ['Mr & Mrs Harrison','David Lloyd','The Morrison Partnership','Sarah Cheng','James & Anna Forsyth','Thornton Investments','Mr P Gray','Webb Enterprises','Mrs L Kapur','The Davies Trust'],
  bridal: ['Miss E Morrison (Oct 2026)','Miss C Fletcher (Aug 2026)','Miss R Khan (Jul 2026)','Miss P Davidson (Sep 2026)','Miss A Stone (Dec 2026)','Miss T Cole (Nov 2026)','Miss J Park (Oct 2026)'],
  restaurant: ['The Harrison Party','Wedding Enquiry — Smith','Corporate — Apex Ltd','The Cole Family','Private Dining — Morrison'],
}

// historyWeeks and futureWeeks (shorter than full seed to stay within Vercel timeout)
const QUAL = {
  excellent:  { density: 0.78, cancelRate: 0.05, noShowRate: 0.02, onlineRate: 0.35, historyWeeks: 18, futureWeeks: 8, gap: 10 },
  good:       { density: 0.63, cancelRate: 0.08, noShowRate: 0.04, onlineRate: 0.22, historyWeeks: 12, futureWeeks: 6, gap: 10 },
  average:    { density: 0.47, cancelRate: 0.13, noShowRate: 0.07, onlineRate: 0.14, historyWeeks: 10, futureWeeks: 4, gap: 10 },
  poor:       { density: 0.28, cancelRate: 0.21, noShowRate: 0.12, onlineRate: 0.05, historyWeeks: 6,  futureWeeks: 2, gap: 15 },
  struggling: { density: 0.15, cancelRate: 0.30, noShowRate: 0.16, onlineRate: 0.02, historyWeeks: 4,  futureWeeks: 1, gap: 30 },
}

const TENANT_CFG = {
  'Bloom & Co Hair & Beauty':             { type: 'hair',         qual: 'excellent', openDays: [2,3,4,5,6], openHour: 9,  closeHour: 18 },
  'The Style Collective':                 { type: 'hair',         qual: 'poor',      openDays: [2,3,4,5,6], openHour: 9,  closeHour: 17 },
  'Elegant Hair Design':                  { type: 'hair',         qual: 'poor',      openDays: [1,2,3,4,5], openHour: 9,  closeHour: 17 },
  'Meridian Hair & Beauty':               { type: 'hair',         qual: 'average',   openDays: [2,3,4,5,6], openHour: 9,  closeHour: 18 },
  'Riverside Salon':                      { type: 'hair',         qual: 'average',   openDays: [2,3,4,5,6], openHour: 9,  closeHour: 18 },
  'Radiant Beauty Clinic':                { type: 'beauty_clinic',qual: 'good',      openDays: [2,3,4,5,6], openHour: 9,  closeHour: 18 },
  "Jennings Nail & Beauty Studio":        { type: 'nail_beauty',  qual: 'struggling',openDays: [2,3,4,5,6], openHour: 9,  closeHour: 17 },
  "Sarah's Beauty Studio":                { type: 'nail_beauty',  qual: 'struggling',openDays: [2,3,4,5],   openHour: 9,  closeHour: 17 },
  'Paws & Claws Dog Grooming':            { type: 'grooming',     qual: 'poor',      openDays: [1,2,3,4,5,6],openHour: 8, closeHour: 17 },
  'Apex Commercial Cleaning':             { type: 'cleaning',     qual: 'good',      openDays: [1,2,3,4,5], openHour: 7,  closeHour: 17 },
  'Bright Cleaning Co':                   { type: 'cleaning',     qual: 'poor',      openDays: [1,2,3,4,5], openHour: 7,  closeHour: 16 },
  'Apex Electrical Services':             { type: 'electrical',   qual: 'good',      openDays: [1,2,3,4,5], openHour: 8,  closeHour: 17 },
  'Highfield Electrical':                 { type: 'electrical',   qual: 'average',   openDays: [1,2,3,4,5], openHour: 8,  closeHour: 17 },
  'Swift Electrical':                     { type: 'electrical',   qual: 'poor',      openDays: [1,2,3,4,5,6],openHour: 8, closeHour: 17 },
  'Whitmore Electrical Services':         { type: 'electrical',   qual: 'poor',      openDays: [1,2,3,4,5], openHour: 8,  closeHour: 16 },
  'Hargreaves Plumbing':                  { type: 'plumbing',     qual: 'good',      openDays: [1,2,3,4,5,6],openHour: 7, closeHour: 17 },
  "Dave's Plumbing":                      { type: 'plumbing',     qual: 'struggling',openDays: [1,2,3,4,5], openHour: 8,  closeHour: 17 },
  "Henderson's Plumbing":                 { type: 'plumbing',     qual: 'struggling',openDays: [1,2,3,4,5], openHour: 8,  closeHour: 17 },
  'Haverford Dental Practice':            { type: 'dental',       qual: 'average',   openDays: [1,2,3,4,5], openHour: 8,  closeHour: 17 },
  'Lakeside Dental':                      { type: 'dental',       qual: 'good',      openDays: [1,2,3,4,5], openHour: 8,  closeHour: 18 },
  'Restore Physiotherapy':                { type: 'physio',       qual: 'average',   openDays: [1,2,3,4,5], openHour: 8,  closeHour: 18 },
  'Thornton Physiotherapy & Sports Rehab':{ type: 'physio',       qual: 'good',      openDays: [1,2,3,4,5,6],openHour: 7, closeHour: 19 },
  'Oak Tree Therapy':                     { type: 'therapy',      qual: 'average',   openDays: [1,2,3,4,5], openHour: 9,  closeHour: 18 },
  'Westfield Osteopathy':                 { type: 'osteopathy',   qual: 'average',   openDays: [1,2,3,4,5], openHour: 8,  closeHour: 17 },
  'Harmony Wellness Centre':              { type: 'wellness',     qual: 'good',      openDays: [1,2,3,4,5,6],openHour: 8, closeHour: 20 },
  'Peak Performance Gym':                 { type: 'fitness',      qual: 'good',      openDays: [1,2,3,4,5,6],openHour: 6, closeHour: 21 },
  'Clarity Yoga & Wellbeing Studio':      { type: 'wellness',     qual: 'struggling',openDays: [1,2,3,4,5,6],openHour: 7, closeHour: 20 },
  'luminoo welness ':                     { type: 'wellness',     qual: 'struggling',openDays: [2,3,4,5,6], openHour: 9,  closeHour: 18 },
  'Nationwide Recruitment':               { type: 'recruitment',  qual: 'excellent', openDays: [1,2,3,4,5], openHour: 8,  closeHour: 18 },
  'Sterling Recruitment':                 { type: 'recruitment',  qual: 'average',   openDays: [1,2,3,4,5], openHour: 9,  closeHour: 17 },
  'Premier Mortgage Solutions':           { type: 'mortgage',     qual: 'average',   openDays: [1,2,3,4,5], openHour: 9,  closeHour: 17 },
  'Capital Mortgage Advisers':            { type: 'mortgage',     qual: 'struggling',openDays: [1,2,3,4,5], openHour: 9,  closeHour: 17 },
  'Webb Financial Solutions':             { type: 'finance',      qual: 'poor',      openDays: [1,2,3,4,5], openHour: 9,  closeHour: 17 },
  'Williams & Associates LLP':            { type: 'legal',        qual: 'average',   openDays: [1,2,3,4,5], openHour: 9,  closeHour: 17 },
  'Meridian Property Group':              { type: 'property',     qual: 'excellent', openDays: [1,2,3,4,5,6],openHour: 9, closeHour: 18 },
  'Greenfield Landscape Gardening':       { type: 'landscaping',  qual: 'good',      openDays: [1,2,3,4,5,6],openHour: 7, closeHour: 17 },
  "Tom's Landscaping & Garden Design":    { type: 'landscaping',  qual: 'struggling',openDays: [1,2,3,4,5], openHour: 8,  closeHour: 17 },
  'The Garden Studio':                    { type: 'landscaping',  qual: 'struggling',openDays: [2,3,4,5,6], openHour: 9,  closeHour: 16 },
  'Apex Print & Design':                  { type: 'print_design', qual: 'average',   openDays: [1,2,3,4,5], openHour: 9,  closeHour: 17 },
  'JB Sports & Fashion':                  { type: 'retail',       qual: 'good',      openDays: [1,2,3,4,5,6],openHour: 9, closeHour: 18 },
  'Central Locksmith Ltd':                { type: 'locksmith',    qual: 'poor',      openDays: [1,2,3,4,5,6],openHour: 8, closeHour: 18 },
  'Blackwood Restoration':                { type: 'restoration',  qual: 'good',      openDays: [1,2,3,4,5], openHour: 8,  closeHour: 17 },
  'Valley View B&B':                      { type: 'bnb',          qual: 'average',   openDays: [0,1,2,3,4,5,6],openHour: 10,closeHour: 20 },
  "Sarah's Bridal Alterations":           { type: 'bridal',       qual: 'average',   openDays: [2,3,4,5,6], openHour: 10, closeHour: 17 },
  'Blue Lotus Indian Restaurant':         { type: 'restaurant',   qual: 'poor',      openDays: [2,3,4,5,6,0],openHour: 12, closeHour: 22 },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantId, ownerEmail } = req.body || {}
  if (ownerEmail !== OWNER_EMAIL) return res.status(403).json({ error: 'Forbidden' })
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

  try {
  // Get tenant
  const { data: tenant } = await supabase.from('tenants').select('business_name').eq('id', tenantId).maybeSingle()
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' })

  const cfg = TENANT_CFG[tenant.business_name]
  if (!cfg) return res.status(200).json({ ok: true, skipped: true, reason: `No config for: ${tenant.business_name}` })

  // Get staff
  const { data: staff } = await supabase.from('staff_profiles').select('id, name').eq('tenant_id', tenantId)
  if (!staff?.length) return res.status(200).json({ ok: true, skipped: true, reason: 'No staff' })

  const qual = QUAL[cfg.qual]
  const svcTemplate = SVC[cfg.type] || SVC.wellness
  const prodTemplate = PROD[cfg.type] || null
  const clientPool = CLIENTS[cfg.type] || CLIENTS.wellness

  // Delete existing data
  await supabase.from('appointments').delete().eq('tenant_id', tenantId)
  await supabase.from('catalogue_items').delete().eq('tenant_id', tenantId)

  // Insert services
  const services = svcTemplate.map(([name, dur, pf, pt, cat]) => ({
    id: uid(), tenant_id: tenantId, item_type: 'service', name,
    duration_minutes: dur, price_from: pf, price_to: pt, category: cat, active: true,
  }))
  await supabase.from('catalogue_items').insert(services)

  // Insert products
  let productCount = 0
  if (prodTemplate) {
    const products = prodTemplate.map(([name, sku, pf, cp, cat]) => ({
      id: uid(), tenant_id: tenantId, item_type: 'product', name, sku,
      price_from: pf, price_to: pf, cost_price: cp, category: cat, active: true,
    }))
    await supabase.from('catalogue_items').insert(products)
    productCount = products.length
  }

  // Generate appointments
  const TODAY = new Date()
  TODAY.setHours(0, 0, 0, 0)
  const histStart = new Date(TODAY)
  histStart.setDate(histStart.getDate() - qual.historyWeeks * 7)
  const futureEnd = new Date(TODAY)
  futureEnd.setDate(futureEnd.getDate() + qual.futureWeeks * 7)

  const appts = []
  for (let d = new Date(histStart); d <= futureEnd; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    if (!cfg.openDays.includes(dow)) continue

    for (const staffMember of staff) {
      let mins = cfg.openHour * 60
      const closeMins = cfg.closeHour * 60

      while (mins < closeMins - 30) {
        if (Math.random() > qual.density) { mins += 30; continue }
        const svc = pick(services)
        const dur = svc.duration_minutes
        if (mins + dur > closeMins) break
        const client = pick(clientPool)
        const start = new Date(d)
        const month = start.getMonth()
        const utcOffset = (month >= 2 && month <= 9) ? 1 : 0
        const startMins = mins - utcOffset * 60
        start.setUTCHours(Math.floor(startMins / 60), startMins % 60, 0, 0)
        const end = new Date(start.getTime() + dur * 60000)
        const isPast = start < TODAY
        let status
        if (isPast) {
          const r = Math.random()
          status = r < qual.cancelRate ? 'cancelled' : r < qual.cancelRate + qual.noShowRate ? 'no_show' : 'completed'
        } else {
          status = Math.random() < 0.68 ? 'confirmed' : 'provisional'
        }
        appts.push({
          id: uid(), tenant_id: tenantId, staff_profile_id: staffMember.id, service_id: svc.id,
          client_name: client, title: `${svc.name} — ${client}`, appointment_type: svc.name,
          start_time: start.toISOString(), end_time: end.toISOString(), status,
          created_from: !isPast && Math.random() < qual.onlineRate ? 'customer_booking' : null,
        })
        mins += dur + qual.gap
      }
    }
  }

  // Insert appointments in batches
  const BATCH = 300
  for (let i = 0; i < appts.length; i += BATCH) {
    await supabase.from('appointments').insert(appts.slice(i, i + BATCH))
  }

  return res.status(200).json({ ok: true, services: services.length, products: productCount, appointments: appts.length })
  } catch (err) {
    console.error('[ground-zero] unhandled error:', err)
    return res.status(500).json({ error: 'Internal server error', message: err.message })
  }
}
