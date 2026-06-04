import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const event = req.body
  const eventType = event.message?.type || event.type || 'unknown'
  console.log('Vapi event received:', eventType, JSON.stringify(event).slice(0, 300))

  // Only process call-ended events
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

  // Look up which tenant this assistant belongs to
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, business_name, urgent_callback_mins, urgent_escalation_method, notify_new_lead, subcategory_id')
    .eq('vapi_assistant_id', assistantId)
    .maybeSingle()

  if (!tenant) {
    console.error('No tenant found for assistant:', assistantId)
    return res.status(200).json({ received: true })
  }

  const tenantId = tenant.id
  const isUrgent = outcome === 'escalated'
  const callerName = analysis.structuredData?.caller_name || null

  // Check if tenant's subcategory is sensitive — minimal storage applies
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
      .from('callers')
      .select('id')
      .eq('phone_number', callerNumber)
      .maybeSingle()

    if (existing) {
      callerId = existing.id
    } else {
      const { data: newCaller } = await supabase
        .from('callers')
        .insert({ phone_number: callerNumber })
        .select()
        .maybeSingle()
      callerId = newCaller?.id || null
    }
  }

  // Write call log — sensitive types: no summary or transcript stored
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
  }

  // Write referral log if referred out
  if (outcome === 'referred_out') {
    const partnerName = analysis.structuredData?.referred_to || null
    if (partnerName) {
      const { data: partner } = await supabase
        .from('referral_partners')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('business_name', `%${partnerName}%`)
        .maybeSingle()

      if (partner) {
        await supabase.from('referral_log').insert({
          tenant_id:  tenantId,
          partner_id: partner.id,
          call_log_id: callLog?.id || null,
        })
      }
    }
  }

  return res.status(200).json({ received: true })
}
