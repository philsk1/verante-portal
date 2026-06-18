// Q scoring engine — per-channel health + legacy pillar support for HelpMascot

const POSITIVE_OUTCOMES = new Set([
  'booked', 'lead_captured', 'callback_scheduled',
  'referred_out', 'enquiry_handled', 'referral_made',
])

// Pillar 1: config completeness (0–100) from tenant record
// greeting_message is excluded — Qerxel owns the greeting, it is always present
export function configScore(tenant) {
  if (!tenant) return 0
  let pts = 0
  if (tenant.additional_instructions?.trim())  pts += 25
  if (tenant.business_name?.trim())            pts += 20
  if (tenant.callback_preference_note?.trim()) pts += 20
  if (tenant.emergency_keywords?.length > 0)   pts += 15
  if (tenant.lead_contact_name?.trim())         pts += 12
  if (tenant.booking_link?.trim())              pts += 8
  return Math.min(100, pts)
}

// Pillar 2: tool activation (0–100) from tenant record
export function toolScore(tenant) {
  if (!tenant) return 0
  const tools = [
    tenant.sms_followup_enabled,
    tenant.provisional_booking_enabled,
    tenant.booking_link?.trim(),
    tenant.emergency_keywords?.length > 0,
    tenant.keep_alive_topics?.length > 0,
    tenant.blocked_phone_numbers?.length > 0,
    tenant.calendar_tier && tenant.calendar_tier !== 'none',
  ]
  const active = tools.filter(Boolean).length
  return Math.min(100, Math.round((active / tools.length) * 100))
}

// Pillar 3: performance score (0–100) from call outcome counts { outcome: count }
// Converts raw call data into a score relative to the 70% positive-outcome baseline
export function performanceScore(outcomeCounts) {
  if (!outcomeCounts) return null // null = no data yet, Q won't score this pillar
  const total = Object.values(outcomeCounts).reduce((s, n) => s + n, 0)
  if (total < 5) return null // too few calls to score
  const positive = Object.entries(outcomeCounts)
    .filter(([k]) => POSITIVE_OUTCOMES.has(k))
    .reduce((s, [, n]) => s + n, 0)
  const rate = positive / total
  // 80%+ = 100, 65% = 75, 50% = 50, <40% = 20
  if (rate >= 0.80) return 100
  if (rate >= 0.65) return 75 + Math.round(((rate - 0.65) / 0.15) * 25)
  if (rate >= 0.50) return 50 + Math.round(((rate - 0.50) / 0.15) * 25)
  if (rate >= 0.35) return 20 + Math.round(((rate - 0.35) / 0.15) * 30)
  return 10
}

// Combined Q score — weighted blend of whichever pillars have data
export function qScore({ tenant, outcomeCounts, weights = { config: 0.4, tool: 0.3, perf: 0.3 } }) {
  const cs = configScore(tenant)
  const ts = toolScore(tenant)
  const ps = performanceScore(outcomeCounts)

  if (ps === null) {
    // No call data — reweight between config and tool
    return Math.round(cs * 0.6 + ts * 0.4)
  }
  return Math.round(cs * weights.config + ts * weights.tool + ps * weights.perf)
}

// ── Per-channel health ───────────────────────────────────────────────────────
// Each returns { id, label, score (0–100), issues: [{ label, tab, severity }] }
// Only include channels for products the tenant owns.
// Global health score = average of owned channel scores.

