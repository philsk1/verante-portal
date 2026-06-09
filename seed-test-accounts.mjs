/**
 * seed-test-accounts.mjs
 * Creates 10 real Supabase auth accounts covering every product/tier/config variation.
 * Run: node seed-test-accounts.mjs
 * Password for all accounts: Qerxel2026!
 *
 * Accounts created:
 *  1. test-newuser@qerxel.app        Light, fresh start, minimal data
 *  2. test-light@qerxel.app          Light, SMS on, booking link, 1 staff
 *  3. test-standard@qerxel.app       Standard, 2 staff + DIDs, 3 partners, provisional booking
 *  4. test-overage@qerxel.app        Standard, near minute limit (235/250 used)
 *  5. test-holiday@qerxel.app        Standard, holiday mode ON
 *  6. test-professional@qerxel.app   Professional, Calendar multi, 4 staff, full features
 *  7. test-sensitive@qerxel.app      Professional + Listen, solicitor (sensitive), minimal capture
 *  8. test-enterprise@qerxel.app     Enterprise, Listen + Calendar multi, 6 staff, full stack
 *  9. test-payg@qerxel.app           PAYG / Free tier, cost limit set
 * 10. test-listen@qerxel.app         Standard + Listen, transcripts visible
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kkrsvkxkefijmtbwykzv.supabase.co'
const SERVICE_KEY  = 'sb_secret_DY3gYbhNJuncwHjPGdjOPA_mZi1GJfZ'
const PASSWORD     = 'Qerxel2026!'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── helpers ──────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID()

// UK mobile-style numbers — each account gets its own prefix block so no collisions
let phoneSeq = 7700900100
const phone = () => `+447700${String(phoneSeq++).padStart(6, '0')}`

const daysAgo = (n, jitterHours = 0) => {
  const d = new Date(Date.now() - n * 86400000 - jitterHours * 3600000)
  return d.toISOString()
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const OUTCOMES = ['lead_captured', 'lead_captured', 'lead_captured', 'enquiry_handled', 'enquiry_handled',
                  'referred_out', 'filtered_spam', 'no_action', 'escalated', 'booked']

const BOOKING_OUTCOMES = ['booked', 'booked', 'lead_captured', 'enquiry_handled', 'referred_out',
                          'escalated', 'filtered_spam', 'no_action', 'enquiry_handled', 'booked']

function makeCallData(tenantId, callerIds, count, outcomesPool, daysRange = 30) {
  return Array.from({ length: count }, (_, i) => ({
    id:               uuid(),
    tenant_id:        tenantId,
    caller_id:        callerIds[i % callerIds.length],
    caller_phone:     null,
    duration_seconds: 30 + Math.floor(Math.random() * 210),
    call_outcome:     pick(outcomesPool),
    ai_summary:       pick(AI_SUMMARIES),
    transcript:       null,
    callback_flagged: Math.random() < 0.08,
    created_at:       daysAgo(Math.floor(Math.random() * daysRange), Math.random() * 20),
  }))
}

function makeLeads(tenantId, calls) {
  return calls
    .filter(c => c.call_outcome === 'lead_captured' || c.call_outcome === 'booked')
    .map(c => ({
      id:               uuid(),
      tenant_id:        tenantId,
      caller_id:        c.caller_id,
      call_log_id:      c.id,
      lead_contact_name: pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES),
      ai_summary:       c.ai_summary,
      status:           pick(['new', 'new', 'contacted', 'converted', 'lost']),
      created_at:       c.created_at,
    }))
}

function makeCallers(n) {
  return Array.from({ length: n }, () => ({
    id:           uuid(),
    phone_number: phone(),
    full_name:    pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES),
  }))
}

const AI_SUMMARIES = [
  'Caller enquired about availability for next week. Interested in a quote for a full job.',
  'Prospective customer asked about pricing and turnaround time. Wants a callback tomorrow.',
  'Caller requested information about the service range. Sounded keen — follow up recommended.',
  "Enquiry about a repeat booking. Previous customer. Mentioned they'd heard good things.",
  'Asked specifically about weekend availability. Budget appears strong.',
  'Caller had a time-sensitive need. Requested urgent callback within 2 hours.',
  'General pricing enquiry. Comparing options but showed clear interest.',
  'New business lead — asked about contract or retainer options.',
  'Caller wants to book a consultation. Said they found us via Google.',
  'Asked about team availability for a larger project. High-value potential.',
]

const FIRST_NAMES = ['James','Sarah','Oliver','Emily','Harry','Charlotte','George','Amelia','Jack','Sophia','Thomas','Grace','Daniel','Lucy','William','Ella','Robert','Hannah','Edward','Poppy','Michael','Zoe','Alexander','Alice','Benjamin','Lily','Charlie','Chloe','Sam','Mia']
const LAST_NAMES  = ['Smith','Jones','Taylor','Brown','Williams','Wilson','Johnson','Davies','Robinson','Clarke','Wright','Thompson','Walker','White','Harrison','Martin','Jackson','Wood','Green','Hall','Hughes','Lewis','Harris','Clarke','Patel','Turner','Hill','Cooper','Morris','Ward']

// ── account definitions ───────────────────────────────────────────────────────

const ACCOUNTS = [

  // ── 1. New user — Light, fresh start ────────────────────────────────────────
  {
    email: 'test-newuser@qerxel.app',
    tenant: {
      business_name:         'Tom\'s Landscaping & Garden Design',
      business_email:        'test-newuser@qerxel.app',
      business_phone:        '+441234567890',
      subscription_tier:     'light',
      billing_model:         'subscription',
      included_minutes:      120,
      listen_tier:           'none',
      calendar_tier:         'entry',
      triage_mode:           'balanced',
      tone_register:         'warm',
      business_outcome_type: 'callback',
      escalation_preference: 'escalate',
      spam_filter_enabled:   true,
      sales_call_handling:   true,
      urgent_callback_mins:  60,
      urgent_escalation_method: 'both',
      urgent_outcomes:       ['escalated'],
      sms_followup_enabled:  false,
      notify_new_lead:       true,
      notify_daily_summary:  true,
      notify_weekly_report:  true,
      data_retention_days:   90,
      referral_code:         'TOMSGARDEN',
      overage_voice_preference: 'standard',
    },
    callerCount: 6,
    callCount:   8,
    outcomesPool: OUTCOMES,
    partners: [],
    staff: [],
    catalogue: [],
    banned: [],
  },

  // ── 2. Light — bridal alterations, SMS on, booking link ─────────────────────
  {
    email: 'test-light@qerxel.app',
    tenant: {
      business_name:         'Sarah\'s Bridal Alterations',
      business_email:        'test-light@qerxel.app',
      business_phone:        '+441612345678',
      subscription_tier:     'light',
      billing_model:         'subscription',
      included_minutes:      120,
      listen_tier:           'none',
      calendar_tier:         'entry',
      triage_mode:           'balanced',
      tone_register:         'warm',
      business_outcome_type: 'booking',
      booking_link:          'https://calendly.com/sarahsbridal',
      escalation_preference: 'escalate',
      spam_filter_enabled:   true,
      sales_call_handling:   true,
      urgent_callback_mins:  120,
      urgent_escalation_method: 'sms',
      urgent_outcomes:       ['escalated'],
      sms_followup_enabled:  true,
      sms_followup_message:  'Hi, thanks for calling Sarah\'s Bridal. We\'ll be in touch soon to arrange your fitting.',
      notify_new_lead:       true,
      notify_daily_summary:  true,
      notify_weekly_report:  true,
      data_retention_days:   90,
      referral_code:         'SARAHBRIDAL',
      overage_voice_preference: 'standard',
    },
    callerCount: 30,
    callCount:   45,
    outcomesPool: BOOKING_OUTCOMES,
    partners: [
      { partner_name: 'Ivory & Lace Bridal Boutique',  contact_phone: '+441612345001', specialty: 'Wedding dresses and accessories' },
      { partner_name: 'Perfect Day Wedding Florist',   contact_phone: '+441612345002', specialty: 'Bridal flowers and venue styling' },
    ],
    staff: [
      { name: 'Jenny Walters', role: 'Senior Seamstress', phone: '+441612345101', colour: '#7c3aed', active: true },
    ],
    catalogue: [
      { item_type: 'service', name: 'Dress Fitting & Alterations', description: 'Full bridal gown fitting with up to 3 alteration rounds', price_from: 120, price_to: 350, duration_minutes: 90 },
      { item_type: 'service', name: 'Bridesmaid Dress Alterations', description: 'Per dress alterations for bridesmaid party', price_from: 45, price_to: 120, duration_minutes: 60 },
      { item_type: 'service', name: 'Rush Alteration (7 days)', description: 'Priority service for urgent alterations', price_from: 150, price_to: 450, duration_minutes: 90 },
    ],
    banned: [],
  },

  // ── 3. Standard — electrical, 2 staff + DIDs, 3 partners, provisional booking ─
  {
    email: 'test-standard@qerxel.app',
    tenant: {
      business_name:             'Whitmore Electrical Services',
      business_email:            'test-standard@qerxel.app',
      business_phone:            '+441132345678',
      subscription_tier:         'standard',
      billing_model:             'subscription',
      included_minutes:          250,
      listen_tier:               'none',
      calendar_tier:             'entry',
      triage_mode:               'balanced',
      tone_register:             'professional',
      business_outcome_type:     'quote',
      escalation_preference:     'escalate',
      spam_filter_enabled:       true,
      sales_call_handling:       true,
      urgent_callback_mins:      30,
      urgent_escalation_method:  'call',
      urgent_outcomes:           ['escalated', 'booked'],
      emergency_keywords:        ['gas leak', 'sparking', 'no power', 'burning smell', 'flooding'],
      sms_followup_enabled:      true,
      sms_followup_message:      'Thanks for calling Whitmore Electrical. We\'ll get back to you with a quote shortly.',
      provisional_booking_enabled: true,
      provisional_booking_rule:  'Offer a provisional slot if the caller describes a clear fault or installation need and is available within 5 working days.',
      booking_slots_to_offer:    2,
      booking_buffer_mins:       60,
      notify_new_lead:           true,
      notify_daily_summary:      true,
      notify_weekly_report:      true,
      data_retention_days:       90,
      referral_code:             'WHITMORELEC',
      overage_voice_preference:  'premium',
    },
    callerCount: 40,
    callCount:   95,
    outcomesPool: OUTCOMES,
    partners: [
      { partner_name: 'Premier Plumbing & Heating',    contact_phone: '+441132345001', specialty: 'Plumbing and gas central heating' },
      { partner_name: 'Citywide Building Contractors', contact_phone: '+441132345002', specialty: 'General building and renovation' },
      { partner_name: 'SafeSpark Solar Installations', contact_phone: '+441132345003', specialty: 'Solar panel installation and EV chargers' },
    ],
    staff: [
      { name: 'James Whitmore', role: 'Director & Lead Electrician', phone: '+441132345101', direct_line_did: '+441132111001', colour: '#1d4ed8', active: true },
      { name: 'Craig Foster',   role: 'Qualified Electrician',       phone: '+441132345102', direct_line_did: '+441132111002', colour: '#059669', active: true },
    ],
    catalogue: [
      { item_type: 'service', name: 'Fault Finding & Repair',           price_from: 85,   price_to: 250,  duration_minutes: 60  },
      { item_type: 'service', name: 'Consumer Unit Replacement',        price_from: 450,  price_to: 800,  duration_minutes: 240 },
      { item_type: 'service', name: 'EV Charger Installation',          price_from: 650,  price_to: 1100, duration_minutes: 180 },
      { item_type: 'service', name: 'Periodic Electrical Inspection',   price_from: 180,  price_to: 350,  duration_minutes: 120 },
      { item_type: 'service', name: 'Emergency Callout',                price_from: 120,  price_to: 350,  duration_minutes: 60  },
    ],
    banned: ['Plumbing', 'Gas work', 'Boiler installation', 'CCTV installation'],
  },

  // ── 4. Standard — near minute limit (235 / 250 min used) ────────────────────
  {
    email: 'test-overage@qerxel.app',
    tenant: {
      business_name:         'Capital Mortgage Advisers',
      business_email:        'test-overage@qerxel.app',
      business_phone:        '+442012345678',
      subscription_tier:     'standard',
      billing_model:         'subscription',
      included_minutes:      250,
      listen_tier:           'none',
      calendar_tier:         'entry',
      triage_mode:           'open',
      tone_register:         'professional',
      business_outcome_type: 'quote',
      escalation_preference: 'escalate',
      spam_filter_enabled:   true,
      sales_call_handling:   false,
      urgent_callback_mins:  60,
      urgent_escalation_method: 'email',
      urgent_outcomes:       ['escalated'],
      sms_followup_enabled:  false,
      notify_new_lead:       true,
      notify_daily_summary:  true,
      notify_weekly_report:  true,
      data_retention_days:   90,
      referral_code:         'CAPITALMORT',
      overage_voice_preference: 'standard',
    },
    callerCount: 25,
    callCount:   55,
    // Long calls — mortgage consultations. Force high duration in overrides below.
    outcomesPool: OUTCOMES,
    forceHighDuration: true,   // flag handled below
    partners: [
      { partner_name: 'Meridian Estate Agents',  contact_phone: '+442012345001', specialty: 'Property sales and lettings' },
      { partner_name: 'Heritage Conveyancing',   contact_phone: '+442012345002', specialty: 'Residential conveyancing' },
    ],
    staff: [],
    catalogue: [
      { item_type: 'service', name: 'First-Time Buyer Consultation', price_from: 0,   price_to: 0,    duration_minutes: 60  },
      { item_type: 'service', name: 'Remortgage Advice',             price_from: 0,   price_to: 0,    duration_minutes: 45  },
      { item_type: 'service', name: 'Buy-to-Let Mortgage Review',    price_from: 495, price_to: 995,  duration_minutes: 60  },
    ],
    banned: [],
  },

  // ── 5. Standard — holiday mode ON ───────────────────────────────────────────
  {
    email: 'test-holiday@qerxel.app',
    tenant: {
      business_name:         'Blue Lotus Indian Restaurant',
      business_email:        'test-holiday@qerxel.app',
      business_phone:        '+441512345678',
      subscription_tier:     'standard',
      billing_model:         'subscription',
      included_minutes:      250,
      listen_tier:           'none',
      calendar_tier:         'entry',
      triage_mode:           'balanced',
      tone_register:         'warm',
      business_outcome_type: 'booking',
      booking_link:          'https://bluelotus-restaurant.co.uk/book',
      escalation_preference: 'hard_close',
      spam_filter_enabled:   true,
      sales_call_handling:   true,
      holiday_mode:          true,
      holiday_return_date:   '2026-06-20',
      urgent_callback_mins:  60,
      urgent_escalation_method: 'sms',
      urgent_outcomes:       ['escalated'],
      sms_followup_enabled:  false,
      notify_new_lead:       true,
      notify_daily_summary:  false,
      notify_weekly_report:  true,
      data_retention_days:   90,
      referral_code:         'BLUELOTUS',
      overage_voice_preference: 'standard',
    },
    callerCount: 20,
    callCount:   32,
    outcomesPool: OUTCOMES,
    daysRange: 20,  // calls stopped ~10 days ago when holiday started
    partners: [
      { partner_name: 'Spice Garden Catering', contact_phone: '+441512345001', specialty: 'Catering and event meals' },
    ],
    staff: [
      { name: 'Priya Patel', role: 'Manager', phone: '+441512345101', colour: '#dc2626', active: false },
    ],
    catalogue: [
      { item_type: 'service', name: 'Table Reservation (up to 4)',   price_from: 0,   price_to: 0,    duration_minutes: 90 },
      { item_type: 'service', name: 'Private Dining (up to 20)',     price_from: 400, price_to: 1200, duration_minutes: 180 },
    ],
    banned: [],
  },

  // ── 6. Professional — physio, Calendar multi, 4 staff, provisional booking ──
  {
    email: 'test-professional@qerxel.app',
    tenant: {
      business_name:             'Thornton Physiotherapy & Sports Rehab',
      business_email:            'test-professional@qerxel.app',
      business_phone:            '+441332345678',
      subscription_tier:         'professional',
      billing_model:             'subscription',
      included_minutes:          450,
      listen_tier:               'none',
      calendar_tier:             'multi',
      triage_mode:               'balanced',
      tone_register:             'warm',
      business_outcome_type:     'booking',
      booking_link:              'https://thorntonphysio.co.uk/book',
      escalation_preference:     'escalate',
      spam_filter_enabled:       true,
      sales_call_handling:       true,
      urgent_callback_mins:      60,
      urgent_escalation_method:  'call',
      urgent_outcomes:           ['escalated'],
      sms_followup_enabled:      true,
      sms_followup_message:      'Hi, thanks for calling Thornton Physio. We\'ll confirm your appointment or call you back shortly.',
      provisional_booking_enabled: true,
      provisional_booking_rule:  'Offer a provisional booking if the caller has a specific injury or condition and wants to be seen within the next 7 days.',
      booking_slots_to_offer:    3,
      booking_buffer_mins:       30,
      notify_new_lead:           true,
      notify_daily_summary:      true,
      notify_weekly_report:      true,
      data_retention_days:       90,
      referral_code:             'THORNTONPHYS',
      overage_voice_preference:  'premium',
    },
    callerCount: 50,
    callCount:   140,
    outcomesPool: BOOKING_OUTCOMES,
    partners: [
      { partner_name: 'Peak Performance Sports Clinic', contact_phone: '+441332345001', specialty: 'Sports injury diagnosis and imaging' },
      { partner_name: 'Active Recovery Massage',        contact_phone: '+441332345002', specialty: 'Sports massage and soft tissue therapy' },
      { partner_name: 'Runners & Cyclists Podiatry',   contact_phone: '+441332345003', specialty: 'Gait analysis and orthotics' },
    ],
    staff: [
      { name: 'Rebecca Thornton', role: 'Principal Physiotherapist',  phone: '+441332345101', direct_line_did: '+441332111001', colour: '#7c3aed', active: true },
      { name: 'Liam Ashworth',    role: 'Sports Physio',              phone: '+441332345102', direct_line_did: '+441332111002', colour: '#1d4ed8', active: true },
      { name: 'Nadia Kowalski',   role: 'Rehabilitation Specialist',  phone: '+441332345103', direct_line_did: '+441332111003', colour: '#059669', active: true },
      { name: 'Dan Byrne',        role: 'Sports Massage Therapist',   phone: '+441332345104', direct_line_did: '+441332111004', colour: '#d97706', active: true },
    ],
    catalogue: [
      { item_type: 'service', name: 'Initial Assessment',           price_from: 75,  price_to: 75,  duration_minutes: 60  },
      { item_type: 'service', name: 'Follow-up Treatment Session',  price_from: 55,  price_to: 55,  duration_minutes: 45  },
      { item_type: 'service', name: 'Sports Injury Consultation',   price_from: 65,  price_to: 65,  duration_minutes: 45  },
      { item_type: 'service', name: 'Sports Massage (60 min)',      price_from: 55,  price_to: 55,  duration_minutes: 60  },
      { item_type: 'service', name: 'Block of 6 Sessions',          price_from: 300, price_to: 300, duration_minutes: 45  },
    ],
    banned: [],
  },

  // ── 7. Professional + Listen — solicitors (sensitive, minimal capture) ───────
  {
    email: 'test-sensitive@qerxel.app',
    tenant: {
      business_name:         'Williams & Associates LLP',
      business_email:        'test-sensitive@qerxel.app',
      business_phone:        '+442032345678',
      subscription_tier:     'professional',
      billing_model:         'subscription',
      included_minutes:      450,
      listen_tier:           'standard',
      calendar_tier:         'entry',
      triage_mode:           'strict',
      tone_register:         'professional',
      business_outcome_type: 'callback',
      escalation_preference: 'escalate',
      spam_filter_enabled:   true,
      sales_call_handling:   true,
      urgent_callback_mins:  30,
      urgent_escalation_method: 'call',
      urgent_outcomes:       ['escalated'],
      sms_followup_enabled:  false,
      notify_new_lead:       true,
      notify_daily_summary:  true,
      notify_weekly_report:  true,
      data_retention_days:   30,
      referral_code:         'WILLIAMSLLP',
      overage_voice_preference: 'premium',
    },
    callerCount: 30,
    callCount:   85,
    outcomesPool: ['lead_captured', 'enquiry_handled', 'enquiry_handled', 'no_action', 'filtered_spam', 'escalated', 'referred_out', 'enquiry_handled'],
    isSensitive: true,  // no transcripts, no ai_summary
    partners: [
      { partner_name: 'Meridian Barristers Chambers', contact_phone: '+442032345001', specialty: 'Barrister services and advocacy' },
      { partner_name: 'Clear Finance Litigation',     contact_phone: '+442032345002', specialty: 'Commercial litigation funding' },
    ],
    staff: [
      { name: 'Helena Williams', role: 'Senior Partner',       phone: '+442032345101', direct_line_did: '+442032111001', colour: '#1e3a8a', active: true },
      { name: 'Rupert Doyle',    role: 'Associate Solicitor',  phone: '+442032345102', direct_line_did: '+442032111002', colour: '#3730a3', active: true },
      { name: 'Fiona Singh',     role: 'Paralegal',            phone: '+442032345103', colour: '#6d28d9', active: true },
    ],
    catalogue: [
      { item_type: 'service', name: 'Initial Consultation',      price_from: 150, price_to: 300, duration_minutes: 60 },
      { item_type: 'service', name: 'Residential Conveyancing',  price_from: 800, price_to: 2500, duration_minutes: 0 },
      { item_type: 'service', name: 'Employment Law Advice',     price_from: 200, price_to: 0,    duration_minutes: 60 },
      { item_type: 'service', name: 'Wills & Probate',           price_from: 350, price_to: 1200, duration_minutes: 60 },
    ],
    banned: ['Conveyancing referrals', 'Litigation funding'],
  },

  // ── 8. Enterprise — facilities management, full stack ───────────────────────
  {
    email: 'test-enterprise@qerxel.app',
    tenant: {
      business_name:             'Apex Commercial Cleaning',
      business_email:            'test-enterprise@qerxel.app',
      business_phone:            '+441212345678',
      subscription_tier:         'enterprise',
      billing_model:             'subscription',
      included_minutes:          1000,
      listen_tier:               'premium',
      calendar_tier:             'multi',
      triage_mode:               'open',
      tone_register:             'professional',
      business_outcome_type:     'quote',
      escalation_preference:     'escalate',
      spam_filter_enabled:       true,
      sales_call_handling:       false,
      urgent_callback_mins:      30,
      urgent_escalation_method:  'call',
      urgent_outcomes:           ['escalated', 'booked'],
      emergency_keywords:        ['chemical spill', 'biohazard', 'flood damage', 'emergency clean'],
      sms_followup_enabled:      true,
      sms_followup_message:      'Thank you for contacting Apex Commercial Cleaning. Our team will be in touch within the hour with a quote.',
      provisional_booking_enabled: true,
      provisional_booking_rule:  'Offer a provisional booking for site surveys if the caller manages a commercial premises and wants to be seen this week.',
      booking_slots_to_offer:    3,
      booking_buffer_mins:       120,
      notify_new_lead:           true,
      notify_daily_summary:      true,
      notify_weekly_report:      true,
      data_retention_days:       365,
      referral_code:             'APEXCLEAN',
      overage_voice_preference:  'premium',
    },
    callerCount: 60,
    callCount:   320,
    outcomesPool: OUTCOMES,
    partners: [
      { partner_name: 'BuildRight Facilities Ltd',    contact_phone: '+441212345001', specialty: 'Building maintenance and repairs' },
      { partner_name: 'SecureGuard Security',         contact_phone: '+441212345002', specialty: 'Commercial security and CCTV' },
      { partner_name: 'Greenspace Grounds Maint.',    contact_phone: '+441212345003', specialty: 'Grounds maintenance and landscaping' },
      { partner_name: 'ProWaste Management',          contact_phone: '+441212345004', specialty: 'Commercial waste collection and recycling' },
      { partner_name: 'Premier Pest Control',         contact_phone: '+441212345005', specialty: 'Commercial pest control and prevention' },
    ],
    staff: [
      { name: 'David Achterberg',  role: 'Managing Director',       phone: '+441212345101', direct_line_did: '+441212111001', colour: '#1d4ed8', active: true },
      { name: 'Karen Moss',        role: 'Operations Manager',      phone: '+441212345102', direct_line_did: '+441212111002', colour: '#7c3aed', active: true },
      { name: 'Shane McAllister',  role: 'Regional Supervisor (N)', phone: '+441212345103', direct_line_did: '+441212111003', colour: '#059669', active: true },
      { name: 'Yemi Adeyemi',      role: 'Regional Supervisor (S)', phone: '+441212345104', direct_line_did: '+441212111004', colour: '#d97706', active: true },
      { name: 'Claire Sherwood',   role: 'Client Relations',        phone: '+441212345105', direct_line_did: '+441212111005', colour: '#dc2626', active: true },
      { name: 'Tom Griffiths',     role: 'Technical Lead',          phone: '+441212345106', direct_line_did: '+441212111006', colour: '#0891b2', active: true },
    ],
    catalogue: [
      { item_type: 'service', name: 'Office Deep Clean',          price_from: 250,  price_to: 1200,  duration_minutes: 180 },
      { item_type: 'service', name: 'Regular Contract Cleaning',  price_from: 180,  price_to: 600,   duration_minutes: 120 },
      { item_type: 'service', name: 'Industrial Floor Cleaning',  price_from: 400,  price_to: 2000,  duration_minutes: 240 },
      { item_type: 'service', name: 'Emergency Specialist Clean', price_from: 500,  price_to: 5000,  duration_minutes: 240 },
      { item_type: 'service', name: 'Site Survey & Quote',        price_from: 0,    price_to: 0,     duration_minutes: 60  },
      { item_type: 'product', name: 'Eco-Clean Starter Kit',      price_from: 45,   price_to: 45,    duration_minutes: 0   },
    ],
    banned: ['Domestic cleaning', 'Window cleaning'],
  },

  // ── 9. PAYG — nail & beauty studio, cost-sensitive ──────────────────────────
  {
    email: 'test-payg@qerxel.app',
    tenant: {
      business_name:         'Jennings Nail & Beauty Studio',
      business_email:        'test-payg@qerxel.app',
      business_phone:        '+441712345678',
      subscription_tier:     'free',
      billing_model:         'payg',
      monthly_cost_limit:    20,
      included_minutes:      0,
      listen_tier:           'none',
      calendar_tier:         'entry',
      triage_mode:           'balanced',
      tone_register:         'warm',
      business_outcome_type: 'booking',
      booking_link:          'https://fresha.com/jenningsnails',
      escalation_preference: 'hard_close',
      spam_filter_enabled:   true,
      sales_call_handling:   true,
      urgent_callback_mins:  120,
      urgent_escalation_method: 'sms',
      urgent_outcomes:       ['escalated'],
      sms_followup_enabled:  false,
      notify_new_lead:       true,
      notify_daily_summary:  true,   // critical for PAYG cost visibility
      notify_weekly_report:  false,
      data_retention_days:   90,
      referral_code:         'JENNINGSNAIL',
      overage_voice_preference: 'standard',
    },
    callerCount: 14,
    callCount:   18,
    outcomesPool: BOOKING_OUTCOMES,
    partners: [
      { partner_name: 'Bliss Hair & Beauty', contact_phone: '+441712345001', specialty: 'Hair colouring and styling' },
    ],
    staff: [],
    catalogue: [
      { item_type: 'service', name: 'Gel Manicure',      price_from: 28, price_to: 38, duration_minutes: 60  },
      { item_type: 'service', name: 'Acrylic Full Set',  price_from: 40, price_to: 55, duration_minutes: 90  },
      { item_type: 'service', name: 'Lash Extensions',   price_from: 55, price_to: 80, duration_minutes: 90  },
      { item_type: 'service', name: 'Brow Shaping',      price_from: 12, price_to: 18, duration_minutes: 30  },
    ],
    banned: [],
  },

  // ── 10. Standard + Listen — finance, transcripts visible ────────────────────
  {
    email: 'test-listen@qerxel.app',
    tenant: {
      business_name:         'Webb Financial Solutions',
      business_email:        'test-listen@qerxel.app',
      business_phone:        '+441912345678',
      subscription_tier:     'standard',
      billing_model:         'subscription',
      included_minutes:      250,
      listen_tier:           'standard',
      calendar_tier:         'entry',
      triage_mode:           'balanced',
      tone_register:         'professional',
      business_outcome_type: 'quote',
      escalation_preference: 'escalate',
      spam_filter_enabled:   true,
      sales_call_handling:   false,
      urgent_callback_mins:  60,
      urgent_escalation_method: 'email',
      urgent_outcomes:       ['escalated'],
      sms_followup_enabled:  false,
      notify_new_lead:       true,
      notify_daily_summary:  true,
      notify_weekly_report:  true,
      data_retention_days:   90,
      referral_code:         'WEBBFINANCE',
      overage_voice_preference: 'premium',
    },
    callerCount: 30,
    callCount:   70,
    outcomesPool: OUTCOMES,
    withTranscripts: true,
    partners: [
      { partner_name: 'Castleton Estate Agents', contact_phone: '+441912345001', specialty: 'Property sales and rentals' },
      { partner_name: 'Hartley Tax Advisers',    contact_phone: '+441912345002', specialty: 'Corporate and personal tax advice' },
    ],
    staff: [
      { name: 'Marcus Webb',     role: 'Director',           phone: '+441912345101', direct_line_did: '+441912111001', colour: '#1d4ed8', active: true },
      { name: 'Diane Hartley',   role: 'Senior Adviser',     phone: '+441912345102', direct_line_did: '+441912111002', colour: '#7c3aed', active: true },
    ],
    catalogue: [
      { item_type: 'service', name: 'Financial Health Check',     price_from: 0,   price_to: 0,    duration_minutes: 45 },
      { item_type: 'service', name: 'Pension Review',             price_from: 350, price_to: 1200, duration_minutes: 60 },
      { item_type: 'service', name: 'Investment Portfolio Review', price_from: 500, price_to: 2000, duration_minutes: 60 },
      { item_type: 'service', name: 'Protection Insurance Review', price_from: 0,   price_to: 0,   duration_minutes: 45 },
    ],
    banned: [],
  },
]

// Sample transcripts for the Listen account
const SAMPLE_TRANSCRIPTS = [
  JSON.stringify([
    { role: 'assistant', text: 'Good afternoon, thank you for calling Webb Financial Solutions. I\'m Vera, the AI assistant. How can I help you today?' },
    { role: 'user',      text: 'Hi yes, I\'d like to speak to someone about reviewing my pension. I\'ve just changed jobs and I\'m not sure what to do with my old workplace pension.' },
    { role: 'assistant', text: 'Of course, that\'s a really important thing to address. Marcus would be the best person to help you with that. Can I take your name and a contact number so he can call you back?' },
    { role: 'user',      text: 'Yes it\'s David Hennessey, my number is 07711 234567.' },
    { role: 'assistant', text: 'Perfect, thank you David. I\'ve made a note of your enquiry about pension consolidation after a job change. Marcus or Diane will be in touch with you shortly. Is there anything else I can help you with?' },
    { role: 'user',      text: 'No that\'s everything, thanks.' },
    { role: 'assistant', text: 'Great, thanks for calling Webb Financial. Have a lovely afternoon.' },
  ]),
  JSON.stringify([
    { role: 'assistant', text: 'Good morning, Webb Financial Solutions. I\'m the AI assistant. How can I help?' },
    { role: 'user',      text: 'I saw your ad about investment reviews. I\'ve got some money sitting in a savings account that I want to put to better use.' },
    { role: 'assistant', text: 'That\'s a great starting point. Would you like me to arrange a free initial consultation with one of our advisers? There\'s no obligation and it usually takes about 45 minutes.' },
    { role: 'user',      text: 'Yes please, that sounds good.' },
    { role: 'assistant', text: 'Wonderful. Can I take your name and best number to call you back?' },
    { role: 'user',      text: 'It\'s Carol Summers, 07722 345678.' },
    { role: 'assistant', text: 'Got it, Carol. Someone will be in touch within the hour to arrange a convenient time for your consultation. Thanks for calling.' },
  ]),
  JSON.stringify([
    { role: 'assistant', text: 'Hello, thank you for calling Webb Financial. How can I help today?' },
    { role: 'user',      text: 'I need to talk to someone urgently. I\'ve received a letter from HMRC about a tax demand and I\'m worried.' },
    { role: 'assistant', text: 'I understand that sounds stressful. This is something Marcus would want to speak to you about directly. Can I connect you now or arrange an immediate callback?' },
    { role: 'user',      text: 'A callback please, as soon as possible.' },
    { role: 'assistant', text: 'Absolutely. I\'m flagging this as urgent. Can I take your name and number?' },
    { role: 'user',      text: 'Brian O\'Neill, 07733 456789.' },
    { role: 'assistant', text: 'Thank you Brian. I\'ve marked this as urgent and Marcus or Diane will call you back within 30 minutes. Please don\'t worry — they deal with HMRC queries regularly.' },
  ]),
]

// ── main ──────────────────────────────────────────────────────────────────────

async function createUser(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey':        SERVICE_KEY,
    },
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  })
  const data = await res.json()
  if (!res.ok) {
    // User already exists — fetch their id
    if (data.msg?.includes('already been registered') || data.code === 'email_exists') {
      console.log(`  ↩  ${email} already exists, looking up ID…`)
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
        headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY },
      })
      const listData = await listRes.json()
      const found = (listData.users || []).find(u => u.email === email)
      if (found) return found.id
      throw new Error(`Cannot find existing user ${email}: ${JSON.stringify(data)}`)
    }
    throw new Error(`createUser failed for ${email}: ${JSON.stringify(data)}`)
  }
  return data.id
}

async function seedAccount(account) {
  const { email, tenant: tenantData, callerCount, callCount, outcomesPool,
          partners, staff, catalogue, banned,
          isSensitive, withTranscripts, forceHighDuration,
          daysRange = 30 } = account

  console.log(`\n▶  ${email}`)

  // 1. Auth user
  const userId = await createUser(email)
  console.log(`   ✓ auth user: ${userId}`)

  // 2. Tenant
  const tenantId = uuid()
  const { error: tErr } = await supabase.from('tenants').insert({ id: tenantId, ...tenantData })
  if (tErr) { console.error('   ✗ tenant:', tErr.message); return }
  console.log(`   ✓ tenant: ${tenantId}`)

  // 3. Membership
  const { error: mErr } = await supabase
    .from('tenant_memberships').insert({ user_id: userId, tenant_id: tenantId, role: 'owner' })
  if (mErr) { console.error('   ✗ membership:', mErr.message); return }
  console.log(`   ✓ membership`)

  // 4. Callers
  const callers = makeCallers(callerCount)
  const { error: cErr } = await supabase.from('callers').insert(callers)
  if (cErr) console.error('   ✗ callers:', cErr.message)
  else console.log(`   ✓ ${callers.length} callers`)

  // 5. Call logs
  let calls = makeCallData(tenantId, callers.map(c => c.id), callCount, outcomesPool, daysRange)

  if (forceHighDuration) {
    // Near-overage: total duration ~14100s (235 min out of 250 allowed)
    const target = 14100
    const perCall = Math.ceil(target / calls.length)
    calls = calls.map(c => ({ ...c, duration_seconds: perCall + Math.floor(Math.random() * 30) }))
  }

  if (isSensitive) {
    calls = calls.map(c => ({ ...c, ai_summary: null, transcript: null }))
  }

  if (withTranscripts) {
    calls = calls.map((c, i) => ({
      ...c,
      transcript: i < SAMPLE_TRANSCRIPTS.length ? SAMPLE_TRANSCRIPTS[i % SAMPLE_TRANSCRIPTS.length] : null,
    }))
  }

  // Insert in batches of 50 to avoid payload limits
  for (let i = 0; i < calls.length; i += 50) {
    const { error: lErr } = await supabase.from('call_logs').insert(calls.slice(i, i + 50))
    if (lErr) { console.error(`   ✗ call_logs batch ${i}:`, lErr.message); break }
  }
  console.log(`   ✓ ${calls.length} call logs`)

  // 6. Leads
  const leads = makeLeads(tenantId, calls)
  if (leads.length) {
    const { error: ldErr } = await supabase.from('leads').insert(leads)
    if (ldErr) console.error('   ✗ leads:', ldErr.message)
    else console.log(`   ✓ ${leads.length} leads`)
  }

  // 7. Partners + referral log
  if (partners.length) {
    const partnerRows = partners.map(p => ({ id: uuid(), tenant_id: tenantId, ...p }))
    // partner_name and contact_phone go into referral_partners; specialty goes into referral_service_map
    const partnerInsertRows = partnerRows.map(p => ({
      id: p.id, tenant_id: p.tenant_id,
      partner_name: p.partner_name, contact_phone: p.contact_phone,
    }))
    const { error: pErr } = await supabase.from('referral_partners').insert(partnerInsertRows)
    if (pErr) console.error('   ✗ partners:', pErr.message)
    else {
      console.log(`   ✓ ${partners.length} partners`)
      // Service map rows
      const svcMap = partnerRows
        .filter(p => partners.find(pa => pa.partner_name === p.partner_name)?.specialty)
        .map(p => ({
          tenant_id: tenantId,
          partner_id: p.id,
          service_keyword: partners.find(pa => pa.partner_name === p.partner_name).specialty,
        }))
      if (svcMap.length) {
        const { error: smErr } = await supabase.from('referral_service_map').insert(svcMap)
        if (smErr) console.error('   ✗ service_map:', smErr.message)
      }
      // Referral log: ~40% of referred_out calls get a log entry against a random partner
      const referredCalls = calls.filter(c => c.call_outcome === 'referred_out')
      const logRows = referredCalls.slice(0, Math.max(1, Math.ceil(referredCalls.length * 0.7)))
        .map(c => ({
          tenant_id:  tenantId,
          partner_id: partnerRows[Math.floor(Math.random() * partnerRows.length)].id,
          created_at: c.created_at,
        }))
      if (logRows.length) {
        const { error: rlErr } = await supabase.from('referral_log').insert(logRows)
        if (rlErr) console.error('   ✗ referral_log:', rlErr.message)
        else console.log(`   ✓ ${logRows.length} referral log entries`)
      }
    }
  }

  // 8. Staff
  if (staff.length) {
    const staffRows = staff.map(s => ({
      id:          uuid(),
      tenant_id:   tenantId,
      name:        s.name,
      role:        s.role || null,
      phone:       s.phone || null,
      direct_line_did: s.direct_line_did || null,
      active:      s.active !== false,
      colour:      s.colour || '#5e3b87',
    }))
    const { error: sErr } = await supabase.from('staff_profiles').insert(staffRows)
    if (sErr) console.error('   ✗ staff:', sErr.message)
    else console.log(`   ✓ ${staff.length} staff`)
  }

  // 9. Catalogue
  if (catalogue.length) {
    const catRows = catalogue.map(c => ({
      id:                  uuid(),
      tenant_id:           tenantId,
      item_type:           c.item_type || 'service',
      name:                c.name,
      description:         c.description || null,
      price_from:          c.price_from ?? null,
      price_to:            c.price_to ?? null,
      duration_minutes:    c.duration_minutes ?? null,
      active:              true,
    }))
    const { error: caErr } = await supabase.from('catalogue_items').insert(catRows)
    if (caErr) console.error('   ✗ catalogue:', caErr.message)
    else console.log(`   ✓ ${catalogue.length} catalogue items`)
  }

  // 10. Banned services
  if (banned.length) {
    const bannedRows = banned.map(b => ({ id: uuid(), tenant_id: tenantId, banned_item: b }))
    const { error: bErr } = await supabase.from('banned_services').insert(bannedRows)
    if (bErr) console.error('   ✗ banned_services:', bErr.message)
    else console.log(`   ✓ ${banned.length} banned services`)
  }

  console.log(`   ✅ ${email} complete`)
}

async function main() {
  console.log('Qerxel test account seeder')
  console.log('══════════════════════════')
  console.log(`Password for all accounts: ${PASSWORD}\n`)

  for (const account of ACCOUNTS) {
    await seedAccount(account)
  }

  console.log('\n══════════════════════════')
  console.log('All accounts seeded.')
  console.log('\nAccount summary:')
  for (const a of ACCOUNTS) {
    console.log(`  ${a.email.padEnd(35)} ${(a.tenant.subscription_tier || 'free').padEnd(14)} listen:${(a.tenant.listen_tier||'none').padEnd(10)} calendar:${a.tenant.calendar_tier}`)
  }
  console.log(`\nPassword: ${PASSWORD}`)
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1) })
