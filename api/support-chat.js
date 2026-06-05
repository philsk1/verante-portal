// POST { tenantId, messages }
// Claude Haiku support agent with live tenant context

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const client  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tenantId, messages } = req.body
  if (!tenantId || !messages?.length) return res.status(400).json({ error: 'Missing required fields' })

  // Fetch tenant context in parallel
  const [tenantRes, callRes, leadRes, partnerRes] = await Promise.all([
    supabase.from('tenants')
      .select('business_name, subscription_tier, billing_model, included_minutes, triage_mode, tone_register, business_outcome_type, spam_filter_enabled, overage_voice_preference')
      .eq('id', tenantId).maybeSingle(),
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

  // Build Claude messages — skip leading AI messages, ensure starts with user
  const claudeMessages = messages
    .map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))
    .filter((m, i, arr) => {
      // Drop leading assistant turns — Claude requires user first
      if (i === 0 && m.role === 'assistant') return false
      return true
    })

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