// Single source of truth for all Answer issues — used by both health score and Q coaching panel.
// Keeps health score expansion and Q's coaching panel in perfect sync.
export function buildAnswerIssues(tenant, { catalogueCount = 0, ps = null, messagingSettings = {} } = {}) {
  const issues = []
  if (!tenant.additional_instructions?.trim())  issues.push({ label: 'Add AI instructions',                tab: 'ai',        severity: 'high',   suggestion: 'Tell Q about your business, how you like calls handled, and what to do with different enquiry types. This single field has the most impact on call quality.' })
  if (!tenant.opening_hours?.trim())            issues.push({ label: 'Add your opening hours',             tab: 'profile',   severity: 'high',   suggestion: "Callers regularly ask when you're open. Without this, Q has to say it doesn't know — which doesn't inspire confidence." })
  if (ps !== null && ps < 40)                   issues.push({ label: 'Call capture rate is low',           tab: 'analytics', severity: 'high',   suggestion: 'Review recent calls in Analytics — look at which call types end without a positive outcome and adjust your AI behaviour accordingly.' })
  if (!tenant.callback_preference_note?.trim()) issues.push({ label: 'Set callback preference wording',    tab: 'ai',        severity: 'medium', suggestion: '"Within 2 hours" converts better than "as soon as possible". A specific promise gives callers a reason to wait rather than ring a competitor.' })
  if (!tenant.booking_link?.trim())             issues.push({ label: 'Add your booking link',              tab: 'profile',   severity: 'medium', suggestion: 'Q quotes your booking link on every relevant call. Without it, motivated callers have nowhere to go.' })
  if (catalogueCount === 0)                     issues.push({ label: 'Add services to your catalogue',     tab: 'services',  severity: 'medium', suggestion: 'Services give Q the language to talk about your business with confidence. Callers who hear a price convert faster.' })
  if (!tenant.lead_contact_name?.trim())        issues.push({ label: 'Set your name as lead contact',      tab: 'profile',   severity: 'medium', suggestion: 'Q uses your name when directing callers. "Ask for Sarah" feels personal. "Ask for the owner" does not.' })
  const anyMsgEnabled = Object.values(messagingSettings).some(m => m?.enabled)
  const thankyouEnabled = messagingSettings?.call_summary?.enabled
  if (!anyMsgEnabled) {
    issues.push({ label: 'Enable after-call messaging', tab: 'ai', severity: 'medium', suggestion: 'After-call messages close the loop with every caller. The thank-you message alone significantly improves caller perception — takes 30 seconds to set up.' })
  } else {
    if (!thankyouEnabled)                issues.push({ label: 'Enable the thank-you message',   tab: 'ai', severity: 'low', suggestion: 'The callback confirmation message is the most-sent after-call message. It reassures callers someone will be in touch and reduces repeat calls.' })
    if (!tenant.sms_followup_enabled)   issues.push({ label: 'Enable SMS follow-up for leads', tab: 'ai', severity: 'low', suggestion: 'Fires only when a lead is captured — the caller gave contact details and asked about your services. A targeted nudge while you\'re busy.' })
  }
  if (!tenant.provisional_booking_enabled)      issues.push({ label: 'Enable provisional booking',         tab: 'ai',        severity: 'low',    suggestion: 'Lets Q hold a slot for callers without waiting for your confirmation. Reduces the number who drift away before you call back.' })
  if (!tenant.emergency_keywords?.length)       issues.push({ label: 'Set emergency keywords',             tab: 'ai',        severity: 'low',    suggestion: "Words like 'urgent' or 'emergency' trigger immediate escalation to you. Essential for any trade where delayed response has consequences." })
  return issues
}

export function answerChannelHealth(tenant, ps, catalogueCount = 0) {
  const issues = buildAnswerIssues(tenant, { catalogueCount, ps })
  const cs = configScore(tenant)
  const score = ps === null ? cs : Math.round(cs * 0.55 + ps * 0.45)
  return { id: 'answer', label: 'Answer', score, issues }
}

export function scheduleChannelHealth({ staffCount = 0, availabilityCount = 0, catalogueCount = 0 }) {
  const issues = []
  let pts = 100
  if (staffCount === 0)        { issues.push({ label: 'Add at least one staff member',  tab: 'team',    severity: 'high',   suggestion: 'Add yourself as a staff member first — this unlocks availability management and makes you bookable.' });   pts -= 40 }
  if (availabilityCount === 0) { issues.push({ label: 'Set staff working hours',        tab: 'team',    severity: 'high',   suggestion: 'Without working hours, customers can\'t see when to book. Set your availability and the calendar opens up.' });   pts -= 30 }
  if (catalogueCount === 0)    { issues.push({ label: 'Add services to your catalogue', tab: 'services', severity: 'medium', suggestion: 'Services are what customers choose when booking. Add at least one to make the booking flow usable.' }); pts -= 30 }
  return { id: 'schedule', label: 'Schedule', score: Math.max(0, pts), issues }
}

export function sentryChannelHealth({ zonesCount = 0 }) {
  const issues = []
  let pts = 100
  if (zonesCount === 0) { issues.push({ label: 'No stations defined — Sentry has nothing to watch', tab: 'sentry', severity: 'high', suggestion: 'Go to Sentry and draw your first monitoring zone on the canvas. Q needs at least one zone to start watching.' }); pts -= 80 }
  return { id: 'sentry', label: 'Sentry', score: Math.max(0, pts), issues }
}

// Map score → mood state
export function qMoodFromScore(score) {
  if (score >= 86) return 'smile'
  if (score >= 61) return 'content'
  if (score >= 31) return 'sad'
  return 'crying'
}

// Map score → caption (mode-aware — returns null if mode suppresses it)
export function qCaption(score, mode = 'jump_in') {
  if (mode === 'mind_own_business') return null
  const mood = qMoodFromScore(score)
  if (mode === 'jump_in' && mood !== 'crying') return null
  return {
    crying:  "I don't know enough to do my best work yet.",
    sad:     "Nearly there — a few things would make me much more effective.",
    content: "I'm doing well. There's more I could do for you though.",
    smile:   "I'm fully set up. You can always fine-tune me further.",
  }[mood]
}
