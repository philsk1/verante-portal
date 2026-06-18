import { createClient } from '@supabase/supabase-js'
import { sendEmail, email80pct, emailExhausted, emailNewLead, emailUrgentEscalation } from './_emails.js'
import { sendSms } from './_sms.js'
import { sendWhatsApp } from './_whatsapp-send.js'
import { fireZapier } from './_zapier-webhook.js'
import { emitSignal } from './_signals.js'

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

// ─── After-call messaging dispatch ───────────────────────────────────────────
// Reads tenant's messaging config from tenant_integrations (integration_id='messaging')
// and fires the right message(s) through the right channel based on call outcome.

const MSG_DEFAULTS = {
  call_summary:        'Hi {caller_name}, thanks for calling {business_name}. {lead_contact_name} will be in touch shortly.',
  booking_link:        'Hi {caller_name}, thanks for calling {business_name}. Book online here: {booking_link}',
  detail_confirmation: 'Hi {caller_name}, please confirm your details: {appointment_datetime} at {appointment_address}. Reply with any corrections or simply ignore to confirm.',
  booking_confirmed:   'Hi {caller_name}, your booking with {business_name} is confirmed. See you soon.',
  reminder:            'Hi {caller_name}, just a reminder about your appointment with {business_name}. See you soon.',
}

function resolveTemplate(template, vars) {
  return (template || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] || '')
}

async function dispatchAfterCallMessages({ tenantId, callerNumber, outcome, structuredData, tenant }) {
  if (!callerNumber) return
  if (!['lead_captured', 'booked', 'referred_out'].includes(outcome)) return

  const { data: msgIntegration } = await supabase
    .from('tenant_integrations')
    .select('settings')
    .eq('tenant_id', tenantId)
    .eq('integration_id', 'messaging')
    .maybeSingle()

  const config = msgIntegration?.settings || {}

  const vars = {
    caller_name:          structuredData.caller_name || 'there',
    business_name:        tenant.business_name || '',
    lead_contact_name:    tenant.lead_contact_name || 'the team',
    booking_link:         tenant.booking_link || '',
    service_requested:    structuredData.service_requested || '',
    appointment_address:  structuredData.appointment_address || '',
    appointment_datetime: structuredData.appointment_datetime
      ? new Date(structuredData.appointment_datetime).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      : '',
  }

  async function send(typeKey) {
    const cfg = config[typeKey]
    if (!cfg?.enabled) return
    const text = resolveTemplate(cfg.template?.trim() || MSG_DEFAULTS[typeKey], vars)
    const channel = cfg.channel || 'whatsapp'
    try {
      if (channel === 'whatsapp') {
        await sendWhatsApp({ tenantId, to: callerNumber, message: text })
      } else if (channel === 'sms') {
        await sendSms({ to: callerNumber, message: text })
      } else if (channel === 'email' && structuredData.caller_email) {
        await sendEmail({ to: structuredData.caller_email, subject: `Thanks for calling ${tenant.business_name || 'us'}`, html: `<p>${text.replace(/\n/g, '<br>')}</p>` })
      }
      console.log(`Messaging: sent ${typeKey} via ${channel} to ${callerNumber}`)
    } catch (err) {
      console.error(`Messaging: ${typeKey} via ${channel} failed:`, err.message)
    }
  }

  if (outcome === 'lead_captured') {
    // Send booking link message if configured and link exists, otherwise call summary
    if (config.booking_link?.enabled && tenant.booking_link) {
      await send('booking_link')
    } else {
      await send('call_summary')
    }
  }

  if (outcome === 'booked') {
    await send('call_summary')
    if (structuredData.appointment_address) await send('detail_confirmation')
  }

  if (outcome === 'referred_out') {
    await send('call_summary')
  }
}

// ─── Support call post-processing ────────────────────────────────────────────

