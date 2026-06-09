// Merged send handler
// { type: 'welcome', tenantId } — welcome email after onboarding
// { type: 'review', tenantId, appointmentId, integrationId? } — review request

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailWelcome } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function handleWelcome(body, res) {
  const { tenantId } = body
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

  const { data: tenant } = await supabase.from('tenants').select('id, business_name, lead_contact_name, business_email, subscription_tier').eq('id', tenantId).maybeSingle()
  if (!tenant?.business_email) return res.status(200).json({ skipped: true })

  const portalUrl = `${process.env.SITE_URL || 'https://verrante-portal.vercel.app'}/portal`
  const { subject, html } = emailWelcome({ businessName: tenant.business_name || 'your business', ownerName: tenant.lead_contact_name || null, tier: tenant.subscription_tier || 'standard', portalUrl })
  await sendEmail({ to: tenant.business_email, subject, html })
  return res.status(200).json({ ok: true })
}

async function handleReview(body, res) {
  const { tenantId, appointmentId, integrationId = 'google_business' } = body
  if (!tenantId || !appointmentId) return res.status(400).json({ error: 'Missing fields' })

  const PLATFORM_LABELS = { google_business: 'Google', checkatrade: 'Checkatrade', rated_people: 'Rated People' }

  const { data: reviewIntegration } = await supabase.from('tenant_integrations').select('settings').eq('tenant_id', tenantId).eq('integration_id', integrationId).maybeSingle()
  const reviewUrl = reviewIntegration?.settings?.review_url || reviewIntegration?.settings?.google_review_url
  if (!reviewUrl) return res.status(400).json({ error: `${PLATFORM_LABELS[integrationId] || integrationId} not connected` })

  const platformLabel = PLATFORM_LABELS[integrationId] || integrationId

  const { data: appt } = await supabase.from('appointments').select('id, title, client_notes, caller_id').eq('id', appointmentId).maybeSingle()
  if (!appt) return res.status(404).json({ error: 'Appointment not found' })

  const { data: tenant } = await supabase.from('tenants').select('business_name, business_email, lead_contact_name').eq('id', tenantId).maybeSingle()
  const businessName = tenant?.business_name || 'us'
  const ownerName = tenant?.lead_contact_name || businessName
  const clientName = appt.title.split(' — ')[0] || appt.title

  const message = `Hi ${clientName}, thank you for choosing ${businessName}. If you have a moment, we'd really appreciate a ${platformLabel} review — it helps other people find us. Here's the link: ${reviewUrl}\n\nThanks, ${ownerName}`

  if (tenant?.business_email) {
    await sendEmail({
      to: tenant.business_email,
      subject: `${platformLabel} review request ready — ${appt.title}`,
      html: `<p>Hi ${ownerName},</p><p>Here's a review request for <strong>${appt.title}</strong> — ready to copy and send:</p><blockquote style="border-left:3px solid #5e3b87;padding:0.75rem 1rem;background:#f8f7fa;border-radius:4px;margin:1rem 0;">${message.replace(/\n/g, '<br>')}</blockquote><p style="font-size:0.85rem;color:#888;">This was generated because you marked the appointment as complete in Qerxel.</p>`,
    })
  }

  return res.status(200).json({ sent: true })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { type } = req.body || {}
  if (type === 'welcome') return handleWelcome(req.body, res)
  if (type === 'review') return handleReview(req.body, res)
  return res.status(400).json({ error: 'Unknown type' })
}
