// POST { tenantId, leadId }
// Creates a draft invoice in FreeAgent from a captured lead.
// Returns { invoiceUrl } on success.
// Handles token refresh automatically.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE_URL = process.env.SITE_URL || 'https://verante-portal.vercel.app'

async function refreshToken(tenantId, refreshToken) {
  const res = await fetch('https://api.freeagent.com/v2/token_endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.FREEAGENT_CLIENT_ID,
      client_secret: process.env.FREEAGENT_CLIENT_SECRET,
    }),
  })
  const tokens = await res.json()
  if (!res.ok || !tokens.access_token) throw new Error('Token refresh failed')

  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()
  await supabase.from('tenant_integration_credentials').update({
    credentials: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || refreshToken,
      expires_at: expiresAt,
    },
    updated_at: new Date().toISOString(),
  }).eq('tenant_id', tenantId).eq('integration_id', 'freeagent')

  return tokens.access_token
}

async function faGet(url, token) {
  return fetch(url, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } })
}

async function faPost(url, token, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantId, leadId } = req.body
  if (!tenantId || !leadId) return res.status(400).json({ error: 'Missing fields' })

  // Load credentials
  const { data: credsRow } = await supabase
    .from('tenant_integration_credentials')
    .select('credentials')
    .eq('tenant_id', tenantId).eq('integration_id', 'freeagent')
    .maybeSingle()

  if (!credsRow?.credentials?.access_token) {
    return res.status(400).json({ error: 'FreeAgent not connected' })
  }

  let { access_token, refresh_token, expires_at, company_url } = credsRow.credentials

  // Refresh token if expired
  if (expires_at && new Date(expires_at) < new Date()) {
    try { access_token = await refreshToken(tenantId, refresh_token) }
    catch { return res.status(401).json({ error: 'FreeAgent token expired. Please reconnect.' }) }
  }

  // Load lead
  const { data: lead } = await supabase
    .from('leads')
    .select('id, lead_contact_name, callers(phone_number)')
    .eq('id', leadId).maybeSingle()

  if (!lead) return res.status(404).json({ error: 'Lead not found' })

  const contactName = lead.lead_contact_name || 'Unknown'
  const contactPhone = lead.callers?.phone_number || null

  try {
    // Find or create contact in FreeAgent
    const contactsRes = await faGet(
      `https://api.freeagent.com/v2/contacts?search=${encodeURIComponent(contactName)}`,
      access_token
    )
    const contactsData = await contactsRes.json()
    let contactUrl = contactsData.contacts?.[0]?.url

    if (!contactUrl) {
      const newContactRes = await faPost('https://api.freeagent.com/v2/contacts', access_token, {
        contact: {
          first_name: contactName.split(' ')[0] || contactName,
          last_name: contactName.split(' ').slice(1).join(' ') || '',
          phone_number: contactPhone || '',
        },
      })
      const newContact = await newContactRes.json()
      contactUrl = newContact.contact?.url
    }

    if (!contactUrl) return res.status(502).json({ error: 'Could not create FreeAgent contact' })

    // Create draft invoice
    const invoiceRes = await faPost('https://api.freeagent.com/v2/invoices', access_token, {
      invoice: {
        contact: contactUrl,
        dated_on: new Date().toISOString().split('T')[0],
        payment_terms_in_days: 30,
        invoice_items: [{
          description: 'Services — see details',
          quantity: '1',
          unit_price: '0.00',
          item_type: 'Services',
        }],
      },
    })

    const invoiceData = await invoiceRes.json()
    const invoiceUrl = invoiceData.invoice?.url

    if (!invoiceUrl) return res.status(502).json({ error: 'Could not create FreeAgent invoice' })

    // Extract invoice ID for portal deep link
    const invoiceId = invoiceUrl.split('/').pop()
    const portalUrl = `https://app.freeagent.com/invoices/${invoiceId}`

    return res.status(200).json({ invoiceUrl: portalUrl, freeagentUrl: invoiceUrl })
  } catch (err) {
    console.error('FreeAgent invoice error:', err.message)
    return res.status(500).json({ error: 'Failed to create invoice' })
  }
}
