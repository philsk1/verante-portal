import { createClient } from '@supabase/supabase-js'
import { buildSystemPrompt, buildAnalysisPlan } from './_build-prompt.js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const VAPI_API = 'https://api.vapi.ai'

async function fetchTenantData(tenantId) {
  const [tenantRes, servicesRes, partnerServicesRes, callRulesRes, partnersRes, specialtiesRes] =
    await Promise.all([
      supabase
        .from('tenants')
        .select('id, vapi_assistant_id, business_name, business_email, business_phone, lead_contact_name, booking_link, opening_hours, business_context, triage_mode, escalation_preference, greeting_message, spam_filter_enabled, sales_call_handling, autodialler_detection, emergency_keywords, tone_register, business_outcome_type, callback_preference_note, urgent_callback_mins')
        .eq('id', tenantId)
        .maybeSingle(),
      supabase.from('services').select('service_name').eq('tenant_id', tenantId),
      supabase.from('banned_services').select('service_name').eq('tenant_id', tenantId),
      supabase.from('call_handling_rules').select('call_type, mode, booking_link, callback, email, email_address, instructions').eq('tenant_id', tenantId),
      supabase.from('referral_partners').select('id, business_name, business_phone').eq('tenant_id', tenantId),
      supabase.from('referral_service_map').select('partner_id, service_name'),
    ])

  const partners = (partnersRes.data || []).map(p => {
    const specs = (specialtiesRes.data || [])
      .filter(s => s.partner_id === p.id)
      .map(s => s.service_name)
    return { ...p, specialties: specs }
  })

  return {
    tenant:          tenantRes.data,
    services:        (servicesRes.data || []).map(s => s.service_name),
    partnerServices: (partnerServicesRes.data || []).map(s => s.service_name),
    callRules:       callRulesRes.data || [],
    partners,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tenantId } = req.body
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

  if (!process.env.VAPI_PRIVATE_KEY) {
    return res.status(500).json({ error: 'VAPI_PRIVATE_KEY not configured' })
  }

  const data = await fetchTenantData(tenantId)

  if (!data.tenant) return res.status(404).json({ error: 'Tenant not found' })
  if (!data.tenant.vapi_assistant_id) return res.status(400).json({ error: 'No vapi_assistant_id on tenant' })

  const systemPrompt = buildSystemPrompt(data)
  const analysisPlan = buildAnalysisPlan()
  const greeting     = data.tenant.greeting_message
    || `Good morning, you're through to ${data.tenant.business_name}. How can I help?`

  const patch = {
    firstMessage: greeting,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.4,
    },
    analysisPlan,
  }

  const vapiRes = await fetch(`${VAPI_API}/assistant/${data.tenant.vapi_assistant_id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })

  if (!vapiRes.ok) {
    const err = await vapiRes.text()
    console.error('Vapi PATCH failed:', vapiRes.status, err)
    return res.status(500).json({ error: 'Vapi update failed', detail: err })
  }

  console.log(`Vapi assistant synced for tenant ${tenantId}`)
  return res.status(200).json({ ok: true })
}
