// POST { action: 'connect'|'disconnect'|'caldav-sync'|'send-welcome'|'send-review'|'booking-confirm'|'get-booking'|'cancel-booking', tenantId?, cancelToken?, ... }

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailWelcome, emailBookingConfirmation } from './_emails.js'
import { sendSms } from './_sms.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export function formatICS(appt) {
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
  const portalUrl = `${process.env.SITE_URL || 'https://verante-portal.vercel.app'}/portal`
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

async function handleSentrySnapshot(body, res) {
  const { url } = body
  if (!url) return res.status(400).json({ error: 'url required' })
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) return res.status(200).json({ unreachable: true, error: `Camera returned ${response.status}` })
    const ct = response.headers.get('content-type') || 'image/jpeg'
    if (!ct.startsWith('image/')) return res.status(200).json({ unreachable: true, error: 'URL did not return an image' })
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return res.status(200).json({ frame: `data:${ct};base64,${base64}` })
  } catch (err) {
    return res.status(200).json({ unreachable: true, error: err.name === 'AbortError' ? 'Connection timed out' : 'Camera not reachable — it may be on a private network' })
  }
}

async function handleBookingConfirm(body, res) {
  const { tenantId, clientName, clientPhone, clientEmail, serviceName, startTime, bookingRef, cancelToken } = body
  if (!tenantId || !startTime) return res.status(400).json({ error: 'Missing required fields' })

  const { data: tenant } = await supabase
    .from('tenants')
    .select('business_name, business_phone, business_email, cancel_cutoff_hrs')
    .eq('id', tenantId).maybeSingle()

  if (!tenant) return res.status(404).json({ error: 'Tenant not found' })

  const start = new Date(startTime)
  const dateStr = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const siteUrl = process.env.SITE_URL || 'https://verante-portal.vercel.app'
  const manageUrl = cancelToken ? `${siteUrl}/manage-booking/${cancelToken}` : `${siteUrl}/book/${tenantId}`

  const tasks = []

  // Email to client
  if (clientEmail) {
    const { subject, html } = emailBookingConfirmation({
      clientName: clientName || 'there',
      businessName: tenant.business_name,
      businessPhone: tenant.business_phone,
      serviceName: serviceName || 'appointment',
      dateStr, timeStr, bookingRef, manageUrl,
      cancelCutoffHrs: tenant.cancel_cutoff_hrs ?? 24,
    })
    tasks.push(sendEmail({ to: clientEmail, subject, html }))
  }

  // SMS to client
  if (clientPhone) {
    const smsText = `Booking confirmed! ${serviceName || 'Your appointment'} on ${dateStr} at ${timeStr} with ${tenant.business_name}.${bookingRef ? ` Ref: ${bookingRef}.` : ''} To cancel or reschedule: ${manageUrl}`
    tasks.push(sendSms({ to: clientPhone, message: smsText }))
  }

  // Notify tenant
  if (tenant.business_email) {
    tasks.push(sendEmail({
      to: tenant.business_email,
      subject: `New booking — ${serviceName || 'Appointment'}, ${clientName || 'Client'} on ${dateStr}`,
      html: `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;max-width:520px;margin:0 auto;padding:2rem 1rem;color:#1a1a1a;">
        <div style="margin-bottom:1.5rem;"><span style="font-weight:700;color:#5e3b87;font-size:1.125rem;">Qerxel</span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f0a500;margin-left:3px;margin-bottom:8px;"></span></div>
        <div style="display:inline-block;background:#5e3b87;color:white;padding:0.25rem 0.65rem;border-radius:4px;font-size:0.75rem;font-weight:700;margin-bottom:1rem;">NEW ONLINE BOOKING</div>
        <p>A new booking has been made through your booking page.</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:1.25rem;">
          <tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Client</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${clientName || '—'}</td></tr>
          ${clientPhone ? `<tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Phone</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;"><a href="tel:${clientPhone}" style="color:#5e3b87;text-decoration:none;">${clientPhone}</a></td></tr>` : ''}
          <tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Service</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${serviceName || '—'}</td></tr>
          <tr><td style="padding:0.5rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Date</td><td style="padding:0.5rem 0;border-bottom:1px solid #eee;font-weight:600;text-align:right;">${dateStr}</td></tr>
          <tr><td style="padding:0.5rem 0;color:#aaa;font-size:0.8rem;">Time</td><td style="padding:0.5rem 0;font-weight:600;text-align:right;">${timeStr}</td></tr>
        </table>
        <div style="margin-top:1.5rem;"><a href="${siteUrl}/portal" style="display:inline-block;background:#f0a500;color:#1a0533;text-decoration:none;font-weight:700;font-size:0.875rem;padding:0.65rem 1.4rem;border-radius:8px;">View in Qerxel →</a></div>
        <hr style="border:none;border-top:1px solid #eee;margin:2rem 0 1rem;">
        <p style="color:#aaa;font-size:0.8rem;margin:0;">Qerxel booking notification. Manage notifications in Account settings.</p>
      </body></html>`,
    }))
  }

  await Promise.allSettled(tasks)
  return res.status(200).json({ sent: true })
}

async function handleGetBooking(body, res) {
  const { cancelToken } = body
  if (!cancelToken) return res.status(400).json({ error: 'Missing cancelToken' })

  const { data: appt } = await supabase
    .from('appointments')
    .select('id, start_time, end_time, status, appointment_type, client_name, client_phone, cancel_token, tenant_id, tenants(business_name, business_phone, cancel_cutoff_hrs)')
    .eq('cancel_token', cancelToken)
    .maybeSingle()

  if (!appt) return res.status(404).json({ error: 'Booking not found' })
  return res.status(200).json({ appointment: appt })
}

async function handleCancelBooking(body, res) {
  const { cancelToken } = body
  if (!cancelToken) return res.status(400).json({ error: 'Missing cancelToken' })

  const { data: appt } = await supabase
    .from('appointments')
    .select('id, start_time, status, tenant_id, tenants(cancel_cutoff_hrs)')
    .eq('cancel_token', cancelToken)
    .maybeSingle()

  if (!appt) return res.status(404).json({ error: 'Booking not found' })
  if (appt.status === 'cancelled') return res.status(200).json({ cancelled: true, alreadyCancelled: true })

  const cutoffHrs = appt.tenants?.cancel_cutoff_hrs ?? 24
  const hoursUntil = (new Date(appt.start_time) - new Date()) / 3600000
  if (cutoffHrs > 0 && hoursUntil < cutoffHrs) {
    return res.status(200).json({ cancelled: false, pastCutoff: true, cutoffHrs })
  }

  await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id)
  return res.status(200).json({ cancelled: true })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, tenantId, integrationId, credentials, settings } = req.body

  // Token-based public actions — no tenantId required
  if (action === 'get-booking')    return handleGetBooking(req.body, res)
  if (action === 'cancel-booking') return handleCancelBooking(req.body, res)

  if (!tenantId) return res.status(400).json({ error: 'Missing tenantId' })

  if (action === 'caldav-sync') return handleCaldavSync(req.body, res)
  if (action === 'send-welcome') return handleSendWelcome(req.body, res)
  if (action === 'send-review') return handleSendReview(req.body, res)
  if (action === 'booking-confirm') return handleBookingConfirm(req.body, res)
  if (action === 'sentry-snapshot') return handleSentrySnapshot(req.body, res)

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
