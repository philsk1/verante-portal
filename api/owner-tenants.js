// Returns all tenants for the owner preview dropdown
// Uses service role to bypass RLS — only callable by the verified owner email

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const OWNER_EMAIL = 'finsolsoffice@gmail.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userEmail } = req.body
  if (userEmail !== OWNER_EMAIL) return res.status(403).json({ error: 'Forbidden' })

  const { data, error } = await supabase
    .from('tenants')
    .select('id, business_name, subscription_tier')
    .order('business_name')

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ tenants: data || [] })
}
