// POST { tenantId, leadId }
// Creates a draft invoice (ACCREC) in Xero from a captured lead.
// Returns { invoiceUrl } on success. Handles token refresh.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE_URL = process.env.SITE_URL || 'https://qerxel-portal.vercel.app'

async function refreshXeroToken(tenantId, refreshToken, xeroTenantId) {
  const credentials = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  const tokens = await res.json()
  if (!res.ok || !tokens.access_token) throw new Error('Xero token refresh failed')

  const expiresAt = new Date(Date.now() + (tokens.expires_in || 1800) * 1000).toISOString()
  await supabase.from('tenant_integration_credentials').update({
    credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token || refreshToken, xero_tenant_id: xeroTenantId, expires_at: expiresAt },
    updated_at: new Date().toISOString(),
  }).eq('tenant_id', tenantId).eq('integration_id', 'xero')

  return tokens.access_token
}

function xeroHeaders(accessToken, xeroTenantId) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Xero-tenant-id': xeroTenantId,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantId, leadId } = req.body
  if (!tenantId || !leadId) return res.status(400).json({ error: 'Missing fields' })

  const { data: credsRow } = await supabase
    .from('tenant_integration_credentials')
    .select('credentials').eq('tenant_id', tenantId).eq('integration_id', 'xero').maybeSingle()

  if (!credsRow?.credentials?.access_token) return res.status(400).json({ error: 'Xero not connected' })

  let { access_token, refresh_token, xero_tenant_id, expires_at } = credsRow.credentials

  if (expires_at && new Date(expires_at) < new Date()) {
    try { access_token = await refreshXeroToken(tenantId, refresh_token, xero_tenant_id) }
    catch { return res.status(401).json({ error: 'Xero token expired. Please reconnect.' }) }
  }

  const { data: lead } = await supabase
    .from('leads').select('id, lead_contact_name, callers(phone_number)').eq('id', leadId).maybeSingle()
  if (!lead) return res.status(404).json({ error: 'Lead not found' })

  const contactName = lead.lead_contact_name || 'Unknown'
  const headers = xeroHeaders(access_token, xero_tenant_id)

  try {
    // Find or create contact
    const searchRes = await fetch(
      `https://api.xero.com/api.xro/2.0/Contacts?searchTerm=${encodeURIComponent(contactName)}&summaryOnly=true`,
      { headers }
    )
    const searchData = await searchRes.json()
    let contactId = searchData.Contacts?.[0]?.ContactID

    if (!contactId) {
      const newContactRes = await fetch('https://api.xero.com/api.xro/2.0/Contacts', {
        method: 'POST',
        headers,
        body: JSON.stringify({ Contacts: [{ Name: contactName, Phones: lead.callers?.phone_number ? [{ PhoneType: 'MOBILE', PhoneNumber: lead.callers.phone_number }] : [] }] }),
      })
      const newContactData = await newContactRes.json()
      contactId = newContactData.Contacts?.[0]?.ContactID
    }

    if (!contactId) return res.status(502).json({ error: 'Could not create Xero contact' })

    // Create draft invoice (ACCREC = sales invoice)
    const invoiceRes = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        Invoices: [{
          Type: 'ACCREC',
          Status: 'DRAFT',
          Contact: { ContactID: contactId },
          DateString: new Date().toISOString().split('T')[0],
          DueDateString: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          LineItems: [{ Description: 'Services — see details', Quantity: 1, UnitAmount: 0 }],
        }],
      }),
    })

    const invoiceData = await invoiceRes.json()
    const invoiceId = invoiceData.Invoices?.[0]?.InvoiceID

    if (!invoiceId) return res.status(502).json({ error: 'Could not create Xero invoice' })

    return res.status(200).json({ invoiceUrl: `https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=${invoiceId}` })
  } catch (err) {
    console.error('Xero invoice error:', err.message)
    return res.status(500).json({ error: 'Failed to create invoice' })
  }
}
