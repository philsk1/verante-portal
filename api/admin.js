// Consolidates owner-tenants, scrape-website, demo-init, support data, and warden snapshots.
// POST { userEmail }                              → return all tenants (owner only)
// POST { url }                                    → scrape website and extract business fields
// POST { ownerEmail, action: 'demo-init' }        → seed demo tenant accounts (owner only)
// POST { ownerEmail, action: 'support-dashboard'} → support calls + incidents + policy (owner only)
// POST { ownerEmail, action: 'support-policy-save', policyText, ... } → update support_policy (owner only)
// POST { ownerEmail, action: 'incident-create', ... }   → log a new incident (owner only)
// POST { ownerEmail, action: 'incident-resolve', id, ... } → mark incident resolved + calc compensation (owner only)
// GET  ?type=warden                               → warden snapshot (cron, hourly)
// GET  ?type=meaning-map                          → meaning tree + unmatched interactions (owner)

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { emitSignal } from './_signals.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const OWNER_EMAILS = ['finsolsoffice@gmail.com', 'philoffice@btconnect.com']
const OWNER_EMAIL  = OWNER_EMAILS[0]
const isOwner = (email) => OWNER_EMAILS.includes(email)
const DEMO_PASSWORD = 'QerxelDemo2026!'

const EXTRACTION_PROMPT = `You are extracting business information from a UK business website.

Return a JSON object with EXACTLY these fields (use null or empty array if not found):
{
  "business_name": string or null,
  "business_phone": string or null (UK format, e.g. "0114 123 4567"),
  "business_email": string or null,
  "business_address": string or null (full address if present),
  "opening_hours": string or null (e.g. "Mon–Fri 8am–6pm, Sat 9am–1pm"),
  "lead_contact_name": string or null (owner name or main contact name),
  "business_context": string or null (2-3 sentence description of what the business does, in plain English),
  "services": array of strings (list of specific service names offered, max 12 items, empty array if none found),
  "staff": array of objects with { "name": string, "role": string } for each named team member or employee listed on the site (empty array if none found),
  "catalogue_items": array of objects for any services or products with pricing or duration mentioned, each with:
    { "name": string, "description": string or null, "price_from": number or null, "price_to": number or null, "duration_minutes": number or null }
    (empty array if no pricing details found)
}

Rules:
- Only extract information clearly stated on the website
- Do not guess, infer, or fabricate any field
- For services: named services only, not generic descriptions
- For staff: only named individuals with a stated role or title
- For catalogue_items: only where a price or duration is explicitly stated; price_from/price_to in GBP numbers only (no £ symbol)
- For business_context: third person, factual, 2-3 sentences max
- Return ONLY valid JSON, no explanation, no markdown fences`

// ── Demo business definitions ──────────────────────────────────────────────────

