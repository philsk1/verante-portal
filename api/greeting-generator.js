import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Write a greeting for this business owner. It must name the business and the owner. It must state the owner is unavailable and the AI is their virtual assistant. It must include a natural disclosure that a note will be taken. It must close with an open invitation to speak. The phrase 'please allow me' must appear naturally in the greeting or in the immediate follow-up when the AI begins gathering details. Keep it under 40 words. Write one version only.`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tenantNotes, businessName, ownerName } = req.body

  const userMessage = [
    businessName && `Business name: ${businessName}`,
    ownerName && `Owner name: ${ownerName}`,
    tenantNotes && `Notes from owner: ${tenantNotes}`,
  ].filter(Boolean).join('\n')

  if (!userMessage.trim()) return res.status(400).json({ error: 'Missing required fields' })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })
    return res.status(200).json({ greeting: response.content[0].text.trim() })
  } catch (err) {
    console.error('greeting-generator error:', err.message)
    return res.status(500).json({ error: 'Could not generate greeting. Please try again.' })
  }
}
