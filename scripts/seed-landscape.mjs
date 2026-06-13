// scripts/seed-landscape.mjs
// Comprehensive landscape seed — every flag, every scenario
// NODE_OPTIONS=--use-system-ca node scripts/seed-landscape.mjs

const PAT  = 'sbp_9a977a5ee8b6aa2e764bf10384c53084aeac87c1'
const PROJ = 'kkrsvkxkefijmtbwykzv'

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJ}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const j = await r.json()
  if (j.message) throw new Error(j.message)
  return j
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}
function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5) }

const NOW = new Date('2026-06-11T12:00:00Z')
const DAY = 86400000

function daysFromNow(n) { return new Date(NOW.getTime() + n * DAY) }

function isWorkingDay(date, workDays) {
  return workDays.includes(date.getDay())
}

function makeSlot(date, startHour, slotMins, slotIndex) {
  const totalMins = startHour * 60 + slotIndex * slotMins
  const start = new Date(date)
  start.setUTCHours(Math.floor(totalMins / 60), totalMins % 60, 0, 0)
  return { start, end: new Date(start.getTime() + slotMins * 60000) }
}

// ── Name pools ────────────────────────────────────────────────────────────────
const FIRST = ['Sarah','James','Emma','Oliver','Lily','Jack','Sophia','Harry','Grace','Charlie','Emily','Thomas','Ava','Noah','Mia','Ethan','Chloe','Liam','Ella','Max','Sophie','Oscar','Lucy','William','Hannah','Jake','Amelia','Sam','Natalie','Ryan','Rebecca','Daniel','Katie','Luke','Charlotte','Ben','Fiona','Tom','Zoe','Chris','Lauren','David','Rachel','Adam','Claire','Michael','Amy','Nathan','Jessica','Mark','Laura','George','Alice','Alex','Caroline','Rob','Helen','Joe','Anna','Pete','Kerry','Ian','Tracey','Simon','Diane','Gary','Lisa','Neil','Alison','Craig','Sharon']
const LAST  = ['Smith','Jones','Williams','Taylor','Brown','Davies','Evans','Wilson','Thomas','Roberts','Johnson','Lewis','Walker','Robinson','Wood','Harrison','Clarke','Thompson','White','Jackson','Martin','Young','Hall','Wright','Scott','Green','Baker','Adams','Mitchell','Carter','Morris','Phillips','Campbell','Shaw','Ward','Cook','Rogers','Morgan','Cooper','Bell','Fletcher','Barnes','Patel','Singh','Khan','Ahmed','Hassan','Okafor','Adeyemi','Chen','Wang','Park','Nguyen','Sharma']
const PHONES = ['07712334451','07823661290','07934772001','07651229882','07788441763','07900112445','07543871229','07612990334','07411223344','07822331100','07933445566','07644556677','07755667788','07866778899','07977889900','07534229871','07645330982','07756441093','07867552104','07978663215']

function name() { return `${pick(FIRST)} ${pick(LAST)}` }

