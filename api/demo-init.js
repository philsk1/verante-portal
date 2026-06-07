// One-time demo initialisation endpoint.
// POST { ownerEmail } → creates 4 real Supabase auth accounts + seeds demo data.
// Run once only. Safe to re-run (deletes existing demo tenants first).

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const OWNER_EMAIL  = 'finsolsoffice@gmail.com'
const DEMO_PASSWORD = 'QerxelDemo2026!'

const BUSINESSES = [
  {
    email: 'demo-plumber@qerxel.app',
    tier: 'light',
    included_minutes: 120,
    business_name: "Henderson's Plumbing",
    business_type: 'trades',
    business_phone: '0114 278 4422',
    business_email: 'info@hendersonsplumbing.co.uk',
    business_address: '14 Millbrook Lane, Sheffield, S6 4RP',
    opening_hours: 'Mon–Fri 7:30am–6pm, Sat 8am–1pm',
    lead_contact_name: 'Dave Henderson',
    business_context: "Henderson's Plumbing is a Sheffield-based sole trader specialising in residential plumbing repairs, boiler servicing, and emergency callouts. Operating since 2009, the business handles 15–20 calls per week from homeowners across South Yorkshire.",
    triage_mode: 'balanced',
    tone_register: 'warm',
    business_outcome_type: 'callback',
    greeting_message: "You've reached Henderson's Plumbing. We're busy on the tools right now — leave your name and number and Dave will call you back shortly.",
    staff: [],
    catalogue: [
      { item_type: 'service', name: 'Emergency Callout', description: 'Same-day emergency plumbing callout', price_from: 95, price_to: 150, duration_minutes: 60 },
      { item_type: 'service', name: 'Boiler Service', description: 'Annual boiler service and safety check', price_from: 85, price_to: 85, duration_minutes: 90 },
      { item_type: 'service', name: 'Leak Repair', description: 'Standard pipe or tap leak repair', price_from: 65, price_to: 120, duration_minutes: 45 },
    ],
    partners: [
      { business_name: 'Sheffield Building Merchants', business_phone: '0114 244 3100' },
    ],
    callSummaries: [
      'Caller has a leaking pipe under the kitchen sink — urgent. Captured name and number for callback.',
      'Annual boiler service inquiry — 3-bed semi, Worcester Bosch. Lead captured.',
      'Emergency callout for no hot water. Directed to call back urgently.',
      'Customer asking about cost of new bathroom tap fitting. Quote requested.',
      'Central heating not working — radiators cold. Captured as urgent lead.',
      'Caller wants a quote for replacing all radiator valves.',
      'Blocked drain — caller not sure if plumbing or outside drain. Callback scheduled.',
      'Boiler making banging noise. Customer worried — lead captured.',
      'Inquiry about fitting a new shower — mixer or electric. Lead captured.',
      'Cold water tank replacement — loft conversion. Quote requested.',
    ],
    callOutcomes: ['lead_captured', 'lead_captured', 'callback_scheduled', 'lead_captured', 'lead_captured', 'callback_scheduled', 'lead_captured', 'lead_captured', 'callback_scheduled', 'lead_captured'],
    leadNames: ['Janet Morris', 'Rob Fletcher', 'Diane Walsh', 'Colin Sykes', 'Margaret Burns', 'Tony Patel', 'Sue Whitfield', 'Gary Brooks', 'Rachel Holt', 'Ian Stafford', 'Pam Jennings', 'Dave Thornton'],
    partnerName: 'Sheffield Building Merchants',
  },
  {
    email: 'demo-salon@qerxel.app',
    tier: 'standard',
    included_minutes: 250,
    business_name: 'Meridian Hair & Beauty',
    business_type: 'beauty',
    business_phone: '0121 445 7831',
    business_email: 'hello@meridianhair.co.uk',
    business_address: '88 Stratford Road, Birmingham, B11 1AN',
    opening_hours: 'Tue–Sat 9am–7pm, Sun 10am–4pm',
    lead_contact_name: 'Priya Sharma',
    business_context: 'Meridian Hair & Beauty is a boutique salon in Birmingham offering full hair services, colour treatments, and nail care. The salon operates with three stylists and handles significant appointment booking traffic by phone.',
    triage_mode: 'balanced',
    tone_register: 'warm',
    business_outcome_type: 'booking',
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
      'Inquiry about full colour price — blonde to brunette transition. Quote given.',
      'Bridal party booking inquiry — 4 people, late August. Lead captured urgently.',
      'Rebook request — regular client Janet wants her usual monthly trim.',
      'Caller asking about highlights — wants a consultation first. Booked in.',
      'Gel manicure booking for Friday afternoon. Lead captured.',
      'New client asking about balayage pricing. Full explanation given, lead captured.',
      'Caller wants to change existing appointment from Tuesday to Thursday.',
      'Gift voucher inquiry — birthday present for daughter. Lead captured.',
      'Inquiry about keratin smoothing treatment. Directed to website for details.',
      'Lash lift and tint appointment booking. Lead captured.',
      'Complaint call — colour not as expected. Transferred to manager note.',
    ],
    callOutcomes: ['lead_captured', 'resolved', 'lead_captured', 'lead_captured', 'lead_captured', 'lead_captured', 'lead_captured', 'callback_scheduled', 'lead_captured', 'resolved', 'lead_captured', 'callback_scheduled'],
    leadNames: ['Sarah Mitchell', 'Emma Clark', 'Janet Powell', 'Lucy Barnes', 'Amara Osei', 'Claire Fenn', 'Donna Reid', 'Nikki Patel', 'Jo Whitaker', 'Bex Lowe', 'Sophie Wu', 'Yemi Adams', 'Rachel Cooke', 'Faye Doran', 'Kate Hodge'],
    partnerName: 'The Skin Retreat Spa',
  },
  {
    email: 'demo-physio@qerxel.app',
    tier: 'professional',
    included_minutes: 450,
    business_name: 'Restore Physiotherapy',
    business_type: 'health',
    business_phone: '0161 834 5600',
    business_email: 'appointments@restorephysio.co.uk',
    business_address: '24 John Dalton Street, Manchester, M2 6HP',
    opening_hours: 'Mon–Fri 7:30am–7pm, Sat 8am–2pm',
    lead_contact_name: 'Dr Sarah Okafor',
    business_context: 'Restore Physiotherapy is a Manchester city centre private clinic offering physiotherapy, sports injury rehabilitation, and clinical Pilates. The practice has three registered physiotherapists and sees 40–50 patients per week.',
    triage_mode: 'sensitive',
    tone_register: 'professional',
    business_outcome_type: 'booking',
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
      'New patient inquiry — lower back pain following desk work. Initial assessment booked.',
      'GP referral for knee ligament rehabilitation post-surgery. Urgent appointment requested.',
      'Caller asking about clinical Pilates for core stability. Lead captured.',
      'Sports injury — runner with Achilles tendinopathy. James Walsh requested specifically.',
      'Existing patient rebook — Sarah Okafor. Monthly maintenance session.',
      'Insurance query — AXA PPP coverage for physio. Directed to check policy and call back.',
      'Post-op shoulder rehab inquiry — 3 weeks post rotator cuff surgery.',
      'Corporate wellness inquiry — 6 staff members, monthly sessions. Referred to admin.',
      'Neck and shoulder pain — office worker. Initial assessment lead captured.',
      'Frozen shoulder — 6 months history. Urgent appointment requested.',
      'Child patient — 14yo swimmer with hip pain. Parent caller. Lead captured.',
      'Inquiry about sports massage vs physiotherapy. Explained difference, booked assessment.',
    ],
    callOutcomes: ['lead_captured', 'lead_captured', 'lead_captured', 'lead_captured', 'lead_captured', 'callback_scheduled', 'lead_captured', 'referral_made', 'lead_captured', 'lead_captured', 'lead_captured', 'lead_captured'],
    leadNames: ['Michael Chen', 'Abi Clarke', 'Tom Fitzgerald', 'Rachel Hurst', 'David Okafor', 'Sara Malik', 'Neil Brennan', 'Fiona Grant', 'Pete Lawson', 'Amy Sherwood', 'Jake Williams', 'Carol Mistry', 'Steve Barker', 'Olivia Nash', 'Ravi Patel', 'Helen Ford', 'Dan Kowalski', 'Tasha Brown', 'Matt Ellison', 'Grace Tong'],
    partnerName: 'Active Sports Club Manchester',
  },
  {
    email: 'demo-electrical@qerxel.app',
    tier: 'enterprise',
    included_minutes: 1000,
    business_name: 'Apex Electrical Services',
    business_type: 'trades',
    business_phone: '020 8432 7700',
    business_email: 'info@apexelectrical.co.uk',
    business_address: '3 Commerce Way, Croydon, CR0 4XA',
    opening_hours: 'Mon–Fri 7am–6pm, emergency 24/7',
    lead_contact_name: 'Marcus Dean',
    business_context: 'Apex Electrical Services is a London-based electrical contractor serving residential, commercial, and industrial clients. With a team of 8 qualified electricians, the company handles everything from consumer unit upgrades to full commercial fit-outs.',
    triage_mode: 'aggressive',
    tone_register: 'professional',
    business_outcome_type: 'quote',
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
      'Commercial inquiry — new restaurant fit-out in Croydon, 4,000 sq ft. Lead captured for Marcus.',
      'Residential — consumer unit upgrade needed for extension work. Quote requested.',
      'EICR certification needed for letting agent — 3-bed flat. Lead captured.',
      'EV charger installation inquiry — Tesla driver, semi-detached with garage.',
      'Emergency — power tripped and won\'t reset. Urgent callback within 15 minutes.',
      'Solar PV inquiry — 5-bed detached, south-facing roof. Survey requested.',
      'PAT testing for 40 appliances — office in Streatham. Corporate lead.',
      'House purchase survey — buyer wants full rewire quote before exchange.',
      'Fault finding — lights flickering in kitchen for 3 weeks. Lead captured.',
      'Landlord — 6 rental properties need EICR certificates urgently. Major lead.',
      'Commercial — shop refit, new lighting circuit needed. Referred to Owen.',
      'Outdoor power — hot tub installation, armoured cable needed. Quote requested.',
    ],
    callOutcomes: ['lead_captured', 'lead_captured', 'lead_captured', 'lead_captured', 'callback_scheduled', 'lead_captured', 'lead_captured', 'lead_captured', 'callback_scheduled', 'lead_captured', 'referral_made', 'lead_captured'],
    leadNames: ['Chris Hammond', 'Diane Patel', 'Ben Foster', 'Kelly Marsh', 'Andrew Yip', 'Natasha Romero', 'Ed Flanagan', 'Priya Nair', 'Rob Sinclair', 'Jess Okafor', 'Toby Watts', 'Layla Ahmed', 'Gary Stubbs', 'Anna Kowalski', 'Mike Davey', 'Claire Webb', 'Sam Burton', 'Fran Ogden', 'Des Murphy', 'Iona McLeod', 'Phil Tanner', 'Zara Khan', 'Noel Brady', 'Cath Rawlings', 'Tim Shore'],
    partnerName: 'BuildRight Construction',
  },
]

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateCalls(tenantId, biz) {
  const rows = []
  const phones = ['07712 334 451', '07823 661 290', '07934 772 001', '07651 229 882', '07788 441 763', '07900 112 445', '07543 871 229', '07612 990 334']
  for (let day = 29; day >= 0; day--) {
    const callsThisDay = randomBetween(
      biz.tier === 'enterprise' ? 5 : biz.tier === 'professional' ? 3 : 2,
      biz.tier === 'enterprise' ? 10 : biz.tier === 'professional' ? 7 : 5,
    )
    for (let i = 0; i < callsThisDay; i++) {
      const base = daysAgo(day)
      base.setHours(randomBetween(8, 17), randomBetween(0, 59), 0, 0)
      const summaryIdx = Math.floor(Math.random() * biz.callSummaries.length)
      const outcomeIdx = Math.floor(Math.random() * biz.callOutcomes.length)
      rows.push({
        tenant_id: tenantId,
        created_at: base.toISOString(),
        duration_seconds: randomBetween(45, 280),
        call_outcome: biz.callOutcomes[outcomeIdx],
        ai_summary: biz.callSummaries[summaryIdx],
        caller_phone: phones[Math.floor(Math.random() * phones.length)],
      })
    }
  }
  return rows
}

