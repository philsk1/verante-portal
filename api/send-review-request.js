// POST { tenantId, appointmentId, integrationId? }
// Sends a review request to the appointment's client.
// integrationId: 'google_business' (default) | 'checkatrade' | 'rated_people'
// Sends via WhatsApp if connected, otherwise email tenant to forward.
// Review URL stored in tenant_integrations settings.review_url.

import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantId, appointmentId, integrationId = 'google_business' } = req.body
  if (!tenantId || !appointmentId) return res.status(400).json({ error: 'Missing fields' })

  const PLATFORM_LABELS = {
    google_business: 'Google',
    checkatrade: 'Checkatrade',
    rated_people: 'Rated People',
  }

  // Load review platform settings
  const { data: reviewIntegration } = await supabase
    .from('tenant_integrations')
    .select('settings')
    .eq('tenant_id', tenantId).eq('integration_id', integrationId).maybeSingle()

  const reviewUrl = reviewIntegration?.settings?.review_url || reviewIntegration?.settings?.google_review_url
  if (!reviewUrl) return res.status(400).json({ error: `${PLATFORM_LABELS[integrationId] || integrationId} not connected` })

  const platformLabel = PLATFORM_LABELS[integrationId] || integrationId

  // Load appointment + caller details
  const { data: appt } = await supabase
    .from('appointments')
    .select('id, title, client_notes, caller_id')
    .eq('id', appointmentId).maybeSingle()

  if (!appt) return res.status(404).json({ error: 'Appointment not found' })

  // Load tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('business_name, business_email, lead_contact_name')
    .eq('id', tenantId).maybeSingle()

  const businessName = tenant?.business_name || 'us'
  const ownerName = tenant?.lead_contact_name || businessName
  const clientName = appt.title.split(' — ')[0] || appt.title

  const message = `Hi ${clientName}, thank you for choosing ${businessName}. If you have a moment, we'd really appreciate a ${platformLabel} review — it helps other people find us. Here's the link: ${reviewUrl}\n\nThanks, ${ownerName}`

  let sent = false

  // Fallback: email the tenant with the review request to forward
  if (!sent && tenant?.business_email) {
    await sendEmail({
      to: tenant.business_email,
      subject: `${platformLabel} review request ready — ${appt.title}`,
      html: `<p>Hi ${ownerName},</p>
<p>Here's a review request for <strong>${appt.title}</strong> — ready to copy and send:</p>
<blockquote style="border-left:3px solid #5e3b87;padding:0.75rem 1rem;background:#f8f7fa;border-radius:4px;margin:1rem 0;">
${message.replace(/\n/g, '<br>')}
</blockquote>
<p style="font-size:0.85rem;color:#888;">This was generated because you marked the appointment as complete in Qerxel.</p>`,
    })
    sent = true
  }

  return res.status(200).json({ sent })
}