// ── Call summary pools per sector ─────────────────────────────────────────────
const S = {
  dental: {
    lead: ['New patient — check-up and clean requested. Lead captured.','Caller asking about teeth whitening — prices given, appointment enquiry captured.','Emergency toothache — lead captured for urgent appointment.','Child first check-up enquiry — appointment requested.','Crown fitting enquiry — dental images requested.','Enquiry about invisible aligners — lead captured.','Broken tooth — semi-urgent appointment requested.','Hygienist appointment — regular patient rebook.','New implant enquiry — referral to specialist discussed.','Veneer consultation requested — lead captured.'],
    escalated: ['Caller in severe pain — abscess suspected. Urgent callback flagged immediately.','Child with knocked-out tooth — caller very distressed. Escalated.','Post-extraction heavy bleeding — urgent dental advice needed.','Swelling around jaw — possible infection. Escalated to Dr Haverford.','Allergic reaction to anaesthetic — caller panicking. Escalated.'],
    callback: ['Caller wants to discuss payment plan — callback requested.','Existing patient — complaint about filling. Awaiting callback.','Insurance pre-authorisation query — needs manager callback.','Cancelled appointment — wants to rebook, callback requested.','Query about dental plan membership — callback scheduled.'],
    filtered: ['Caller selling dental consumables — filtered.','Automated survey call — filtered.','Wrong number — asked for a pharmacy.','Recruitment agency — filtered.','PPI-style cold call — spam filtered.'],
  },
  cleaning: {
    lead: ['Office cleaning contract — 3,000 sq ft, 3x per week. Lead captured.','End-of-tenancy deep clean — 2-bed flat, 48 hrs notice.','Restaurant kitchen clean — monthly contract enquiry.','Construction site clearance — large commercial. Lead captured.','Retail unit cleaning — daily open/close. Lead captured.','School corridor deep clean — term break. Lead captured.','Gym equipment clean — weekly contract. Lead captured.','Post-renovation clear-up — new office fitout. Lead captured.','Window cleaning — 4-storey commercial. Lead captured.','Healthcare facility cleaning — specialist clean. Lead captured.'],
    escalated: ['Client complaint — cleaner missed 3 visits, no communication. Escalated.','Breakage during clean — expensive equipment. Caller very upset. Escalated.'],
    callback: ['Quote follow-up — awaiting contract details.','Existing contract — renegotiation requested.','New area coverage query — Leeds depot?'],
    filtered: ['Supplier call — cleaning products.','Competitor enquiry — mystery shop suspected.','Automated billing query — wrong number.'],
  },
  wellness: {
    lead: ['Swedish massage — first visit enquiry, Saturday appointment.','Hot stone therapy — couples package enquiry. Lead captured.','Sports massage — marathon runner, injury prevention.','Reflexology course — 6-session package enquiry.','Pregnancy massage — second trimester. Lead captured.','Corporate wellness day — 15 staff. Lead captured.','Gift voucher — birthday present for partner.','Lymphatic drainage enquiry — post-surgery client.','Indian head massage — new client. Lead captured.','Reiki session — ongoing course enquiry.'],
    escalated: ['Caller allergic reaction during previous treatment — escalated.','Client collapsed on premises — ambulance called. Escalated.'],
    callback: ['Membership renewal — wants to discuss upgrade.','Regular client — injury, needs physio referral.','Cancellation — wants credit, not refund.'],
    filtered: ['Product sales call — essential oils.','Franchise enquiry.','Automated appointment reminder — wrong number.'],
  },
  gym: {
    lead: ['Personal training enquiry — weight loss goal, 3x per week.','6-month PT package — pre-wedding body transformation.','Post-injury rehab training — GP referral.','Teen fitness coaching — parent calling for 16yo.','Nutrition and strength programme enquiry.','Corporate wellness — 25 staff PT sessions.','Semi-private training (pairs) enquiry.','Online PT package — remote client.','Fitness assessment — new member onboarding.','Marathon training plan — 12-week programme.'],
    escalated: ['Client with chest pain during session — ambulance called. Escalated.','Injury on equipment — client requesting incident report.'],
    callback: ['Membership cancellation — wants callback to discuss.','Price increase query — long-standing member.','Missed sessions query — will credits roll over?'],
    filtered: ['Equipment supplier call.','Energy drink promotional enquiry.','Competitor mystery shop call.'],
  },
  salon: {
    lead: ['Cut and blow dry — Saturday morning, Nikki requested.','Full colour — root to tip, light brunette to blonde.','Highlights and toner — regular client, 6-weekly visit.','Bridal party — 5 people, September 12th.','New client — balayage and trim enquiry.','Keratin smoothing treatment — 4hr appointment.','Gel manicure — Thursday afternoon.','Lash lift and tint — combo appointment.','Kids cut — 3-year-old, nervous child.','Peroxide test required — patch test booking.'],
    escalated: ['Colour reaction — client has rash and swelling. Escalated.','Complaint — hair severely damaged from bleach. Very upset caller. Escalated.'],
    callback: ['Rebook after cancellation — wants specific stylist.','Gift voucher redemption — expiring soon.','Complaint — colour not as discussed. Manager callback.'],
    filtered: ['Wholesale supplier — hair products.','Recruitment — stylist CV being left.','Spam automated call.'],
  },
  plumbing: {
    lead: ['Burst pipe under kitchen sink — emergency. Lead captured.','Boiler service — annual check, Worcester Bosch combi.','New bathroom installation — full suite, 3-bed semi.','Leak from shower tray — coming through ceiling below.','Radiator not heating — balancing needed.','Blocked drain — kitchen, slow drain getting worse.','Gas safety certificate — landlord, 2-bed flat.','Immersion heater replacement — no hot water.','New shower installation — wetroom conversion enquiry.','Outdoor tap installation — garden project.'],
    escalated: ['Smell of gas in house — caller very anxious. Escalated to emergency.','Flooding from washing machine — water through floor. Escalated.'],
    callback: ['Quote follow-up — bathroom installation.','Insurance job — waiting on loss adjuster.','Rebook after missed appointment.'],
    filtered: ['Parts supplier call.','Warranty registration company.','Spam automated call.'],
  },
  property: {
    lead: ['First-time buyer — £280k property, 10% deposit. Lead captured.','Remortgage — fixed rate ending October, wants comparison.','Buy-to-let portfolio — 4 properties, review needed.','Self-employed mortgage — 2yr accounts available.','Shared ownership — 50% share in new build.','Adverse credit mortgage — defaults 3 years ago.','Equity release — couple in their 60s.','Commercial mortgage — small business premises.','Bridging loan — chain break, urgent.','Protection review — critical illness + life cover.'],
    escalated: ['Mortgage offer expiring Friday — conveyancer not responding. Urgent escalation.','Client losing chain — vendor pulled out. Needs emergency bridging advice.'],
    callback: ['Callback after AIP — awaiting documents.','Client returning — changed property.','Rate change query — wants to lock in today.'],
    filtered: ['Lead generation company cold call.','PPI-style automated call.','Competitor mystery shop.'],
  },
  restaurant: {
    lead: ['Table for 4 — Saturday 7:30pm. Lead captured.','Private dining — birthday party, 18 guests, June 28th.','Corporate lunch — 12 covers, Thursday.','Large party enquiry — 35 covers, wedding reception.','Regular booking — couple, first anniversary.','Sunday lunch — family of 6.','Takeaway delivery — referred to JustEat.','Chef table experience enquiry.'],
    escalated: ['Food allergy incident — guest reacted. Escalated to manager.','Complaint — food poisoning suspected. Escalated.'],
    callback: ['Cancellation — wants to rebook for following week.','Deposit dispute — event cancelled.','Private event quote follow-up.'],
    filtered: ['Reservation platform cold call.','Wine merchant.','Spam call.'],
  },
  yoga: {
    lead: ['Private 1:1 yoga — beginners, anxiety management.','Monthly membership — unlimited classes.','Corporate yoga — 10 staff, Wednesday lunchtime.','Pregnancy yoga — second trimester.','Meditation course — 8-week mindfulness programme.','Yin yoga workshop — Saturday morning.','Kids yoga — 5-10 year olds.','Yoga retreat deposit — October weekend.'],
    escalated: ['Injury during class — guest needs incident form. Escalated.'],
    callback: ['Membership freeze — maternity.','Class swap — different day needed.','Refund query — pre-paid course not taken.'],
    filtered: ['Yoga mat supplier.','Franchising enquiry.','Automated survey.'],
  },
  restoration: {
    lead: ['Grade II listed building — full facade restoration quote.','Victorian terrace — lime pointing and render repair.','Commercial stonework — church restoration, 6-month project.','Post-fire internal restoration — timber and plasterwork.','Stone cleaning — commercial premises, anti-graffiti.','Heritage window frame restoration — 14 units.','Roof parapet repair — water ingress causing damage.','Brick repointing — residential terrace, 20 metres.'],
    escalated: ['Structural concern flagged — unsafe gable end. Escalated to surveyor.','Asbestos suspected in substrate — health and safety escalation.'],
    callback: ['Heritage grant application — needs project quote.','Listed building consent — planning query.','Insurance claim — storm damage.'],
    filtered: ['Materials supplier cold call.','Recruitment call.','Spam automated.'],
  },
  locksmith: {
    lead: ['Locked out — house key snapped in lock. Urgent callout.','Lock change required — after tenant left.','Anti-snap locks — whole house security upgrade.','Safe opening — lost combination.','Business lock change — office break-in overnight.','UPVC door lock failure — can\'t lock house.','Deadlock installation — insurance requirement.','Window locks — 6-window terraced house.','Master key system — commercial premises.','Car key lost — locksmith needed urgently.'],
    escalated: ['Domestic violence situation — woman locked out, ex has key. Urgent escalation.','Commercial break-in — building insecure overnight. Escalated.','Elderly resident stuck inside — lock failure. Escalated to emergency.'],
    callback: ['Quote follow-up — waiting on insurance.','Multi-lock discount query.','Scheduled security audit.'],
    filtered: ['Key cutting machine supplier.','Spam automated call.','Wrong number — asked for plumber.'],
  },
  generic: {
    lead: ['New enquiry — services requested. Lead captured.','Callback required — details taken.','Booking enquiry — availability checked.','Referral from existing client. Lead captured.','Quote requested — follow-up scheduled.'],
    escalated: ['Urgent escalation — manager needed.'],
    callback: ['Callback scheduled — follow up tomorrow.','Quote pending — awaiting details.'],
    filtered: ['Cold sales call — filtered.','Spam call — filtered.'],
  },
}

