// GET ?code=xxx&state=tenantId
// Exchanges OAuth code for Xero tokens, fetches org (tenant) ID, stores credentials.
// Requires: XERO_CLIENT_ID, XERO_CLIENT_SECRET in Vercel env vars.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE_URL = process.env.SITE_URL || 'https://qerxel-portal.vercel.app'

export default async function handler(req, res) {
  const { code, state: tenantId, error } = req.query

  if (error) {
    console.error('Xero OAuth error:', error)
    return res.redirect(`${SITE_URL}/portal?tab=integrations&error=xero_denied`)
  }

  if (!code || !tenantId) return res.status(400).json({ error: 'Missing code or state' })

  try {
    const credentials = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')

    // Exchange code for tokens
    const tokenRes = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${SITE_URL}/api/xero-callback`,
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokenRes.ok || !tokens.access_token) {
      console.error('Xero token exchange failed:', JSON.stringify(tokens))
      return res.redirect(`${SITE_URL}/portal?tab=integrations&error=xero_token`)
    }

    // Fetch connected organisations (Xero tenants)
    const connectionsRes = await fetch('https://api.xero.com/connections', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` },
    })
    const connections = await connectionsRes.json()
    const xeroTenantId = connections?.[0]?.tenantId || null
    const orgName = connections?.[0]?.tenantName || null

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 1800) * 1000).toISOString()

    await supabase.from('tenant_integration_credentials').upsert({
      tenant_id: tenantId,
      integration_id: 'xero',
      credentials: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        xero_tenant_id: xeroTenantId,
        expires_at: expiresAt,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,integration_id' })

    await supabase.from('tenant_integrations').upsert({
      tenant_id: tenantId,
      integration_id: 'xero',
      enabled: true,
      settings: { org_name: orgName },
      connected_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,integration_id' })

    return res.redirect(`${SITE_URL}/portal?tab=integrations&connected=xero`)
  } catch (err) {
    console.error('Xero callback error:', err.message)
    return res.redirect(`${SITE_URL}/portal?tab=integrations&error=xero_failed`)
  }
}
