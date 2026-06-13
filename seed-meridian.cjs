// Meridian Hair & Beauty — demo data seed
// Run with: NODE_OPTIONS=--use-system-ca node seed-meridian.cjs

const https = require('https')

const PAT = 'sbp_9a977a5ee8b6aa2e764bf10384c53084aeac87c1'
const TID = 'c648ca9c-4e33-4587-8281-a258bba2f029'

function q(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const opts = {
      hostname: 'api.supabase.com',
      path: '/v1/projects/kkrsvkxkefijmtbwykzv/database/query',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + PAT,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }
    const req = https.request(opts, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve(d) } })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

const CALLERS = [
  { name: 'Amara Osei',        phone: '+447700900101' },
  { name: 'Sophie Hartley',    phone: '+447700900102' },
  { name: 'Diane Fletcher',    phone: '+447700900103' },
  { name: 'Karen Whitfield',   phone: '+447700900104' },
  { name: 'Natasha Patel',     phone: '+447700900105' },
  { name: 'Gemma Rowlands',    phone: '+447700900106' },
  { name: 'Lisa Beaumont',     phone: '+447700900107' },
  { name: 'Tanya Okafor',      phone: '+447700900108' },
  { name: 'Rebecca Simmons',   phone: '+447700900109' },
  { name: 'Claire Ng',         phone: '+447700900110' },
  { name: 'Michelle Brooks',   phone: '+447700900111' },
  { name: 'Fiona Chukwu',      phone: '+447700900112' },
  { name: 'Sarah Ahmed',       phone: '+447700900113' },
  { name: 'Zoe Cartwright',    phone: '+447700900114' },
  { name: 'Helen Bradshaw',    phone: '+447700900115' },
  { name: 'Priscilla King',    phone: '+447700900116' },
  { name: 'Nina Kowalski',     phone: '+447700900117' },
  { name: 'Donna Blackwell',   phone: '+447700900118' },
  { name: 'Anjali Mehta',      phone: '+447700900119' },
  { name: 'Caitlin Ryan',      phone: '+447700900120' },
  { name: 'Tracey Goodwin',    phone: '+447700900121' },
  { name: 'Joyce Adeyemi',     phone: '+447700900122' },
  { name: 'Emma Sanderson',    phone: '+447700900123' },
  { name: 'Pauline Cross',     phone: '+447700900124' },
  { name: 'Harriet Moss',      phone: '+447700900125' },
  { name: 'Valerie Stein',     phone: '+447700900126' },
  { name: 'Bridget Nwosu',     phone: '+447700900127' },
  { name: 'Alison Forde',      phone: '+447700900128' },
  { name: 'Jade Thompson',     phone: '+447700900129' },
  { name: 'Carolyn Banks',     phone: '+447700900130' },
  { name: 'Sharon Ellison',    phone: '+447700900131' },
  { name: 'Fatima Al-Hassan',  phone: '+447700900132' },
  { name: 'Patricia Owens',    phone: '+447700900133' },
  { name: 'Melissa Daley',     phone: '+447700900134' },
  { name: 'Abigail Frost',     phone: '+447700900135' },
  { name: 'Denise Obi',        phone: '+447700900136' },
  { name: 'Mandy Sherwood',    phone: '+447700900137' },
  { name: 'Yvonne Clarke',     phone: '+447700900138' },
  { name: 'Sandra Okonkwo',    phone: '+447700900139' },
  { name: 'Beverley Walsh',    phone: '+447700900140' },
  { name: 'Simone Draper',     phone: '+447700900141' },
  { name: 'Theresa Quinn',     phone: '+447700900142' },
  { name: 'Ruth Adebayo',      phone: '+447700900143' },
  { name: 'Georgina Lyle',     phone: '+447700900144' },
  { name: 'Annette Pearson',   phone: '+447700900145' },
]

