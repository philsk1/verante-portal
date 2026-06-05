// GET ?tenantId=xxx
// Redirects to FreeAgent OAuth authorisation page.
// After auth, FreeAgent redirects to /api/freeagent-callback.
// Requires: FREEAGENT_CLIENT_ID in Vercel env vars.

const SITE_URL = process.env.SITE_URL || 'https://qerxel-portal.vercel.app'

export default async function handler(req, res) {
  const { tenantId } = req.query
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' })
  if (!process.env.FREEAGENT_CLIENT_ID) return res.status(500).json({ error: 'FREEAGENT_CLIENT_ID not configured' })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.FREEAGENT_CLIENT_ID,
    redirect_uri: `${SITE_URL}/api/freeagent-callback`,
    state: tenantId,
  })

  return res.redirect(`https://api.freeagent.com/v2/approve_app?${params}`)
}
