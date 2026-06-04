// Called by Vercel cron on the 1st of each month at 08:00 UTC
// Sends renewal notification to all active paid tenants

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailRenewal } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Vercel cron sends GET; protect against other callers
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, business_name, business_email, included_minutes, subscription_tier')
    .not('business_email', 'is', null)
    .not('subscription_tier', 'in', '("free","bespoke")')

  if (error) {
    console.error('Renewal fetch error:', error.message)
    return res.status(500).json({ error: error.message })
  }

  let sent = 0
  for (const tenant of tenants || []) {
    if (!tenant.included_minutes || !tenant.business_email) continue
    const { subject, html } = emailRenewal({
      businessName:    tenant.business_name,
      includedMinutes: tenant.included_minutes,
    })
    await sendEmail({ to: tenant.business_email, subject, html })
    // Reset monthly notification flags so they can fire again this month
    await supabase
      .from('tenants')
      .update({ notify_80pct_sent_month: null, notify_exhausted_sent_month: null })
      .eq('id', tenant.id)
    sent++
  }

  console.log(`Renewal emails sent: ${sent}`)
  return res.status(200).json({ sent })
}
