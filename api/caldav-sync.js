// POST { tenantId, appointmentId, action }
// action: 'upsert' | 'delete'
// Pushes a Qerxel appointment to the tenant's CalDAV calendar (one-way).
// Credentials: caldav_url, username, app_password in tenant_integration_credentials.
//
// Google Calendar setup:
//   CalDAV URL: https://apidata.googleusercontent.com/caldav/v2/{email}/events/
//   Username: Google account email
//   App password: myaccount.google.com/apppasswords (requires 2FA)
//
// Apple iCloud setup:
//   CalDAV URL: https://caldav.icloud.com/ (iCloud determines calendar path after discovery)
//   Username: Apple ID email
//   App password: appleid.apple.com/account/manage → App-Specific Passwords
//
// Outlook / Microsoft 365:
//   CalDAV URL: https://outlook.office365.com/owa/{email}/calendar/
//   Username: Microsoft account email
//   App password: account.microsoft.com/security → App passwords

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
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Qerxel//EN',
    'BEGIN:VEVENT',
    `UID:${appt.id}@qerxel.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    desc ? `DESCRIPTION:${desc}` : '',
    `STATUS:${appt.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantId, appointmentId, action = 'upsert' } = req.body
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
    if (action === 'delete') {
      await fetch(eventUrl, { method: 'DELETE', headers: { 'Authorization': authHeader } })
      return res.status(200).json({ synced: true, action: 'deleted' })
    }

    const { data: appt } = await supabase
      .from('appointments').select('*').eq('id', appointmentId).maybeSingle()

    if (!appt) return res.status(404).json({ error: 'Appointment not found' })

    const icsBody = formatICS(appt)

    const putRes = await fetch(eventUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'text/calendar; charset=utf-8',
        'If-None-Match': action === 'upsert' ? undefined : '*',
      },
      body: icsBody,
    })

    if (!putRes.ok && putRes.status !== 204 && putRes.status !== 201) {
      const body = await putRes.text()
      console.error('CalDAV PUT failed:', putRes.status, body.slice(0, 200))
      return res.status(502).json({ error: `CalDAV error: ${putRes.status}` })
    }

    return res.status(200).json({ synced: true, action: 'upserted' })
  } catch (err) {
    console.error('CalDAV sync error:', err.message)
    return res.status(500).json({ error: 'CalDAV sync failed' })
  }
}
