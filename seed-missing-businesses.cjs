const https = require('https')
const PAT = 'sbp_9a977a5ee8b6aa2e764bf10384c53084aeac87c1'

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
        'Content-Length': Buffer.byteLength(body)
      }
    }
    const req = https.request(opts, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve(JSON.parse(d)))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

const esc = s => s.replace(/'/g, "''")

const BUSINESSES = [
  {
    name: 'Bright Cleaning Co',
    tier: 'entry',
    staff: [
      { name: 'Rachel Simmons', role: 'Lead Cleaner', days: [1,2,3,4,5], start: '08:00', end: '17:00' },
      { name: 'Tony Walsh',     role: 'Cleaner',      days: [1,2,3,4,5], start: '08:00', end: '17:00' },
    ],
    services: [
      ['Regular Domestic Clean',  90,  45, 'Weekly or fortnightly home clean. All rooms, surfaces, floors, kitchen and bathrooms.'],
      ['Deep Clean',             180, 120, 'Thorough top-to-bottom clean including inside appliances, behind furniture, all fixtures.'],
      ['End of Tenancy Clean',   240, 150, 'Full property clean to landlord/letting agent standard. Checklist provided on request.'],
      ['Office Clean',           120,  60, 'Commercial office clean. Regular contract or one-off available.'],
      ['Carpet & Upholstery',    120,  80, 'Hot water extraction carpet clean. Per room or whole property pricing.'],
    ],
    products: [
      ['Eco Cleaning Bundle', 18, 'Pack of 5 eco-friendly cleaning products. Safe for homes with children and pets.'],
      ['Microfibre Cloth Set (10pk)', 12, 'Professional-grade microfibre cloths. Streak-free on glass and chrome.'],
    ],
    clients: ['Karen Walsh','Sandra Hughes','Peter Doyle','Linda Morris','Graham Scott','Diane Fletcher','Rob Cannon'],
  },
  {
    name: 'Central Locksmith Ltd',
    tier: 'entry',
    staff: [
      { name: 'Marcus Reid',  role: 'Master Locksmith', days: [1,2,3,4,5,6], start: '08:00', end: '20:00' },
      { name: 'Jo Flanagan',  role: 'Locksmith',        days: [1,2,3,4,5],   start: '09:00', end: '17:00' },
    ],
    services: [
      ['Emergency Lock-out',          60,  95, '24/7 emergency response. Most lock-outs resolved in under 30 minutes.'],
      ['Lock Change',                  75,  55, 'Replace cylinder, mortice or euro-profile lock. All major brands stocked.'],
      ['Key Cutting',                  15,   8, 'Cut to original or code. Keys cut while you wait.'],
      ['Security Assessment',          60,   0, 'Free security survey. Recommendations for upgrading door and window locks.'],
      ['uPVC Door Lock Repair',         75,  65, 'Multipoint locking mechanisms repaired or replaced same day in most cases.'],
    ],
    products: [
      ['High-Security Euro Cylinder (5-pin)', 42, 'Anti-snap, anti-pick, anti-drill. Suitable for most uPVC doors.'],
    ],
    clients: ['David Harley','Sue Newton','Mike Patel','Rebecca Lowe','Chris Tanner','Laura Bell'],
  },
  {
    name: "Dave's Plumbing",
    tid: 'a3f735bb-352d-4fd2-af44-a51373cde4b7',
    tier: 'entry',
    staff: [
      { name: 'Dave Hollis', role: 'Owner & Plumber', days: [1,2,3,4,5], start: '07:30', end: '17:30' },
    ],
    services: [
      ['Boiler Service',            60,  80, 'Annual gas boiler service. Safety check and efficiency report included.'],
      ['Emergency Call-out',        90, 110, 'Same-day emergency plumbing. Burst pipes, leaks, no hot water.'],
      ['Leak Repair',               75,  65, 'Pipe, tap, or fitting leak. Trace and repair. No call-out fee on fixed-price jobs.'],
      ['Bathroom Installation',    600, 450, 'Full bathroom fit. Supply and fit or fit only. Free quote.'],
      ['Radiator Installation',    120, 120, 'New radiator supply and fit. TRV and lockshield valves included.'],
    ],
    products: [],
    clients: ['Janet Marsh','Phil Donovan','Cathy Webb','Alan Cooper','Lisa Baines','Tony Wright'],
  },
  {
    name: 'Highfield Electrical',
    tier: 'multi',
    staff: [
      { name: 'Steve Highfield', role: 'Director & Electrician', days: [1,2,3,4,5], start: '07:30', end: '17:00' },
      { name: 'Dan Okafor',      role: 'Qualified Electrician',  days: [1,2,3,4,5], start: '07:30', end: '17:00' },
      { name: 'Paul Greer',      role: 'Qualified Electrician',  days: [2,3,4,5,6], start: '08:00', end: '17:00' },
    ],
    services: [
      ['Consumer Unit Replacement', 180, 350, 'Full fuse board upgrade to 18th edition standards. Completion certificate issued.'],
      ['EV Charger Installation',   120, 299, 'OZEV-approved installer. 7kW smart charger. OLEV grant paperwork handled.'],
      ['EICR (Electrical Safety Certificate)', 150, 149, 'Full periodic inspection and condition report. Required for landlords.'],
      ['Emergency Call-out',         90, 120, 'Same-day electrical faults. No power, sparking, tripped circuits.'],
      ['New Circuit Installation',  150, 180, 'Sockets, lighting circuits, cooker circuits. Notified work with building control.'],
    ],
    products: [
      ['7kW Smart EV Charger (Zappi)', 599, 'MyEnergi Zappi. App-controlled, solar-divert compatible. Excludes installation.'],
      ['Smart Doorbell (Ring Pro)',    189, 'Ring Video Doorbell Pro 2. Hardwired. Excludes installation.'],
    ],
    clients: ['Brian Foster','Mohammed Iqbal','Claire Henderson','Paul Ashton','Niamh Ryan','Jack Slater'],
  },
  {
    name: 'Lakeside Dental',
    tier: 'multi',
    staff: [
      { name: 'Dr Sarah Whitfield', role: 'Principal Dentist', days: [1,2,3,4,5], start: '08:30', end: '17:30' },
      { name: 'Dr James Okoro',     role: 'Associate Dentist', days: [1,2,4,5],   start: '09:00', end: '17:00' },
      { name: 'Priya Nair',         role: 'Dental Hygienist',  days: [2,3,4],     start: '09:00', end: '16:00' },
    ],
    services: [
      ['New Patient Consultation',  60,  75, 'Full oral examination, X-rays, treatment plan. Includes hygienist assessment.'],
      ['Routine Checkup & Scale',   30,  55, 'Checkup with examination, scale and polish. Recommended every 6 months.'],
      ['Hygienist Appointment',     45,  65, 'Professional clean, stain removal, gum health advice.'],
      ['Composite Filling',         60, 120, 'Tooth-coloured composite resin filling. Single-visit treatment.'],
      ['Teeth Whitening (Zoom)',    75, 350, 'In-chair Zoom whitening. Up to 8 shades lighter. Take-home kit included.'],
    ],
    products: [
      ['Electric Toothbrush (Oral-B iO)', 89, 'Oral-B iO Series 4 with pressure sensor and app connectivity.'],
      ['Professional Whitening Kit', 145, 'Custom-fit trays with professional-grade whitening gel. 10-day course.'],
    ],
    clients: ['Janet Cooper','Robert Miles','Sandra Khan','Tom Bradley','Emma Ross','David Park'],
  },
  {
    name: 'Meridian Property Group',
    tier: 'multi',
    staff: [
      { name: 'James Cavendish', role: 'Director',         days: [1,2,3,4,5], start: '09:00', end: '18:00' },
      { name: 'Sophie Drake',    role: 'Sales Negotiator', days: [1,2,3,4,5], start: '09:00', end: '18:00' },
      { name: 'Rhys Owen',       role: 'Lettings Manager', days: [1,2,3,4,5], start: '09:00', end: '17:30' },
      { name: 'Fiona Bancroft',  role: 'Property Manager', days: [2,3,4,5,6], start: '09:30', end: '17:30' },
    ],
    services: [
      ['Property Valuation',        60,   0, 'Free market appraisal. Includes comparable evidence and current market analysis.'],
      ['Sales Management',          60,   0, 'Full sales service. Photography, listing, viewings, negotiation, progression.'],
      ['Lettings & Management',     60,   0, 'Full lettings management including referencing, deposit, repairs, inspections.'],
      ['Tenant Find Only',          60,   0, 'Marketing, viewings, referencing and tenancy set-up. Landlord self-manages after.'],
      ['Rental Yield Consultation', 45,   0, 'Investment property analysis. Current yield, potential uplift, refinancing guidance.'],
    ],
    products: [],
    clients: ['Michael Stone','Helen Forsyth','Alistair Kerr','Patricia Booth','Neil Sutherland','Karen Lloyd'],
  },
  {
    name: "Sarah's Beauty Studio",
    tid: 'e13c64dd-2f76-4df5-9aef-9e6ecdfe800c',
    tier: 'entry',
    staff: [
      { name: 'Sarah Moran', role: 'Beauty Therapist & Owner', days: [2,3,4,5,6], start: '09:30', end: '18:00' },
    ],
    services: [
      ['Brow Wax & Shape',   30,  18, 'Precision wax and shape to define brow arch. Includes tint option.'],
      ['Lash Lift & Tint',   60,  45, 'Keratin lash lift and tint. Results last 6-8 weeks.'],
      ['Luxury Facial',      75,  65, 'Deep cleanse, exfoliation, mask and facial massage. Tailored to skin type.'],
      ['Gel Manicure',       60,  35, 'Shellac or gel colour. Prep, apply, cure. Lasts 2-3 weeks.'],
      ['Full Body Wax',     120,  70, 'Legs, underarm and bikini. Sensitive wax available.'],
    ],
    products: [
      ['OPI Gel Colour (15ml)',   18, 'Professional gel nail colour. Wide shade range. Salon-grade.'],
      ['Lash Growth Serum (3ml)', 24, 'HD Brows Growth Serum. Apply nightly. Visible results in 4 weeks.'],
    ],
    clients: ['Michelle Carter','Debbie Walsh','Nicola Price','Amy Foster','Claire Adams','Leah Grant'],
  },
]

async function seedBusiness(biz) {
  let tid = biz.tid || null
  if (!tid) {
    const t = await q("SELECT id FROM tenants WHERE business_name = '" + esc(biz.name) + "'")
    if (!t[0]) { console.log('NOT FOUND: ' + biz.name); return }
    tid = t[0].id
  }
  console.log('\n─── ' + biz.name + ' ───')

  await q("UPDATE tenants SET calendar_tier = '" + biz.tier + "' WHERE id='" + tid + "'")
  console.log('  calendar_tier → ' + biz.tier)

  const staffRows = []
  for (const s of biz.staff) {
    const existing = await q("SELECT id FROM staff_profiles WHERE tenant_id='" + tid + "' AND name='" + esc(s.name) + "'")
    if (existing[0]) { staffRows.push({ id: existing[0].id, days: s.days, start: s.start, end: s.end }); continue }
    const ins = await q("INSERT INTO staff_profiles(tenant_id,name,role,active) VALUES ('" + tid + "','" + esc(s.name) + "','" + esc(s.role) + "',true) RETURNING id")
    staffRows.push({ id: ins[0].id, days: s.days, start: s.start, end: s.end })
  }
  console.log('  staff: ' + staffRows.length)

  const availVals = []
  for (const s of staffRows) {
    for (const d of s.days) {
      availVals.push("('" + s.id + "'," + d + ",'" + s.start + "','" + s.end + "',true)")
    }
  }
  if (availVals.length) {
    await q('INSERT INTO staff_availability(staff_profile_id,day_of_week,start_time,end_time,active) VALUES ' + availVals.join(',') + ' ON CONFLICT DO NOTHING')
  }
  console.log('  availability: ' + availVals.length + ' rows')

  const svcIds = []
  for (const [name, dur, price, desc] of biz.services) {
    const ins = await q("INSERT INTO catalogue_items(tenant_id,name,item_type,price_from,price_to,duration_minutes,description,active) VALUES ('" + tid + "','" + esc(name) + "','service'," + price + "," + price + "," + dur + ",'" + esc(desc) + "',true) ON CONFLICT DO NOTHING RETURNING id")
    if (ins[0]) svcIds.push(ins[0].id)
  }
  console.log('  services: ' + svcIds.length)

  for (const [name, price, desc] of (biz.products || [])) {
    await q("INSERT INTO catalogue_items(tenant_id,name,item_type,price_from,price_to,description,active) VALUES ('" + tid + "','" + esc(name) + "','product'," + price + "," + price + ",'" + esc(desc) + "',true) ON CONFLICT DO NOTHING")
  }
  console.log('  products: ' + (biz.products || []).length)

  const svcs = await q("SELECT id, name, duration_minutes FROM catalogue_items WHERE tenant_id='" + tid + "' AND item_type='service' AND active=true")
  if (!svcs.length || !staffRows.length) return

  const now = new Date()
  const appts = []
  const timeSlots = [9, 10, 11, 12, 13, 14, 15, 16]
  const maxPerSlot = biz.tier === 'multi' ? 2 : 1

  for (let d = 1; d <= 21; d++) {
    const date = new Date(now)
    date.setDate(now.getDate() + d)
    const dow = date.getDay()
    const workingStaff = staffRows.filter(s => s.days.includes(dow))
    if (!workingStaff.length) continue

    const slotUsage = {}
    timeSlots.forEach(s => slotUsage[s] = 0)
    const shuffled = [...workingStaff].sort(() => Math.random() - 0.5)

    for (const st of shuffled) {
      let assigned = 0
      const slotOrder = [...timeSlots].sort(() => Math.random() - 0.5)
      for (const slot of slotOrder) {
        if (assigned >= 2) break
        if (slotUsage[slot] >= maxPerSlot) continue
        slotUsage[slot]++
        assigned++
        const svc = svcs[Math.floor(Math.random() * svcs.length)]
        const dur = svc.duration_minutes || 60
        const start = new Date(date); start.setHours(slot, 0, 0, 0)
        const end = new Date(start.getTime() + dur * 60000)
        const client = biz.clients[Math.floor(Math.random() * biz.clients.length)]
        appts.push("('" + tid + "','" + svc.id + "','" + esc(svc.name + ' — ' + client) + "','" + start.toISOString() + "','" + end.toISOString() + "','" + esc(svc.name) + "','" + esc(client) + "','" + st.id + "','confirmed')")
      }
    }
  }

  for (let i = 0; i < appts.length; i += 100) {
    await q('INSERT INTO appointments(tenant_id,service_id,title,start_time,end_time,appointment_type,client_name,staff_profile_id,status) VALUES ' + appts.slice(i, i+100).join(','))
  }
  console.log('  appointments: ' + appts.length)
}

async function main() {
  for (const biz of BUSINESSES) {
    await seedBusiness(biz)
  }
  console.log('\nAll done.')
}

main().catch(console.error)
