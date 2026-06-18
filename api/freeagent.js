// Merged FreeAgent + Xero + Stripe handler.
// GET  ?provider=freeagent|xero &tenantId=xxx            → initiate OAuth
// GET  ?provider=freeagent|xero &code=xxx &state=tid     → OAuth callback
// POST { type: 'freeagent'|'xero'|'stripe-link'|'stripe-checkout', tenantId, ... }

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE_URL = process.env.SITE_URL || 'https://verante-portal.vercel.app'
const REDIRECT = (provider) => `${SITE_URL}/api/freeagent?provider=${provider}`

// ── OAuth ─────────────────────────────────────────────────────────────────────

async function freeagentOAuthStart(tenantId, res) {
  if (!process.env.FREEAGENT_CLIENT_ID) return res.status(500).json({ error: 'FREEAGENT_CLIENT_ID not configured' })
  const params = new URLSearchParams({ response_type: 'code', client_id: process.env.FREEAGENT_CLIENT_ID, redirect_uri: REDIRECT('freeagent'), state: tenantId })
  return res.redirect(`https://api.freeagent.com/v2/approve_app?${params}`)
}

async function freeagentOAuthCallback(code, tenantId, res) {
  const tokenRes = await fetch('https://api.freeagent.com/v2/token_endpoint', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT('freeagent'), client_id: process.env.FREEAGENT_CLIENT_ID, client_secret: process.env.FREEAGENT_CLIENT_SECRET }),
  })
  const tokens = await tokenRes.json()
  if (!tokenRes.ok || !tokens.access_token) return res.redirect(`${SITE_URL}/portal?tab=integrations&error=freeagent_token`)
  const companyRes = await fetch('https://api.freeagent.com/v2/company', { headers: { 'Authorization': `Bearer ${tokens.access_token}` } })
  const companyUrl = (await companyRes.json()).company?.url || null
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()
  await supabase.from('tenant_integration_credentials').upsert({ tenant_id: tenantId, integration_id: 'freeagent', credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: expiresAt, company_url: companyUrl }, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id,integration_id' })
  await supabase.from('tenant_integrations').upsert({ tenant_id: tenantId, integration_id: 'freeagent', enabled: true, settings: { company_url: companyUrl }, connected_at: new Date().toISOString() }, { onConflict: 'tenant_id,integration_id' })
  return res.redirect(`${SITE_URL}/portal?tab=integrations&connected=freeagent`)
}

async function xeroOAuthStart(tenantId, res) {
  if (!process.env.XERO_CLIENT_ID) return res.status(500).json({ error: 'XERO_CLIENT_ID not configured' })
  const params = new URLSearchParams({ response_type: 'code', client_id: process.env.XERO_CLIENT_ID, redirect_uri: REDIRECT('xero'), scope: 'offline_access accounting.transactions accounting.contacts', state: tenantId })
  return res.redirect(`https://login.xero.com/identity/connect/authorize?${params}`)
}

async function xeroOAuthCallback(code, tenantId, res) {
  const credentials = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')
  const tokenRes = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST', headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT('xero') }),
  })
  const tokens = await tokenRes.json()
  if (!tokenRes.ok || !tokens.access_token) return res.redirect(`${SITE_URL}/portal?tab=integrations&error=xero_token`)
  const connections = await (await fetch('https://api.xero.com/connections', { headers: { 'Authorization': `Bearer ${tokens.access_token}` } })).json()
  const xeroTenantId = connections?.[0]?.tenantId || null
  const orgName = connections?.[0]?.tenantName || null
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 1800) * 1000).toISOString()
  await supabase.from('tenant_integration_credentials').upsert({ tenant_id: tenantId, integration_id: 'xero', credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token, xero_tenant_id: xeroTenantId, expires_at: expiresAt }, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id,integration_id' })
  await supabase.from('tenant_integrations').upsert({ tenant_id: tenantId, integration_id: 'xero', enabled: true, settings: { org_name: orgName }, connected_at: new Date().toISOString() }, { onConflict: 'tenant_id,integration_id' })
  return res.redirect(`${SITE_URL}/portal?tab=integrations&connected=xero`)
}

// ── Invoice helpers ───────────────────────────────────────────────────────────

async function refreshFAToken(tenantId, refreshToken) {
  const res = await fetch('https://api.freeagent.com/v2/token_endpoint', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: process.env.FREEAGENT_CLIENT_ID, client_secret: process.env.FREEAGENT_CLIENT_SECRET }),
  })
  const tokens = await res.json()
  if (!res.ok || !tokens.access_token) throw new Error('Token refresh failed')
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()
  await supabase.from('tenant_integration_credentials').update({ credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token || refreshToken, expires_at: expiresAt }, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('integration_id', 'freeagent')
  return tokens.access_token
}

