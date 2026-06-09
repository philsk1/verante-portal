// POST { action: 'connect'|'disconnect'|'caldav-sync', tenantId, integrationId, credentials?, settings? }
// caldav-sync: { action: 'caldav-sync', tenantId, appointmentId, caldavAction: 'upsert'|'delete' }

import { createClient } from '@supabase/supabase-js'

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, tenantId, integrationId, credentials, settings } = req.body
  if (!tenantId) return res.status(400).json({ error: 'Missing tenantId' })

  if (action === 'caldav-sync') return handleCaldavSync(req.body, res)

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
