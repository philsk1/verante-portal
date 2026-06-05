// POST { tenantId, appointmentId }
// Sends a Google Business Profile review request to the appointment's client.
// Sends via WhatsApp if connected, otherwise email.
// Review URL stored in tenant_integrations settings.google_review_url.

import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE_URL = process.env.SITE_URL || 'https://qerxel-portal.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantId, appointmentId } = req.body
  if (!tenantId || !appointmentId) return res.status(400).json({ error: 'Missing fields' })

  // Load Google Business integration settings
  const { data: gbpIntegration } = await supabase
    .from('tenant_integrations')
    .select('settings')
    .eq('tenant_id', tenantId).eq('integration_id', 'google_business').maybeSingle()

  const reviewUrl = gbpIntegration?.settings?.google_review_url
  if (!reviewUrl) return res.status(400).json({ error: 'Google Business Profile not connected' })

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

  const message = `Hi ${clientName}, thank you for choosing ${businessName}. If you enjoyed your experience, we'd really appreciate a quick review — it helps other people find us. Here's the link: ${reviewUrl}\n\nThanks, ${ownerName}`

  // Try WhatsApp first if integration is connected and we have a caller
  let sent = false
  if (appt.caller_id) {
    const { data: caller } = await supabase
      .from('callers').select('phone_number').eq('id', appt.caller_id).maybeSingle()

    if (caller?.phone_number) {
      const { data: waIntegration } = await supabase
        .from('tenant_integrations')
        .select('enabled').eq('tenant_id', tenantId).eq('integration_id', 'whatsapp').maybeSingle()

      if (waIntegration?.enabled) {
        try {
          await fetch(`${SITE_URL}/api/whatsapp-send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId, to: caller.phone_number, message }),
          })
          sent = true
        } catch { /* fall through to email */ }
      }
    }
  }

  // Fallback: email the tenant with the review request to forward
  if (!sent && tenant?.business_email) {
    await sendEmail({
      to: tenant.business_email,
      subject: `Review request ready to send — ${appt.title}`,
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
