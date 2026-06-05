// POST { tenantId, targetTier }
// Returns { mode: 'redirect', url } for new subscribers
// Returns { mode: 'updated', tier } for existing subscribers (direct price swap)

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PRICE_IDS = {
  light:        process.env.STRIPE_PRICE_LIGHT,
  standard:     process.env.STRIPE_PRICE_STANDARD,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL,
  enterprise:   process.env.STRIPE_PRICE_ENTERPRISE,
}

const SITE_URL = process.env.SITE_URL || 'https://verante-portal.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tenantId, targetTier } = req.body
  if (!tenantId || !targetTier) return res.status(400).json({ error: 'Missing fields' })

  const priceId = PRICE_IDS[targetTier]
  if (!priceId) return res.status(400).json({ error: `No price configured for tier: ${targetTier}` })

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, business_email, stripe_customer_id, stripe_subscription_id')
    .eq('id', tenantId)
    .maybeSingle()

  if (error || !tenant) return res.status(404).json({ error: 'Tenant not found' })

  // Existing subscriber — swap price directly, no redirect needed
  if (tenant.stripe_subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        const itemId = subscription.items.data[0]?.id
        await stripe.subscriptions.update(tenant.stripe_subscription_id, {
          items: [{ id: itemId, price: priceId }],
          proration_behavior: 'always_invoice',
        })
        await supabase.from('tenants').update({ tier: targetTier }).eq('id', tenantId)
        return res.status(200).json({ mode: 'updated', tier: targetTier })
      }
    } catch (err) {
      console.error('Subscription update failed, falling back to checkout:', err.message)
    }
  }

  // New subscriber — create Checkout session
  const sessionParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { tenantId, targetTier },
    client_reference_id: tenantId,
    success_url: `${SITE_URL}/portal?upgraded=1`,
    cancel_url: `${SITE_URL}/portal`,
  }

  if (tenant.stripe_customer_id) {
    sessionParams.customer = tenant.stripe_customer_id
  } else if (tenant.business_email) {
    sessionParams.customer_email = tenant.business_email
  }

  const session = await stripe.checkout.sessions.create(sessionParams)
  return res.status(200).json({ mode: 'redirect', url: session.url })
}