async function handleFreeagentInvoice(body, res) {
  const { tenantId, leadId } = body
  if (!tenantId || !leadId) return res.status(400).json({ error: 'Missing fields' })
  const { data: credsRow } = await supabase.from('tenant_integration_credentials').select('credentials').eq('tenant_id', tenantId).eq('integration_id', 'freeagent').maybeSingle()
  if (!credsRow?.credentials?.access_token) return res.status(400).json({ error: 'FreeAgent not connected' })
  let { access_token, refresh_token, expires_at } = credsRow.credentials
  if (expires_at && new Date(expires_at) < new Date()) {
    try { access_token = await refreshFAToken(tenantId, refresh_token) } catch { return res.status(401).json({ error: 'FreeAgent token expired. Please reconnect.' }) }
  }
  const { data: lead } = await supabase.from('leads').select('id, lead_contact_name, callers(phone_number)').eq('id', leadId).maybeSingle()
  if (!lead) return res.status(404).json({ error: 'Lead not found' })
  const contactName = lead.lead_contact_name || 'Unknown'
  const headers = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' }
  try {
    const contactsData = await (await fetch(`https://api.freeagent.com/v2/contacts?search=${encodeURIComponent(contactName)}`, { headers })).json()
    let contactUrl = contactsData.contacts?.[0]?.url
    if (!contactUrl) {
      const nc = await (await fetch('https://api.freeagent.com/v2/contacts', { method: 'POST', headers, body: JSON.stringify({ contact: { first_name: contactName.split(' ')[0] || contactName, last_name: contactName.split(' ').slice(1).join(' ') || '' } }) })).json()
      contactUrl = nc.contact?.url
    }
    if (!contactUrl) return res.status(502).json({ error: 'Could not create FreeAgent contact' })
    const invoiceData = await (await fetch('https://api.freeagent.com/v2/invoices', { method: 'POST', headers, body: JSON.stringify({ invoice: { contact: contactUrl, dated_on: new Date().toISOString().split('T')[0], payment_terms_in_days: 30, invoice_items: [{ description: 'Services — see details', quantity: '1', unit_price: '0.00', item_type: 'Services' }] } }) })).json()
    const invoiceUrl = invoiceData.invoice?.url
    if (!invoiceUrl) return res.status(502).json({ error: 'Could not create FreeAgent invoice' })
    return res.status(200).json({ invoiceUrl: `https://app.freeagent.com/invoices/${invoiceUrl.split('/').pop()}`, freeagentUrl: invoiceUrl })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create invoice' })
  }
}

async function refreshXeroToken(tenantId, refreshToken, xeroTenantId) {
  const credentials = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST', headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })
  const tokens = await res.json()
  if (!res.ok || !tokens.access_token) throw new Error('Xero token refresh failed')
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 1800) * 1000).toISOString()
  await supabase.from('tenant_integration_credentials').update({ credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token || refreshToken, xero_tenant_id: xeroTenantId, expires_at: expiresAt }, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('integration_id', 'xero')
  return tokens.access_token
}

async function handleXeroInvoice(body, res) {
  const { tenantId, leadId } = body
  if (!tenantId || !leadId) return res.status(400).json({ error: 'Missing fields' })
  const { data: credsRow } = await supabase.from('tenant_integration_credentials').select('credentials').eq('tenant_id', tenantId).eq('integration_id', 'xero').maybeSingle()
  if (!credsRow?.credentials?.access_token) return res.status(400).json({ error: 'Xero not connected' })
  let { access_token, refresh_token, xero_tenant_id, expires_at } = credsRow.credentials
  if (expires_at && new Date(expires_at) < new Date()) {
    try { access_token = await refreshXeroToken(tenantId, refresh_token, xero_tenant_id) } catch { return res.status(401).json({ error: 'Xero token expired. Please reconnect.' }) }
  }
  const { data: lead } = await supabase.from('leads').select('id, lead_contact_name, callers(phone_number)').eq('id', leadId).maybeSingle()
  if (!lead) return res.status(404).json({ error: 'Lead not found' })
  const contactName = lead.lead_contact_name || 'Unknown'
  const headers = { 'Authorization': `Bearer ${access_token}`, 'Xero-tenant-id': xero_tenant_id, 'Accept': 'application/json', 'Content-Type': 'application/json' }
  try {
    const searchData = await (await fetch(`https://api.xero.com/api.xro/2.0/Contacts?searchTerm=${encodeURIComponent(contactName)}&summaryOnly=true`, { headers })).json()
    let contactId = searchData.Contacts?.[0]?.ContactID
    if (!contactId) {
      const nc = await (await fetch('https://api.xero.com/api.xro/2.0/Contacts', { method: 'POST', headers, body: JSON.stringify({ Contacts: [{ Name: contactName }] }) })).json()
      contactId = nc.Contacts?.[0]?.ContactID
    }
    if (!contactId) return res.status(502).json({ error: 'Could not create Xero contact' })
    const invoiceId = (await (await fetch('https://api.xero.com/api.xro/2.0/Invoices', { method: 'POST', headers, body: JSON.stringify({ Invoices: [{ Type: 'ACCREC', Status: 'DRAFT', Contact: { ContactID: contactId }, DateString: new Date().toISOString().split('T')[0], DueDateString: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], LineItems: [{ Description: 'Services — see details', Quantity: 1, UnitAmount: 0 }] }] }) })).json()).Invoices?.[0]?.InvoiceID
    if (!invoiceId) return res.status(502).json({ error: 'Could not create Xero invoice' })
    return res.status(200).json({ invoiceUrl: `https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=${invoiceId}` })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create invoice' })
  }
}

