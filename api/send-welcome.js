// Fires once after tenant completes onboarding
// Called from the frontend on the final onboarding step

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailWelcome } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tenantId } = req.body
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, business_name, lead_contact_name, business_email, subscription_tier')
    .eq('id', tenantId)
    .maybeSingle()

  if (!tenant?.business_email) return res.status(200).json({ skipped: true })

  const portalUrl = `${process.env.SITE_URL || 'https://verrante-portal.vercel.app'}/portal`

  const { subject, html } = emailWelcome({
    businessName: tenant.business_name || 'your business',
    ownerName:    tenant.lead_contact_name || null,
    tier:         tenant.subscription_tier || 'standard',
    portalUrl,
  })

  await sendEmail({ to: tenant.business_email, subject, html })

  return res.status(200).json({ ok: true })
}
