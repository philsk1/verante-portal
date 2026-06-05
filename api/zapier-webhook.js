// Internal utility — fires outbound Zapier webhooks for Qerxel events.
// Called by vapi-webhook.js (lead_captured) and Calendar.jsx save (appointment_created).
// POST { tenantId, event, payload }
// event: 'lead_captured' | 'appointment_created' | 'appointment_completed'
// Tenant's Zapier webhook URL stored in tenant_integrations settings.webhook_url.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantId, event, payload } = req.body
  if (!tenantId || !event) return res.status(400).json({ error: 'Missing fields' })

  const { data: integration } = await supabase
    .from('tenant_integrations')
    .select('settings, enabled')
    .eq('tenant_id', tenantId).eq('integration_id', 'zapier').maybeSingle()

  if (!integration?.enabled || !integration?.settings?.webhook_url) {
    return res.status(200).json({ skipped: true }) // Not connected — silent skip
  }

  const webhookUrl = integration.settings.webhook_url

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    })

    return res.status(200).json({ fired: true, status: response.status })
  } catch (err) {
    console.error('Zapier webhook error:', err.message)
    return res.status(500).json({ error: 'Webhook delivery failed' })
  }
}
