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

  // Only process call-ended events
  if (event.message?.type !== 'end-of-call-report') {
    return res.status(200).json({ received: true })
  }

  const call     = event.message.call
  const analysis = event.message.analysis || {}
  const artifact = event.message.artifact || {}

  const assistantId  = call?.assistantId
  const callerNumber = call?.customer?.number || null
  const duration     = Math.round((call?.endedAt - call?.startedAt) / 1000) || 0
  const transcript   = artifact.transcript || null
  const summary      = analysis.summary || null
  const outcome      = analysis.structuredData?.triage_outcome || null

  // Look up which tenant this assistant belongs to
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('vapi_assistant_id', assistantId)
    .maybeSingle()

  if (!tenant) {
    console.error('No tenant found for assistant:', assistantId)
    return res.status(200).json({ received: true })
  }

  const tenantId = tenant.id

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

  // Write call log
  const { data: callLog } = await supabase
    .from('call_logs')
    .insert({
      tenant_id:      tenantId,
      caller_id:      callerId,
      duration,
      transcript,
      caller_notes:   summary,
      triage_outcome: outcome,
    })
    .select()
    .maybeSingle()

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
