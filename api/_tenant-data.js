import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PACE_TO_SPEED = { slow: 'slow', natural: 'normal', fast: 'fast' }

export function getVoiceConfig(tenant) {
  const pref  = tenant?.overage_voice_preference || 'standard'
  const speed = PACE_TO_SPEED[tenant?.speech_pace] || 'normal'

  if (pref === 'premium') {
    if (process.env.CARTESIA_PREMIUM_VOICE_ID) {
      return { provider: 'cartesia', voiceId: process.env.CARTESIA_PREMIUM_VOICE_ID, speed }
    }
    return { provider: 'deepgram', voiceId: 'luna', speed }
  }
  if (process.env.CARTESIA_STANDARD_VOICE_ID) {
    return { provider: 'cartesia', voiceId: process.env.CARTESIA_STANDARD_VOICE_ID, speed }
  }
  return { provider: 'deepgram', voiceId: 'stella', speed }
}

export async function fetchTenantData(tenantId) {
  const [tenantRes, servicesRes, partnerServicesRes, callRulesRes, partnersRes, staffRes, catalogueRes] =
    await Promise.all([
      supabase
        .from('tenants')
        .select('id, vapi_assistant_id, business_name, business_email, business_phone, lead_contact_name, booking_link, opening_hours, business_context, triage_mode, escalation_preference, greeting_message, spam_filter_enabled, sales_call_handling, autodialler_detection, emergency_keywords, keep_alive_topics, keep_alive_max_minutes, tone_register, business_outcome_type, custom_outcome_text, callback_preference_note, urgent_callback_mins, additional_instructions, subcategory_id, blocked_phone_numbers, provisional_booking_enabled, provisional_booking_rule, booking_slots_to_offer, booking_buffer_mins, booking_confirmation_window_mins, overage_voice_preference, speech_pace, speech_style, response_delay_seconds')
        .eq('id', tenantId)
        .maybeSingle(),
      supabase.from('services').select('service_name').eq('tenant_id', tenantId),
      supabase.from('banned_services').select('banned_item').eq('tenant_id', tenantId),
      supabase.from('call_handling_rules').select('call_type, mode, booking_link, callback, email, email_address, instructions').eq('tenant_id', tenantId),
      supabase.from('referral_partners').select('id, partner_name, contact_phone').eq('tenant_id', tenantId),
      supabase.from('staff_profiles').select('id, name, role, specialist_services, phone, direct_line_did, active').eq('tenant_id', tenantId),
      supabase.from('catalogue_items').select('name, description, price_from, price_to, duration_minutes, item_type').eq('tenant_id', tenantId).eq('active', true).order('name'),
    ])

  const partnerIds = (partnersRes.data || []).map(p => p.id)
  const specialtiesRes = partnerIds.length
    ? await supabase.from('referral_service_map').select('partner_id, service_keyword').in('partner_id', partnerIds)
    : { data: [] }

  const partners = (partnersRes.data || []).map(p => {
    const specs = (specialtiesRes.data || [])
      .filter(s => s.partner_id === p.id)
      .map(s => s.service_keyword)
    return { ...p, business_name: p.partner_name, business_phone: p.contact_phone, specialties: specs }
  })

  let isSensitive = false
  if (tenantRes.data?.subcategory_id) {
    const { data: sub } = await supabase
      .from('business_type_subcategories')
      .select('is_sensitive')
      .eq('id', tenantRes.data.subcategory_id)
      .maybeSingle()
    isSensitive = sub?.is_sensitive === true
  }

  return {
    tenant:          tenantRes.data,
    services:        (servicesRes.data || []).map(s => s.service_name),
    partnerServices: (partnerServicesRes.data || []).map(s => s.banned_item),
    callRules:       callRulesRes.data || [],
    partners,
    staff:           staffRes.data || [],
    catalogue:       catalogueRes.data || [],
    isSensitive,
  }
}
