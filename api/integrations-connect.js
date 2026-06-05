// POST { tenantId, integrationId, credentials, settings }
// Stores credentials (service role, never exposed to frontend) and
// settings (tenant-readable). Used for credential-based integrations
// like WhatsApp that don't use OAuth.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantId, integrationId, credentials, settings } = req.body
  if (!tenantId || !integrationId) return res.status(400).json({ error: 'Missing fields' })

  try {
    // Upsert public settings (tenant can read enabled/settings)
    await supabase.from('tenant_integrations').upsert({
      tenant_id: tenantId,
      integration_id: integrationId,
      enabled: true,
      settings: settings || {},
      connected_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,integration_id' })

    // Upsert credentials (service role only — never readable by frontend)
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
    console.error('integrations-connect error:', err.message)
    return res.status(500).json({ error: 'Failed to save integration' })
  }
}