const CATALOGUE_ADDITIONS = [
  { name: 'Cut & Blow Dry (Long Hair)', item_type: 'service', price_from: 55, price_to: 75, duration_minutes: 75, description: 'Wash, cut, and blow dry for longer hair. Includes scalp massage.' },
  { name: "Men's Cut & Style", item_type: 'service', price_from: 28, price_to: 35, duration_minutes: 30, description: 'Short back and sides with finish. Includes hot towel.' },
  { name: 'Balayage', item_type: 'service', price_from: 130, price_to: 185, duration_minutes: 165, description: 'Hand-painted freehand colouring for a natural, sun-kissed finish.' },
  { name: 'Root Tint', item_type: 'service', price_from: 55, price_to: 75, duration_minutes: 60, description: 'Root colour touch-up using professional permanent tint.' },
  { name: 'Blow Dry Only', item_type: 'service', price_from: 30, price_to: 42, duration_minutes: 45, description: 'Wash and blow dry, no cut. Style to your preference.' },
  { name: 'Keratin Smoothing Treatment', item_type: 'service', price_from: 175, price_to: 225, duration_minutes: 180, description: 'Eliminates frizz and reduces curl for 3-4 months. Results immediate.' },
  { name: 'Olaplex Bond Repair', item_type: 'service', price_from: 45, price_to: 60, duration_minutes: 45, description: 'Intensive bond repair treatment. Ideal post-colour or for damaged hair.' },
  { name: 'Bridal Trial & Updo', item_type: 'service', price_from: 90, price_to: 130, duration_minutes: 90, description: 'Pre-wedding trial and final updo styling session. Includes accessories consultation.' },
  { name: 'Toner / Gloss', item_type: 'service', price_from: 30, price_to: 45, duration_minutes: 30, description: 'Refreshes colour, adds shine, neutralises brassiness. Perfect between colours.' },
  { name: 'Full Head Highlights', item_type: 'service', price_from: 120, price_to: 165, duration_minutes: 150, description: 'Classic full head foil highlights with toner finish.' },
  { name: 'Half Head Highlights', item_type: 'service', price_from: 80, price_to: 115, duration_minutes: 105, description: 'Foil highlights on the top section and hairline.' },
  { name: 'Scalp Treatment', item_type: 'service', price_from: 40, price_to: 55, duration_minutes: 30, description: 'Deep conditioning scalp treatment for dryness, sensitivity, or dandruff.' },
  { name: 'Eyebrow Tinting', item_type: 'service', price_from: 12, price_to: 18, duration_minutes: 20, description: 'Semi-permanent tint matched to your hair colour.' },
  { name: 'Gel Nails (Full Set)', item_type: 'service', price_from: 38, price_to: 48, duration_minutes: 60, description: 'Full set gel nails. Choice of colour or French finish.' },
  { name: 'Nail Removal & Re-set', item_type: 'service', price_from: 42, price_to: 55, duration_minutes: 75, description: 'Safe removal of existing gel or acrylic and fresh full set.' },
  { name: 'Brazilian Blowout', item_type: 'service', price_from: 160, price_to: 200, duration_minutes: 120, description: 'Professional smoothing treatment lasting up to 12 weeks.' },
]

const CALL_TEMPLATES = [
  { outcome: 'booked',        dur: 140, summary: (n) => `${n} booked a cut and blow dry with Priya for Saturday at 11am.` },
  { outcome: 'booked',        dur: 115, summary: (n) => `${n} booked a balayage with Chloe. First-time client, patch test required.` },
  { outcome: 'booked',        dur: 95,  summary: (n) => `${n} rebooked for a blow dry ahead of a work event. Same day at 4pm.` },
  { outcome: 'booked',        dur: 130, summary: (n) => `${n} booked an Olaplex treatment and blow dry. Saturday 2pm with Chloe.` },
  { outcome: 'booked',        dur: 108, summary: (n) => `${n} booked a full head of highlights with Chloe.` },
  { outcome: 'booked',        dur: 122, summary: (n) => `${n} booked root tint. 45 minutes with Priya on Wednesday.` },
  { outcome: 'lead_captured', dur: 88,  summary: (n) => `${n} enquired about full head highlights cost. Given price range. Priya to follow up.` },
  { outcome: 'lead_captured', dur: 102, summary: (n) => `${n} interested in keratin treatment. Asked about longevity and aftercare. Chloe to call back.` },
  { outcome: 'lead_captured', dur: 118, summary: (n) => `${n} asking about bridal packages for August. Interested in updo plus bridesmaids.` },
  { outcome: 'lead_captured', dur: 75,  summary: (n) => `${n} asked about balayage pricing and availability.` },
  { outcome: 'lead_captured', dur: 91,  summary: (n) => `${n} enquired about nail services and gel sets. Details taken.` },
  { outcome: 'filtered',      dur: 35,  summary: (n) => `Sales call from hair product supplier. Declined politely.` },
  { outcome: 'filtered',      dur: 20,  summary: (n) => `Wrong number. Caller looking for different salon.` },
  { outcome: 'filtered',      dur: 28,  summary: (n) => `Automated call detected. Ended immediately.` },
  { outcome: 'escalated',     dur: 185, summary: (n) => `${n} unhappy with colour result from last week. Distressed caller. Priya notified as urgent.` },
  { outcome: 'referred_out',  dur: 65,  summary: (n) => `${n} asking about nail extensions (acrylic). Referred to Luxe Nails on Ladypool Road.` },
  { outcome: 'referred_out',  dur: 58,  summary: (n) => `${n} looking for waxing services. Referred to Beauty Suite upstairs.` },
]

