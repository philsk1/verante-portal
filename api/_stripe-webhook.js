// Stripe webhook handler — signature-verified, raw body required
// Events handled: checkout.session.completed, customer.subscription.updated,
//                 customer.subscription.deleted

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: false } }

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(
  'https://kkrsvkxkefijmtbwykzv.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PRICE_TO_TIER = () => ({
  [process.env.STRIPE_PRICE_LIGHT]:        'light',
  [process.env.STRIPE_PRICE_STANDARD]:     'standard',
  [process.env.STRIPE_PRICE_PROFESSIONAL]: 'professional',
  [process.env.STRIPE_PRICE_ENTERPRISE]:   'enterprise',
})

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  const rawBody = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  try {
    const priceToTier = PRICE_TO_TIER()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const tenantId = session.metadata?.tenantId
        const targetTier = session.metadata?.targetTier
        if (!tenantId || !targetTier) break

        await supabase.from('tenants').update({
          subscription_tier:       targetTier,
          billing_model:           'subscription',
          stripe_customer_id:      session.customer,
          stripe_subscription_id:  session.subscription,
        }).eq('id', tenantId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const priceId = sub.items.data[0]?.price?.id
        const tier = priceToTier[priceId]
        if (!tier) break

        await supabase.from('tenants')
          .update({ subscription_tier: tier })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await supabase.from('tenants').update({
          subscription_tier:       'free',
          billing_model:           'payg',
          stripe_subscription_id:  null,
        }).eq('stripe_subscription_id', sub.id)
        break
      }
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook processing error:', err.message)
    return res.status(500).json({ error: 'Processing failed' })
  }
}