// ── Tenant profiles — every scenario covered ─────────────────────────────────

const PROFILES = [

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: COMPLETE CHAOS — Uses everything, riddled with issues
  // Haverford Dental: high volume, poor conversion, escalations unresolved,
  // cancellations rampant, callback backlog 40+ deep, incomplete catalogue
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '0ceb9848-6811-4eb1-b843-2c97c21a1a88',
    name: 'Haverford Dental',
    scenario: 'CHAOS — riddled with issues',
    isCalendar: true,
    staff: ['df300558-a038-4fba-8a02-0012f877edd4','8845c0d2-948b-4eef-bdd5-2aadd53abd35','c093777c-719d-4ed1-9150-e784777059eb','8a1cc07b-f297-4b00-a1ec-592338b4de31'],
    services: ['Check-up & Clean','Filling','Crown Fitting','Root Canal','Emergency Examination','Whitening Consultation'],
    slotMins: 30, workStart: 8, slotsPerDay: 16,
    workDays: [1,2,3,4,5], fillRate: 0.88, cancelRate: 0.30, noShowRate: 0.14,
    callVol: 115,
    callMix: { lead: 0.28, escalated: 0.17, callback: 0.22, referred: 0.08, filtered: 0.14, spam: 0.11 },
    flagEscalated: 0.90,  // 90% of escalated get flagged (unresolved)
    flagLead: 0.35,       // 35% of leads also flagged (not being actioned)
    summaryKey: 'dental',
    // Deliberately leave some catalogue items without duration (incomplete)
    addBadCatalogue: true,
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: MODEL TENANT — Perfect setup, excellent results
  // Apex Commercial Cleaning: full catalogue, all staff active, great conversion
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'a0d47125-3406-43f6-805a-38cd46253bf1',
    name: 'Apex Commercial Cleaning',
    scenario: 'MODEL — perfect setup, great conversion',
    isCalendar: true,
    staff: ['c55ec0e4-d337-4434-9837-47c77295f51b','baec1ae6-2dc5-498d-85c6-3b919c740107','3be7fd12-87e7-44d3-805e-52a5deae94a2','0ef67ac8-f5a7-49c8-8c78-8a6af691d9ac','c982f1c9-7e42-4c26-ac0b-bc70f0510a6f','ef712846-228c-4de2-8d97-ce305a2102bd'],
    services: ['Commercial Deep Clean','Scheduled Contract Clean','End of Tenancy Clean','Specialist Industrial Clean'],
    slotMins: 120, workStart: 7, slotsPerDay: 5,
    workDays: [1,2,3,4,5], fillRate: 0.74, cancelRate: 0.08, noShowRate: 0.04,
    callVol: 78,
    callMix: { lead: 0.48, escalated: 0.03, callback: 0.15, referred: 0.12, filtered: 0.15, spam: 0.07 },
    flagEscalated: 0.10,  // escalated mostly actioned quickly
    flagLead: 0.05,
    summaryKey: 'cleaning',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: NEAR CAPACITY — Excellent conversion, almost no slots left
  // Peak Performance Gym: 90%+ fill, AI doing brilliantly, may need to scale
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '12f0e851-4bbe-4a81-975f-331245cc1622',
    name: 'Peak Performance Gym',
    scenario: 'NEAR CAPACITY — brilliant conversion, needs to scale',
    isCalendar: true,
    newStaff: [
      { name: 'Jay Hopkins', role: 'Head Coach & PT', colour: '#1d4ed8' },
      { name: 'Donna Clarke', role: 'Personal Trainer', colour: '#dc2626' },
      { name: 'Chris Okafor', role: 'Nutrition & Strength Coach', colour: '#059669' },
      { name: 'Beth Lawson', role: 'Group Fitness Instructor', colour: '#d97706' },
    ],
    services: ['Personal Training (60min)','Fitness Assessment','Nutrition Consultation','Online PT Session'],
    slotMins: 60, workStart: 6, slotsPerDay: 9,
    workDays: [1,2,3,4,5,6], fillRate: 0.91, cancelRate: 0.06, noShowRate: 0.03,
    callVol: 72,
    callMix: { lead: 0.50, escalated: 0.02, callback: 0.18, referred: 0.08, filtered: 0.14, spam: 0.08 },
    flagEscalated: 0.08,
    flagLead: 0.04,
    summaryKey: 'gym',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: HOLIDAY MODE LEFT ON — Calls going unanswered right now
  // Harmony Wellness: AI paused, calls accumulating, needs urgent action
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '8317a5c9-0ea7-443f-be2c-82c702542ddd',
    name: 'Harmony Wellness Centre',
    scenario: 'HOLIDAY MODE ON — AI paused, calls going to voicemail',
    isCalendar: true,
    setHolidayMode: true,
    newStaff: [
      { name: 'Lisa Thornton', role: 'Director & Lead Therapist', colour: '#7c3aed' },
      { name: 'Marcus Webb', role: 'Sports Massage Therapist', colour: '#059669' },
      { name: 'Kezia Obi', role: 'Beauty Therapist', colour: '#d97706' },
      { name: 'Jules Moran', role: 'Holistic Practitioner', colour: '#db2777' },
    ],
    services: ['Swedish Massage','Hot Stone Therapy','Reflexology','Holistic Facial','Sports Massage'],
    slotMins: 60, workStart: 9, slotsPerDay: 7,
    workDays: [1,2,3,4,5,6], fillRate: 0.68, cancelRate: 0.11, noShowRate: 0.06,
    callVol: 12,  // recent calls very low — holiday mode effect
    callMix: { lead: 0.33, escalated: 0.05, callback: 0.40, referred: 0.05, filtered: 0.12, spam: 0.05 },
    flagEscalated: 0.50,
    flagLead: 0.10,
    summaryKey: 'wellness',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: REVENUE LEAK — Calendar full but cancellations haemorrhaging
  // Riverside Salon: 80% fill but 32% cancel+no-show = a third of revenue gone
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '1bb3ae2f-4c24-43da-aad1-a164324a99cc',
    name: 'Riverside Salon',
    scenario: 'REVENUE LEAK — 32% of booked appointments lost to cancellations',
    isCalendar: true,
    newStaff: [
      { name: 'Nikki Pearce', role: 'Owner & Senior Stylist', colour: '#7c3aed' },
      { name: 'Ryan Ford', role: 'Colour Specialist', colour: '#1d4ed8' },
      { name: 'Tanya Webb', role: 'Stylist', colour: '#059669' },
      { name: 'Mia Osei', role: 'Nail Technician', colour: '#d97706' },
    ],
    services: ['Cut & Blow Dry','Full Colour','Highlights & Balayage','Keratin Treatment','Gel Nails'],
    slotMins: 60, workStart: 9, slotsPerDay: 7,
    workDays: [1,2,3,4,5,6], fillRate: 0.79, cancelRate: 0.28, noShowRate: 0.14,
    callVol: 55,
    callMix: { lead: 0.42, escalated: 0.03, callback: 0.14, referred: 0.08, filtered: 0.20, spam: 0.13 },
    flagEscalated: 0.15,
    flagLead: 0.06,
    summaryKey: 'salon',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: ENTERPRISE UNDERPERFORMING — Paid for top tier, getting poor ROI
  // Blackwood Restoration: Enterprise plan, no catalogue, AI flying blind,
  // low conversion, callbacks piling up, calendar only 50% full
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '681e8f19-4374-4c3c-95b0-c17948485049',
    name: 'Blackwood Restoration',
    scenario: 'ENTERPRISE UNDERPERFORMING — no catalogue, poor conversion, callbacks unactioned',
    isCalendar: true,
    clearCatalogue: true,  // wipe catalogue so flag triggers
    newStaff: [
      { name: 'Robert Blackwood', role: 'Director & Master Restorer', colour: '#1d4ed8' },
      { name: 'Amy Blackwood', role: 'Project Manager', colour: '#7c3aed' },
      { name: 'Kevin Harper', role: 'Stone Mason', colour: '#059669' },
    ],
    services: ['Heritage Stone Survey','Facade Restoration','Internal Plasterwork','Brick Cleaning'],
    slotMins: 240, workStart: 7, slotsPerDay: 3,
    workDays: [1,2,3,4,5], fillRate: 0.52, cancelRate: 0.16, noShowRate: 0.09,
    callVol: 22,
    callMix: { lead: 0.22, escalated: 0.09, callback: 0.36, referred: 0.12, filtered: 0.14, spam: 0.07 },
    flagEscalated: 0.80,  // escalated mostly not actioned
    flagLead: 0.40,       // leads not being followed up
    summaryKey: 'restoration',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: EMERGENCY SERVICE — High escalation rate, fast callbacks critical
  // Central Locksmith: Answer-only, very high urgency, all escalated flagged
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'e451bf61-fce6-49bf-9357-84b281af6eab',
    name: 'Central Locksmith Ltd',
    scenario: 'EMERGENCY SERVICE — high escalation, rapid response critical',
    isCalendar: false,
    callVol: 62,
    callMix: { lead: 0.52, escalated: 0.10, callback: 0.16, referred: 0.08, filtered: 0.09, spam: 0.05 },
    flagEscalated: 1.0,   // ALL escalated get flagged (urgent lockouts)
    flagLead: 0.08,
    summaryKey: 'locksmith',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: INCOMPLETE SETUP — Calendar active, NO staff entered
  // Capital Mortgage: entry calendar, no staff profiles, moderate performance
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'f429cddd-433c-461f-b793-ee94a9f2d343',
    name: 'Capital Mortgage Advisers',
    scenario: 'INCOMPLETE SETUP — calendar active but no staff entered',
    isCalendar: true,
    staff: [],  // entry calendar, no staff_profile_id needed
    services: ['First-Time Buyer Consultation','Remortgage Advice','Buy-to-Let Review','Protection Insurance Review'],
    slotMins: 60, workStart: 9, slotsPerDay: 7,
    workDays: [1,2,3,4,5], fillRate: 0.63, cancelRate: 0.11, noShowRate: 0.05,
    callVol: 38,
    callMix: { lead: 0.34, escalated: 0.06, callback: 0.22, referred: 0.16, filtered: 0.14, spam: 0.08 },
    flagEscalated: 0.40,
    flagLead: 0.15,
    summaryKey: 'property',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: SOLO OPERATOR AT CAPACITY — Full calendar, can't take more work
  // Clarity Yoga: single instructor, 95% booked, AI converting well
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '7a9f6e6a-7503-4774-afd2-a1707a9a7740',
    name: 'Clarity Yoga & Wellbeing Studio',
    scenario: 'AT CAPACITY — solo instructor nearly full, AI turning away calls',
    isCalendar: true,
    staff: ['9d1ed41b-3449-4b4e-96b1-5ce798d460a0'],
    services: ['Private Yoga Session','Pilates 1:1','Meditation Session','Breathwork Session'],
    slotMins: 60, workStart: 7, slotsPerDay: 8,
    workDays: [1,2,3,4,5,6], fillRate: 0.94, cancelRate: 0.07, noShowRate: 0.04,
    callVol: 38,
    callMix: { lead: 0.44, escalated: 0.02, callback: 0.20, referred: 0.14, filtered: 0.14, spam: 0.06 },
    flagEscalated: 0.10,
    flagLead: 0.05,
    summaryKey: 'yoga',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: DEAD ACCOUNT — Almost no calls, no growth signal
  // Dave's Plumbing: Answer-only, 4 calls in 30 days, something is wrong
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'a3f735bb-352d-4fd2-af44-a51373cde4b7',
    name: "Dave's Plumbing",
    scenario: 'DEAD ACCOUNT — only 4 calls in 30 days, phone number may be wrong',
    isCalendar: false,
    callVol: 4,  // CRITICALLY LOW — flags low activity
    callMix: { lead: 0.25, escalated: 0.25, callback: 0.25, referred: 0.00, filtered: 0.25, spam: 0.00 },
    flagEscalated: 1.0,
    flagLead: 0.50,
    summaryKey: 'plumbing',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: LISTEN USER — High volume, no calendar, AI + owner copilot
  // Lakeside Dental: Listen active, great call volume, missing calendar
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '4b63106e-cb7f-455d-b993-1486888265d2',
    name: 'Lakeside Dental',
    scenario: 'LISTEN USER — high volume, AI copilot active, good conversion',
    isCalendar: false,
    callVol: 78,
    callMix: { lead: 0.37, escalated: 0.09, callback: 0.20, referred: 0.14, filtered: 0.12, spam: 0.08 },
    flagEscalated: 0.30,  // some actioned, some not
    flagLead: 0.08,
    summaryKey: 'dental',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: REFERRAL ENGINE — High volume, most calls routed to partners
  // Meridian Property: Listen + Answer, strong partner network driving referrals
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '5cd5db47-d226-4011-9f41-c1c603b68cf3',
    name: 'Meridian Property Group',
    scenario: 'REFERRAL ENGINE — partner network actively routing 30% of calls',
    isCalendar: false,
    callVol: 58,
    callMix: { lead: 0.30, escalated: 0.05, callback: 0.14, referred: 0.34, filtered: 0.12, spam: 0.05 },
    flagEscalated: 0.20,
    flagLead: 0.06,
    summaryKey: 'property',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: ANSWER ONLY + SPAM FILTER — Valid use case, calls clean
  // Bright Cleaning: Quote business, no bookings needed, spam filter essential
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '874afb7e-b608-4151-9998-7c3bf0723c7e',
    name: 'Bright Cleaning Co',
    scenario: 'ANSWER ONLY — quote business, no calendar needed, spam filter active',
    isCalendar: false,
    callVol: 26,
    callMix: { lead: 0.38, escalated: 0.04, callback: 0.22, referred: 0.10, filtered: 0.18, spam: 0.08 },
    flagEscalated: 0.20,
    flagLead: 0.08,
    summaryKey: 'cleaning',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: FREE TIER GROWING — Promising growth, upgrade trigger imminent
  // Jennings Nail: free plan, entry calendar, decent conversion
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '4bd5f989-6809-4e08-9219-687242be9f76',
    name: 'Jennings Nail & Beauty Studio',
    scenario: 'FREE TIER GROWING — usage suggests upgrade imminent',
    isCalendar: true,
    staff: [],
    services: ['Gel Manicure','Acrylic Nails','Nail Art','Lash Extensions','Eyebrow Wax & Tint'],
    slotMins: 60, workStart: 9, slotsPerDay: 7,
    workDays: [1,2,3,4,5,6], fillRate: 0.68, cancelRate: 0.11, noShowRate: 0.07,
    callVol: 32,
    callMix: { lead: 0.35, escalated: 0.03, callback: 0.22, referred: 0.08, filtered: 0.20, spam: 0.12 },
    flagEscalated: 0.30,
    flagLead: 0.10,
    summaryKey: 'salon',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: NO CATALOGUE — Calendar active, AI has no service context
  // Oak Tree Therapy: calendar + Answer but zero catalogue items seeded
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '5749a60f-e5eb-48e1-bf61-8b6d5afd53a0',
    name: 'Oak Tree Therapy',
    scenario: 'NO CATALOGUE — AI has no service context, guessing on every call',
    isCalendar: true,
    clearCatalogue: true,
    staff: [],
    services: ['Consultation','Session'],  // minimal for appointments
    slotMins: 60, workStart: 9, slotsPerDay: 6,
    workDays: [1,2,3,4,5], fillRate: 0.52, cancelRate: 0.13, noShowRate: 0.07,
    callVol: 22,
    callMix: { lead: 0.27, escalated: 0.06, callback: 0.28, referred: 0.10, filtered: 0.20, spam: 0.09 },
    flagEscalated: 0.55,
    flagLead: 0.20,
    summaryKey: 'wellness',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SCENARIO: MODERATE — Steady but unremarkable
  // (Remaining calendar tenants with varied moderate data)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: '41da59ff-9426-47e4-9790-a2221430a345',
    name: 'Elegant Hair Design',
    scenario: 'STEADY MODERATE — consistent but room to grow',
    isCalendar: true,
    staff: ['fbaceceb-e8cd-42b9-a989-793072015cc9','9d433e9a-f916-4e49-8f24-de33bcec78da','659d4208-7ce2-4cb4-a53e-70b62b28fde9','2dcac98a-0c61-4a49-aa39-e09fffa64b98'],
    services: ['Cut & Blow Dry','Full Colour','Highlights & Lowlights','Balayage','Keratin Smooth'],
    slotMins: 60, workStart: 9, slotsPerDay: 7,
    workDays: [2,3,4,5,6,0], fillRate: 0.69, cancelRate: 0.12, noShowRate: 0.06,
    callVol: 48,
    callMix: { lead: 0.38, escalated: 0.03, callback: 0.18, referred: 0.10, filtered: 0.20, spam: 0.11 },
    flagEscalated: 0.20, flagLead: 0.06,
    summaryKey: 'salon',
  },
  {
    id: '33eaefb5-17c1-47b2-9476-ef205298da0b',
    name: 'Nationwide Recruitment',
    scenario: 'MODERATE — inconsistent conversion, referral network underused',
    isCalendar: true,
    staff: ['1838011d-935b-4575-9b55-00dc10e1d1a4','ed7b8d8c-f39f-4bcd-aef0-eea99906b239','31cc0019-8d13-4a90-b7ce-2b131d0cac8d','534c38d8-17cc-4d7b-84ea-6ebd6a3fafcf','20618ae7-8cca-4c2e-a0cb-b623ad63fe01','24eb4990-4161-45dc-ba0a-2c3af1c2706d'],
    services: ['Candidate Consultation','Interview Preparation','CV Review Session','Client Briefing'],
    slotMins: 60, workStart: 9, slotsPerDay: 6,
    workDays: [1,2,3,4,5], fillRate: 0.61, cancelRate: 0.11, noShowRate: 0.05,
    callVol: 44,
    callMix: { lead: 0.30, escalated: 0.05, callback: 0.24, referred: 0.14, filtered: 0.18, spam: 0.09 },
    flagEscalated: 0.25, flagLead: 0.12,
    summaryKey: 'generic',
  },
  {
    id: 'e0695cba-7361-4cc1-b6d9-28db18f59e17',
    name: 'JB Sports & Fashion',
    scenario: 'GOOD — solid conversion, calendar well used',
    isCalendar: true,
    staff: ['5430e1e8-b967-43a6-8cbc-7d782aa32c1f','524b7484-6d82-4162-bd33-c82ea33e02ba','a1bfc7b5-a2b7-4177-bb6b-5f2e06aad312','40593dd3-2640-4213-b2b0-c59b0c4220e3','cccc8cd9-527d-403c-a8f7-29cc5d43eabe'],
    services: ['Trade Account Meeting','Franchise Consultation','Press Appointment','Wholesale Review'],
    slotMins: 60, workStart: 9, slotsPerDay: 5,
    workDays: [1,2,3,4,5], fillRate: 0.74, cancelRate: 0.08, noShowRate: 0.04,
    callVol: 60,
    callMix: { lead: 0.38, escalated: 0.03, callback: 0.16, referred: 0.14, filtered: 0.18, spam: 0.11 },
    flagEscalated: 0.12, flagLead: 0.05,
    summaryKey: 'generic',
  },
  {
    id: '0f718500-cc25-4d9a-9e44-2cededf886af',
    name: 'Apex Print & Design',
    scenario: 'GOOD — well configured demo, consistent results',
    isCalendar: true,
    staff: ['a16f915f-e9b4-475f-8253-08211a4bccad','a19169c7-3533-4aad-935f-7865c20c4a0b','1a2a1c0f-69f1-4777-89dc-90dbfd4e00b9','8f66c797-c10b-4d95-9121-70afd51a1eb5'],
    services: ['Design Consultation','Print Briefing','Artwork Approval Session','Account Review'],
    slotMins: 60, workStart: 9, slotsPerDay: 5,
    workDays: [1,2,3,4,5], fillRate: 0.68, cancelRate: 0.10, noShowRate: 0.05,
    callVol: 44,
    callMix: { lead: 0.35, escalated: 0.04, callback: 0.18, referred: 0.12, filtered: 0.20, spam: 0.11 },
    flagEscalated: 0.15, flagLead: 0.06,
    summaryKey: 'generic',
  },
  {
    id: '8c67099a-89bf-48e6-aae9-37eae648de14',
    name: 'Blue Lotus Indian Restaurant',
    scenario: 'LOW VOLUME — restaurant using AI for table bookings, quiet period',
    isCalendar: true,
    staff: ['46cb2227-9c9d-4125-b40f-dbb5d69657fb'],
    services: ['Table (2 covers)','Table (4 covers)','Table (6+ covers)','Private Dining'],
    slotMins: 90, workStart: 12, slotsPerDay: 5,
    workDays: [2,3,4,5,6,0], fillRate: 0.54, cancelRate: 0.20, noShowRate: 0.12,
    callVol: 22,
    callMix: { lead: 0.30, escalated: 0.08, callback: 0.20, referred: 0.07, filtered: 0.22, spam: 0.13 },
    flagEscalated: 0.45, flagLead: 0.12,
    summaryKey: 'restaurant',
  },
  {
    id: 'c2dfb41d-82ff-4696-a63c-27870ad5d288',
    name: 'Hargreaves Plumbing',
    scenario: 'MODERATE — decent volume but callback rate high, leads going cold',
    isCalendar: true,
    staff: ['ce85f225-e560-41fb-bee7-a6f3e01ab45d','3bba7693-d0af-4d4c-aacb-f2197a0f5bec','f3231be6-06ad-484c-a2ba-067a5ea5747a','57cd76c7-8dbd-4357-948d-f20ca425b5bf'],
    services: ['Emergency Callout','Boiler Service','Leak Repair','Bathroom Installation'],
    slotMins: 60, workStart: 7, slotsPerDay: 6,
    workDays: [1,2,3,4,5], fillRate: 0.62, cancelRate: 0.12, noShowRate: 0.07,
    callVol: 42,
    callMix: { lead: 0.33, escalated: 0.08, callback: 0.28, referred: 0.08, filtered: 0.15, spam: 0.08 },
    flagEscalated: 0.35, flagLead: 0.18,
    summaryKey: 'plumbing',
  },
  {
    id: 'd181592a-6ddb-4157-b3a3-233418717007',
    name: "Henderson's Plumbing",
    scenario: 'INCOMPLETE — no staff, no catalogue, poor performance',
    isCalendar: true,
    staff: [],
    services: ['Emergency Callout','Boiler Service','Leak Repair'],
    slotMins: 60, workStart: 7, slotsPerDay: 5,
    workDays: [1,2,3,4,5,6], fillRate: 0.51, cancelRate: 0.14, noShowRate: 0.10,
    callVol: 28,
    callMix: { lead: 0.26, escalated: 0.09, callback: 0.30, referred: 0.08, filtered: 0.18, spam: 0.09 },
    flagEscalated: 0.50, flagLead: 0.22,
    summaryKey: 'plumbing',
  },
  {
    id: 'c648ca9c-4e33-4587-8281-a258bba2f029',
    name: 'Meridian Hair & Beauty',
    scenario: 'GOOD DEMO — all set up, performing well',
    isCalendar: true,
    staff: ['c83c604c-ffe5-4a25-9c46-078b363ad6d1','f5f4b345-8e32-4f75-9a17-5fa08e2f88ed'],
    services: ['Cut & Blow Dry','Full Colour','Highlights & Lowlights','Gel Manicure'],
    slotMins: 60, workStart: 9, slotsPerDay: 7,
    workDays: [2,3,4,5,6,0], fillRate: 0.74, cancelRate: 0.09, noShowRate: 0.05,
    callVol: 46,
    callMix: { lead: 0.40, escalated: 0.03, callback: 0.16, referred: 0.10, filtered: 0.20, spam: 0.11 },
    flagEscalated: 0.12, flagLead: 0.05,
    summaryKey: 'salon',
  },
  {
    id: '402201a7-0f13-4495-9fc3-385d3c4e3d6c',
    name: 'Paws & Claws Dog Grooming',
    scenario: 'MODERATE — decent, underusing referral features',
    isCalendar: true,
    staff: ['83281dc9-16b9-4307-a4b2-6f3df23c4049','fd67f6af-8622-4622-8aaf-0d97766e3d98','fe7126bf-1fc5-4e21-b899-1fd343b3ba4a'],
    services: ['Full Groom','Bath & Brush','Puppy First Groom','Nail Trim'],
    slotMins: 60, workStart: 8, slotsPerDay: 6,
    workDays: [1,2,3,4,5,6], fillRate: 0.66, cancelRate: 0.10, noShowRate: 0.06,
    callVol: 34,
    callMix: { lead: 0.36, escalated: 0.03, callback: 0.20, referred: 0.09, filtered: 0.20, spam: 0.12 },
    flagEscalated: 0.15, flagLead: 0.08,
    summaryKey: 'generic',
  },
  {
    id: '96502dbd-25f2-4f73-98e4-774a3a50feb9',
    name: 'Restore Physiotherapy',
    scenario: 'EXCELLENT DEMO — high conversion, great fill, AI performing',
    isCalendar: true,
    staff: ['b448552e-6917-4bd1-8499-ae4792bdb159','aa47c1a0-9bae-4dc2-8690-0f50199487dd'],
    services: ['Initial Assessment','Follow-up Treatment','Sports Injury Assessment','Clinical Pilates (1:1)'],
    slotMins: 60, workStart: 7, slotsPerDay: 7,
    workDays: [1,2,3,4,5,6], fillRate: 0.84, cancelRate: 0.08, noShowRate: 0.05,
    callVol: 64,
    callMix: { lead: 0.46, escalated: 0.03, callback: 0.16, referred: 0.12, filtered: 0.16, spam: 0.07 },
    flagEscalated: 0.08, flagLead: 0.04,
    summaryKey: 'physio',
  },
  {
    id: 'ed7c9f2d-6486-4657-b238-fdc26ff91325',
    name: 'Premier Mortgage Solutions',
    scenario: 'MODERATE — good setup but underconverting for the volume',
    isCalendar: true,
    staff: ['e96d797b-98d9-4f22-b338-50094aab4e69','db100c15-5cc7-4ec7-bb56-d23f78d2746b','d659bb15-20c7-423f-8757-07891d326f56','09b4f1d2-d6ff-4c31-bb88-7032be7ae1b8'],
    services: ['First-Time Buyer Consultation','Remortgage Review','Buy-to-Let Advice','Protection Insurance Review'],
    slotMins: 60, workStart: 9, slotsPerDay: 6,
    workDays: [1,2,3,4,5], fillRate: 0.61, cancelRate: 0.10, noShowRate: 0.06,
    callVol: 40,
    callMix: { lead: 0.30, escalated: 0.06, callback: 0.24, referred: 0.14, filtered: 0.16, spam: 0.10 },
    flagEscalated: 0.30, flagLead: 0.14,
    summaryKey: 'property',
  },
  {
    id: '3b4d00fb-b413-4ab7-b355-5f09705360de',
    name: 'Greenfield Landscape Gardening',
    scenario: 'POOR — seasonal lull, low volume, callbacks not actioned',
    isCalendar: true,
    staff: ['db593b5a-f283-414b-9745-bea434b113ac'],
    services: ['Garden Design Consultation','Site Survey','Maintenance Quote','Hard Landscaping Survey'],
    slotMins: 120, workStart: 8, slotsPerDay: 4,
    workDays: [1,2,3,4,5], fillRate: 0.55, cancelRate: 0.14, noShowRate: 0.08,
    callVol: 26,
    callMix: { lead: 0.27, escalated: 0.07, callback: 0.30, referred: 0.10, filtered: 0.18, spam: 0.08 },
    flagEscalated: 0.45, flagLead: 0.22,
    summaryKey: 'generic',
  },
  {
    id: '78b60a50-541d-415d-967b-1ff3d92e4316',
    name: 'luminoo welness',
    scenario: 'POOR + INCOMPLETE — low activity, no staff, sparse catalogue',
    isCalendar: true,
    staff: [],
    services: ['Wellness Consultation','Holistic Treatment','Sound Bath Session'],
    slotMins: 60, workStart: 10, slotsPerDay: 6,
    workDays: [1,2,3,4,5,6], fillRate: 0.51, cancelRate: 0.18, noShowRate: 0.09,
    callVol: 14,
    callMix: { lead: 0.22, escalated: 0.06, callback: 0.35, referred: 0.08, filtered: 0.20, spam: 0.09 },
    flagEscalated: 0.60, flagLead: 0.25,
    summaryKey: 'wellness',
  },
  {
    id: '49656c13-8a5e-4b20-865e-2d7835437f5a',
    name: 'Highfield Electrical',
    scenario: 'MODERATE — Answer only, decent but not maximising features',
    isCalendar: false,
    callVol: 40,
    callMix: { lead: 0.38, escalated: 0.05, callback: 0.20, referred: 0.12, filtered: 0.16, spam: 0.09 },
    flagEscalated: 0.22, flagLead: 0.08,
    summaryKey: 'generic',
  },
]

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function insertStaff(tenantId, staffList) {
  if (!staffList.length) return []
  const rows = staffList.map(s => `('${uuid()}','${tenantId}','${s.name.replace(/'/g,"''")}','${s.role.replace(/'/g,"''")}','${s.colour || '#5e3b87'}',true)`).join(',\n')
  const res = await sql(`INSERT INTO staff_profiles (id,tenant_id,name,role,colour,active) VALUES ${rows} ON CONFLICT DO NOTHING RETURNING id`)
  console.log(`    ↳ added ${Array.isArray(res) ? res.length : '?'} staff`)
  const ids = await sql(`SELECT id FROM staff_profiles WHERE tenant_id='${tenantId}'`)
  return (Array.isArray(ids) ? ids : []).map(r => r.id)
}