const DEMO_BUSINESSES = [
  {
    email: 'demo-plumber@qerxel.app',
    tier: 'light',
    included_minutes: 120,
    business_name: "Henderson's Plumbing",
    business_phone: '0114 278 4422',
    business_email: 'info@hendersonsplumbing.co.uk',
    business_address: '14 Millbrook Lane, Sheffield, S6 4RP',
    opening_hours: 'Mon–Fri 7:30am–6pm, Sat 8am–1pm',
    lead_contact_name: 'Dave Henderson',
    business_context: "Henderson's Plumbing is a Sheffield-based sole trader specialising in residential plumbing repairs, boiler servicing, and emergency callouts. Operating since 2009, the business handles 15–20 calls per week from homeowners across South Yorkshire.",
    triage_mode: 'balanced', tone_register: 'warm', business_outcome_type: 'callback',
    greeting_message: "You've reached Henderson's Plumbing. We're busy on the tools right now — leave your name and number and Dave will call you back shortly.",
    staff: [],
    catalogue: [
      { item_type: 'service', name: 'Emergency Callout', description: 'Same-day emergency plumbing callout', price_from: 95, price_to: 150, duration_minutes: 60 },
      { item_type: 'service', name: 'Boiler Service', description: 'Annual boiler service and safety check', price_from: 85, price_to: 85, duration_minutes: 90 },
      { item_type: 'service', name: 'Leak Repair', description: 'Standard pipe or tap leak repair', price_from: 65, price_to: 120, duration_minutes: 45 },
    ],
    partners: [{ business_name: 'Sheffield Building Merchants', business_phone: '0114 244 3100' }],
    callSummaries: [
      'Caller has a leaking pipe under the kitchen sink — urgent. Captured name and number for callback.',
      'Annual boiler service inquiry — 3-bed semi, Worcester Bosch. Lead captured.',
      'Emergency callout for no hot water. Directed to call back urgently.',
      'Customer asking about cost of new bathroom tap fitting. Quote requested.',
      'Central heating not working — radiators cold. Captured as urgent lead.',
      'Caller wants a quote for replacing all radiator valves.',
      'Blocked drain inquiry — callback scheduled.',
      'Boiler making banging noise — lead captured.',
      'Inquiry about fitting a new shower. Lead captured.',
      'Cold water tank replacement quote requested.',
    ],
    callOutcomes: ['lead_captured','lead_captured','callback_scheduled','lead_captured','lead_captured','callback_scheduled','lead_captured','lead_captured','callback_scheduled','lead_captured'],
    leadNames: ['Janet Morris','Rob Fletcher','Diane Walsh','Colin Sykes','Margaret Burns','Tony Patel','Sue Whitfield','Gary Brooks','Rachel Holt','Ian Stafford','Pam Jennings','Dave Thornton'],
  },
  {
    email: 'demo-salon@qerxel.app',
    tier: 'standard',
    included_minutes: 250,
    business_name: 'Meridian Hair & Beauty',
    business_phone: '0121 445 7831',
    business_email: 'hello@meridianhair.co.uk',
    business_address: '88 Stratford Road, Birmingham, B11 1AN',
    opening_hours: 'Tue–Sat 9am–7pm, Sun 10am–4pm',
    lead_contact_name: 'Priya Sharma',
    business_context: 'Meridian Hair & Beauty is a boutique salon in Birmingham offering full hair services, colour treatments, and nail care. The salon operates with three stylists and handles significant appointment booking traffic by phone.',
    triage_mode: 'balanced', tone_register: 'warm', business_outcome_type: 'booking',
    greeting_message: "Welcome to Meridian Hair & Beauty. We're with a client right now — leave your name and number and we'll call back to book you in.",
    staff: [
      { name: 'Priya Sharma', role: 'Senior Stylist', active: true },
      { name: 'Chloe Bennett', role: 'Colour Specialist', active: true },
    ],
    catalogue: [
      { item_type: 'service', name: 'Cut & Blow Dry', description: 'Wash, cut and blow dry', price_from: 45, price_to: 55, duration_minutes: 60 },
      { item_type: 'service', name: 'Full Colour', description: 'Full head colour with toner', price_from: 95, price_to: 145, duration_minutes: 120 },
      { item_type: 'service', name: 'Highlights & Lowlights', description: 'Partial or full highlights', price_from: 75, price_to: 110, duration_minutes: 90 },
      { item_type: 'service', name: 'Gel Manicure', description: 'Gel polish, shape and file', price_from: 35, price_to: 35, duration_minutes: 45 },
    ],
    partners: [
      { business_name: 'The Skin Retreat Spa', business_phone: '0121 622 4422' },
      { business_name: 'Bridal by Belle', business_phone: '0121 708 9910' },
    ],
    callSummaries: [
      'Caller wants to book a cut and blow dry with Priya on Saturday — lead captured.',
      'Inquiry about full colour price — blonde to brunette. Quote given.',
      'Bridal party booking inquiry — 4 people, late August. Lead captured urgently.',
      'Rebook request — regular client wants monthly trim.',
      'Caller asking about highlights — consultation first. Lead captured.',
      'Gel manicure booking for Friday afternoon. Lead captured.',
      'New client asking about balayage pricing. Lead captured.',
      'Caller wants to change existing appointment.',
      'Gift voucher inquiry — birthday present. Lead captured.',
      'Inquiry about keratin smoothing treatment.',
      'Lash lift and tint appointment booking. Lead captured.',
      'Complaint call — colour not as expected. Manager note captured.',
    ],
    callOutcomes: ['lead_captured','resolved','lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','callback_scheduled','lead_captured','resolved','lead_captured','callback_scheduled'],
    leadNames: ['Sarah Mitchell','Emma Clark','Janet Powell','Lucy Barnes','Amara Osei','Claire Fenn','Donna Reid','Nikki Patel','Jo Whitaker','Bex Lowe','Sophie Wu','Yemi Adams','Rachel Cooke','Faye Doran','Kate Hodge'],
  },
  {
    email: 'demo-physio@qerxel.app',
    tier: 'professional',
    included_minutes: 450,
    business_name: 'Restore Physiotherapy',
    business_phone: '0161 834 5600',
    business_email: 'appointments@restorephysio.co.uk',
    business_address: '24 John Dalton Street, Manchester, M2 6HP',
    opening_hours: 'Mon–Fri 7:30am–7pm, Sat 8am–2pm',
    lead_contact_name: 'Dr Sarah Okafor',
    business_context: 'Restore Physiotherapy is a Manchester city centre private clinic offering physiotherapy, sports injury rehabilitation, and clinical Pilates. The practice has three registered physiotherapists and sees 40–50 patients per week.',
    triage_mode: 'sensitive', tone_register: 'professional', business_outcome_type: 'booking',
    greeting_message: "Thank you for calling Restore Physiotherapy. Our reception team is with a patient right now — your call has been captured and we'll call you back shortly to arrange an appointment.",
    staff: [
      { name: 'Dr Sarah Okafor', role: 'Lead Physiotherapist', active: true },
      { name: 'James Walsh', role: 'Sports Physio', active: true },
    ],
    catalogue: [
      { item_type: 'service', name: 'Initial Assessment', description: '60-minute full body assessment with treatment plan', price_from: 85, price_to: 85, duration_minutes: 60 },
      { item_type: 'service', name: 'Follow-up Treatment', description: '30-minute follow-up session', price_from: 55, price_to: 55, duration_minutes: 30 },
      { item_type: 'service', name: 'Sports Injury Assessment', description: 'Sports-specific injury assessment and rehabilitation plan', price_from: 95, price_to: 95, duration_minutes: 60 },
      { item_type: 'service', name: 'Clinical Pilates (1:1)', description: 'One-to-one Pilates session with physiotherapist', price_from: 65, price_to: 65, duration_minutes: 55 },
    ],
    partners: [
      { business_name: 'Active Sports Club Manchester', business_phone: '0161 445 2200' },
      { business_name: 'Salford Royal — Orthopaedic Dept', business_phone: '0161 789 7373' },
      { business_name: 'Manchester City FC Academy', business_phone: '0161 444 1894' },
    ],
    callSummaries: [
      'New patient — lower back pain following desk work. Initial assessment booked.',
      'GP referral for knee ligament rehabilitation post-surgery. Urgent appointment.',
      'Caller asking about clinical Pilates for core stability. Lead captured.',
      'Sports injury — runner with Achilles tendinopathy. James Walsh requested.',
      'Existing patient rebook — Sarah Okafor. Monthly maintenance session.',
      'Insurance query — AXA PPP coverage for physio.',
      'Post-op shoulder rehab — 3 weeks post rotator cuff surgery.',
      'Corporate wellness inquiry — 6 staff. Referred to admin.',
      'Neck and shoulder pain — office worker. Assessment lead captured.',
      'Frozen shoulder — 6 months history. Urgent appointment.',
      'Child patient — 14yo swimmer with hip pain. Parent caller.',
      'Sports massage vs physio query. Explained and booked assessment.',
    ],
    callOutcomes: ['lead_captured','lead_captured','lead_captured','lead_captured','lead_captured','callback_scheduled','lead_captured','referral_made','lead_captured','lead_captured','lead_captured','lead_captured'],
    leadNames: ['Michael Chen','Abi Clarke','Tom Fitzgerald','Rachel Hurst','David Okafor','Sara Malik','Neil Brennan','Fiona Grant','Pete Lawson','Amy Sherwood','Jake Williams','Carol Mistry','Steve Barker','Olivia Nash','Ravi Patel','Helen Ford','Dan Kowalski','Tasha Brown','Matt Ellison','Grace Tong'],
  },
  {
    email: 'demo-electrical@qerxel.app',
    tier: 'enterprise',
    included_minutes: 1000,
    business_name: 'Apex Electrical Services',
    business_phone: '020 8432 7700',
    business_email: 'info@apexelectrical.co.uk',
    business_address: '3 Commerce Way, Croydon, CR0 4XA',
    opening_hours: 'Mon–Fri 7am–6pm, emergency 24/7',
    lead_contact_name: 'Marcus Dean',
    business_context: 'Apex Electrical Services is a London-based electrical contractor serving residential, commercial, and industrial clients. With a team of 8 qualified electricians, the company handles everything from consumer unit upgrades to full commercial fit-outs.',
    triage_mode: 'aggressive', tone_register: 'professional', business_outcome_type: 'quote',
    greeting_message: "You've reached Apex Electrical Services. We handle jobs across London and Surrey — leave your details and a brief description of the work and we'll call back with a quote.",
    staff: [
      { name: 'Marcus Dean', role: 'Master Electrician & Director', active: true },
      { name: 'Owen Richards', role: 'Commercial Lead', active: true },
      { name: 'Fatima Al-Hassan', role: 'Project Coordinator', active: true },
    ],
    catalogue: [
      { item_type: 'service', name: 'Consumer Unit Upgrade', description: 'Full consumer unit replacement, up to 16 ways', price_from: 450, price_to: 850, duration_minutes: 240 },
      { item_type: 'service', name: 'EV Home Charger Installation', description: 'OZEV-approved home EV charger supply and fit', price_from: 650, price_to: 850, duration_minutes: 180 },
      { item_type: 'service', name: 'Commercial Electrical Survey', description: 'Full fixed wire test and EICR certification', price_from: 150, price_to: 400, duration_minutes: 120 },
      { item_type: 'service', name: 'Solar PV System', description: 'Residential solar panel installation with battery', price_from: 4500, price_to: 9000, duration_minutes: 480 },
      { item_type: 'service', name: 'Commercial Fit-out', description: 'Full first fix and second fix for new commercial premises', price_from: 2500, price_to: null, duration_minutes: null },
    ],
    partners: [
      { business_name: 'Croydon Property Management', business_phone: '020 8667 1234' },
      { business_name: 'BuildRight Construction', business_phone: '020 8444 7890' },
      { business_name: 'London Letting Solutions', business_phone: '020 8765 4321' },
      { business_name: 'SolarSmart Installations', business_phone: '020 8334 7700' },
    ],
    callSummaries: [
      'Commercial inquiry — new restaurant fit-out in Croydon, 4,000 sq ft. Lead captured.',
      'Residential — consumer unit upgrade needed for extension work. Quote requested.',
      'EICR certification needed for letting agent — 3-bed flat. Lead captured.',
      'EV charger installation — Tesla driver, semi-detached with garage.',
      'Emergency — power tripped and won\'t reset. Urgent callback.',
      'Solar PV inquiry — 5-bed detached, south-facing roof. Survey requested.',
      'PAT testing for 40 appliances — office in Streatham. Corporate lead.',
      'House purchase — buyer wants full rewire quote before exchange.',
      'Fault finding — lights flickering in kitchen for 3 weeks.',
      'Landlord — 6 rental properties need EICR certificates urgently.',
      'Commercial shop refit — new lighting circuit needed.',
      'Outdoor power — hot tub installation, armoured cable needed.',
    ],
    callOutcomes: ['lead_captured','lead_captured','lead_captured','lead_captured','callback_scheduled','lead_captured','lead_captured','lead_captured','callback_scheduled','lead_captured','referral_made','lead_captured'],
    leadNames: ['Chris Hammond','Diane Patel','Ben Foster','Kelly Marsh','Andrew Yip','Natasha Romero','Ed Flanagan','Priya Nair','Rob Sinclair','Jess Okafor','Toby Watts','Layla Ahmed','Gary Stubbs','Anna Kowalski','Mike Davey','Claire Webb','Sam Burton','Fran Ogden','Des Murphy','Iona McLeod','Phil Tanner','Zara Khan','Noel Brady','Cath Rawlings','Tim Shore'],
  },
]

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function generateCalls(tenantId, biz) {
  const phones = ['07712 334 451','07823 661 290','07934 772 001','07651 229 882','07788 441 763','07900 112 445','07543 871 229','07612 990 334']
  const count = biz.tier === 'enterprise' ? 20 : biz.tier === 'professional' ? 16 : 12
  return Array.from({ length: count }, (_, i) => {
    // First 3 calls are from today; rest spread over last 0-6 days (all within current month)
    const daysBack = i < 3 ? 0 : rnd(1, 6)
    const d = daysAgo(daysBack)
    d.setHours(rnd(8, 17), rnd(0, 59), 0, 0)
    return { tenant_id: tenantId, created_at: d.toISOString(), duration_seconds: rnd(45, 280), call_outcome: biz.callOutcomes[i % biz.callOutcomes.length], ai_summary: biz.callSummaries[i % biz.callSummaries.length], caller_phone: phones[i % phones.length] }
  })
}