// Weighted indices: 6 booked, 5 lead_captured, 3 filtered, 1 escalated, 2 referred_out
const WEIGHTS = [0,0,0,0,0,0, 6,7,8,9,10, 11,12,13, 14, 15,16]

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  const day = d.getDay()
  if (day === 0) d.setDate(d.getDate() + 2)
  if (day === 1) d.setDate(d.getDate() + 1)
  d.setHours(randomInt(9, 17), randomInt(0, 59), randomInt(0, 59))
  return d
}

const esc = (s) => String(s).replace(/'/g, "''")

async function main() {
  console.log('Starting Meridian seed...')

  // 1. Upgrade tenant
  await q(`UPDATE tenants SET
    subscription_tier = 'professional',
    calendar_tier = 'multi',
    included_minutes = 450,
    sms_followup_enabled = true,
    sms_followup_message = 'Hi [name], thanks for calling Meridian Hair & Beauty. Priya or Chloe will be in touch very soon.',
    booking_link = 'https://meridianhair.co.uk/book',
    business_context = 'Meridian Hair & Beauty is an award-winning boutique salon on Stratford Road, Birmingham. Established in 2018, the salon has built a loyal client base across South Birmingham with a reputation for exceptional colour work, creative styling, and genuine care. Led by Senior Stylist Priya Sharma and Colour Specialist Chloe Bennett. Services include cuts, colours, balayage, keratin treatments, and nail care. Products: Olaplex and Schwarzkopf Professional. Booking link: meridianhair.co.uk/book.',
    notify_new_lead = true,
    lead_contact_name = 'Priya',
    keep_alive_topics = ARRAY['appointment booking', 'product enquiry', 'senior citizen', 'bridal', 'colour consultation']
  WHERE id = '${TID}'`)
  console.log('1/7 Tenant profile upgraded.')

  // 2. Clear old call logs without caller links (they were placeholder data)
  await q(`DELETE FROM call_logs WHERE tenant_id = '${TID}' AND caller_id IS NULL`)
  console.log('2/7 Old unlinked call logs cleared.')

  // 3. Catalogue
  for (const item of CATALOGUE_ADDITIONS) {
    await q(`INSERT INTO catalogue_items (tenant_id, name, item_type, price_from, price_to, duration_minutes, description, active)
      VALUES ('${TID}', '${esc(item.name)}', '${item.item_type}', ${item.price_from}, ${item.price_to}, ${item.duration_minutes}, '${esc(item.description)}', true)
      ON CONFLICT DO NOTHING`)
  }
  console.log('3/7 Catalogue items added.')

  // 4. Callers — column is full_name not name
  const callerIds = {}
  for (const c of CALLERS) {
    const rows = await q(`INSERT INTO callers (phone_number, full_name)
      VALUES ('${c.phone}', '${esc(c.name)}')
      ON CONFLICT (phone_number) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id`)
    if (Array.isArray(rows) && rows[0]) callerIds[c.phone] = rows[0].id
  }
  console.log('4/7 Callers created:', Object.keys(callerIds).length)

  // 5. Call logs — 280 calls from Jan 2025 to Jun 2026
  const startDate = new Date('2025-01-06')
  const endDate   = new Date('2026-06-08')
  const callRecords = []

  for (let i = 0; i < 280; i++) {
    const tIdx     = randomItem(WEIGHTS)
    const template = CALL_TEMPLATES[tIdx]
    const caller   = randomItem(CALLERS)
    const cid      = callerIds[caller.phone]
    if (!cid) continue
    const firstName = caller.name.split(' ')[0]
    const date     = randomDate(startDate, endDate)
    const duration = Math.max(18, template.dur + randomInt(-25, 35))
    const summary  = template.summary(firstName)

    const row = await q(`INSERT INTO call_logs (tenant_id, caller_id, caller_phone, duration_seconds, ai_summary, call_outcome, created_at)
      VALUES ('${TID}', '${cid}', '${caller.phone}', ${duration}, '${esc(summary)}', '${template.outcome}', '${date.toISOString()}')
      RETURNING id`)
    if (Array.isArray(row) && row[0]) {
      callRecords.push({ id: row[0].id, cid, caller, outcome: template.outcome, date })
    }
    if (i % 50 === 49) process.stdout.write(`   ${i+1}/280\n`)
  }
  console.log('5/7 Call logs created:', callRecords.length)

  // 6. Leads
  let leads = 0
  for (const cl of callRecords) {
    if (cl.outcome === 'booked' || cl.outcome === 'lead_captured') {
      await q(`INSERT INTO leads (tenant_id, caller_id, call_log_id, lead_contact_name, ai_summary, status, created_at)
        VALUES ('${TID}', '${cl.cid}', '${cl.id}',
        '${esc(cl.caller.name)}',
        '${cl.outcome === "booked" ? "Appointment booked via AI call handling." : "Inbound enquiry — follow-up required."}',
        '${cl.outcome === "booked" ? "won" : "new"}',
        '${cl.date.toISOString()}')`)
      leads++
    }
  }
  console.log('6/7 Leads created:', leads)

  // 7. Caller-tenant relationships
  const ctrNotes = [
    'Prefers Priya. Sensitive scalp — use gentle shampoo only.',
    'Regular cut & colour every 8 weeks. Loyal client since 2019.',
    'Balayage only. Always books Chloe. Note: allergic to PPD dye.',
    'VIP client. Director at local firm. Needs same-day confirmation.',
    'Prefers early Saturday mornings. Generous tipper.',
    'Long hair — colour appointments take 3+ hours. Book double slot.',
    'New client — referred by Sophie Hartley.',
    'Bridal booking August — updo plus 2 bridesmaids.',
    'Regular Friday blow dry before weekend.',
    'Senior client — patient and thorough approach appreciated.',
    null, null, null,
  ]
  const uniqueCallerIds = [...new Set(callRecords.map(c => c.cid).filter(Boolean))]
  for (const cid of uniqueCallerIds) {
    const note = randomItem(ctrNotes)
    const hot  = Math.random() < 0.25
    await q(`INSERT INTO caller_tenant_relationships (tenant_id, caller_id, notes, is_hot_prospect, marketing_opted_out)
      VALUES ('${TID}', '${cid}', ${note ? `'${esc(note)}'` : 'NULL'}, ${hot}, false)
      ON CONFLICT (tenant_id, caller_id) DO UPDATE
        SET notes = EXCLUDED.notes, is_hot_prospect = EXCLUDED.is_hot_prospect`)
  }
  console.log('7/7 Client relationships:', uniqueCallerIds.length)

  // Bonus: 3rd staff member
  await q(`INSERT INTO staff_profiles (tenant_id, name, role, specialist_services, active)
    VALUES ('${TID}', 'Marcus Webb', 'Junior Stylist', 'Men''s cuts, blow dries, wet shaves', true)
    ON CONFLICT DO NOTHING`)

  console.log('\nSeed complete! Meridian is ready for demo.')
}

main().catch(console.error)