function generateAppointments(profile, staffIds) {
  const { fillRate, cancelRate, noShowRate, slotMins, workStart, slotsPerDay, workDays, services } = profile
  const candidates = staffIds.length ? staffIds : [null]
  const appts = []

  for (let d = -42; d <= 21; d++) {
    const date = daysFromNow(d)
    if (!isWorkingDay(date, workDays)) continue
    const isPast = d < 0
    for (const staffId of candidates) {
      for (let s = 0; s < slotsPerDay; s++) {
        if (Math.random() > fillRate) continue
        const slot = makeSlot(date, workStart, slotMins, s)
        const r = Math.random()
        let status
        if (!isPast) {
          status = 'confirmed'
        } else if (r < cancelRate) {
          status = 'cancelled'
        } else if (r < cancelRate + noShowRate) {
          status = 'no_show'
        } else {
          status = 'completed'
        }
        appts.push({
          id: uuid(), tenant_id: profile.id,
          staff_profile_id: staffId,
          title: pick(services), start_time: slot.start.toISOString(), end_time: slot.end.toISOString(),
          status, client_name: name(), client_phone: pick(PHONES),
          created_from: pick(['manual','ai_call','lead_conversion','customer_booking']),
          created_at: new Date(slot.start.getTime() - rnd(1, 14) * DAY).toISOString(),
        })
      }
    }
  }
  return appts
}