function generateLeads(tenantId, biz) {
  const statuses = ['new', 'new', 'new', 'contacted', 'contacted', 'converted', 'converted', 'lost']
  const notes = [
    'Called back — left voicemail.',
    'Sent quote via email.',
    'Awaiting response.',
    'Booked in for next week.',
    'Job completed.',
    '',
    'Follow up Monday.',
    'Not suitable at this time.',
  ]
  return biz.leadNames.map((name, i) => ({
    tenant_id: tenantId,
    created_at: daysAgo(randomBetween(0, 28)).toISOString(),
    status: statuses[i % statuses.length],
    lead_contact_name: name,
    ai_summary: biz.callSummaries[i % biz.callSummaries.length],
    notes: notes[i % notes.length],
  }))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { ownerEmail } = req.body
  if (ownerEmail !== OWNER_EMAIL) return res.status(403).json({ error: 'Forbidden' })

  const log = []

  try {
    // Remove existing demo tenants first (clean re-run)
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
      ])
      await supabase.from('tenants').delete().in('id', ids)
      log.push(`Cleared ${ids.length} existing demo tenants`)
    }

    for (const biz of BUSINESSES) {
      // Create auth user (or fetch existing)
      let userId
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users?.find(u => u.email === biz.email)

      if (existing) {
        userId = existing.id
        log.push(`Using existing auth user: ${biz.email}`)
      } else {
        const { data: created, error: userErr } = await supabase.auth.admin.createUser({
          email: biz.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
        })
        if (userErr) {
          log.push(`WARN: Could not create user ${biz.email}: ${userErr.message}`)
          continue
        }
        userId = created.user.id
        log.push(`Created auth user: ${biz.email}`)
      }

      // Create tenant
      const { data: tenant, error: tenantErr } = await supabase.from('tenants').insert({
        business_name: biz.business_name,
        subscription_tier: biz.tier,
        included_minutes: biz.included_minutes,
        business_phone: biz.business_phone,
        business_email: biz.business_email,
        business_address: biz.business_address,
        opening_hours: biz.opening_hours,
        lead_contact_name: biz.lead_contact_name,
        business_context: biz.business_context,
        triage_mode: biz.triage_mode,
        tone_register: biz.tone_register,
        business_outcome_type: biz.business_outcome_type,
        greeting_message: biz.greeting_message,
        is_demo: true,
      }).select('id').single()

      if (tenantErr) { log.push(`ERROR creating tenant ${biz.business_name}: ${tenantErr.message}`); continue }
      const tid = tenant.id
      log.push(`Created tenant: ${biz.business_name} (${tid})`)

      // Membership
      await supabase.from('tenant_memberships').insert({ tenant_id: tid, user_id: userId, role: 'owner' })

      // Staff
      if (biz.staff.length) {
        await supabase.from('staff_profiles').insert(biz.staff.map(s => ({ ...s, tenant_id: tid })))
        log.push(`Seeded ${biz.staff.length} staff`)
      }

      // Catalogue
      if (biz.catalogue.length) {
        await supabase.from('catalogue_items').insert(biz.catalogue.map(c => ({ ...c, tenant_id: tid, active: true })))
        log.push(`Seeded ${biz.catalogue.length} catalogue items`)
      }

      // Partners
      if (biz.partners.length) {
        const { data: insertedPartners } = await supabase.from('referral_partners').insert(
          biz.partners.map(p => ({ ...p, tenant_id: tid, agreed: true }))
        ).select('id')
        log.push(`Seeded ${biz.partners.length} partners`)

        // Referral log entries (point to first partner)
        if (insertedPartners?.length) {
          const partnerId = insertedPartners[0].id
          const refRows = Array.from({ length: randomBetween(8, 18) }, (_, i) => ({
            tenant_id: tid,
            partner_id: partnerId,
            created_at: daysAgo(randomBetween(0, 29)).toISOString(),
            caller_name: `Demo Caller ${i + 1}`,
            reason: 'Caller out of scope — referred to network partner',
          }))
          await supabase.from('referral_log').insert(refRows)
          log.push(`Seeded ${refRows.length} referral log entries`)
        }
      }

      // Calls
      const calls = generateCalls(tid, biz)
      await supabase.from('call_logs').insert(calls)
      log.push(`Seeded ${calls.length} call logs`)

      // Leads
      const leads = generateLeads(tid, biz)
      await supabase.from('leads').insert(leads)
      log.push(`Seeded ${leads.length} leads`)
    }

    return res.status(200).json({ ok: true, log })
  } catch (err) {
    console.error('demo-init error:', err)
    return res.status(500).json({ error: err.message, log })
  }
}
