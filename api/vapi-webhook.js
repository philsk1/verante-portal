import { createClient } from '@supabase/supabase-js'
import { sendEmail, email80pct, emailExhausted, emailDailyCost, emailNewLead } from './_emails.js'
import { sendSms } from './_sms.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Returns "2026-06" — used to deduplicate monthly notifications
function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Check minute thresholds after a call and fire notifications if needed
async function checkMinuteNotifications(tenant, tenantId) {
  const { included_minutes, subscription_tier, business_email, business_name,
          overage_voice_preference, notify_80pct_sent_month, notify_exhausted_sent_month } = tenant

  // Free tier: no included minutes, no threshold notifications
  if (!included_minutes || subscription_tier === 'free') return
  if (!business_email) return

  const monthKey = currentMonthKey()

  // Sum this calendar month's call durations
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: monthCalls } = await supabase
    .from('call_logs')
    .select('duration_seconds')
    .eq('tenant_id', tenantId)
    .gte('created_at', startOfMonth.toISOString())

  const totalSecs = (monthCalls || []).reduce((s, c) => s + (c.duration_seconds || 0), 0)
  const minutesUsed = Math.round(totalSecs / 60)
  const pct = minutesUsed / included_minutes

  const overagePref = overage_voice_preference || 'premium'
  const updates = {}

  // 80% notification
  if (pct >= 0.8 && pct < 1.0 && notify_80pct_sent_month !== monthKey) {
    const { subject, html } = email80pct({ businessName: business_name, minutesUsed, includedMinutes: included_minutes, overagePref })
    await sendEmail({ to: business_email, subject, html })
    updates.notify_80pct_sent_month = monthKey
  }

  // 100% exhausted notification
  if (pct >= 1.0 && notify_exhausted_sent_month !== monthKey) {
    const { subject, html } = emailExhausted({ businessName: business_name, includedMinutes: included_minutes, overagePref, tier: subscription_tier })
    await sendEmail({ to: business_email, subject, html })
    updates.notify_exhausted_sent_month = monthKey
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('tenants').update(updates).eq('id', tenantId)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const event = req.body
  const eventType = event.message?.type || event.type || 'unknown'
  console.log('Vapi event received:', eventType, JSON.stringify(event).slice(0, 300))

  if (eventType !== 'end-of-call-report') {
    return res.status(200).json({ received: true })
  }

  const payload  = event.message || event
  const call     = payload.call
  const analysis = payload.analysis || {}
  const artifact = payload.artifact || {}

  const assistantId  = call?.assistantId
  const callerNumber = call?.customer?.number || null
  const duration     = Math.round((call?.endedAt - call?.startedAt) / 1000) || 0
  const transcript   = artifact.transcript || null
  const summary      = analysis.summary || null
  const outcome      = analysis.structuredData?.triage_outcome || analysis.structuredData?.call_outcome || null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, business_name, business_email, included_minutes, subscription_tier, overage_voice_preference, notify_80pct_sent_month, notify_exhausted_sent_month, urgent_callback_mins, urgent_escalation_method, notify_new_lead, subcategory_id, lead_contact_name, callback_preference_note, booking_link, sms_followup_enabled, sms_followup_message')
    .eq('vapi_assistant_id', assistantId)
    .maybeSingle()

  if (!tenant) {
    console.error('No tenant found for assistant:', assistantId)
    return res.status(200).json({ received: true })
  }

  const tenantId  = tenant.id
  const isUrgent  = outcome === 'escalated'
  const callerName = analysis.structuredData?.caller_name || null

  let isSensitive = false
  if (tenant.subcategory_id) {
    const { data: sub } = await supabase
      .from('business_type_subcategories')
      .select('is_sensitive')
      .eq('id', tenant.subcategory_id)
      .maybeSingle()
    isSensitive = sub?.is_sensitive === true
  }

  const notificationMessage = isUrgent
    ? `URGENT — ${tenant.urgent_callback_mins ?? 60} minute response time requested\nCaller: ${callerName || 'Unknown'} · ${callerNumber || 'Unknown'}\nNeed: ${summary || 'No summary'}\nResolution: Escalated — ${tenant.urgent_escalation_method === 'sms' ? 'text' : tenant.urgent_escalation_method === 'email' ? 'email' : 'text + email'} sent`
    : `${tenant.business_name || 'Your business'} — New call\nCaller: ${callerName || 'Unknown'} · ${callerNumber || 'Unknown'}\nNeed: ${summary || 'No summary'}\nResolution: ${outcome || 'Unknown'}`

  console.log('Notification:', notificationMessage)

  // Find or create caller record
  let callerId = null
  if (callerNumber) {
    const { data: existing } = await supabase
      .from('callers').select('id').eq('phone_number', callerNumber).maybeSingle()
    if (existing) {
      callerId = existing.id
    } else {
      const { data: newCaller } = await supabase
        .from('callers').insert({ phone_number: callerNumber }).select().maybeSingle()
      callerId = newCaller?.id || null
    }
  }

  // Write call log
  const { data: callLog, error: logError } = await supabase
    .from('call_logs')
    .insert({
      tenant_id:        tenantId,
      caller_id:        callerId,
      caller_phone:     callerNumber,
      duration_seconds: duration,
      transcript:       isSensitive ? null : transcript,
      ai_summary:       isSensitive ? null : summary,
      call_outcome:     outcome,
    })
    .select()
    .maybeSingle()

  if (logError) console.error('call_logs insert error:', logError.message)

  // Write lead if captured
  if (outcome === 'lead_captured' || outcome === 'booked') {
    await supabase.from('leads').insert({
      tenant_id:         tenantId,
      caller_id:         callerId,
      call_log_id:       callLog?.id || null,
      lead_contact_name: analysis.structuredData?.caller_name || null,
      status:            'new',
    })

    // Immediate lead notification to owner — if enabled
    if (tenant.notify_new_lead !== false && tenant.business_email) {
      const portalUrl = `${process.env.SITE_URL || 'https://verrante-portal.vercel.app'}/portal?tab=dashboard`
      const { subject, html } = emailNewLead({
        businessName: tenant.business_name || 'Your business',
        callerName:   analysis.structuredData?.caller_name || null,
        callerPhone:  callerNumber,
        summary:      summary,
        outcome,
        callbackUrl:  portalUrl,
      })
      await sendEmail({ to: tenant.business_email, subject, html })
    }

    // SMS follow-up — confirmation text to caller seconds after the call
    if (callerNumber && tenant.sms_followup_enabled) {
      const name      = callerName || 'there'
      const biz       = tenant.business_name || 'us'
      const owner     = tenant.lead_contact_name || 'We'
      const timeframe = tenant.callback_preference_note || 'shortly'
      const bookingP  = tenant.booking_link ? ` Book online: ${tenant.booking_link}` : ''
      const message   = tenant.sms_followup_message?.trim()
        || `Hi ${name}, thanks for calling ${biz}. ${owner} will be in touch ${timeframe}.${bookingP}`
      await sendSms({ to: callerNumber, message })
    }

    // WhatsApp follow-up — fire if tenant has WhatsApp connected + enabled
    const callerPhone = call?.customer?.number
    if (callerPhone) {
      const { data: waIntegration } = await supabase
        .from('tenant_integrations')
        .select('enabled, settings')
        .eq('tenant_id', tenantId)
        .eq('integration_id', 'whatsapp')
        .maybeSingle()

      if (waIntegration?.enabled) {
        const callerName = analysis.structuredData?.caller_name || 'there'
        const template = waIntegration.settings?.message_template
          || `Hi ${callerName}, thanks for calling ${tenant.business_name}. ${tenant.lead_contact_name || 'We'} will be in touch shortly.${tenant.booking_link ? ` Book online: ${tenant.booking_link}` : ''}`

        // Fire and forget — don't block webhook response
        fetch(`${process.env.SITE_URL || 'https://qerxel-portal.vercel.app'}/api/whatsapp-send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, to: callerPhone, message: template }),
        }).catch(err => console.error('WhatsApp follow-up failed:', err.message))
      }
    }

    // Zapier webhook — fire and forget
    fetch(`${process.env.SITE_URL || 'https://qerxel-portal.vercel.app'}/api/zapier-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        event: 'lead_captured',
        payload: {
          caller_phone: call?.customer?.number || null,
          caller_name: analysis.structuredData?.caller_name || null,
          call_outcome: outcome,
        },
      }),
    }).catch(() => {})
  }

  // Write referral log if referred out
  if (outcome === 'referred_out') {
    const partnerName = analysis.structuredData?.referred_to || null
    if (partnerName) {
      const { data: partner } = await supabase
        .from('referral_partners').select('id')
        .eq('tenant_id', tenantId).ilike('partner_name', `%${partnerName}%`).maybeSingle()
      if (partner) {
        await supabase.from('referral_log').insert({
          tenant_id:  tenantId,
          partner_id: partner.id,
        })
      }
    }
  }

  // Check minute thresholds — fire 80% and exhausted notifications as needed
  await checkMinuteNotifications(tenant, tenantId)

  // PAYG cost limit check
  if (tenant.billing_model === 'payg' && tenant.monthly_cost_limit && tenant.business_email) {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const { data: mCalls } = await supabase
      .from('call_logs').select('duration_seconds').eq('tenant_id', tenantId)
      .gte('created_at', monthStart.toISOString())
    const monthMins = Math.round((mCalls || []).reduce((s, c) => s + (c.duration_seconds || 0), 0) / 60)
    const monthCost = monthMins * 0.35
    if (monthCost >= tenant.monthly_cost_limit) {
      // Log warning — actual AI pause requires Vapi API call (Task 4 / future)
      console.warn(`PAYG limit reached for tenant ${tenantId}: £${monthCost.toFixed(2)} >= £${tenant.monthly_cost_limit}`)
    }
  }

  return res.status(200).json({ received: true })
}
