// Consolidates owner-tenants and scrape-website.
// POST { userEmail }       → return all tenants (owner only)
// POST { url }             → scrape website and extract business fields

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const OWNER_EMAIL = 'finsolsoffice@gmail.com'

const EXTRACTION_PROMPT = `You are extracting business information from a UK business website.

Return a JSON object with EXACTLY these fields (use null if not found or not confident):
{
  "business_name": string or null,
  "business_phone": string or null (UK format, e.g. "0114 123 4567"),
  "business_email": string or null,
  "business_address": string or null (full address if present),
  "opening_hours": string or null (e.g. "Mon–Fri 8am–6pm, Sat 9am–1pm"),
  "lead_contact_name": string or null (owner name or main contact name),
  "business_context": string or null (2-3 sentence description of what the business does, in plain English),
  "services": array of strings (list of specific services offered, max 12 items, empty array if none found)
}

Rules:
- Only extract information clearly stated on the website
- Do not guess, infer, or fabricate any field
- For services: list specific named services, not generic descriptions
- For business_context: write in third person, factual, 2-3 sentences max
- Return ONLY valid JSON, no explanation, no markdown fences`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userEmail, url } = req.body

  // ── owner-tenants ──────────────────────────────────────────────────────────
  if (userEmail !== undefined) {
    if (userEmail !== OWNER_EMAIL) return res.status(403).json({ error: 'Forbidden' })

    const { data, error } = await supabase
      .from('tenants')
      .select('id, business_name, subscription_tier')
      .order('business_name')

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ tenants: data || [] })
  }

  // ── scrape-website ─────────────────────────────────────────────────────────
  if (!url) return res.status(400).json({ error: 'URL required' })

  const firecrawlKey = process.env.FIRECRAWL_API_KEY
  if (!firecrawlKey) return res.status(503).json({ error: 'Scraping not configured' })

  const targetUrl = url.startsWith('http') ? url : `https://${url}`

  try {
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 2000,
      }),
    })

    if (!scrapeRes.ok) {
      const err = await scrapeRes.text()
      console.error('Firecrawl error:', err)
      return res.status(422).json({ error: 'Could not reach that website. Please check the address and try again.' })
    }

    const scrapeData = await scrapeRes.json()
    const markdown = scrapeData?.data?.markdown || ''

    if (!markdown || markdown.length < 100) {
      return res.status(422).json({ error: 'Not enough content found on that page. Try your homepage URL.' })
    }

    const content = markdown.slice(0, 8000)

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: `${EXTRACTION_PROMPT}\n\nWebsite content:\n\n${content}` }],
    })

    const raw = response.content[0]?.text?.trim() || '{}'

    let fields
    try {
      fields = JSON.parse(raw)
    } catch {
      console.error('Claude returned non-JSON:', raw)
      return res.status(500).json({ error: 'Could not parse website data. Please fill in manually.' })
    }

    const found = Object.entries(fields).filter(([k, v]) => {
      if (k === 'services') return Array.isArray(v) && v.length > 0
      return v !== null && v !== ''
    }).length

    return res.status(200).json({ fields, found })
  } catch (err) {
    console.error('admin/scrape error:', err.message)
    return res.status(500).json({ error: 'Something went wrong. Please fill in your details manually.' })
  }
}
