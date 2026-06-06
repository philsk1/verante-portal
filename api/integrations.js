// POST { action: 'connect'|'disconnect', tenantId, integrationId, credentials?, settings? }
// Consolidates integrations-connect and integrations-disconnect.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { action, tenantId, integrationId, credentials, settings } = req.body
  if (!tenantId || !integrationId) return res.status(400).json({ error: 'Missing fields' })

  try {
    if (action === 'disconnect') {
      await Promise.all([
        supabase.from('tenant_integrations')
          .delete().eq('tenant_id', tenantId).eq('integration_id', integrationId),
        supabase.from('tenant_integration_credentials')
          .delete().eq('tenant_id', tenantId).eq('integration_id', integrationId),
      ])
      return res.status(200).json({ disconnected: true })
    }

    // default: connect
    await supabase.from('tenant_integrations').upsert({
      tenant_id: tenantId,
      integration_id: integrationId,
      enabled: true,
      settings: settings || {},
      connected_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,integration_id' })

    if (credentials && Object.keys(credentials).length > 0) {
      await supabase.from('tenant_integration_credentials').upsert({
        tenant_id: tenantId,
        integration_id: integrationId,
        credentials,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,integration_id' })
    }

    return res.status(200).json({ connected: true })
  } catch (err) {
    console.error('integrations error:', err.message)
    return res.status(500).json({ error: 'Integration operation failed' })
  }
}
