// Appointment reminder cron — runs hourly via vercel.json
// Finds appointments in 24h and 1h windows, sends email reminders, marks sent.

import { createClient } from '@supabase/supabase-js'
import { sendEmail, emailAppointmentReminder, emailClientReminder } from './_emails.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function runReminders() {
  const now = new Date()

  // 24h window: ±1h around the 24h mark
  const win24Start = new Date(now.getTime() + 23 * 3600000).toISOString()
  const win24End   = new Date(now.getTime() + 25 * 3600000).toISOString()

  // 1h window: ±5min around the 1h mark
  const win1Start  = new Date(now.getTime() + 55 * 60000).toISOString()
  const win1End    = new Date(now.getTime() + 65 * 60000).toISOString()

  const [res24, res1h] = await Promise.all([
    supabase.from('appointments')
      .select('id, title, start_time, appointment_type, tenant_id, client_name, client_email, cancel_token')
      .gte('start_time', win24Start).lte('start_time', win24End)
      .eq('reminder_sent_24h', false)
      .not('status', 'in', '("cancelled","no_show")'),
    supabase.from('appointments')
      .select('id, title, start_time, appointment_type, tenant_id, client_name, client_email, cancel_token')
      .gte('start_time', win1Start).lte('start_time', win1End)
      .eq('reminder_sent_1h', false)
      .not('status', 'in', '("cancelled","no_show")'),
  ])

  const appts24 = res24.data || []
  const appts1h  = res1h.data  || []
  const allIds   = [...new Set([...appts24, ...appts1h].map(a => a.tenant_id))]

  if (allIds.length === 0) return { sent: 0 }

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, business_name, business_email, business_phone, reminders_enabled')
    .in('id', allIds)

  const tMap = Object.fromEntries((tenants || []).map(t => [t.id, t]))
  const siteUrl = process.env.SITE_URL || 'https://verante-portal.vercel.app'
  let sent = 0

  for (const appt of appts24) {
    const t = tMap[appt.tenant_id]
    if (!t?.reminders_enabled) continue
    const tasks = []
    if (t?.business_email) {
      const tmpl = emailAppointmentReminder({ businessName: t.business_name, appointment: appt, hoursAhead: 24 })
      tasks.push(sendEmail({ to: t.business_email, ...tmpl }))
    }
    if (appt.client_email) {
      const manageUrl = appt.cancel_token ? `${siteUrl}/manage-booking/${appt.cancel_token}` : null
      const tmpl = emailClientReminder({ clientName: appt.client_name, businessName: t?.business_name, businessPhone: t?.business_phone, appointment: appt, hoursAhead: 24, manageUrl })
      tasks.push(sendEmail({ to: appt.client_email, ...tmpl }))
    }
    if (tasks.length) {
      await Promise.allSettled(tasks)
      await supabase.from('appointments').update({ reminder_sent_24h: true }).eq('id', appt.id)
      sent++
    }
  }

  for (const appt of appts1h) {
    const t = tMap[appt.tenant_id]
    if (!t?.reminders_enabled) continue
    const tasks = []
    if (t?.business_email) {
      const tmpl = emailAppointmentReminder({ businessName: t.business_name, appointment: appt, hoursAhead: 1 })
      tasks.push(sendEmail({ to: t.business_email, ...tmpl }))
    }
    if (appt.client_email) {
      const manageUrl = appt.cancel_token ? `${siteUrl}/manage-booking/${appt.cancel_token}` : null
      const tmpl = emailClientReminder({ clientName: appt.client_name, businessName: t?.business_name, businessPhone: t?.business_phone, appointment: appt, hoursAhead: 1, manageUrl })
      tasks.push(sendEmail({ to: appt.client_email, ...tmpl }))
    }
    if (tasks.length) {
      await Promise.allSettled(tasks)
      await supabase.from('appointments').update({ reminder_sent_1h: true }).eq('id', appt.id)
      sent++
    }
  }

  return { sent, checked: { '24h': appts24.length, '1h': appts1h.length } }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  const result = await runReminders()
  return res.status(200).json(result)
}
