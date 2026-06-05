import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { zoneText, zoneName, tabName, messages } = req.body
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