function generateLeads(tenantId, biz) {
  const statuses = ['new','new','new','contacted','contacted','converted','converted','lost']
  const notes = ['Called back — left voicemail.','Sent quote via email.','Awaiting response.','Booked in for next week.','Job completed.','','Follow up Monday.','Not suitable at this time.']
  return biz.leadNames.slice(0, 8).map((name, i) => ({ tenant_id: tenantId, created_at: daysAgo(rnd(0, 6)).toISOString(), status: statuses[i % statuses.length], lead_contact_name: name, ai_summary: biz.callSummaries[i % biz.callSummaries.length], notes: notes[i] }))
}

// ── Warden snapshot (called hourly by cron) ────────────────────────────────────

async function handleWardenSnapshot(res) {
  const PERIOD_HOURS = 1
  const since = new Date(Date.now() - PERIOD_HOURS * 60 * 60 * 1000).toISOString()

  const { data: signals } = await supabase
    .from('system_signals')
    .select('element, signal_type, payload, created_at')
    .gte('created_at', since)
    .neq('signal_type', 'warden_snapshot')

  const byElement = {}
  for (const sig of signals || []) {
    if (!byElement[sig.element]) {
      byElement[sig.element] = { total: 0, errors: 0, calls: 0, chat_turns: 0, cat_a: 0 }
    }
    const el = byElement[sig.element]
    el.total++
    if (sig.signal_type === 'error')            el.errors++
    if (sig.signal_type === 'call_completed')   el.calls++
    if (sig.signal_type === 'call_support_done') el.calls++
    if (sig.signal_type === 'chat_turn')        el.chat_turns++
    if (sig.payload?.complaint_category === 'A') el.cat_a++
  }

  const elementSummaries = {}
  const stressFlags = []

  for (const [element, data] of Object.entries(byElement)) {
    const errorRate = data.total > 0 ? Math.round((data.errors / data.total) * 100) / 100 : 0
    elementSummaries[element] = {
      signal_count: data.total,
      errors:       data.errors,
      error_rate:   errorRate,
      calls:        data.calls,
      chat_turns:   data.chat_turns,
    }
    if (errorRate > 0.1)  stressFlags.push(`${element}:error_rate_elevated`)
    if (data.cat_a >= 2)  stressFlags.push(`support:category_a_spike:${data.cat_a}`)
  }

  const snapshot = {
    period_hours:  PERIOD_HOURS,
    period_start:  since,
    total_signals: (signals || []).length,
    elements:      elementSummaries,
    stress_flags:  stressFlags,
  }

  await emitSignal('warden', 'warden_snapshot', snapshot)

  // Clean up expired ephemeral demo tenants
  const { data: expired } = await supabase
    .from('tenants')
    .select('id, demo_user_id')
    .eq('is_ephemeral', true)
    .lt('expires_at', new Date().toISOString())

  for (const t of (expired || [])) {
    await Promise.all([
      supabase.from('catalogue_items').delete().eq('tenant_id', t.id),
      supabase.from('staff_profiles').delete().eq('tenant_id', t.id),
      supabase.from('leads').delete().eq('tenant_id', t.id),
      supabase.from('call_logs').delete().eq('tenant_id', t.id),
      supabase.from('appointments').delete().eq('tenant_id', t.id),
      supabase.from('tenant_memberships').delete().eq('tenant_id', t.id),
    ])
    await supabase.from('tenants').delete().eq('id', t.id)
    if (t.demo_user_id) {
      await supabase.auth.admin.deleteUser(t.demo_user_id).catch(() => {})
    }
    console.log(`Warden: deleted expired demo tenant ${t.id}`)
  }

  return res.status(200).json({ ok: true, snapshot, demoTenantsExpired: (expired || []).length })
}

