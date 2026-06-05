// POST { tenantId, integrationId }
// Removes integration settings and credentials for a tenant.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantId, integrationId } = req.body
  if (!tenantId || !integrationId) return res.status(400).json({ error: 'Missing fields' })

  try {
    await Promise.all([
      supabase.from('tenant_integrations')
        .delete().eq('tenant_id', tenantId).eq('integration_id', integrationId),
      supabase.from('tenant_integration_credentials')
        .delete().eq('tenant_id', tenantId).eq('integration_id', integrationId),
    ])
    return res.status(200).json({ disconnected: true })
  } catch (err) {
    console.error('integrations-disconnect error:', err.message)
    return res.status(500).json({ error: 'Failed to disconnect integration' })
  }
}