async function handleStripeLink(body, res) {
  const { tenantId, amountPounds, description } = body
  if (!tenantId || !amountPounds || amountPounds <= 0) return res.status(400).json({ error: 'Missing or invalid fields' })
  const amountPence = Math.round(parseFloat(amountPounds) * 100)
  if (amountPence < 100) return res.status(400).json({ error: 'Minimum amount is £1.00' })
  const { data: tenant } = await supabase.from('tenants').select('business_name').eq('id', tenantId).maybeSingle()
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.checkout.sessions.create({ mode: 'payment', line_items: [{ price_data: { currency: 'gbp', product_data: { name: description?.trim() || `${tenant?.business_name || 'Services'} — payment` }, unit_amount: amountPence }, quantity: 1 }], success_url: `${SITE_URL}/portal?payment=success`, cancel_url: `${SITE_URL}/portal`, expires_at: Math.floor(Date.now() / 1000) + 86400 })
    return res.status(200).json({ checkoutUrl: session.url })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create payment link' })
  }
}

const PRICE_IDS = { light: process.env.STRIPE_PRICE_LIGHT, standard: process.env.STRIPE_PRICE_STANDARD, professional: process.env.STRIPE_PRICE_PROFESSIONAL, enterprise: process.env.STRIPE_PRICE_ENTERPRISE }

async function handleStripeCheckout(body, res) {
  const { tenantId, targetTier } = body
  if (!tenantId || !targetTier) return res.status(400).json({ error: 'Missing fields' })
  const priceId = PRICE_IDS[targetTier]
  if (!priceId) return res.status(400).json({ error: `No price configured for tier: ${targetTier}` })
  const { data: tenant } = await supabase.from('tenants').select('id, business_email, stripe_customer_id, stripe_subscription_id').eq('id', tenantId).maybeSingle()
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' })
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  if (tenant.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)
      if (sub.status === 'active' || sub.status === 'trialing') {
        await stripe.subscriptions.update(tenant.stripe_subscription_id, { items: [{ id: sub.items.data[0]?.id, price: priceId }], proration_behavior: 'always_invoice' })
        await supabase.from('tenants').update({ subscription_tier: targetTier }).eq('id', tenantId)
        return res.status(200).json({ mode: 'updated', tier: targetTier })
      }
    } catch {}
  }
  const sessionParams = { mode: 'subscription', line_items: [{ price: priceId, quantity: 1 }], metadata: { tenantId, targetTier }, client_reference_id: tenantId, success_url: `${SITE_URL}/portal?upgraded=1`, cancel_url: `${SITE_URL}/portal` }
  if (tenant.stripe_customer_id) sessionParams.customer = tenant.stripe_customer_id
  else if (tenant.business_email) sessionParams.customer_email = tenant.business_email
  const session = await stripe.checkout.sessions.create(sessionParams)
  return res.status(200).json({ mode: 'redirect', url: session.url })
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // GET → OAuth flow
  if (req.method === 'GET') {
    const { code, state: tenantId, error, tenantId: queryTenantId, provider = 'freeagent' } = req.query
    if (error) return res.redirect(`${SITE_URL}/portal?tab=integrations&error=${provider}_denied`)
    try {
      if (code) {
        if (!tenantId) return res.status(400).json({ error: 'Missing state' })
        return provider === 'xero' ? xeroOAuthCallback(code, tenantId, res) : freeagentOAuthCallback(code, tenantId, res)
      }
      if (!queryTenantId) return res.status(400).json({ error: 'tenantId required' })
      return provider === 'xero' ? xeroOAuthStart(queryTenantId, res) : freeagentOAuthStart(queryTenantId, res)
    } catch (err) {
      return res.redirect(`${SITE_URL}/portal?tab=integrations&error=${provider}_failed`)
    }
  }

  // POST → invoice / stripe
  if (req.method !== 'POST') return res.status(405).end()
  const { type = 'freeagent' } = req.body || {}
  if (type === 'xero') return handleXeroInvoice(req.body, res)
  if (type === 'stripe-link') return handleStripeLink(req.body, res)
  if (type === 'stripe-checkout') return handleStripeCheckout(req.body, res)
  return handleFreeagentInvoice(req.body, res)
}
