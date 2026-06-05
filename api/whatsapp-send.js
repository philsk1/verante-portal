// POST { tenantId, to, message }
// Sends a WhatsApp message via Meta Cloud API using tenant's own credentials.
// Credentials stored in tenant_integration_credentials (service role only).

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantId, to, message } = req.body
  if (!tenantId || !to || !message) return res.status(400).json({ error: 'Missing fields' })

  // Load tenant's WhatsApp credentials
  const { data: creds } = await supabase
    .from('tenant_integration_credentials')
    .select('credentials')
    .eq('tenant_id', tenantId)
    .eq('integration_id', 'whatsapp')
    .maybeSingle()

  if (!creds?.credentials?.phone_number_id || !creds?.credentials?.access_token) {
    return res.status(400).json({ error: 'WhatsApp not connected for this tenant' })
  }

  const { phone_number_id, access_token } = creds.credentials

  // Sanitise number — strip spaces/dashes, ensure E.164 format (no leading +)
  const toClean = to.replace(/\D/g, '').replace(/^0/, '44')

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toClean,
          type: 'text',
          text: { body: message },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('WhatsApp send failed:', JSON.stringify(data))
      return res.status(502).json({ error: 'WhatsApp API error', detail: data.error?.message })
    }

    return res.status(200).json({ sent: true, message_id: data.messages?.[0]?.id })
  } catch (err) {
    console.error('WhatsApp send error:', err.message)
    return res.status(500).json({ error: 'Failed to send WhatsApp message' })
  }
}
