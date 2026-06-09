// Daily summary cron — runs 07:00 UTC every day
// PAYG tenants: cost-focused report
// Subscription tenants: activity summary (calls, leads, referrals, minutes)
// Only sends if there were calls yesterday. Skips silent days.

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailDailyCost, emailDailySummary } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PAYG_RATE = 0.35 // £ per minute

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

  // Yesterday window (midnight → midnight)
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1)

  const monthStart = new Date(now)
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const dateLabel = yesterdayStart.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  // All tenants with a business email
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, business_name, business_email, billing_model, subscription_tier, monthly_cost_limit, included_minutes, notify_daily_summary')
    .not('business_email', 'is', null)

  let sent = 0

  for (const tenant of tenants || []) {
    // Yesterday's calls
    const { data: yCalls } = await supabase
      .from('call_logs')
      .select('duration_seconds, call_outcome, created_at')
      .eq('tenant_id', tenant.id)
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString())

    if (!yCalls || yCalls.length === 0) continue // silent day — skip
    if (tenant.notify_daily_summary === false) continue // tenant opted out

    // Yesterday's leads
    const { data: yLeads } = await supabase
      .from('leads')
      .select('lead_contact_name, caller_name, created_at')
      .eq('tenant_id', tenant.id)
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })

    // Yesterday's referrals
    const { data: rawRefs } = await supabase
      .from('referral_log')
      .select('created_at, referral_partners(partner_name)')
      .eq('tenant_id', tenant.id)
      .gte('created_at', yesterdayStart.toISOString())
      .lt('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
    const yRefs = (rawRefs || []).map(r => ({ ...r, partner_name: r.referral_partners?.partner_name || '' }))

    const minutesYesterday = Math.round(yCalls.reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)
    const leadsCount     = (yLeads || []).length
    const referralsCount = (yRefs  || []).length
    const filteredCount  = yCalls.filter(c => c.call_outcome === 'filtered').length
    const escalatedCount = yCalls.filter(c => c.call_outcome === 'escalated').length

    if (tenant.billing_model === 'payg') {
      // Month-to-date for running cost total
      const { data: mCalls } = await supabase
        .from('call_logs')
        .select('duration_seconds')
        .eq('tenant_id', tenant.id)
        .gte('created_at', monthStart.toISOString())
        .lt('created_at', todayStart.toISOString())

      const minutesMonth   = Math.round((mCalls || []).reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)
      const costYesterday  = minutesYesterday * PAYG_RATE
      const totalCostMonth = minutesMonth * PAYG_RATE

      const { subject, html } = emailDailyCost({
        businessName:   tenant.business_name,
        callsToday:     yCalls.length,
        leadsToday:     leadsCount,
        minutesToday:   minutesYesterday,
        costToday:      costYesterday,
        totalCostMonth,
        costLimit:      tenant.monthly_cost_limit || 20,
      })
      await sendEmail({ to: tenant.business_email, subject, html })
    } else {
      // Month-to-date minutes for allowance bar
      const { data: mCalls } = await supabase
        .from('call_logs')
        .select('duration_seconds')
        .eq('tenant_id', tenant.id)
        .gte('created_at', monthStart.toISOString())
        .lt('created_at', todayStart.toISOString())

      const minutesMonth   = Math.round((mCalls || []).reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)
      const includedMinutes = tenant.included_minutes || INCLUDED_MINUTES[tenant.subscription_tier] || 0

      const { subject, html } = emailDailySummary({
        businessName:    tenant.business_name,
        date:            dateLabel,
        callsTotal:      yCalls.length,
        leadsCount,
        referralsCount,
        filteredCount,
        escalatedCount,
        minutesUsed:     minutesMonth,
        includedMinutes,
        tier:            tenant.subscription_tier,
        leads:           yLeads || [],
        referrals:       yRefs  || [],
      })
      await sendEmail({ to: tenant.business_email, subject, html })
    }

    sent++
  }

  console.log(`Daily summaries sent: ${sent}`)
  return res.status(200).json({ sent })
}
