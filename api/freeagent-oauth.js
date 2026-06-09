// OAuth handler for FreeAgent and Xero.
// GET ?provider=freeagent&tenantId=xxx   → initiate FreeAgent OAuth
// GET ?provider=xero&tenantId=xxx        → initiate Xero OAuth
// GET ?provider=freeagent&code=xxx&state=tenantId → FreeAgent callback
// GET ?provider=xero&code=xxx&state=tenantId      → Xero callback

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE_URL = process.env.SITE_URL || 'https://verrante-portal.vercel.app'

// ── FreeAgent ────────────────────────────────────────────────────────────────

async function freeagentCallback(code, tenantId, res) {
  const tokenRes = await fetch('https://api.freeagent.com/v2/token_endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code,
      redirect_uri: `${SITE_URL}/api/freeagent-oauth?provider=freeagent`,
      client_id: process.env.FREEAGENT_CLIENT_ID,
      client_secret: process.env.FREEAGENT_CLIENT_SECRET,
    }),
  })
  const tokens = await tokenRes.json()
  if (!tokenRes.ok || !tokens.access_token) {
    console.error('FreeAgent token exchange failed:', JSON.stringify(tokens))
    return res.redirect(`${SITE_URL}/portal?tab=integrations&error=freeagent_token`)
  }

  const companyRes = await fetch('https://api.freeagent.com/v2/company', {
    headers: { 'Authorization': `Bearer ${tokens.access_token}` },
  })
  const companyData = await companyRes.json()
  const companyUrl = companyData.company?.url || null
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()

  await supabase.from('tenant_integration_credentials').upsert({
    tenant_id: tenantId, integration_id: 'freeagent',
    credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: expiresAt, company_url: companyUrl },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,integration_id' })

  await supabase.from('tenant_integrations').upsert({
    tenant_id: tenantId, integration_id: 'freeagent',
    enabled: true, settings: { company_url: companyUrl }, connected_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,integration_id' })

  return res.redirect(`${SITE_URL}/portal?tab=integrations&connected=freeagent`)
}

function freeagentStart(tenantId, res) {
  if (!process.env.FREEAGENT_CLIENT_ID) return res.status(500).json({ error: 'FREEAGENT_CLIENT_ID not configured' })
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.FREEAGENT_CLIENT_ID,
    redirect_uri: `${SITE_URL}/api/freeagent-oauth?provider=freeagent`,
    state: tenantId,
  })
  return res.redirect(`https://api.freeagent.com/v2/approve_app?${params}`)
}

// ── Xero ─────────────────────────────────────────────────────────────────────

async function xeroCallback(code, tenantId, res) {
  const credentials = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')
  const tokenRes = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', code,
      redirect_uri: `${SITE_URL}/api/freeagent-oauth?provider=xero`,
    }),
  })
  const tokens = await tokenRes.json()
  if (!tokenRes.ok || !tokens.access_token) {
    console.error('Xero token exchange failed:', JSON.stringify(tokens))
    return res.redirect(`${SITE_URL}/portal?tab=integrations&error=xero_token`)
  }

  const connectionsRes = await fetch('https://api.xero.com/connections', {
    headers: { 'Authorization': `Bearer ${tokens.access_token}` },
  })
  const connections = await connectionsRes.json()
  const xeroTenantId = connections?.[0]?.tenantId || null
  const orgName = connections?.[0]?.tenantName || null
  const expiresAt = new Date(Date.now() + (tokens.expires_in || 1800) * 1000).toISOString()

  await supabase.from('tenant_integration_credentials').upsert({
    tenant_id: tenantId, integration_id: 'xero',
    credentials: { access_token: tokens.access_token, refresh_token: tokens.refresh_token, xero_tenant_id: xeroTenantId, expires_at: expiresAt },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,integration_id' })

  await supabase.from('tenant_integrations').upsert({
    tenant_id: tenantId, integration_id: 'xero',
    enabled: true, settings: { org_name: orgName }, connected_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,integration_id' })

  return res.redirect(`${SITE_URL}/portal?tab=integrations&connected=xero`)
}

function xeroStart(tenantId, res) {
  if (!process.env.XERO_CLIENT_ID) return res.status(500).json({ error: 'XERO_CLIENT_ID not configured' })
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID,
    redirect_uri: `${SITE_URL}/api/freeagent-oauth?provider=xero`,
    scope: 'offline_access accounting.transactions accounting.contacts',
    state: tenantId,
  })
  return res.redirect(`https://login.xero.com/identity/connect/authorize?${params}`)
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const { code, state: tenantId, error, tenantId: queryTenantId, provider = 'freeagent' } = req.query

  if (error) {
    console.error(`${provider} OAuth error:`, error)
    return res.redirect(`${SITE_URL}/portal?tab=integrations&error=${provider}_denied`)
  }

  try {
    if (code) {
      if (!tenantId) return res.status(400).json({ error: 'Missing state' })
      if (provider === 'xero') return await xeroCallback(code, tenantId, res)
      return await freeagentCallback(code, tenantId, res)
    }

    const tid = queryTenantId
    if (!tid) return res.status(400).json({ error: 'tenantId required' })
    if (provider === 'xero') return xeroStart(tid, res)
    return freeagentStart(tid, res)
  } catch (err) {
    console.error(`${provider} OAuth error:`, err.message)
    return res.redirect(`${SITE_URL}/portal?tab=integrations&error=${provider}_failed`)
  }
}
