// Consolidates freeagent-auth and freeagent-callback.
// GET ?tenantId=xxx       → initiate OAuth (no code param)
// GET ?code=xxx&state=tid → OAuth callback (code param present)

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE_URL = process.env.SITE_URL || 'https://verante-portal.vercel.app'

export default async function handler(req, res) {
  const { code, state: tenantId, error, tenantId: queryTenantId } = req.query

  // ── OAuth callback (FreeAgent redirects here with ?code=...) ──────────────
  if (code) {
    if (error) {
      console.error('FreeAgent OAuth error:', error)
      return res.redirect(`${SITE_URL}/portal?tab=integrations&error=freeagent_denied`)
    }

    if (!tenantId) return res.status(400).json({ error: 'Missing state' })

    try {
      const tokenRes = await fetch('https://api.freeagent.com/v2/token_endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${SITE_URL}/api/freeagent-oauth`,
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
        tenant_id: tenantId,
        integration_id: 'freeagent',
        credentials: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          company_url: companyUrl,
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,integration_id' })

      await supabase.from('tenant_integrations').upsert({
        tenant_id: tenantId,
        integration_id: 'freeagent',
        enabled: true,
        settings: { company_url: companyUrl },
        connected_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,integration_id' })

      return res.redirect(`${SITE_URL}/portal?tab=integrations&connected=freeagent`)
    } catch (err) {
      console.error('FreeAgent callback error:', err.message)
      return res.redirect(`${SITE_URL}/portal?tab=integrations&error=freeagent_failed`)
    }
  }

  // ── Auth start (frontend redirects browser here) ───────────────────────────
  const tid = queryTenantId
  if (!tid) return res.status(400).json({ error: 'tenantId required' })
  if (!process.env.FREEAGENT_CLIENT_ID) return res.status(500).json({ error: 'FREEAGENT_CLIENT_ID not configured' })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.FREEAGENT_CLIENT_ID,
    redirect_uri: `${SITE_URL}/api/freeagent-oauth`,
    state: tid,
  })

  return res.redirect(`https://api.freeagent.com/v2/approve_app?${params}`)
}
