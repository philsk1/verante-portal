// Weekly summary cron — runs 07:00 UTC every Monday
// Subscription tenants only. Sends 7-day activity summary.
// Skips tenants with no calls and those who opted out.

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailWeeklySummary } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const INCLUDED_MINUTES = {
  free:         0,
  light:        120,
  standard:     250,
  professional: 450,
  enterprise:   1000,
  bespoke:      1000,
}

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Last 7 days window
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)
  const weekStart = new Date(todayStart)
  weekStart.setUTCDate(weekStart.getUTCDate() - 7)

  const monthStart = new Date(now)
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const fromStr = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const toStr   = new Date(todayStart.getTime() - 1).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const dateRange = `${fromStr} – ${toStr}`

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, business_name, business_email, billing_model, subscription_tier, included_minutes, notify_weekly_report')
    .not('business_email', 'is', null)
    .neq('billing_model', 'payg') // PAYG tenants get daily cost report instead

  let sent = 0

  for (const tenant of tenants || []) {
    if (tenant.notify_weekly_report === false) continue

    const { data: wCalls } = await supabase
      .from('call_logs')
      .select('duration_seconds, call_outcome, created_at')
      .eq('tenant_id', tenant.id)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', todayStart.toISOString())

    if (!wCalls || wCalls.length === 0) continue // silent week — skip

    const { data: wLeads } = await supabase
      .from('leads')
      .select('lead_contact_name, caller_name, created_at')
      .eq('tenant_id', tenant.id)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })

    const { data: rawRefs } = await supabase
      .from('referral_log')
      .select('created_at, referral_partners(partner_name)')
      .eq('tenant_id', tenant.id)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
    const wRefs = (rawRefs || []).map(r => ({ ...r, partner_name: r.referral_partners?.partner_name || '' }))

    // Month-to-date minutes for allowance bar
    const { data: mCalls } = await supabase
      .from('call_logs')
      .select('duration_seconds')
      .eq('tenant_id', tenant.id)
      .gte('created_at', monthStart.toISOString())
      .lt('created_at', todayStart.toISOString())

    const minutesUsed = Math.round((mCalls || []).reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)
    const includedMinutes = tenant.included_minutes || INCLUDED_MINUTES[tenant.subscription_tier] || 0
    const leadsCount     = (wLeads || []).length
    const referralsCount = (wRefs  || []).length
    const filteredCount  = wCalls.filter(c => c.call_outcome === 'filtered').length
    const escalatedCount = wCalls.filter(c => c.call_outcome === 'escalated').length

    const { subject, html } = emailWeeklySummary({
      businessName:    tenant.business_name,
      dateRange,
      callsTotal:      wCalls.length,
      leadsCount,
      referralsCount,
      filteredCount,
      escalatedCount,
      minutesUsed,
      includedMinutes,
      tier:            tenant.subscription_tier,
      leads:           wLeads || [],
      referrals:       wRefs  || [],
    })

    await sendEmail({ to: tenant.business_email, subject, html })
    sent++
  }

  console.log(`Weekly summaries sent: ${sent}`)
  return res.status(200).json({ sent })
}
