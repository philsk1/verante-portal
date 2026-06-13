const https = require('https')
const PAT = require('fs').readFileSync('.env', 'utf8').match(/SUPABASE_PAT=(.+)/)[1].trim()

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
      res.on('end', () => resolve(JSON.parse(d)))
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// Each entry: business name, array of staff schedules
// days: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
const SCHEDULES = [
  {
    business: 'Apex Electrical Services',
    staff: [
      { name: 'Marcus Dean',     days: [1,2,3,4,5], start: '07:30', end: '17:30' },
      { name: 'Fatima Al-Hassan',days: [1,2,3,4,5], start: '08:00', end: '17:30' },
      { name: 'Owen Richards',   days: [1,2,3,4,5,6], start: '08:00', end: '16:00' },
    ],
  },
  {
    business: 'Blackwood Restoration',
    staff: [
      { name: 'Robert Blackwood', days: [1,2,3,4,5], start: '08:00', end: '17:30' },
      { name: 'Amy Blackwood',    days: [1,2,3,4,5], start: '08:00', end: '17:00' },
      { name: 'Kevin Harper',     days: [1,2,3,4,5,6], start: '07:30', end: '16:30' },
    ],
  },
  {
    business: 'Clarity Yoga & Wellbeing Studio',
    staff: [
      { name: 'Priya Sharma', days: [1,2,3,4,5,6], start: '07:00', end: '20:00' },
    ],
  },
  {
    business: 'Greenfield Landscape Gardening',
    staff: [
      { name: 'James Greenfield', days: [1,2,3,4,5], start: '07:30', end: '17:00' },
      { name: 'Billy Sharpe',     days: [1,2,3,4,5], start: '07:30', end: '17:00' },
      { name: 'Pete Walsh',       days: [1,2,3,4,5,6], start: '08:00', end: '16:00' },
      { name: 'Rachel Drummond',  days: [1,2,3,4,5], start: '08:00', end: '17:00' },
      { name: 'Tom Kaur',         days: [2,3,4,5,6], start: '08:00', end: '17:00' },
    ],
  },
  {
    business: 'Paws & Claws Dog Grooming',
    staff: [
      { name: 'Sarah Chen',  days: [2,3,4,5,6], start: '09:00', end: '17:30' },
      { name: 'Molly Grant', days: [2,3,4,5,6], start: '09:00', end: '17:30' },
      { name: 'Abbie Shaw',  days: [1,2,3,4,5], start: '09:30', end: '17:30' },
    ],
  },
  {
    business: 'Restore Physiotherapy',
    staff: [
      { name: 'Dr Sarah Okafor', days: [1,2,3,4,5], start: '08:00', end: '18:00' },
      { name: 'James Walsh',     days: [1,2,3,4,5,6], start: '08:30', end: '17:00' },
    ],
  },
  {
    business: "Sarah's Bridal Alterations",
    staff: [
      { name: 'Jenny Walters', days: [2,3,4,5,6], start: '10:00', end: '18:00' },
    ],
  },
  {
    business: 'Swift Electrical',
    staff: [
      { name: 'Dave Swift',   days: [1,2,3,4,5], start: '07:30', end: '18:00' },
      { name: 'Jake Whitmore',days: [1,2,3,4,5], start: '07:30', end: '17:30' },
      { name: 'Ryan Cole',    days: [1,2,3,4,5,6], start: '08:00', end: '17:00' },
      { name: 'Sandra Swift', days: [1,2,3,4,5], start: '09:00', end: '17:00' },
    ],
  },
  {
    business: 'Thornton Physiotherapy & Sports Rehab',
    staff: [
      { name: 'Rebecca Thornton', days: [1,2,3,4,5], start: '08:00', end: '19:00' },
      { name: 'Dan Byrne',        days: [1,2,3,4,5], start: '08:00', end: '18:00' },
      { name: 'Nadia Kowalski',   days: [2,3,4,5,6], start: '09:00', end: '17:00' },
      { name: 'Liam Ashworth',    days: [1,2,3,4,5,6], start: '07:30', end: '16:00' },
    ],
  },
  {
    business: 'Valley View B&B',
    staff: [
      { name: 'Paul Morris',  days: [0,1,2,3,4,5,6], start: '08:00', end: '20:00' },
      { name: 'Janet Morris', days: [0,1,2,3,4,5,6], start: '08:00', end: '20:00' },
      { name: 'Amy Trent',    days: [1,2,3,4,5], start: '09:00', end: '17:00' },
      { name: 'Ben Ashworth', days: [0,5,6], start: '09:00', end: '17:00' },
    ],
  },
  {
    business: 'Webb Financial Solutions',
    staff: [
      { name: 'Marcus Webb',   days: [1,2,3,4,5], start: '09:00', end: '17:30' },
      { name: 'Diane Hartley', days: [1,2,3,4,5], start: '09:00', end: '17:00' },
    ],
  },
  {
    business: 'Whitmore Electrical Services',
    staff: [
      { name: 'James Whitmore', days: [1,2,3,4,5], start: '07:30', end: '17:30' },
      { name: 'Craig Foster',   days: [1,2,3,4,5,6], start: '08:00', end: '16:30' },
    ],
  },
  {
    business: 'Williams & Associates LLP',
    staff: [
      { name: 'Helena Williams', days: [1,2,3,4,5], start: '09:00', end: '17:30' },
      { name: 'Fiona Singh',     days: [1,2,3,4,5], start: '09:00', end: '17:30' },
      { name: 'Rupert Doyle',    days: [1,2,3,4], start: '09:30', end: '16:30' },
    ],
  },
]

const esc = s => s.replace(/'/g, "''")

async function main() {
  for (const biz of SCHEDULES) {
    const tenantRes = await q(`SELECT id FROM tenants WHERE business_name = '${esc(biz.business)}'`)
    if (!tenantRes[0]) { console.log('NOT FOUND: ' + biz.business); continue }
    const tid = tenantRes[0].id
    console.log('\n─── ' + biz.business)

    let inserted = 0
    for (const s of biz.staff) {
      const staffRes = await q(`SELECT id FROM staff_profiles WHERE tenant_id='${tid}' AND name='${esc(s.name)}'`)
      if (!staffRes[0]) { console.log('  staff not found: ' + s.name); continue }
      const sid = staffRes[0].id

      const vals = s.days.map(d =>
        `('${sid}', ${d}, '${s.start}', '${s.end}', true)`
      ).join(',')

      await q(
        `INSERT INTO staff_availability(staff_profile_id, day_of_week, start_time, end_time, active)
         VALUES ${vals}
         ON CONFLICT DO NOTHING`
      )
      inserted += s.days.length
      console.log(`  ${s.name}: ${s.days.length} days (${s.start}–${s.end})`)
    }
    console.log(`  → ${inserted} availability rows`)
  }
  console.log('\nDone.')
}

main().catch(console.error)
