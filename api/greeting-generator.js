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
