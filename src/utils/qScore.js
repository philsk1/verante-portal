// Q scoring engine — three pillars: data completeness, tool activation, performance

const POSITIVE_OUTCOMES = new Set([
  'booked', 'lead_captured', 'callback_scheduled',
  'referred_out', 'enquiry_handled', 'referral_made',
])

// Pillar 1: config completeness (0–100) from tenant record
export function configScore(tenant) {
  if (!tenant) return 0
  let pts = 0
  if (tenant.greeting_message?.trim())       pts += 25
  if (tenant.additional_instructions?.trim()) pts += 20
  if (tenant.business_name?.trim())           pts += 15
  if (tenant.callback_preference_note?.trim()) pts += 15
  if (tenant.emergency_keywords?.length > 0)  pts += 10
  if (tenant.lead_contact_name?.trim())        pts += 8
  if (tenant.booking_link?.trim())             pts += 7
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
