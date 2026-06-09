// Merged notify cron handler
// ?type=daily — runs 07:00 UTC daily (was notify-daily-cost.js)
// ?type=weekly — runs 07:00 UTC every Monday (was notify-weekly-summary.js)

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailDailyCost, emailDailySummary, emailWeeklySummary } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PAYG_RATE = 0.35

const INCLUDED_MINUTES = {
  free: 0, light: 120, standard: 250, professional: 450, enterprise: 1000, bespoke: 1000,
}

async function runDaily(res) {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart); yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1)
  const monthStart = new Date(now); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
  const dateLabel = yesterdayStart.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, business_name, business_email, billing_model, subscription_tier, monthly_cost_limit, included_minutes, notify_daily_summary')
    .not('business_email', 'is', null)

  let sent = 0
  for (const tenant of tenants || []) {
    const { data: yCalls } = await supabase.from('call_logs').select('duration_seconds, call_outcome, created_at').eq('tenant_id', tenant.id).gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString())
    if (!yCalls || yCalls.length === 0) continue
    if (tenant.notify_daily_summary === false) continue

    const { data: yLeadsRaw } = await supabase.from('leads').select('lead_contact_name, created_at, callers(phone_number)').eq('tenant_id', tenant.id).gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()).order('created_at', { ascending: false })
    const yLeads = (yLeadsRaw || []).map(l => ({ ...l, phone_number: l.callers?.phone_number || '' }))

    const { data: rawRefs } = await supabase.from('referral_log').select('created_at, referral_partners(partner_name)').eq('tenant_id', tenant.id).gte('created_at', yesterdayStart.toISOString()).lt('created_at', todayStart.toISOString()).order('created_at', { ascending: false })
    const yRefs = (rawRefs || []).map(r => ({ ...r, partner_name: r.referral_partners?.partner_name || '' }))

    const minutesYesterday = Math.round(yCalls.reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)
    const leadsCount     = yLeads.length
    const referralsCount = yRefs.length
    const filteredCount  = yCalls.filter(c => c.call_outcome === 'filtered').length
    const escalatedCount = yCalls.filter(c => c.call_outcome === 'escalated').length

    const { data: mCalls } = await supabase.from('call_logs').select('duration_seconds').eq('tenant_id', tenant.id).gte('created_at', monthStart.toISOString()).lt('created_at', todayStart.toISOString())
    const minutesMonth = Math.round((mCalls || []).reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)

    if (tenant.billing_model === 'payg') {
      const { subject, html } = emailDailyCost({ businessName: tenant.business_name, callsToday: yCalls.length, leadsToday: leadsCount, minutesToday: minutesYesterday, costToday: minutesYesterday * PAYG_RATE, totalCostMonth: minutesMonth * PAYG_RATE, costLimit: tenant.monthly_cost_limit || 20 })
      await sendEmail({ to: tenant.business_email, subject, html })
    } else {
      const includedMinutes = tenant.included_minutes || INCLUDED_MINUTES[tenant.subscription_tier] || 0
      const { subject, html } = emailDailySummary({ businessName: tenant.business_name, date: dateLabel, callsTotal: yCalls.length, leadsCount, referralsCount, filteredCount, escalatedCount, minutesUsed: minutesMonth, includedMinutes, tier: tenant.subscription_tier, leads: yLeads, referrals: yRefs })
      await sendEmail({ to: tenant.business_email, subject, html })
    }
    sent++
  }
  console.log(`Daily summaries sent: ${sent}`)
  return res.status(200).json({ sent })
}

async function runWeekly(res) {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0)
  const weekStart = new Date(todayStart); weekStart.setUTCDate(weekStart.getUTCDate() - 7)
  const monthStart = new Date(now); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)

  const fromStr = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const toStr = new Date(todayStart.getTime() - 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const dateRange = `${fromStr} – ${toStr}`

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, business_name, business_email, billing_model, subscription_tier, included_minutes, notify_weekly_report')
    .not('business_email', 'is', null)
    .neq('billing_model', 'payg')

  let sent = 0
  for (const tenant of tenants || []) {
    if (tenant.notify_weekly_report === false) continue

    const { data: wCalls } = await supabase.from('call_logs').select('duration_seconds, call_outcome, created_at').eq('tenant_id', tenant.id).gte('created_at', weekStart.toISOString()).lt('created_at', todayStart.toISOString())
    if (!wCalls || wCalls.length === 0) continue

    const { data: wLeadsRaw } = await supabase.from('leads').select('lead_contact_name, created_at, callers(phone_number)').eq('tenant_id', tenant.id).gte('created_at', weekStart.toISOString()).lt('created_at', todayStart.toISOString()).order('created_at', { ascending: false })
    const wLeads = (wLeadsRaw || []).map(l => ({ ...l, phone_number: l.callers?.phone_number || '' }))

    const { data: rawRefs } = await supabase.from('referral_log').select('created_at, referral_partners(partner_name)').eq('tenant_id', tenant.id).gte('created_at', weekStart.toISOString()).lt('created_at', todayStart.toISOString()).order('created_at', { ascending: false })
    const wRefs = (rawRefs || []).map(r => ({ ...r, partner_name: r.referral_partners?.partner_name || '' }))

    const { data: mCalls } = await supabase.from('call_logs').select('duration_seconds').eq('tenant_id', tenant.id).gte('created_at', monthStart.toISOString()).lt('created_at', todayStart.toISOString())
    const minutesUsed = Math.round((mCalls || []).reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)
    const includedMinutes = tenant.included_minutes || INCLUDED_MINUTES[tenant.subscription_tier] || 0

    const { subject, html } = emailWeeklySummary({ businessName: tenant.business_name, dateRange, callsTotal: wCalls.length, leadsCount: wLeads.length, referralsCount: wRefs.length, filteredCount: wCalls.filter(c => c.call_outcome === 'filtered').length, escalatedCount: wCalls.filter(c => c.call_outcome === 'escalated').length, minutesUsed, includedMinutes, tier: tenant.subscription_tier, leads: wLeads, referrals: wRefs })
    await sendEmail({ to: tenant.business_email, subject, html })
    sent++
  }
  console.log(`Weekly summaries sent: ${sent}`)
  return res.status(200).json({ sent })
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const type = req.query?.type || 'daily'
  if (type === 'weekly') return runWeekly(res)
  return runDaily(res)
}