// ── Meaning map (tree + unmatched interactions) ───────────────────────────────

async function handleMeaningMap(res) {
  const [nodesRes, unmatchedRes] = await Promise.all([
    supabase
      .from('meaning_map')
      .select('id, parent_id, level, label, kb_chunk_file, occurrence_count, last_occurred_at, status, created_at')
      .order('level')
      .order('occurrence_count', { ascending: false }),
    supabase
      .from('q_chat_logs')
      .select('id, handler, zone_name, user_message, created_at')
      .is('meaning_id', null)
      .not('user_message', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const nodes     = nodesRes.data     || []
  const unmatched = unmatchedRes.data || []

  // Build tree: trunk → branches (with summed twig counts) → twigs
  const trunk    = nodes.find(n => n.level === 'trunk')
  const branches = nodes.filter(n => n.level === 'branch').map(b => {
    const twigs         = nodes.filter(n => n.level === 'twig' && n.parent_id === b.id)
    const totalCount    = twigs.reduce((s, t) => s + (t.occurrence_count || 0), 0)
    const topTwigs      = [...twigs].sort((a, b2) => (b2.occurrence_count || 0) - (a.occurrence_count || 0)).slice(0, 8)
    return { ...b, twig_count: twigs.length, total_occurrences: totalCount, top_twigs: topTwigs }
  }).sort((a, b) => b.total_occurrences - a.total_occurrences)

  const proposals = nodes.filter(n => n.status === 'proposed')

  return res.status(200).json({ trunk, branches, proposals, unmatched })
}

// ── Handler ────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // GET — cron endpoints (no auth, called by Vercel scheduler)
  if (req.method === 'GET') {
    if (req.query.type === 'warden')      return handleWardenSnapshot(res)
    if (req.query.type === 'meaning-map') return handleMeaningMap(res)
    return res.status(400).json({ error: 'Unknown type' })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
  const { userEmail, url, ownerEmail, action } = req.body

  // ── demo-init ──────────────────────────────────────────────────────────────
  if (action === 'demo-init') {
    if (!isOwner(ownerEmail)) return res.status(403).json({ error: 'Forbidden' })
    const log = []
    try {
      // Step 1: wipe existing demo tenant data only (auth users are never deleted/recreated)
      const { data: existingDemo } = await supabase.from('tenants').select('id').eq('is_demo', true)
      if (existingDemo?.length) {
        const ids = existingDemo.map(t => t.id)
        await Promise.all([
          supabase.from('call_logs').delete().in('tenant_id', ids),
          supabase.from('leads').delete().in('tenant_id', ids),
          supabase.from('referral_log').delete().in('tenant_id', ids),
          supabase.from('referral_partners').delete().in('tenant_id', ids),
          supabase.from('staff_profiles').delete().in('tenant_id', ids),
          supabase.from('catalogue_items').delete().in('tenant_id', ids),
          supabase.from('tenant_memberships').delete().in('tenant_id', ids),
          supabase.from('tenants').delete().in('id', ids),
        ])
        log.push(`Cleared ${ids.length} existing demo tenants`)
      }

      // Step 2: resolve auth user IDs — look up existing via RPC, create only if missing
      const userIds = await Promise.all(DEMO_BUSINESSES.map(async biz => {
        const { data: uid } = await supabase.rpc('lookup_demo_user_id', { p_email: biz.email })
        if (uid) return uid
        const { data: created, error } = await supabase.auth.admin.createUser({ email: biz.email, password: DEMO_PASSWORD, email_confirm: true })
        if (error) { log.push(`WARN auth ${biz.email}: ${error.message}`); return null }
        log.push(`Created auth user: ${biz.email}`)
        return created.user.id
      }))

      // Step 3: create tenants + seed all 4 businesses in parallel
      await Promise.all(DEMO_BUSINESSES.map(async (biz, i) => {
        const userId = userIds[i]
        if (!userId) return

        const { data: tenant, error: te } = await supabase.from('tenants').insert({
          business_name: biz.business_name, subscription_tier: biz.tier, included_minutes: biz.included_minutes,
          business_phone: biz.business_phone, business_email: biz.business_email, business_address: biz.business_address,
          opening_hours: biz.opening_hours, lead_contact_name: biz.lead_contact_name, business_context: biz.business_context,
          triage_mode: biz.triage_mode, tone_register: biz.tone_register, business_outcome_type: biz.business_outcome_type,
          greeting_message: biz.greeting_message, is_demo: true,
        }).select('id').single()
        if (te) { log.push(`WARN tenant ${biz.business_name}: ${te.message}`); return }

        const tid = tenant.id
        log.push(`${biz.business_name} (${tid.slice(0, 8)})`)

        const seedOps = [
          supabase.from('tenant_memberships').insert({ tenant_id: tid, user_id: userId, role: 'owner' }),
          supabase.from('call_logs').insert(generateCalls(tid, biz)),
          supabase.from('leads').insert(generateLeads(tid, biz)),
        ]
        if (biz.staff.length) seedOps.push(supabase.from('staff_profiles').insert(biz.staff.map(s => ({ ...s, tenant_id: tid }))))
        if (biz.catalogue.length) seedOps.push(supabase.from('catalogue_items').insert(biz.catalogue.map(c => ({ ...c, tenant_id: tid, active: true }))))

        if (biz.partners.length) {
          const { data: insertedPartners } = await supabase.from('referral_partners')
            .insert(biz.partners.map(p => ({ partner_name: p.business_name || p.partner_name, contact_phone: p.business_phone || p.contact_phone || null, tenant_id: tid }))).select('id')
          if (insertedPartners?.length) {
            seedOps.push(supabase.from('referral_log').insert(
              Array.from({ length: 5 }, () => ({ tenant_id: tid, partner_id: insertedPartners[0].id, created_at: daysAgo(rnd(0, 14)).toISOString() }))
            ))
          }
        }

        await Promise.all(seedOps)
      }))

      return res.status(200).json({ ok: true, log })
    } catch (err) {
      console.error('demo-init error:', err)
      return res.status(500).json({ error: err.message, log })
    }
  }

  // ── demo-businesses — no auth required, service role bypasses RLS ──────────
  if (action === 'demo-businesses') {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, business_name, subscription_tier, included_minutes, triage_mode')
      .eq('is_demo', true)
      .order('subscription_tier', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ businesses: data || [] })
  }

  // ── owner-tenants ──────────────────────────────────────────────────────────
  if (userEmail !== undefined) {
    if (!isOwner(userEmail)) return res.status(403).json({ error: 'Forbidden' })

    const [tenantsRes, callsRes, apptsRes, catRes, staffRes] = await Promise.all([
      supabase.from('tenants').select('id, business_name, subscription_tier, listen_tier, calendar_tier, sentry_camera_limit, triage_mode, billing_model, business_outcome_type, spam_filter_enabled, sms_followup_enabled, provisional_booking_enabled, is_demo, holiday_mode, greeting_message, additional_instructions, lead_contact_name, callback_preference_note, emergency_keywords, booking_link, keep_alive_topics, blocked_phone_numbers').order('business_name'),
      supabase.from('call_logs').select('tenant_id, call_outcome, callback_flagged, created_at'),
      supabase.from('appointments').select('tenant_id, status, start_time')
        .gte('start_time', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .lte('start_time', new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('catalogue_items').select('tenant_id, duration_minutes').eq('active', true),
      supabase.from('staff_profiles').select('tenant_id').or('active.eq.true,active.is.null'),
    ])

    if (tenantsRes.error) return res.status(500).json({ error: tenantsRes.error.message })

    const now = new Date()
    const ago30 = new Date(now - 30 * 24 * 60 * 60 * 1000)
    const fwd14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    // Build per-tenant call stats
    const callStats = {}
    for (const c of callsRes.data || []) {
      const s = callStats[c.tenant_id] || (callStats[c.tenant_id] = { total30: 0, leads30: 0, escalOpen: 0, flagged: 0, outcomes: {} })
      const isRecent = new Date(c.created_at) >= ago30
      if (isRecent) s.total30++
      if (isRecent && c.call_outcome === 'lead_captured') s.leads30++
      if (c.call_outcome === 'escalated' && c.callback_flagged) s.escalOpen++
      if (c.callback_flagged) s.flagged++
      if (c.call_outcome) s.outcomes[c.call_outcome] = (s.outcomes[c.call_outcome] || 0) + 1
    }

    // Build per-tenant appointment stats
    const apptStats = {}
    for (const a of apptsRes.data || []) {
      const s = apptStats[a.tenant_id] || (apptStats[a.tenant_id] = { upcoming: 0, pastTotal: 0, pastCancelled: 0, totalCount: 0 })
      s.totalCount++
      const t = new Date(a.start_time)
      if (t > now && t < fwd14 && a.status === 'confirmed') s.upcoming++
      if (t < now) {
        s.pastTotal++
        if (a.status === 'cancelled' || a.status === 'no_show') s.pastCancelled++
      }
    }

    // Build per-tenant catalogue stats
    const catStats = {}
    for (const c of catRes.data || []) {
      const s = catStats[c.tenant_id] || (catStats[c.tenant_id] = { count: 0, incomplete: 0 })
      s.count++
      if (!c.duration_minutes) s.incomplete++
    }

    // Build per-tenant staff counts
    const staffCount = {}
    for (const s of staffRes.data || []) {
      staffCount[s.tenant_id] = (staffCount[s.tenant_id] || 0) + 1
    }

    // Annotate tenants with landscape intel + issues
    const tenants = (tenantsRes.data || []).map(t => {
      const calls  = callStats[t.id]  || { total30: 0, leads30: 0, escalOpen: 0, flagged: 0 }
      const appts  = apptStats[t.id]  || { upcoming: 0, pastTotal: 0, pastCancelled: 0 }
      const cat    = catStats[t.id]   || { count: 0, incomplete: 0 }
      const staffN = staffCount[t.id] || 0
      const cancelRate = appts.pastTotal > 0 ? appts.pastCancelled / appts.pastTotal : 0
      const leadRate   = calls.total30 > 0 ? calls.leads30 / calls.total30 : null

      const issues = []
      if (calls.escalOpen > 0)                                                   issues.push({ type: 'urgent_open',       label: `${calls.escalOpen} urgent open`,        severity: 'critical' })
      if (calls.flagged > 12)                                                    issues.push({ type: 'callbacks_high',    label: `${calls.flagged} callbacks queued`,     severity: 'warning' })
      if (calls.total30 >= 5 && leadRate !== null && leadRate < 0.18)           issues.push({ type: 'low_conversion',    label: `${Math.round(leadRate * 100)}% lead rate`, severity: 'warning' })
      if (cancelRate > 0.22)                                                     issues.push({ type: 'high_cancel',       label: `${Math.round(cancelRate * 100)}% cancel rate`, severity: 'warning' })
      if (cat.count === 0 && t.subscription_tier !== 'free')                    issues.push({ type: 'no_catalogue',      label: 'No catalogue',                          severity: 'warning' })
      if (cat.incomplete > 0)                                                    issues.push({ type: 'incomplete_cat',    label: `${cat.incomplete} items missing duration`, severity: 'info' })
      if (t.calendar_tier !== 'none' && staffN === 0)                           issues.push({ type: 'no_staff',          label: 'No staff entered',                      severity: 'warning' })
      if (calls.total30 < 5)                                                     issues.push({ type: 'low_activity',      label: calls.total30 === 0 ? 'No calls recorded' : `Only ${calls.total30} calls`, severity: calls.total30 === 0 ? 'critical' : 'warning' })
      if (t.calendar_tier !== 'none' && appts.upcoming === 0 && appts.pastTotal > 0) issues.push({ type: 'calendar_empty', label: 'No upcoming bookings',               severity: 'info' })
      if (t.holiday_mode)                                                        issues.push({ type: 'holiday_mode',      label: 'AI paused — holiday mode',              severity: 'critical' })
      if (t.subscription_tier === 'free')                                        issues.push({ type: 'free_tier',         label: 'Free tier',                             severity: 'info' })

      return {
        ...t,
        landscape: {
          calls30d: calls.total30,
          leads30d: calls.leads30,
          leadRate,
          escalOpen: calls.escalOpen,
          callbacksQueued: calls.flagged,
          upcoming: appts.upcoming,
          totalAppts: appts.totalCount || 0,
          cancelRate: Math.round(cancelRate * 100),
          catalogueItems: cat.count,
          staffCount: staffN,
          outcomeCounts: calls.outcomes || {},
          issues,
        },
      }
    })

    return res.status(200).json({ tenants })
  }

  // ── support-dashboard ─────────────────────────────────────────────────────
  if (action === 'support-dashboard') {
    if (!isOwner(ownerEmail)) return res.status(403).json({ error: 'Forbidden' })

    const [callsRes, incidentsRes, compRes, policyRes] = await Promise.all([
      supabase
        .from('support_calls')
        .select('id, tenant_id, caller_phone, duration_seconds, complaint_category, frustration_level, complaint_summary, gift_given, resolution, requires_escalation, ai_summary, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('incidents')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50),
      supabase
        .from('compensation_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('support_policy')
        .select('*')
        .limit(1)
        .maybeSingle(),
    ])

    // Enrich support calls with tenant names
    const tenantIds = [...new Set((callsRes.data || []).map(c => c.tenant_id).filter(Boolean))]
    let tenantNames = {}
    if (tenantIds.length) {
      const { data: tenants } = await supabase
        .from('tenants').select('id, business_name').in('id', tenantIds)
      for (const t of tenants || []) tenantNames[t.id] = t.business_name
    }

    const calls = (callsRes.data || []).map(c => ({
      ...c,
      business_name: tenantNames[c.tenant_id] || null,
    }))

    return res.status(200).json({
      calls,
      incidents: incidentsRes.data || [],
      compensation: compRes.data || [],
      policy: policyRes.data || null,
    })
  }

  // ── support-policy-save ────────────────────────────────────────────────────
  if (action === 'support-policy-save') {
    if (!isOwner(ownerEmail)) return res.status(403).json({ error: 'Forbidden' })

    const { policyText, freeMinutesPerCall, maxStrikes, escalationEmail, escalationWhatsapp } = req.body

    // Upsert — there is only ever one support_policy row
    const { data: existing } = await supabase.from('support_policy').select('id').limit(1).maybeSingle()

    const payload = {
      policy_text:           policyText,
      free_minutes_per_call: freeMinutesPerCall ?? 10,
      max_strikes:           maxStrikes ?? 2,
      escalation_email:      escalationEmail || null,
      escalation_whatsapp:   escalationWhatsapp || null,
      updated_at:            new Date().toISOString(),
    }

    if (existing?.id) {
      await supabase.from('support_policy').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('support_policy').insert(payload)
    }

    return res.status(200).json({ ok: true })
  }

  // ── incident-create ────────────────────────────────────────────────────────
  if (action === 'incident-create') {
    if (!isOwner(ownerEmail)) return res.status(403).json({ error: 'Forbidden' })

    const { title, description, startedAt, scope, affectedTenantIds } = req.body
    if (!title || !startedAt) return res.status(400).json({ error: 'title and startedAt required' })

    const { data: incident, error } = await supabase.from('incidents').insert({
      title,
      description: description || null,
      started_at:  startedAt,
      scope:       scope || 'all',
      affected_tenant_ids: affectedTenantIds || null,
      status: 'active',
      compensation_rate: 10,
    }).select().maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ incident })
  }

  // ── incident-resolve ───────────────────────────────────────────────────────
  if (action === 'incident-resolve') {
    if (!isOwner(ownerEmail)) return res.status(403).json({ error: 'Forbidden' })

    const { id: incidentId, endedAt } = req.body
    if (!incidentId || !endedAt) return res.status(400).json({ error: 'id and endedAt required' })

    // Mark incident resolved
    const { data: incident } = await supabase
      .from('incidents')
      .update({ ended_at: endedAt, status: 'compensated' })
      .eq('id', incidentId)
      .select()
      .maybeSingle()

    if (!incident) return res.status(404).json({ error: 'Incident not found' })

    const startMs  = new Date(incident.started_at).getTime()
    const endMs    = new Date(endedAt).getTime()
    const downtimeMinutes = Math.round((endMs - startMs) / 60000)

    // Determine affected tenants
    let affectedTenants = []
    if (incident.scope === 'all' || !incident.affected_tenant_ids?.length) {
      const { data: all } = await supabase.from('tenants').select('id, subscription_tier, included_minutes').not('subscription_tier', 'eq', 'free')
      affectedTenants = all || []
    } else {
      const { data: specific } = await supabase.from('tenants').select('id, subscription_tier, included_minutes').in('id', incident.affected_tenant_ids)
      affectedTenants = specific || []
    }

    // Tier monthly value estimates (pro-rate to downtime) — approximate
    const TIER_MONTHLY = { light: 29, standard: 49, professional: 69, enterprise: 249, bespoke: 299 }

    const compensationRows = affectedTenants.map(t => {
      const monthlyGbp   = TIER_MONTHLY[t.subscription_tier] || 49
      const minutesInMonth = 30 * 24 * 60
      const downtimeValue  = (monthlyGbp / minutesInMonth) * downtimeMinutes
      const compensation   = Math.round(downtimeValue * 10 * 100) / 100 // 10x, 2dp
      return {
        incident_id:      incidentId,
        tenant_id:        t.id,
        downtime_minutes: downtimeMinutes,
        tier:             t.subscription_tier,
        compensation_gbp: compensation,
        status:           'pending',
      }
    })

    if (compensationRows.length) {
      await supabase.from('compensation_log').insert(compensationRows)
    }

    const totalCompensation = compensationRows.reduce((s, r) => s + (r.compensation_gbp || 0), 0)
    await supabase.from('incidents').update({ total_compensation_gbp: Math.round(totalCompensation * 100) / 100 }).eq('id', incidentId)

    return res.status(200).json({
      ok: true,
      incident_id: incidentId,
      affected_tenants: affectedTenants.length,
      downtime_minutes: downtimeMinutes,
      total_compensation_gbp: Math.round(totalCompensation * 100) / 100,
      compensation_rows: compensationRows.length,
    })
  }

  // ── scrape-website ─────────────────────────────────────────────────────────
  if (!url) return res.status(400).json({ error: 'URL required' })

  const firecrawlKey = process.env.FIRECRAWL_API_KEY
  if (!firecrawlKey) return res.status(503).json({ error: 'Scraping not configured' })

  const targetUrl = url.startsWith('http') ? url : `https://${url}`

  try {
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, formats: ['markdown'], onlyMainContent: true, waitFor: 2000 }),
    })

    if (!scrapeRes.ok) {
      console.error('Firecrawl error:', await scrapeRes.text())
      return res.status(422).json({ error: 'Could not reach that website. Please check the address and try again.' })
    }

    const scrapeData = await scrapeRes.json()
    const markdown = scrapeData?.data?.markdown || ''

    if (!markdown || markdown.length < 100) {
      return res.status(422).json({ error: 'Not enough content found on that page. Try your homepage URL.' })
    }

    const content = markdown.slice(0, 8000)
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 1024,
      messages: [{ role: 'user', content: `${EXTRACTION_PROMPT}\n\nWebsite content:\n\n${content}` }],
    })

    const raw = response.content[0]?.text?.trim() || '{}'
    let fields
    try { fields = JSON.parse(raw) } catch {
      console.error('Claude returned non-JSON:', raw)
      return res.status(500).json({ error: 'Could not parse website data. Please fill in manually.' })
    }

    const found = Object.entries(fields).filter(([k, v]) => {
      if (['services', 'staff', 'catalogue_items'].includes(k)) return Array.isArray(v) && v.length > 0
      return v !== null && v !== ''
    }).length

    return res.status(200).json({ fields, found })
  } catch (err) {
    console.error('admin/scrape error:', err.message)
    return res.status(500).json({ error: 'Something went wrong. Please fill in your details manually.' })
  }
  } catch (err) {
    console.error('[admin] unhandled error:', err)
    return res.status(500).json({ error: 'Internal server error', message: err.message })
  }
}