async function seedAppointments(profile, staffIds) {
  await sql(`DELETE FROM appointments WHERE tenant_id='${profile.id}'`)
  const appts = generateAppointments(profile, staffIds)
  const confirmed = appts.filter(a => a.status === 'confirmed').length
  const completed = appts.filter(a => a.status === 'completed').length
  const cancelled = appts.filter(a => a.status === 'cancelled').length
  const noshow    = appts.filter(a => a.status === 'no_show').length
  for (let i = 0; i < appts.length; i += 200) {
    const chunk = appts.slice(i, i + 200)
    const values = chunk.map(a => {
      const sp = a.staff_profile_id ? `'${a.staff_profile_id}'` : 'NULL'
      return `('${a.id}','${a.tenant_id}',${sp},'${a.title.replace(/'/g,"''")}','${a.start_time}','${a.end_time}','${a.status}','${a.client_name.replace(/'/g,"''")}','${a.client_phone}','${a.created_from}','${a.created_at}')`
    }).join(',')
    await sql(`INSERT INTO appointments (id,tenant_id,staff_profile_id,title,start_time,end_time,status,client_name,client_phone,created_from,created_at) VALUES ${values}`)
  }
  console.log(`    ↳ ${appts.length} appointments — ${confirmed} upcoming · ${completed} completed · ${cancelled} cancelled · ${noshow} no-show`)
}

