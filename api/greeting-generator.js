/**
 * ============================================================================
 * QERXEL COMPONENT CONTRACT & BOUNDARY MAP
 * ============================================================================
 * AUTHOR/VISION : Philip Keating
 * FILE PATH     : api/greeting-generator.js
 * TOPOLOGY RING : Ring 1 — Leaf (Standalone API Module)
 * INTENT MAP    : Receives a trigger payload, executes a single standalone
 *                 Anthropic LLM call to generate a dynamic user greeting,
 *                 and returns the raw text stream. Has zero downstream effects.
 *
 * ─── REGRESSION MAP (THE ZERO-WEB STANDARD) ──────────────────────────────────
 * INPUTS/PARAMS : None (Expects incoming HTTP POST request body)
 * EXTERNAL READS: Anthropic API Key (Environment variable)
 * MUTATIONS/DB  : NONE. This file is explicitly forbidden from writing to DB.
 * OUTPUTS/EMITS : JSON payload containing the generated greeting string.
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

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `The user wants to add a short phrase to the end of their AI phone greeting. Qerxel handles the core greeting — the owner just wants to append something specific: a legal note, a language note, a timing promise, or something about the business. Write one concise phrase (under 20 words) that works as a natural sentence at the end of a warm, professional greeting. No quotation marks. No explanation. Just the phrase.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tenantNotes } = req.body
  if (!tenantNotes?.trim()) return res.status(400).json({ error: 'Missing notes' })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: tenantNotes }],
    })
    return res.status(200).json({ greeting: response.content[0].text.trim() })
  } catch (err) {
    console.error('greeting-generator error:', err.message)
    return res.status(500).json({ error: 'Could not generate phrase. Please try again.' })
  }
}
