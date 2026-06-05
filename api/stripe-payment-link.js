// POST { tenantId, leadId, amountPounds, description }
// Creates a Stripe Checkout session (one-time payment) for a captured lead.
// No pre-created Stripe products needed — uses price_data for ad-hoc amounts.
// Returns { checkoutUrl } — share with the client to collect payment.

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE_URL = process.env.SITE_URL || 'https://qerxel-portal.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantId, leadId, amountPounds, description } = req.body
  if (!tenantId || !amountPounds || amountPounds <= 0) {
    return res.status(400).json({ error: 'Missing or invalid fields' })
  }

  const amountPence = Math.round(parseFloat(amountPounds) * 100)
  if (amountPence < 100) return res.status(400).json({ error: 'Minimum amount is £1.00' })

  // Load lead for client email (optional)
  let customerEmail
  if (leadId) {
    const { data: lead } = await supabase
      .from('leads')
      .select('callers(phone_number), lead_contact_name')
      .eq('id', leadId).maybeSingle()
    // Email not stored on leads — use tenant email as fallback for now
    void lead
  }

  const { data: tenant } = await supabase
    .from('tenants').select('business_name, stripe_customer_id').eq('id', tenantId).maybeSingle()

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'gbp',
          product_data: { name: description?.trim() || `${tenant?.business_name || 'Services'} — payment` },
          unit_amount: amountPence,
        },
        quantity: 1,
      }],
      success_url: `${SITE_URL}/portal?payment=success`,
      cancel_url: `${SITE_URL}/portal`,
      expires_at: Math.floor(Date.now() / 1000) + 86400, // 24h
    })

    return res.status(200).json({ checkoutUrl: session.url })
  } catch (err) {
    console.error('Stripe payment link error:', err.message)
    return res.status(500).json({ error: 'Failed to create payment link' })
  }
}