function generateCallLogs(tenantId, profile) {
  const mix = profile.callMix
  const summaries = S[profile.summaryKey] || S.generic
  const count = profile.callVol
  const logs = []

  for (let i = 0; i < count; i++) {
    const daysBack = rnd(0, 30)
    const date = daysFromNow(-daysBack)
    date.setUTCHours(rnd(8, 17), rnd(0, 59), 0, 0)

    // Determine outcome from mix
    const r = Math.random()
    let outcome, pool
    if (r < mix.lead) { outcome = 'lead_captured'; pool = summaries.lead }
    else if (r < mix.lead + mix.escalated) { outcome = 'escalated'; pool = summaries.escalated }
    else if (r < mix.lead + mix.escalated + mix.callback) { outcome = 'callback_scheduled'; pool = summaries.callback }
    else if (r < mix.lead + mix.escalated + mix.callback + mix.referred) { outcome = 'referred_out'; pool = summaries.lead }
    else if (r < mix.lead + mix.escalated + mix.callback + mix.referred + mix.filtered) { outcome = 'filtered'; pool = summaries.filtered }
    else { outcome = 'spam'; pool = summaries.filtered }

    // Flagging logic
    let flagged = false
    if (outcome === 'escalated') flagged = Math.random() < profile.flagEscalated
    else if (outcome === 'lead_captured' || outcome === 'callback_scheduled') flagged = Math.random() < profile.flagLead

    const fn = pick(FIRST), ln = pick(LAST)
    logs.push({
      id: uuid(), tenant_id: tenantId, created_at: date.toISOString(),
      duration_seconds: rnd(30, 310),
      call_outcome: outcome,
      ai_summary: pick(pool || summaries.lead),
      caller_phone: pick(PHONES),
      caller_name: `${fn} ${ln}`,
      callback_flagged: flagged,
    })
  }
  return logs
}

