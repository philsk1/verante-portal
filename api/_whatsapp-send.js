// POST { tenantId, to, message }
// Sends a WhatsApp message via Meta Cloud API using tenant's own credentials.
// Credentials stored in tenant_integration_credentials (service role only).

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function sendWhatsApp({ tenantId, to, message }) {
  const { data: creds } = await supabase
    .from('tenant_integration_credentials')
    .select('credentials')
    .eq('tenant_id', tenantId).eq('integration_id', 'whatsapp').maybeSingle()

  if (!creds?.credentials?.phone_number_id || !creds?.credentials?.access_token) return

  const { phone_number_id, access_token } = creds.credentials
  const toClean = to.replace(/\D/g, '').replace(/^0/, '44')

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${phone_number_id}/messages`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: toClean, type: 'text', text: { body: message } }),
    }
  )
  const data = await response.json()
  if (!response.ok) console.error('WhatsApp send failed:', JSON.stringify(data))
  return data
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { tenantId, to, message } = req.body
  if (!tenantId || !to || !message) return res.status(400).json({ error: 'Missing fields' })
  try {
    const data = await sendWhatsApp({ tenantId, to, message })
    if (!data) return res.status(400).json({ error: 'WhatsApp not connected for this tenant' })
    return res.status(200).json({ sent: true, message_id: data.messages?.[0]?.id })
  } catch (err) {
    console.error('WhatsApp send error:', err.message)
    return res.status(500).json({ error: 'Failed to send WhatsApp message' })
  }
}
