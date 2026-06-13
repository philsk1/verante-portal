// Bulk seed: products + clients for all demo tenants
// NODE_OPTIONS=--use-system-ca node seed-all-tenants.cjs

const https = require('https')
const PAT = 'sbp_9a977a5ee8b6aa2e764bf10384c53084aeac87c1'

function q(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const opts = {
      hostname: 'api.supabase.com',
      path: '/v1/projects/kkrsvkxkefijmtbwykzv/database/query',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + PAT, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve(d) } })
    })
    req.on('error', reject); req.write(body); req.end()
  })
}

const esc = s => String(s || '').replace(/'/g, "''")
function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function bizDate(startMs, endMs) {
  const d = new Date(startMs + Math.random() * (endMs - startMs))
  const day = d.getDay()
  if (day === 0) d.setDate(d.getDate() + 1)
  if (day === 6) d.setDate(d.getDate() + 2)
  d.setHours(ri(9, 17), ri(0, 59), ri(0, 59))
  return d.toISOString()
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

const PRODUCTS = {
  'JB Sports & Fashion': [
    ['Running Shoes — Lightweight Mesh', 65, 95, 'Breathable mesh upper, cushioned sole. Available in sizes 4–12.'],
    ['Training Leggings', 28, 42, 'High-waist compression leggings. Multiple colours.'],
    ['Sports Socks (3-pack)', 12, 16, 'Cushioned ankle socks for training and running.'],
    ['Football Boots', 55, 110, 'Firm ground football boots. Synthetic upper.'],
    ['Gym Gloves', 14, 22, 'Padded palm gloves for lifting and training.'],
    ['Insulated Water Bottle (750ml)', 18, 26, 'Stainless steel, keeps cold 24h / hot 12h.'],
    ['Resistance Band Set (5 levels)', 22, 30, 'Latex-free resistance bands in 5 resistance levels.'],
    ['Sports Holdall', 35, 55, 'Large capacity durable holdall with separate shoe compartment.'],
    ['Performance Hoodie', 38, 55, 'Moisture-wicking fleece hoodie. Full zip.'],
    ['Compression Running Shorts', 22, 32, 'Built-in compression lining. Reflective detailing.'],
    ['Running Cap', 14, 20, 'Lightweight with UPF50 sun protection.'],
    ['Foam Roller (90cm)', 28, 38, 'High-density EVA foam roller for muscle recovery.'],
    ['Sports Bra — Medium Support', 22, 35, 'Wire-free medium support. Sizes XS–XXL.'],
    ['Swim Goggles (Anti-fog)', 12, 18, 'Adjustable silicone strap. UV protection lens.'],
    ['Cycling Shorts (Padded)', 32, 48, 'Gel-padded chamois for road and indoor cycling.'],
  ],
  'Apex Print & Design': [
    ['Business Cards (500, full colour)', 45, 65, 'Gloss or matte laminate. Double-sided print, 400gsm.'],
    ['Business Cards (1000, full colour)', 75, 95, 'Same-day despatch available. Foil upgrade option.'],
    ['A5 Flyers (500)', 55, 75, '130gsm silk, full colour both sides. Ready in 3 working days.'],
    ['A5 Flyers (1000)', 80, 110, 'Bulk order — reduced rate per unit.'],
    ['Roll-Up Banner (85x200cm)', 65, 90, 'Lightweight aluminium cassette. Includes carry bag.'],
    ['A0 Poster Print', 22, 35, 'Satin or gloss finish. Same-day print on request.'],
    ['Branded Tote Bags (50)', 120, 180, 'Natural cotton bags, one-colour screen print.'],
    ['Mug Printing (12)', 85, 120, 'Full-wrap sublimation print on white ceramic 11oz mugs.'],
    ['Wedding Stationery Set', 180, 280, 'Invites, RSVP cards, order of service, table names — matched suite.'],
    ['Letterheads (250)', 55, 75, '100gsm bond paper, full bleed print. Laser-compatible.'],
    ['Compliment Slips (500)', 40, 55, 'DL size (1/3 A4). Coordinated with letterhead.'],
    ['Event Programme (A5 booklet, 8pp)', 85, 140, 'Saddle-stitched, 130gsm cover. Quantity from 50.'],
    ['T-Shirt Printing (12)', 120, 180, 'DTG or screen print. Full colour front print.'],
  ],
  'Paws & Claws Dog Grooming': [
    ['Premium Dog Shampoo (500ml)', 12, 18, 'Oat & aloe formula. Suitable for sensitive skin.'],
    ['Deep Conditioning Spray (250ml)', 10, 14, 'Detangling spray — ideal for long-coat breeds.'],
    ['Flea & Tick Spot Treatment (3-month)', 22, 28, 'Vet-approved formula. For dogs over 10kg.'],
    ['Professional Slicker Brush', 14, 20, 'Stainless steel pins with rubber tip cushion.'],
    ['Dematting Comb', 12, 16, 'Dual-sided blade comb for matted and long coats.'],
    ['Paw Balm (60ml)', 9, 13, 'Beeswax and shea butter formula for cracked pads.'],
    ['Dog Bandana (pack of 3)', 8, 12, 'Cotton blend, machine washable. Sizes S/M/L.'],
    ['Nail Clippers (scissor-style)', 10, 16, 'Safety guard, non-slip grip. For medium to large dogs.'],
    ['Pet First Aid Kit', 28, 38, '24-item kit including bandages, antiseptic, tick remover.'],
    ['Deodorising Spray (250ml)', 9, 13, 'Between-bath freshener. No parabens.'],
  ],
  'Meridian Hair & Beauty': [
    ['Olaplex No.3 Hair Perfector (100ml)', 28, 28, 'At-home bond-building treatment to use weekly.'],
    ['Schwarzkopf BlondMe Bleach (450g)', 22, 22, 'Professional lifting powder — salon-grade.'],
    ['Fudge Urban Blow Dry Cream (150ml)', 14, 14, 'Heat protection and frizz control for blow-drying.'],
    ['Kevin Murphy Angel Wash Shampoo (250ml)', 22, 22, 'Volumising shampoo for fine and fragile hair.'],
    ['Tigi Bedhead Resurrection Conditioner (200ml)', 14, 14, 'Intense repair for damaged and over-processed hair.'],
    ['Moroccan Oil Treatment (100ml)', 35, 35, 'Argan oil finishing treatment. Controls frizz, adds shine.'],
    ['Dry Shampoo Professional (300ml)', 12, 12, 'Salon-grade dry shampoo. Absorbs excess oil, adds volume.'],
  ],
  'Jennings Nail & Beauty Studio': [
    ['Gel Nail Polish Set (12 colours)', 28, 38, 'UV/LED gel polish set including base and top coat.'],
    ['UV/LED Nail Lamp (48W)', 35, 55, 'Professional-grade curing lamp. 30/60s timer.'],
    ['Nail Files (pack of 10, mixed grits)', 6, 9, 'Glass and emery boards. Fine and medium grit.'],
    ['Cuticle Oil Pen (3ml)', 7, 10, 'Nourishing blend of jojoba and vitamin E oil.'],
    ['Nail Glue (pro-strength)', 5, 8, 'Fast-setting adhesive for tips and repairs.'],
    ['Acetone Nail Remover (500ml)', 8, 12, 'Pure acetone for gel and acrylic removal.'],
    ['Press-On Nail Kit (24 tips)', 10, 15, 'Self-adhesive short and medium coffin shapes.'],
  ],
  'Peak Performance Gym': [
    ['Whey Protein (1kg, Vanilla)', 28, 38, 'Premium whey blend, 24g protein per serving.'],
    ['Pre-Workout Powder (30 servings)', 24, 35, 'Caffeine + beta-alanine formula. Berry or orange.'],
    ['Creatine Monohydrate (500g)', 18, 22, 'Unflavoured pharmaceutical-grade creatine.'],
    ['Shaker Bottle (700ml)', 8, 12, 'BPA-free with stainless steel ball. Leakproof lid.'],
    ['Resistance Band Set', 18, 26, 'Set of 5 resistance bands in colour-coded strengths.'],
    ['Gym Gloves (padded)', 14, 20, 'Non-slip palm padding. Velcro wrist strap.'],
    ['Foam Roller (60cm)', 20, 28, 'High-density EPP foam for myofascial release.'],
    ['3-Month Membership Gift Card', 89, 89, 'Gift a 3-month full gym membership. Includes induction.'],
    ['Day Pass', 12, 12, 'Single-day full gym access. Valid weekdays 6am-10pm.'],
    ['Intra-Workout BCAA (30 servings)', 22, 30, '2:1:1 BCAA ratio. Supports muscle retention during training.'],
  ],
  'The Garden Studio': [
    ['Peat-Free Compost (40L)', 9, 12, 'Premium peat-free growing media suitable for all plants.'],
    ['Potting Grit (10kg)', 8, 11, 'Horticultural grit for improving drainage in containers.'],
    ['Slow-Release Plant Food (900g)', 12, 16, '6-month granular fertiliser for beds and borders.'],
    ['Ceramic Plant Pot — Small (15cm)', 14, 22, 'Handmade ceramic with drainage hole. Various glazes.'],
    ['Ceramic Plant Pot — Large (28cm)', 28, 45, 'Statement pot suitable for indoor trees and large plants.'],
    ['Terrarium Starter Kit', 35, 48, 'Glass vessel, substrate, moss, pebbles, and care guide.'],
    ['Succulent Bundle (5 plants)', 18, 25, 'Assorted succulents in 7cm nursery pots.'],
    ['Wildflower Seed Mix (250g)', 8, 12, 'Native UK wildflower mix. Attracts pollinators.'],
    ['Trowel & Fork Gift Set', 22, 32, 'Stainless steel hand tools with cushioned grip handle.'],
  ],
  'Greenfield Landscape Gardening': [
    ['Premium Topsoil (bulk bag, 1 tonne)', 95, 130, 'Screened to 10mm. Suitable for lawns and raised beds.'],
    ['Bark Mulch (bulk bag)', 85, 110, 'Composted bark chippings. Suppresses weeds, retains moisture.'],
    ['Grass Seed — Hard-Wearing Mix (5kg)', 38, 52, 'High wear-tolerance. Suitable for family lawns.'],
    ['Lawn Fertiliser — Spring/Summer (10kg)', 28, 38, 'High nitrogen formula for lush green growth.'],
    ['Professional Weed Killer (5L concentrate)', 45, 65, 'Glyphosate-based systemic formula.'],
    ['Block Paving Sealant (5L)', 38, 55, 'Wet-look finish. Prevents weed growth between paving.'],
  ],
  "Sarah's Beauty Studio": [
    ['Lash Lift Kit (professional)', 22, 32, 'Complete lash lift and tint kit for at-home touch-ups.'],
    ['Brow Tint Kit', 14, 20, 'Semi-permanent brow tint in 4 shades. 30-application kit.'],
    ['Facial Oil Serum (30ml)', 28, 38, 'Rosehip and vitamin C. Reduces redness, brightens tone.'],
    ['Sheet Mask Bundle (5 pack)', 12, 18, 'Hydrating, brightening, and anti-aging variants.'],
    ['Cleansing Balm (100ml)', 18, 26, 'Balm-to-oil double cleanser. Removes makeup and SPF.'],
  ],
  'Blue Lotus Indian Restaurant': [
    ['House Mango Chutney (280g jar)', 5, 5, 'Made in-house from our original recipe. Mild and sweet.'],
    ['Mixed Spice Gift Box', 18, 22, 'Selection of 5 chef-blended spice mixes. Gift wrapped.'],
    ['Blue Lotus Gift Voucher — 25', 25, 25, 'Valid for dine-in or takeaway. No expiry.'],
    ['Blue Lotus Gift Voucher — 50', 50, 50, 'Valid for dine-in or takeaway. No expiry.'],
    ['Naan Bread Pack (frozen, 6)', 6, 6, 'Freshly made and frozen. Ready in 5 minutes from frozen.'],
  ],
}

// ─── CALLERS ──────────────────────────────────────────────────────────────────

const FIRST = ['James','Emily','David','Jennifer','Michael','Laura','Robert','Amanda','William','Helen','Christopher','Nicola','Thomas','Rachel','Andrew','Stephanie','Mark','Samantha','Paul','Claire','Steven','Katherine','Brian','Joanne','Gary','Tracey','Kevin','Linda','Jason','Julie','Scott','Deborah','Craig','Donna','Nathan','Angela','Simon','Michelle','Dean','Susan','Luke','Alison','Sean','Carol','Philip','Wendy','Derek','Fiona','Colin','Gillian','Ravi','Priya','Aisha','Mohammed','Yusuf','Fatima','Tomasz','Anna','Liam','Aoife','Callum','Sinead','Rhys','Catrin','Blessing','Chidi','Adaeze','Emeka','Zara','Omar','Raj','Sunita']
const LAST  = ['Harrison','Clarke','Brown','Walsh','Foster','Simmons','Hall','Price','Turner','Cooper','Reed','Wood','Gray','Hughes','Phillips','Bell','Evans','Green','Morris','Edwards','Rogers','Lewis','Cook','Morgan','Watson','Barnes','Bailey','Cox','Ross','Ward','Butler','Perry','Griffiths','Jenkins','Powell','Russell','Wright','Carter','Owens','Davies','Richardson','Thomas','Murray','Parker','Atkins','Collins','Bennett','Martin','Adams','Patel','Sharma','Okafor','Ali','Ibrahim','Malik','Nowak','Murphy','MacDonald','Kelly','Williams','Jones','Okonkwo','Nwosu','Eze','Obi','Hassan','Hussain','Ahmed','Khan','Singh','Kumar']

function randName(seed) {
  return FIRST[seed % FIRST.length] + ' ' + LAST[(seed * 7 + 3) % LAST.length]
}
function makePhone(seed) {
  const n = 7700900000 + seed
  return '+447' + String(n).slice(1)
}

function getSummaries(biz) {
  const b = biz.toLowerCase()
  if (b.includes('plumb')) return [
    { o: 'lead_captured', fn: n => `${n} reported a leaking pipe. Quote requested.` },
    { o: 'booked',        fn: n => `${n} booked emergency callout for burst pipe.` },
    { o: 'booked',        fn: n => `${n} booked boiler service for next Thursday.` },
    { o: 'lead_captured', fn: n => `${n} enquired about bathroom installation.` },
    { o: 'filtered',      fn: () => 'Sales call from parts supplier. Declined.' },
    { o: 'lead_captured', fn: n => `${n} asking about water pressure issues.` },
  ]
  if (b.includes('electr') || b.includes('whitmore') || b.includes('swift') || b.includes('apex electrical') || b.includes('highfield')) return [
    { o: 'booked',        fn: n => `${n} booked a full rewire quote for a 3-bed semi.` },
    { o: 'lead_captured', fn: n => `${n} enquired about EV charger installation.` },
    { o: 'booked',        fn: n => `${n} booked consumer unit upgrade for Friday.` },
    { o: 'lead_captured', fn: n => `${n} reporting tripping breaker. Callback arranged.` },
    { o: 'filtered',      fn: () => 'Sales call from cable supplier. Declined.' },
    { o: 'booked',        fn: n => `${n} booked an EICR inspection for a rental property.` },
  ]
  if (b.includes('physio') || b.includes('osteo') || b.includes('thornton') || b.includes('restore')) return [
    { o: 'booked',        fn: n => `${n} booked initial assessment for lower back pain.` },
    { o: 'booked',        fn: n => `${n} booked a follow-up session.` },
    { o: 'lead_captured', fn: n => `${n} enquired about sports injury rehab.` },
    { o: 'booked',        fn: n => `${n} booked a deep tissue massage for Saturday.` },
    { o: 'filtered',      fn: () => 'Wrong number — caller looking for GP surgery.' },
    { o: 'escalated',     fn: n => `${n} describing severe pain after a fall. Referred to A&E.` },
  ]
  if (b.includes('dental') || b.includes('haverford') || b.includes('lakeside')) return [
    { o: 'booked',        fn: n => `${n} booked a routine check-up and hygienist.` },
    { o: 'escalated',     fn: n => `${n} reporting severe toothache — emergency slot arranged.` },
    { o: 'booked',        fn: n => `${n} booked a teeth whitening consultation.` },
    { o: 'lead_captured', fn: n => `${n} enquiring about Invisalign.` },
    { o: 'filtered',      fn: () => 'Sales call from dental supplier. Declined.' },
    { o: 'booked',        fn: n => `${n} rebooked for extraction follow-up.` },
  ]
  if (b.includes('mortgage') || b.includes('financial') || b.includes('premier') || b.includes('capital') || b.includes('webb') || b.includes('finance')) return [
    { o: 'lead_captured', fn: n => `${n} enquired about first-time buyer mortgage options.` },
    { o: 'lead_captured', fn: n => `${n} looking to remortgage in the next 3 months.` },
    { o: 'booked',        fn: n => `${n} booked a mortgage consultation for Wednesday.` },
    { o: 'filtered',      fn: () => 'Sales call. Declined.' },
    { o: 'lead_captured', fn: n => `${n} enquiring about buy-to-let mortgage.` },
    { o: 'booked',        fn: n => `${n} booked a protection insurance review.` },
  ]
  if (b.includes('landscape') || b.includes('garden') || b.includes('greenfield') || b.includes('tom')) return [
    { o: 'lead_captured', fn: n => `${n} wants full garden redesign quote. Site visit arranged.` },
    { o: 'booked',        fn: n => `${n} booked fortnightly lawn maintenance.` },
    { o: 'lead_captured', fn: n => `${n} asking about patio installation.` },
    { o: 'filtered',      fn: () => 'Cold call from tool supplier. Declined.' },
    { o: 'booked',        fn: n => `${n} booked one-off garden clearance.` },
    { o: 'lead_captured', fn: n => `${n} asking about decking installation costs.` },
  ]
  if (b.includes('yoga') || b.includes('wellness') || b.includes('wellb') || b.includes('therapy') || b.includes('harmony') || b.includes('clarity') || b.includes('westfield') || b.includes('luminoo') || b.includes('oak tree')) return [
    { o: 'booked',        fn: n => `${n} booked a beginner class for next Tuesday.` },
    { o: 'lead_captured', fn: n => `${n} enquired about private sessions.` },
    { o: 'booked',        fn: n => `${n} booked a stress management consultation.` },
    { o: 'filtered',      fn: () => 'Automated call. Ended.' },
    { o: 'booked',        fn: n => `${n} rebooked monthly wellness session.` },
    { o: 'lead_captured', fn: n => `${n} asking about corporate wellness packages.` },
  ]
  if (b.includes('recruit') || b.includes('sterling') || b.includes('nationwide')) return [
    { o: 'lead_captured', fn: n => `${n} looking for admin roles in the area.` },
    { o: 'lead_captured', fn: n => `${n} business owner looking for temp staff cover.` },
    { o: 'booked',        fn: n => `${n} booked candidate registration for Thursday.` },
    { o: 'filtered',      fn: () => 'Sales call from job board. Declined.' },
    { o: 'lead_captured', fn: n => `${n} permanent placement enquiry. CV to be emailed.` },
    { o: 'booked',        fn: n => `${n} booked a skills assessment session.` },
  ]
  if (b.includes('clean') || b.includes('bright') || b.includes('apex commercial')) return [
    { o: 'booked',        fn: n => `${n} booked one-off deep clean for 4-bed house.` },
    { o: 'lead_captured', fn: n => `${n} enquired about regular weekly cleaning.` },
    { o: 'booked',        fn: n => `${n} booked an end-of-tenancy clean.` },
    { o: 'filtered',      fn: () => 'Sales call from product supplier. Declined.' },
    { o: 'lead_captured', fn: n => `${n} asking about commercial office cleaning.` },
    { o: 'booked',        fn: n => `${n} booked a post-renovation clean.` },
  ]
  if (b.includes('locksmith') || b.includes('central lock')) return [
    { o: 'booked',        fn: n => `${n} locked out of property. Emergency callout arranged.` },
    { o: 'booked',        fn: n => `${n} booked lock change following lost keys.` },
    { o: 'lead_captured', fn: n => `${n} enquiring about security upgrade to front door.` },
    { o: 'filtered',      fn: () => 'Spam call. Ended.' },
    { o: 'booked',        fn: n => `${n} booked deadlock installation.` },
    { o: 'lead_captured', fn: n => `${n} asking about UPVC door lock replacement.` },
  ]
  if (b.includes('valley view') || b.includes('b&b')) return [
    { o: 'booked',        fn: n => `${n} booked 2 nights for a couple. Arrival Friday.` },
    { o: 'lead_captured', fn: n => `${n} enquiring about availability in July.` },
    { o: 'booked',        fn: n => `${n} group booking for 4 rooms over bank holiday.` },
    { o: 'filtered',      fn: () => 'Wrong number — caller looking for a pub.' },
    { o: 'booked',        fn: n => `${n} booked single room for midweek business trip.` },
    { o: 'lead_captured', fn: n => `${n} asking about wheelchair access.` },
  ]
  if (b.includes('restaurant') || b.includes('blue lotus')) return [
    { o: 'booked',        fn: n => `${n} booked table for 6 on Saturday at 7:30pm.` },
    { o: 'booked',        fn: n => `${n} booked birthday dinner with cake arrangement.` },
    { o: 'lead_captured', fn: n => `${n} enquiring about private dining (20 guests).` },
    { o: 'filtered',      fn: () => 'Takeaway order — redirected to online ordering.' },
    { o: 'booked',        fn: n => `${n} booked Sunday lunch for family of 4.` },
    { o: 'lead_captured', fn: n => `${n} asking about vegan menu and allergen info.` },
  ]
  if (b.includes('gym') || b.includes('peak')) return [
    { o: 'booked',        fn: n => `${n} booked a free trial session and induction.` },
    { o: 'lead_captured', fn: n => `${n} enquiring about monthly membership pricing.` },
    { o: 'booked',        fn: n => `${n} booked a personal training consultation.` },
    { o: 'filtered',      fn: () => 'Sales call from supplement supplier. Declined.' },
    { o: 'booked',        fn: n => `${n} booked a beginner fitness assessment.` },
    { o: 'lead_captured', fn: n => `${n} asking about student discount membership.` },
  ]
  if (b.includes('property') || b.includes('meridian property')) return [
    { o: 'lead_captured', fn: n => `${n} enquiring about property valuations.` },
    { o: 'booked',        fn: n => `${n} booked a viewing for a 3-bed property.` },
    { o: 'lead_captured', fn: n => `${n} asking about letting management fees.` },
    { o: 'filtered',      fn: () => 'Cold call from conveyancing firm. Declined.' },
    { o: 'booked',        fn: n => `${n} booked a property appraisal.` },
    { o: 'lead_captured', fn: n => `${n} first-time buyer asking about the purchase process.` },
  ]
  if (b.includes('legal') || b.includes('solicitor') || b.includes('associates') || b.includes('williams')) return [
    { o: 'lead_captured', fn: n => `${n} enquiring about conveyancing for a house purchase.` },
    { o: 'booked',        fn: n => `${n} booked a will-writing consultation.` },
    { o: 'lead_captured', fn: n => `${n} asking about a contractual dispute.` },
    { o: 'filtered',      fn: () => 'Sales call. Declined.' },
    { o: 'booked',        fn: n => `${n} booked an employment law advice session.` },
    { o: 'lead_captured', fn: n => `${n} asking about family law services.` },
  ]
  if (b.includes('print') || b.includes('apex print')) return [
    { o: 'lead_captured', fn: n => `${n} enquiring about business card printing.` },
    { o: 'booked',        fn: n => `${n} booked a brand identity design consultation.` },
    { o: 'lead_captured', fn: n => `${n} asking about large-format banner printing.` },
    { o: 'filtered',      fn: () => 'Sales call from paper supplier. Declined.' },
    { o: 'booked',        fn: n => `${n} booked a print proofing session.` },
    { o: 'lead_captured', fn: n => `${n} asking about branded merchandise.` },
  ]
  if (b.includes('sport') || b.includes('fashion') || b.includes('jb')) return [
    { o: 'lead_captured', fn: n => `${n} asking about sizing for running shoes.` },
    { o: 'booked',        fn: n => `${n} booked a fitting appointment for football boots.` },
    { o: 'lead_captured', fn: n => `${n} enquiring about school sports kit bulk orders.` },
    { o: 'filtered',      fn: () => 'Cold call from clothing manufacturer. Declined.' },
    { o: 'lead_captured', fn: n => `${n} asking about club discount scheme.` },
    { o: 'booked',        fn: n => `${n} booked a team kit consultation.` },
  ]
  if (b.includes('restoration') || b.includes('blackwood')) return [
    { o: 'lead_captured', fn: n => `${n} enquiring about flood damage restoration.` },
    { o: 'booked',        fn: n => `${n} booked a damage assessment survey.` },
    { o: 'lead_captured', fn: n => `${n} asking about mould remediation services.` },
    { o: 'filtered',      fn: () => 'Sales call. Declined.' },
    { o: 'booked',        fn: n => `${n} booked emergency callout for water damage.` },
    { o: 'lead_captured', fn: n => `${n} asking about insurance claim support.` },
  ]
  // default (hair, beauty, bridal, nails, grooming, bridal, paws)
  return [
    { o: 'booked',        fn: n => `${n} booked an appointment.` },
    { o: 'lead_captured', fn: n => `${n} enquired about services and pricing.` },
    { o: 'booked',        fn: n => `${n} rebooked for next month.` },
    { o: 'filtered',      fn: () => 'Sales call. Declined.' },
    { o: 'lead_captured', fn: n => `${n} asked about availability for this week.` },
    { o: 'booked',        fn: n => `${n} booked an appointment. Confirmed via SMS.` },
  ]
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  const startMs = new Date('2025-01-06').getTime()
  const endMs   = new Date('2026-06-08').getTime()

  console.log('Loading tenants...')
  const tenants = await q('SELECT id, business_name FROM tenants ORDER BY business_name')
  console.log('Found', tenants.length, 'tenants')

  const hasCTR = new Set()
  const ctrRows = await q('SELECT DISTINCT tenant_id FROM caller_tenant_relationships')
  for (const r of (ctrRows || [])) hasCTR.add(r.tenant_id)

  const hasCallers = new Map()
  const calRows = await q('SELECT tenant_id, COUNT(DISTINCT caller_id) as n FROM call_logs WHERE caller_id IS NOT NULL GROUP BY tenant_id')
  for (const r of (calRows || [])) hasCallers.set(r.tenant_id, parseInt(r.n))

  let phoneIdx = 6000

  for (const { id: tid, business_name: biz } of tenants) {
    if (biz === 'Meridian Hair & Beauty') { console.log('SKIP', biz); continue }

    // Products
    const prods = PRODUCTS[biz]
    if (prods && prods.length) {
      const vals = prods.map(([name, pf, pt, desc]) =>
        `('${tid}','${esc(name)}','product',${pf},${pt},'${esc(desc)}',true)`
      ).join(',')
      await q(`INSERT INTO catalogue_items(tenant_id,name,item_type,price_from,price_to,description,active) VALUES ${vals} ON CONFLICT DO NOTHING`)
      console.log(`${biz}: +${prods.length} products`)
    }

    const existing = hasCallers.get(tid) || 0
    const summaries = getSummaries(biz)

    if (existing > 0 && !hasCTR.has(tid)) {
      // Bulk CTR from existing callers
      await q(`INSERT INTO caller_tenant_relationships(tenant_id,caller_id,is_hot_prospect,marketing_opted_out) SELECT DISTINCT tenant_id,caller_id,false,false FROM call_logs WHERE tenant_id='${tid}' AND caller_id IS NOT NULL ON CONFLICT(tenant_id,caller_id) DO NOTHING`)
      console.log(`${biz}: CTR created for ${existing} existing callers`)
    } else if (existing === 0) {
      const count = ri(40, 60)
      // Bulk INSERT callers
      const callerVals = Array.from({ length: count }, (_, i) => {
        const name  = randName(phoneIdx + i)
        const phone = makePhone(phoneIdx + i)
        return `('${phone}','${esc(name)}')`
      }).join(',')
      const inserted = await q(`INSERT INTO callers(phone_number,full_name) VALUES ${callerVals} ON CONFLICT(phone_number) DO UPDATE SET full_name=EXCLUDED.full_name RETURNING id,phone_number`)
      phoneIdx += count + 10

      if (!Array.isArray(inserted) || !inserted.length) {
        console.log(`${biz}: insert failed, skip`)
        continue
      }

      // Build call_logs bulk
      const logVals = []
      for (let ci = 0; ci < inserted.length; ci++) {
        const { id: cid, phone_number: phone } = inserted[ci]
        const firstName = randName(phoneIdx - inserted.length - 10 + ci).split(' ')[0]
        for (let j = 0; j < ri(3, 5); j++) {
          const tmpl = summaries[ri(0, summaries.length - 1)]
          const dt   = bizDate(startMs, endMs)
          logVals.push(`('${tid}','${cid}','${phone}',${ri(30,210)},'${esc(tmpl.fn(firstName))}','${tmpl.o}','${dt}')`)
        }
      }

      for (let i = 0; i < logVals.length; i += 200) {
        await q(`INSERT INTO call_logs(tenant_id,caller_id,caller_phone,duration_seconds,ai_summary,call_outcome,created_at) VALUES ${logVals.slice(i,i+200).join(',')}`)
      }

      // Leads (one per caller from booked/captured)
      const leadRows = await q(`SELECT DISTINCT ON(caller_id) caller_id,ai_summary,call_outcome,created_at FROM call_logs WHERE tenant_id='${tid}' AND call_outcome IN('booked','lead_captured') ORDER BY caller_id,created_at`)
      if (Array.isArray(leadRows) && leadRows.length) {
        const lvals = leadRows.map(r => `('${tid}','${r.caller_id}','${esc(r.ai_summary.slice(0,120))}','${r.call_outcome==='booked'?'won':'new'}','${r.created_at}')`).join(',')
        await q(`INSERT INTO leads(tenant_id,caller_id,ai_summary,status,created_at) VALUES ${lvals} ON CONFLICT DO NOTHING`)
      }

      // CTR bulk
      const ctrVals = inserted.map(r => `('${tid}','${r.id}',${Math.random()<0.2},false)`).join(',')
      await q(`INSERT INTO caller_tenant_relationships(tenant_id,caller_id,is_hot_prospect,marketing_opted_out) VALUES ${ctrVals} ON CONFLICT DO NOTHING`)

      console.log(`${biz}: ${inserted.length} callers | ${logVals.length} calls`)
    } else {
      console.log(`${biz}: already seeded`)
    }
  }

  console.log('\nAll done!')
}

main().catch(console.error)