async function seedCallLogs(tenantId, profile) {
  await sql(`DELETE FROM call_logs WHERE tenant_id='${tenantId}'`)
  const logs = generateCallLogs(tenantId, profile)
  if (!logs.length) return
  for (let i = 0; i < logs.length; i += 100) {
    const chunk = logs.slice(i, i + 100)
    const values = chunk.map(l => {
      const nm = l.caller_name ? `'${l.caller_name.replace(/'/g,"''")}'` : 'NULL'
      const sm = l.ai_summary ? `'${l.ai_summary.replace(/'/g,"''")}'` : 'NULL'
      return `('${l.id}','${l.tenant_id}','${l.created_at}',${l.duration_seconds},'${l.call_outcome}',${sm},'${l.caller_phone}',${nm},${l.callback_flagged})`
    }).join(',')
    await sql(`INSERT INTO call_logs (id,tenant_id,created_at,duration_seconds,call_outcome,ai_summary,caller_phone,caller_name,callback_flagged) VALUES ${values}`)
  }
  const esc = logs.filter(l => l.call_outcome === 'escalated').length
  const flagged = logs.filter(l => l.callback_flagged).length
  const leads = logs.filter(l => l.call_outcome === 'lead_captured').length
  console.log(`    ↳ ${logs.length} calls — ${leads} leads (${Math.round(leads/logs.length*100)}%) · ${esc} escalated · ${flagged} flagged`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══ Qerxel Landscape Seed — All Scenarios ═══\n')

  for (const profile of PROFILES) {
    console.log(`▸ ${profile.name}`)
    console.log(`  ${profile.scenario}`)

    // Optional: clear catalogue
    if (profile.clearCatalogue) {
      await sql(`DELETE FROM catalogue_items WHERE tenant_id='${profile.id}'`)
      console.log('  ↳ catalogue cleared (triggers no-catalogue flag)')
    }

    // Optional: add incomplete catalogue items for Haverford (missing durations)
    if (profile.addBadCatalogue) {
      await sql(`UPDATE catalogue_items SET duration_minutes = NULL WHERE tenant_id='${profile.id}' AND name IN ('Crown Fitting','Root Canal')`)
      await sql(`INSERT INTO catalogue_items (id,tenant_id,item_type,name,description,duration_minutes,active) VALUES ('${uuid()}','${profile.id}','service','Emergency Appointment',NULL,NULL,true),('${uuid()}','${profile.id}','service','Orthodontic Consultation',NULL,NULL,true) ON CONFLICT DO NOTHING`)
      console.log('  ↳ added incomplete catalogue items (missing durations — flags in owner view)')
    }

    // Optional: set holiday mode
    if (profile.setHolidayMode) {
      await sql(`UPDATE tenants SET holiday_mode = true WHERE id='${profile.id}'`)
      console.log('  ↳ holiday mode set ON (AI paused — flag will show)')
    }

    // Seed staff if needed
    let staffIds = profile.staff ? [...profile.staff] : []
    if (profile.newStaff?.length) {
      const newIds = await insertStaff(profile.id, profile.newStaff)
      staffIds = [...staffIds, ...newIds]
    }

    // Seed appointments
    if (profile.isCalendar) {
      await seedAppointments(profile, staffIds)
    }

    // Seed call logs
    await seedCallLogs(profile.id, profile)

    console.log()
  }

  console.log('═══ Done ═══')
}

main().catch(err => { console.error('\nFATAL:', err.message); process.exit(1) })
