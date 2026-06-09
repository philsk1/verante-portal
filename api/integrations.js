// POST { action: 'connect'|'disconnect'|'caldav-sync'|'send-welcome'|'send-review', tenantId, ... }

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailWelcome } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function formatICS(appt) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const start = new Date(appt.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const end   = new Date(appt.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const summary = appt.title.replace(/[,;\\]/g, '\\$&')
  const desc = [appt.appointment_type, appt.client_notes].filter(Boolean).join(' | ').replace(/[,;\\]/g, '\\$&')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Qerxel//EN',
    'BEGIN:VEVENT',
    `UID:${appt.id}@qerxel.app`, `DTSTAMP:${stamp}`, `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${summary}`,
    desc ? `DESCRIPTION:${desc}` : '',
    `STATUS:${appt.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

async function handleCaldavSync(body, res) {
  const { tenantId, appointmentId, caldavAction = 'upsert' } = body
  if (!tenantId || !appointmentId) return res.status(400).json({ error: 'Missing fields' })

  const { data: credsRow } = await supabase
    .from('tenant_integration_credentials')
    .select('credentials').eq('tenant_id', tenantId).eq('integration_id', 'google_calendar').maybeSingle()

  if (!credsRow?.credentials?.caldav_url) {
    return res.status(400).json({ error: 'Google Calendar not connected' })
  }

  const { caldav_url, username, app_password } = credsRow.credentials
  const authHeader = 'Basic ' + Buffer.from(`${username}:${app_password}`).toString('base64')
  const eventUrl = caldav_url.replace(/\/?$/, '/') + `${appointmentId}.ics`

  try {
    if (caldavAction === 'delete') {
      await fetch(eventUrl, { method: 'DELETE', headers: { 'Authorization': authHeader } })
      return res.status(200).json({ synced: true, action: 'deleted' })
    }

    const { data: appt } = await supabase
      .from('appointments').select('*').eq('id', appointmentId).maybeSingle()
    if (!appt) return res.status(404).json({ error: 'Appointment not found' })

    const icsBody = formatICS(appt)
    const putRes = await fetch(eventUrl, {
      method: 'PUT',
      headers: { 'Authorization': authHeader, 'Content-Type': 'text/calendar; charset=utf-8' },
      body: icsBody,
    })

    if (!putRes.ok && putRes.status !== 204 && putRes.status !== 201) {
      const text = await putRes.text()
      console.error('CalDAV PUT failed:', putRes.status, text.slice(0, 200))
      return res.status(502).json({ error: `CalDAV error: ${putRes.status}` })
    }

    return res.status(200).json({ synced: true, action: 'upserted' })
  } catch (err) {
    console.error('CalDAV sync error:', err.message)
    return res.status(500).json({ error: 'CalDAV sync failed' })
  }
}

async function handleSendWelcome(body, res) {
  const { tenantId } = body
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })
  const { data: tenant } = await supabase.from('tenants').select('id, business_name, lead_contact_name, business_email, subscription_tier').eq('id', tenantId).maybeSingle()
  if (!tenant?.business_email) return res.status(200).json({ skipped: true })
  const portalUrl = `${process.env.SITE_URL || 'https://verrante-portal.vercel.app'}/portal`
  const { subject, html } = emailWelcome({ businessName: tenant.business_name || 'your business', ownerName: tenant.lead_contact_name || null, tier: tenant.subscription_tier || 'standard', portalUrl })
  await sendEmail({ to: tenant.business_email, subject, html })
  return res.status(200).json({ ok: true })
}

async function handleSendReview(body, res) {
  const { tenantId, appointmentId, integrationId: reviewIntId = 'google_business' } = body
  if (!tenantId || !appointmentId) return res.status(400).json({ error: 'Missing fields' })

  const PLATFORM_LABELS = { google_business: 'Google', checkatrade: 'Checkatrade', rated_people: 'Rated People' }

  const { data: reviewIntegration } = await supabase.from('tenant_integrations').select('settings').eq('tenant_id', tenantId).eq('integration_id', reviewIntId).maybeSingle()
  const reviewUrl = reviewIntegration?.settings?.review_url || reviewIntegration?.settings?.google_review_url
  if (!reviewUrl) return res.status(400).json({ error: `${PLATFORM_LABELS[reviewIntId] || reviewIntId} not connected` })

  const platformLabel = PLATFORM_LABELS[reviewIntId] || reviewIntId
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

  const { action, tenantId, integrationId, credentials, settings } = req.body
  if (!tenantId) return res.status(400).json({ error: 'Missing tenantId' })

  if (action === 'caldav-sync') return handleCaldavSync(req.body, res)
  if (action === 'send-welcome') return handleSendWelcome(req.body, res)
  if (action === 'send-review') return handleSendReview(req.body, res)

  if (!integrationId) return res.status(400).json({ error: 'Missing integrationId' })

  try {
    if (action === 'disconnect') {
      await Promise.all([
        supabase.from('tenant_integrations')
          .delete().eq('tenant_id', tenantId).eq('integration_id', integrationId),
        supabase.from('tenant_integration_credentials')
          .delete().eq('tenant_id', tenantId).eq('integration_id', integrationId),
      ])
      return res.status(200).json({ disconnected: true })
    }

    // default: connect
    await supabase.from('tenant_integrations').upsert({
      tenant_id: tenantId,
      integration_id: integrationId,
      enabled: true,
      settings: settings || {},
      connected_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,integration_id' })

    if (credentials && Object.keys(credentials).length > 0) {
      await supabase.from('tenant_integration_credentials').upsert({
        tenant_id: tenantId,
        integration_id: integrationId,
        credentials,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,integration_id' })
    }

    return res.status(200).json({ connected: true })
  } catch (err) {
    console.error('integrations error:', err.message)
    return res.status(500).json({ error: 'Integration operation failed' })
  }
}