async function handleSupportCallEnd({ call, analysis, artifact }) {
  const callerNumber   = call?.customer?.number || null
  const duration       = Math.round((call?.endedAt - call?.startedAt) / 1000) || 0
  const transcript     = artifact?.transcript || null
  const summary        = analysis?.summary || null
  const structuredData = analysis?.structuredData || {}
  const tenantId       = call?.metadata?.tenantId || null

  const category          = structuredData.complaint_category || 'unknown'
  const frustrationLevel  = structuredData.frustration_level || 'low'
  const complaintSummary  = structuredData.complaint_summary || summary
  const giftGiven         = structuredData.gift_given || 'none'
  const giftRationale     = structuredData.gift_rationale || null
  const resolution        = structuredData.resolution || 'pending'
  const requiresEscalation = structuredData.requires_escalation === true

  // Write support call record
  await supabase.from('support_calls').insert({
    tenant_id:           tenantId,
    caller_phone:        callerNumber,
    duration_seconds:    duration,
    complaint_category:  category,
    frustration_level:   frustrationLevel,
    complaint_summary:   complaintSummary,
    gift_given:          giftGiven,
    gift_rationale:      giftRationale,
    resolution,
    requires_escalation: requiresEscalation,
    transcript,
    ai_summary:          summary,
  })

  // Category A — send WhatsApp + email to Support leadership immediately
  if (category === 'A' || requiresEscalation) {
    const { data: policy } = await supabase
      .from('support_policy')
      .select('escalation_email, escalation_whatsapp')
      .limit(1)
      .maybeSingle()

    const escalEmail  = policy?.escalation_email  || process.env.OWNER_EMAIL || 'finsolsoffice@gmail.com'
    const escalWA     = policy?.escalation_whatsapp || null

    let tenantName = 'Unknown client'
    if (tenantId) {
      const { data: t } = await supabase
        .from('tenants').select('business_name, subscription_tier').eq('id', tenantId).maybeSingle()
      if (t) tenantName = `${t.business_name} (${t.subscription_tier})`
    }

    const subjectLabel = category === 'A' ? 'CATEGORY A — VERIFIED QERXEL FAILURE' : 'SUPPORT ESCALATION'
    const emailHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:2rem 1rem;color:#1a1a1a;">
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:0.75rem 1rem;border-radius:0 6px 6px 0;margin-bottom:1.25rem;">
        <div style="font-weight:700;color:#dc2626;font-size:0.9rem;">${subjectLabel}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:1.25rem;">
        <tr><td style="padding:0.4rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Client</td><td style="padding:0.4rem 0;border-bottom:1px solid #eee;font-weight:600;">${tenantName}</td></tr>
        <tr><td style="padding:0.4rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Caller</td><td style="padding:0.4rem 0;border-bottom:1px solid #eee;font-weight:600;">${callerNumber || 'Unknown'}</td></tr>
        <tr><td style="padding:0.4rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Frustration</td><td style="padding:0.4rem 0;border-bottom:1px solid #eee;font-weight:600;">${frustrationLevel}</td></tr>
        <tr><td style="padding:0.4rem 0;border-bottom:1px solid #eee;color:#aaa;font-size:0.8rem;">Resolution</td><td style="padding:0.4rem 0;border-bottom:1px solid #eee;font-weight:600;">${resolution}</td></tr>
        ${complaintSummary ? `<tr><td style="padding:0.4rem 0;color:#aaa;font-size:0.8rem;vertical-align:top;">Summary</td><td style="padding:0.4rem 0;font-weight:500;">${complaintSummary}</td></tr>` : ''}
      </table>
      ${transcript ? `<p style="font-size:0.8rem;color:#666;">Full transcript available in Qerxel support dashboard.</p>` : ''}
    </body></html>`

    await sendEmail({
      to: escalEmail,
      subject: `${subjectLabel} — ${tenantName} — ${callerNumber || 'unknown caller'}`,
      html: emailHtml,
    })

    // WhatsApp to Support leadership if configured
    if (escalWA) {
      const waMsg = `${subjectLabel}\nClient: ${tenantName}\nCaller: ${callerNumber || 'unknown'}\nFrustration: ${frustrationLevel}\n${complaintSummary ? `Summary: ${complaintSummary}` : ''}`
      sendWhatsApp({ tenantId: null, to: escalWA, message: waMsg }).catch(() => {})
    }

    console.log(`Support escalation fired: category=${category}, tenant=${tenantId}`)
  }

  emitSignal('support', 'call_support_done', {
    tenant_id:           tenantId,
    complaint_category:  category,
    frustration_level:   frustrationLevel,
    resolution,
    gift_given:          giftGiven,
    requires_escalation: requiresEscalation,
    duration_seconds:    duration,
  }).catch(() => {})
}

// ─── Q Live Session — Engine layer ────────────────────────────────────────────
// These functions are the silent technical side. They never surface to the caller.
// The Voice side (GPT-4o) reads tool results and responds naturally.
// THE WALL: tool results are semantic strings only — no DB errors, no stack traces, no JSON.

async function executeTool(name, args) {
  const tid = args.tenant_id
  if (!tid && !['select_demo_tenant', 'end_demo_mode'].includes(name)) return 'Done'

  switch (name) {
    case 'read_ai_setup': {
      const { data: t } = await supabase.from('tenants')
        .select('speech_pace, speech_style, response_delay_seconds, additional_instructions')
        .eq('id', tid).maybeSingle()
      if (!t) return 'No settings found.'
      const pace  = { slow: 'Steady', natural: 'Natural', fast: 'Brisk' }[t.speech_pace] || 'Natural'
      const delay = t.response_delay_seconds === 0.6 ? 'Quick' : t.response_delay_seconds === 2.0 ? 'Thoughtful' : 'Balanced'
      const style = { warm: 'Warm', balanced: 'Balanced', direct: 'Direct' }[t.speech_style] || 'Balanced'
      const notes = t.additional_instructions ? `Custom instructions: ${t.additional_instructions.slice(0, 200)}` : 'No custom instructions set.'
      return `Current settings — Think time: ${delay}. Talking pace: ${pace}. Style: ${style}. ${notes}`
    }

    case 'navigate_portal': {
      const highlight = args.highlight ? [args.highlight] : []
      await supabase.from('tenants').update({
        q_session_active: true,
        q_session_tab: args.tab || 'ai',
        q_session_highlight: highlight,
      }).eq('id', tid)
      return 'Done'
    }

    case 'set_think_time': {
      const val = parseFloat(args.value)
      if (![0.6, 1.2, 2.0].includes(val)) return 'Done'
      await supabase.from('tenants').update({
        response_delay_seconds: val,
        q_session_highlight: ['voice-pace'],
      }).eq('id', tid)
      const label = val === 0.6 ? 'Quick' : val === 2.0 ? 'Thoughtful' : 'Balanced'
      return `Think time set to ${label}.`
    }

    case 'set_voice_pace': {
      const val = args.value
      if (!['slow', 'natural', 'fast'].includes(val)) return 'Done'
      await supabase.from('tenants').update({
        speech_pace: val,
        q_session_highlight: ['voice-pace'],
      }).eq('id', tid)
      const label = { slow: 'Steady', natural: 'Natural', fast: 'Brisk' }[val]
      return `Voice pace set to ${label}.`
    }

    case 'set_communication_style': {
      const val = args.value
      if (!['warm', 'balanced', 'direct'].includes(val)) return 'Done'
      await supabase.from('tenants').update({
        speech_style: val,
        q_session_highlight: ['voice-pace'],
      }).eq('id', tid)
      const label = { warm: 'Warm', balanced: 'Balanced', direct: 'Direct' }[val]
      return `Communication style set to ${label}.`
    }

    case 'draft_ai_instructions': {
      const draft = (args.draft_text || '').slice(0, 2000)
      if (!draft) return 'Done'
      await supabase.from('tenants').update({
        q_draft_instructions: draft,
        q_session_highlight: ['ai-instructions'],
      }).eq('id', tid)
      return 'Draft written and visible on screen.'
    }

    case 'save_ai_instructions': {
      const { data: t } = await supabase.from('tenants')
        .select('q_draft_instructions').eq('id', tid).maybeSingle()
      if (!t?.q_draft_instructions) return 'No draft to save.'
      await supabase.from('tenants').update({
        additional_instructions: t.q_draft_instructions,
        q_draft_instructions: null,
        q_session_highlight: [],
      }).eq('id', tid)
      return 'Saved. Instructions are now live.'
    }

    case 'end_session': {
      await supabase.from('tenants').update({
        q_session_active: false,
        q_session_tab: null,
        q_session_highlight: [],
        q_draft_instructions: null,
      }).eq('id', tid)
      return 'Done'
    }

    case 'select_demo_tenant': {
      const bizType = (args.business_type || '').toLowerCase()
      const words = bizType.split(/\s+/).filter(Boolean)
      const { data: candidates } = await supabase
        .from('tenants')
        .select('business_name, lead_contact_name, opening_hours, business_context')
        .not('business_name', 'is', null)
        .not('business_context', 'is', null)
        .limit(60)
      const scored = (candidates || []).map(t => {
        const haystack = `${t.business_name} ${t.business_context}`.toLowerCase()
        const score = words.reduce((s, w) => s + (haystack.includes(w) ? 1 : 0), 0)
        return { ...t, score }
      }).sort((a, b) => b.score - a.score)
      const match = scored.find(t => t.score > 0) || scored[0]
      if (!match) return 'No demo business found for that business type.'
      const ctx = (match.business_context || '').slice(0, 300)
      return `Demo match: ${match.business_name}. Owner: ${match.lead_contact_name || 'the owner'}. Hours: ${match.opening_hours || 'standard hours'}. About: ${ctx}`
    }

    case 'end_demo_mode': {
      return 'Demo mode ended. You are now Q again.'
    }

    default:
      return 'Done'
  }
}

async function handleToolCalls(res, event) {
  const toolCallList = event.message?.toolCallList || []
  if (!toolCallList.length) return res.status(200).json({ results: [] })

  const results = await Promise.all(toolCallList.map(async (tc) => {
    const name = tc.function?.name
    let args = {}
    try { args = JSON.parse(tc.function?.arguments || '{}') } catch {}
    let result = 'Done'
    try { result = await executeTool(name, args) } catch (e) {
      console.error('[engine]', name, e.message)
    }
    return { toolCallId: tc.id, result }
  }))

  return res.status(200).json({ results })
}

// ──────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const event = req.body
  const eventType = event.message?.type || event.type || 'unknown'
  console.log('Vapi event received:', eventType, JSON.stringify(event).slice(0, 300))

  // Engine layer — tool calls from GPT-4o during live support calls
  if (eventType === 'tool-calls') {
    return handleToolCalls(res, event)
  }

  if (eventType !== 'end-of-call-report') {
    return res.status(200).json({ received: true })
  }

  const payload  = event.message || event
  const call     = payload.call
  const analysis = payload.analysis || {}
  const artifact = payload.artifact || {}

  // ── Support call detection ─────────────────────────────────────────────────
  const supportPhoneId = process.env.VAPI_SUPPORT_PHONE_NUMBER_ID
  const callPhoneId    = call?.phoneNumberId
  if (supportPhoneId && callPhoneId === supportPhoneId) {
    await handleSupportCallEnd({ call, analysis, artifact })
    return res.status(200).json({ received: true })
  }

  const assistantId  = call?.assistantId
  const callerNumber = call?.customer?.number || null
  const duration     = Math.round((call?.endedAt - call?.startedAt) / 1000) || 0
  const transcript   = artifact.transcript || null
  const summary      = analysis.summary || null
  const outcome        = analysis.structuredData?.triage_outcome || analysis.structuredData?.call_outcome || null
  const structuredData = analysis.structuredData || {}

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, business_name, business_email, business_phone, included_minutes, subscription_tier, overage_voice_preference, notify_80pct_sent_month, notify_exhausted_sent_month, urgent_callback_mins, urgent_escalation_method, notify_new_lead, subcategory_id, lead_contact_name, callback_preference_note, booking_link, sms_followup_enabled, sms_followup_message')
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

  // Urgent escalation — notify owner immediately via SMS and/or email
  if (isUrgent) {
    const method = tenant.urgent_escalation_method // 'sms', 'email', or null = both
    const callbackMins = tenant.urgent_callback_mins ?? 60
    const portalUrl = `${process.env.SITE_URL || 'https://verrante-portal.vercel.app'}/portal?tab=dashboard`

    if (method !== 'email' && tenant.business_phone) {
      const smsBody = `URGENT via Qerxel — ${callerName || 'Unknown caller'}${callerNumber ? ` (${callerNumber})` : ''}: ${summary || 'No summary provided'}. Callback needed within ${callbackMins} min.`
      await sendSms({ to: tenant.business_phone, message: smsBody })
    }

    if (method !== 'sms' && tenant.business_email) {
      const { subject, html } = emailUrgentEscalation({
        businessName: tenant.business_name || 'Your business',
        callerName,
        callerPhone: callerNumber,
        summary,
        callbackMins,
        portalUrl,
      })
      await sendEmail({ to: tenant.business_email, subject, html })
    }
  }

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

  // After-call messaging — dispatch based on outcome and tenant config
  dispatchAfterCallMessages({ tenantId, callerNumber, outcome, structuredData, tenant }).catch(err =>
    console.error('After-call messaging failed:', err.message)
  )

  // Write lead if captured
  if (outcome === 'lead_captured' || outcome === 'booked') {
    await supabase.from('leads').insert({
      tenant_id:         tenantId,
      caller_id:         callerId,
      call_log_id:       callLog?.id || null,
      lead_contact_name: analysis.structuredData?.caller_name || null,
      ai_summary:        isSensitive ? null : summary,
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

        sendWhatsApp({ tenantId, to: callerPhone, message: template })
          .catch(err => console.error('WhatsApp follow-up failed:', err.message))
      }
    }

    // Zapier webhook — fire and forget
    fireZapier({
      tenantId,
      event: 'lead_captured',
      payload: {
        caller_phone: call?.customer?.number || null,
        caller_name: analysis.structuredData?.caller_name || null,
        call_outcome: outcome,
      },
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

  // Element signal — Answer observed a completed call
  emitSignal('answer', 'call_completed', {
    tenant_id:        tenantId,
    call_type:        analysis.structuredData?.call_type || 'unknown',
    outcome,
    duration_seconds: duration,
  }).catch(() => {})

  // Opt-out detection — check transcript for removal requests
  if (callerId && transcript) {
    const lower = transcript.toLowerCase()
    const removalPhrases = ['remove me from', 'take me off', 'stop contacting', "don't contact", 'unsubscribe', 'remove my details', 'delete my', 'opt out', 'remove from list']
    if (removalPhrases.some(p => lower.includes(p))) {
      await supabase.from('caller_tenant_relationships').upsert(
        { tenant_id: tenantId, caller_id: callerId, marketing_opted_out: true, opted_out_at: new Date().toISOString(), deletion_requested: true, deletion_requested_at: new Date().toISOString() },
        { onConflict: 'tenant_id,caller_id' }
      )
    }
  }

  return res.status(200).json({ received: true })
}
