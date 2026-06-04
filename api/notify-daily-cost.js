// Daily cost report for PAYG tenants — runs at 09:00 UTC every day
// Sends to any free-tier tenant who had at least one call today

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailDailyCost } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PAYG_RATE = 0.35 // £ per minute

export default async function handler(req, res) {
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Today window
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now)
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  // Fetch all PAYG tenants with email
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, business_name, business_email, monthly_cost_limit')
    .eq('billing_model', 'payg')
    .not('business_email', 'is', null)

  let sent = 0
  for (const tenant of tenants || []) {
    // Calls today
    const { data: todayCalls } = await supabase
      .from('call_logs')
      .select('duration_seconds, call_outcome')
      .eq('tenant_id', tenant.id)
      .gte('created_at', todayStart.toISOString())

    if (!todayCalls || todayCalls.length === 0) continue // no calls today, skip

    // Leads today
    const { count: leadsToday } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('created_at', todayStart.toISOString())

    // Month-to-date calls for running total
    const { data: monthCalls } = await supabase
      .from('call_logs')
      .select('duration_seconds')
      .eq('tenant_id', tenant.id)
      .gte('created_at', monthStart.toISOString())

    const minutesToday = Math.round(todayCalls.reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)
    const minutesMonth = Math.round((monthCalls || []).reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)
    const costToday = minutesToday * PAYG_RATE
    const totalCostMonth = minutesMonth * PAYG_RATE

    const { subject, html } = emailDailyCost({
      businessName:    tenant.business_name,
      callsToday:      todayCalls.length,
      leadsToday:      leadsToday || 0,
      minutesToday,
      costToday,
      totalCostMonth,
      costLimit:       tenant.monthly_cost_limit || 20,
    })

    await sendEmail({ to: tenant.business_email, subject, html })
    sent++
  }

  console.log(`Daily cost reports sent: ${sent}`)
  return res.status(200).json({ sent })
}
