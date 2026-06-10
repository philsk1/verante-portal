// Merged AI chat handler (Claude Haiku)
// { type: 'vera', zoneText, zoneName, tabName, messages } — Vera portal helper
// { type: 'support', tenantId, messages } — support chat with tenant context

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function handleVera(body, res) {
  const { zoneText, zoneName, tabName, messages } = body
  if (!messages || !zoneText) return res.status(400).json({ error: 'Missing required fields' })

  const systemPrompt = `You are Vera, the AI assistant built into the Qerxel portal. Qerxel is a call handling and lead capture platform for UK small businesses — hair salons, tradespeople, sole traders. The owner uses this portal to configure how their AI handles every call.

The user is in the ${tabName || 'portal'} section and has clicked on: "${zoneName || 'a feature'}".

What this feature does: ${zoneText}

Answer their questions directly and helpfully. Be concise — 2 to 4 sentences unless they ask for more detail. Plain English only. No jargon. If they ask something you're genuinely unsure about, ask one short clarifying question rather than guessing.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    return res.status(200).json({ message: response.content[0].text })
  } catch (err) {
    console.error('vera-chat error:', err.message)
    return res.status(500).json({ error: 'Could not reach AI. Please try again.' })
  }
}

async function handleSupport(body, res) {
  const { tenantId, messages } = body
  if (!tenantId || !messages?.length) return res.status(400).json({ error: 'Missing required fields' })

  const [tenantRes, callRes, leadRes, partnerRes] = await Promise.all([
    supabase.from('tenants').select('business_name, subscription_tier, billing_model, included_minutes, triage_mode, tone_register, business_outcome_type, spam_filter_enabled, overage_voice_preference').eq('id', tenantId).maybeSingle(),
    supabase.from('call_logs').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('referral_partners').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ])

  const t = tenantRes.data || {}

  const systemPrompt = `You are a friendly, expert support assistant for Qerxel — an AI call handling and lead capture platform for UK sole traders and small businesses.

You are speaking with: ${t.business_name || 'a Qerxel customer'}

Their account at a glance:
- Plan: ${t.subscription_tier || 'unknown'} ${t.billing_model === 'payg' ? '(pay as you go, 35p/min)' : '(subscription)'}
- Included minutes: ${t.included_minutes || 'N/A'} Premium/month
- Calls handled: ${callRes.count || 0} total
- Leads captured: ${leadRes.count || 0} total
- Partners in network: ${partnerRes.count || 0}
- Triage mode: ${t.triage_mode || 'balanced'}
- Tone: ${t.tone_register || 'warm'}
- Business outcome type: ${t.business_outcome_type || 'quote'}
- Overage voice preference: ${t.overage_voice_preference || 'premium'}

Your role: help them get the most from Qerxel. Answer questions about portal settings, AI behaviour, billing, and how the platform works. Be direct and practical — 2 to 4 sentences unless more detail is asked for. Plain English only.

Key Qerxel facts:
- AI answers missed calls, triages intent, captures leads, and refers to partners
- Triage modes: Strict (short efficient calls), Balanced (standard), Open (conversational)
- Premium voice: Cartesia Sonic 3.5 + GPT-4o mini · Standard voice: Cartesia Sonic 3 + Gemini Flash
- Referral: each converted referral earns 1 free month of subscription
- Overage: Premium 18p/min, Standard 14p/min
- For anything requiring account changes or urgent issues: support@qerxel.com`

  const claudeMessages = messages
    .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
    .filter((m, i) => !(i === 0 && m.role === 'assistant'))

  if (!claudeMessages.length || claudeMessages[0].role !== 'user') {
    return res.status(400).json({ error: 'No valid message to respond to' })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: claudeMessages,
    })
    return res.status(200).json({ message: response.content[0].text })
  } catch (err) {
    console.error('support-chat error:', err.message)
    return res.status(500).json({ error: 'Could not reach AI. Please try again.' })
  }
}

async function handleIntel(body, res) {
  const { page, dataSummary } = body
  if (!page || !dataSummary) return res.status(400).json({ error: 'Missing required fields' })

  const pageLabels = {
    time:    'calendar utilisation and service margin',
    clients: 'client value and retention',
    team:    'team performance and productivity',
    money:   'revenue gaps and margin opportunities',
  }

  const systemPrompt = `You are Q, a business intelligence advisor built into the Qerxel calendar. You help UK small business owners understand their numbers and take action.

You are analysing: ${pageLabels[page] || 'business performance'}.

Data summary:
${dataSummary}

Give a 3–5 sentence briefing as if you've just reviewed this data personally. Mention specific numbers from the summary. End with one concrete action they can take today. Direct, confident, no jargon. Like a trusted advisor who knows their business.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Brief me.' }],
    })
    return res.status(200).json({ message: response.content[0].text })
  } catch (err) {
    console.error('intel-brief error:', err.message)
    return res.status(500).json({ error: 'Could not reach AI. Please try again.' })
  }
}

async function handleBookingAssist(body, res) {
  const { businessName, services, messages } = body
  if (!messages?.length) return res.status(400).json({ error: 'Missing messages' })

  const serviceList = (services || []).map(s => {
    const parts = [s.name]
    if (s.description) parts.push(s.description)
    if (s.duration_minutes) parts.push(`${s.duration_minutes} min`)
    if (s.price_from) parts.push(s.price_to ? `£${s.price_from}–£${s.price_to}` : `from £${s.price_from}`)
    return parts.join(' · ')
  }).join('\n')

  const systemPrompt = `You are the AI advisor for ${businessName || 'this salon'}. You help customers choose the right service or answer questions before booking.

${serviceList ? `Services available:\n${serviceList}` : 'Service information is loading.'}

Be warm, friendly, and concise. Keep replies to 2–4 sentences unless a detailed question is asked. If someone asks about hair problems, colour advice, or treatment recommendations, give genuinely helpful advice — this is what you're here for. If asked about pricing or timing and you have that information, share it. If a question is outside what you know, say so honestly and suggest they call or ask at their appointment. Never invent information not in the service list.`

  const claudeMessages = messages
    .map(m => ({ role: m.role === 'assistant' || m.role === 'ai' ? 'assistant' : 'user', content: m.content || m.text || '' }))
    .filter(m => m.content)

  if (!claudeMessages.length || claudeMessages[0].role !== 'user') {
    return res.status(400).json({ error: 'No valid message' })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: claudeMessages,
    })
    return res.status(200).json({ message: response.content[0].text })
  } catch (err) {
    console.error('booking-assist error:', err.message)
    return res.status(500).json({ error: 'AI unavailable. Please try again.' })
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { type } = req.body || {}
  if (type === 'vera') return handleVera(req.body, res)
  if (type === 'support') return handleSupport(req.body, res)
  if (type === 'intel') return handleIntel(req.body, res)
  if (type === 'booking-assist') return handleBookingAssist(req.body, res)
  return res.status(400).json({ error: 'Unknown type' })
}
