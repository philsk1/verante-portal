/**
 * ============================================================================
 * QERXEL COMPONENT CONTRACT & BOUNDARY MAP
 * ============================================================================
 * AUTHOR/VISION : Philip Keating
 * FILE PATH     : api/vapi-sync.js
 * TOPOLOGY RING : Ring 2 — Contained (HTTP endpoint, 2 callers: AIBehaviour + Onboarding)
 * INTENT MAP    : Manages the lifecycle of Vapi voice assistants for tenants
 *                 and handles outbound call initiation. Three action paths:
 *                 (1) Default — sync/create a tenant's Vapi assistant from live
 *                     tenant data via _tenant-data.js and _build-prompt.js.
 *                 (2) demo-call — trigger a "test my AI" outbound call using
 *                     the tenant's real saved Vapi assistant.
 *                 (3) sales-demo — trigger an outbound Q sales call (rate-limited,
 *                     3 per IP per hour) with an inline ephemeral assistant.
 *                 Only the default sync path writes to the database.
 *
 * ─── REGRESSION MAP (THE ZERO-WEB STANDARD) ──────────────────────────────────
 * INPUTS/PARAMS : HTTP POST body — three shapes:
 *                   Default (sync):  { tenantId: string }
 *                   Demo call:       { action: 'demo-call', phoneNumber: string,
 *                                      assistantId: string }
 *                   Sales demo:      { action: 'sales-demo', phoneNumber: string,
 *                                      businessType?: string }
 * EXTERNAL READS: _tenant-data.js → fetchTenantData() (reads tenants + all AI config)
 *                 _build-prompt.js → buildSystemPrompt(), buildAnalysisPlan(),
 *                                     buildGreeting()
 *                 _ratelimit.js → checkRateLimit(), getClientIP()
 *                 Vapi API: POST /assistant (create), PATCH /assistant/:id (update),
 *                           POST /call (outbound demo + sales)
 *                 Env vars: VAPI_PRIVATE_KEY, VAPI_DEMO_PHONE_NUMBER_ID,
 *                           VAPI_SALES_PHONE_NUMBER_ID, SUPABASE_SERVICE_ROLE_KEY,
 *                           SUPABASE_URL, SITE_URL
 * MUTATIONS/DB  : tenants — UPDATE vapi_assistant_id only when a new assistant is
 *                   created (path: tenantId provided + no existing vapi_assistant_id)
 *                 No other tables touched.
 * OUTPUTS/EMITS : HTTP 200 { ok: true, created?: true, assistantId?: string }
 *                 HTTP 400 missing params | 404 tenant not found | 429 rate limited
 *                 HTTP 500 Vapi or internal error | 503 env var not configured
 *
 * ─── IN-FILE PRIME DIRECTIVES (MANDATORY) ────────────────────────────────────
 * 1. Never create new files to house extracted logic. Keep it in this file.
 * 2. Run a regression map before every single future edit.
 * 3. No CSS, no CSS variables, inline styles only if layout is touched.
 * 4. Every database mutation must keep its save guard (if applicable).
 * 5. Clean Slate Rule: If complex nesting or multi-path drift occurs,
 *    the engineer must rebuild this module from a blank canvas. No patching.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js'
import { buildSystemPrompt, buildAnalysisPlan, buildGreeting } from './_build-prompt.js'
import { fetchTenantData, getVoiceConfig } from './_tenant-data.js'
import { checkRateLimit, getClientIP } from './_ratelimit.js'

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const VAPI_API = 'https://api.vapi.ai'

function buildSalesDemoPrompt(bizTypeHint) {
  return `You are Q — the AI that powers Qerxel, an AI call-handling platform for UK sole traders and small businesses. You are speaking to a prospective client who asked for a call.

You are not representing Qerxel — you ARE Qerxel's AI, demonstrating yourself. Speak from that position. Confident, warm, never pushy. You know this platform completely because you run it.

WHAT QERXEL DOES:
Answers missed calls for small business owners. When a sole trader — plumber, hair salon, personal trainer — can't pick up, Q answers. Captures the lead, triages the call type, offers a booking link or callback, handles everything with warmth and professionalism. Every unanswered call is a lost lead. Qerxel eliminates that.

Three products:
- ANSWER: AI call handling. The core product. 24/7, never has a bad day. Warmth is genuine, not scripted.
- SCHEDULE: Calendar and booking. Entry level always free — the starting point before committing to Answer.
- LISTEN: Live AI copilot for when the owner picks up themselves. Context on screen in real time.

HOW THE CALL FLOWS:
- First 2–3 minutes: Answer whatever they ask. If they haven't asked anything, introduce briefly and ask what kind of business they run.
- Around 3 minutes in: Offer the live demo. Say something like: "Want to hear what it sounds like when I answer a call for a real business? Tell me what kind of business and I'll do it right now."
- When they give a business type: call select_demo_tenant silently, then say: "Right — I'm going to answer as [business name] for a moment. Ask me anything one of their customers might ask." Then answer AS that business's AI.
- Stay in character until they say "end demo", "stop", "okay that's enough", or clearly want out.
- After the demo: step back, ask how it felt. "That's exactly what your callers would hear. Takes about 10 minutes to set that up for your business."
- Close: "Q Chat is live on the site any time — you don't need to call, just type."

TOOL USE:
You have select_demo_tenant(business_type) — call it silently before stepping into character. Never narrate the tool. Just pause naturally and begin.
You have end_demo_mode — call it when the prospect steps back out of the demo.

VOICE:
British English. Natural, warm, a slight sense of personality. Never pushy. Never use filler affirmations. 2–4 sentences per response. Don't monologue.${bizTypeHint ? `\n\nBUSINESS TYPE HINT: The prospect mentioned they run a ${bizTypeHint} business. Bear this in mind when offering the demo.` : ''}`
}

function buildSalesDemoTools(siteUrl) {
  const url = `${siteUrl}/api/vapi-webhook`
  return [
    {
      type: 'function',
      function: {
        name: 'select_demo_tenant',
        description: 'Find the closest matching real demo business for the given business type. Call this silently — never narrate it — then step into character as that business.',
        parameters: {
          type: 'object',
          properties: {
            business_type: { type: 'string', description: 'What kind of business the prospect wants to demo, e.g. "hair salon", "plumber", "personal trainer"' },
          },
          required: ['business_type'],
        },
      },
      server: { url, timeoutSeconds: 10 },
    },
    {
      type: 'function',
      function: {
        name: 'end_demo_mode',
        description: 'Signal that the demo persona has ended and Q has returned to sales mode.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
      server: { url, timeoutSeconds: 5 },
    },
  ]
}

async function handleSalesDemoOutbound(req, res) {
  const { phoneNumber, businessType } = req.body
  if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber required' })
  if (!process.env.VAPI_PRIVATE_KEY) return res.status(500).json({ error: 'VAPI_PRIVATE_KEY not configured' })
  if (!process.env.VAPI_SALES_PHONE_NUMBER_ID) return res.status(503).json({ error: 'Sales demo line not configured — add VAPI_SALES_PHONE_NUMBER_ID to environment variables' })

  const siteUrl = process.env.SITE_URL || 'https://verante-portal.vercel.app'

  const assistant = {
    name: 'Q Sales Demo',
    firstMessageMode: 'assistant-speaks-first',
    firstMessage: "Hi, I'm Q — the AI that powers Qerxel. You asked for a call, so here I am. What would you like to know?",
    firstMessageDelay: 1.0,
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [{ role: 'system', content: buildSalesDemoPrompt(businessType || '') }],
      temperature: 0.5,
      tools: buildSalesDemoTools(siteUrl),
      toolChoice: 'auto',
    },
    voice: {
      provider: 'deepgram',
      voiceId: 'luna',
      speed: 'normal',
    },
    endCallFunctionEnabled: true,
    endCallMessage: 'Thanks for the call. Q Chat is live on the site any time — hope to speak again.',
    serverUrl: `${siteUrl}/api/vapi-webhook`,
    serverMessages: ['end-of-call-report'],
    analysisPlan: {
      summaryPrompt: 'Summarise this sales demo call in one or two sentences. Note whether a live demo was requested, what business type, and how the prospect responded.',
      successEvaluationPrompt: 'Did the prospect express genuine interest in Qerxel?',
      successEvaluationRubric: 'DescriptiveLikert',
    },
  }

  const vapiRes = await fetch(`${VAPI_API}/call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phoneNumberId: process.env.VAPI_SALES_PHONE_NUMBER_ID,
      customer: { number: phoneNumber },
      assistant,
    }),
  })

  if (!vapiRes.ok) {
    const err = await vapiRes.text()
    console.error('Sales demo call failed:', vapiRes.status, err)
    return res.status(500).json({ error: 'Could not start sales demo call', detail: err })
  }

  console.log(`Sales demo call initiated to ${phoneNumber}${businessType ? ` for "${businessType}"` : ''}`)
  return res.status(200).json({ ok: true })
}

async function handleDemoCall(req, res) {
  const { phoneNumber, assistantId } = req.body

  if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber required' })
  if (!process.env.VAPI_PRIVATE_KEY) return res.status(500).json({ error: 'VAPI_PRIVATE_KEY not configured' })
  if (!process.env.VAPI_DEMO_PHONE_NUMBER_ID) return res.status(503).json({ error: 'Demo calling not yet configured' })

  if (!assistantId) {
    // No assistant synced yet — don't fall back to hardcoded content.
    // The demo must go through the real assistant so it tests the actual data flow.
    return res.status(400).json({ error: 'no_assistant', message: 'Save and sync your AI settings first, then test the call.' })
  }

  const body = {
    phoneNumberId: process.env.VAPI_DEMO_PHONE_NUMBER_ID,
    customer: { number: phoneNumber },
    assistantId,
  }

  const vapiRes = await fetch(`${VAPI_API}/call`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!vapiRes.ok) {
    const err = await vapiRes.text()
    console.error('Demo call failed:', vapiRes.status, err)
    return res.status(500).json({ error: 'Could not start demo call', detail: err })
  }

  console.log(`Demo call initiated to ${phoneNumber} using assistant ${assistantId}`)
  return res.status(200).json({ ok: true })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { action, tenantId } = req.body
    if (action === 'demo-call') return handleDemoCall(req, res)
    if (action === 'sales-demo') {
      const ip = getClientIP(req)
      if (checkRateLimit(ip, 'sales-demo', 3, 3_600_000))
        return res.status(429).json({ error: 'Too many demo call requests — please try again later.' })
      return handleSalesDemoOutbound(req, res)
    }

    if (!tenantId) return res.status(400).json({ error: 'tenantId required' })

    if (!process.env.VAPI_PRIVATE_KEY) {
      return res.status(500).json({ error: 'VAPI_PRIVATE_KEY not configured' })
    }

    const data = await fetchTenantData(tenantId)

    if (!data.tenant) return res.status(404).json({ error: 'Tenant not found' })

    const systemPrompt = buildSystemPrompt(data)
    const analysisPlan = buildAnalysisPlan()
    const greeting     = buildGreeting(data.tenant, undefined, data.isSensitive)

    const assistantPayload = {
      firstMessage: greeting,
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.4,
      },
      voice: getVoiceConfig(data.tenant),
      analysisPlan,
    }

    if (!data.tenant.vapi_assistant_id) {
      const vapiRes = await fetch(`${VAPI_API}/assistant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: data.tenant.business_name || 'Qerxel Assistant', ...assistantPayload }),
      })
      if (!vapiRes.ok) {
        const err = await vapiRes.text()
        console.error('Vapi POST failed:', vapiRes.status, err)
        return res.status(500).json({ error: 'Vapi create failed', detail: err })
      }
      const created = await vapiRes.json()
      await supabase.from('tenants').update({ vapi_assistant_id: created.id }).eq('id', tenantId)
      console.log(`Vapi assistant created for tenant ${tenantId}: ${created.id}`)
      return res.status(200).json({ ok: true, created: true, assistantId: created.id })
    }

    const vapiRes = await fetch(`${VAPI_API}/assistant/${data.tenant.vapi_assistant_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assistantPayload),
    })

    if (!vapiRes.ok) {
      const err = await vapiRes.text()
      console.error('Vapi PATCH failed:', vapiRes.status, err)
      return res.status(500).json({ error: 'Vapi update failed', detail: err })
    }

    console.log(`Vapi assistant synced for tenant ${tenantId}`)
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('vapi-sync unhandled error:', err)
    return res.status(500).json({ error: 'Internal error', message: err.message, stack: err.stack?.split('\n').slice(0, 5).join(' | ') })
  }
}
