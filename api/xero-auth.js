// GET ?tenantId=xxx
// Redirects to Xero OAuth authorisation page.
// After auth, Xero redirects to /api/xero-callback.
// Requires: XERO_CLIENT_ID in Vercel env vars.

const SITE_URL = process.env.SITE_URL || 'https://qerxel-portal.vercel.app'

export default async function handler(req, res) {
  const { tenantId } = req.query
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })
  if (!process.env.XERO_CLIENT_ID) return res.status(500).json({ error: 'XERO_CLIENT_ID not configured' })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID,
    redirect_uri: `${SITE_URL}/api/xero-callback`,
    scope: 'offline_access accounting.transactions accounting.contacts',
    state: tenantId,
  })

  return res.redirect(`https://login.xero.com/identity/connect/authorize?${params}`)
}
