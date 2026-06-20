/**
 * ============================================================================
 * QERXEL COMPONENT CONTRACT & BOUNDARY MAP
 * ============================================================================
 * AUTHOR/VISION : Philip Keating
 * FILE PATH     : api/stripe-webhook.js
 * TOPOLOGY RING : Ring 1 — Leaf (Standalone API Module)
 * INTENT MAP    : Receives Stripe webhook events with cryptographic signature
 *                 verification (HMAC SHA-256). Handles three subscription
 *                 lifecycle events — checkout completion, plan change, and
 *                 cancellation — each writing a narrow, targeted UPDATE to the
 *                 tenants table. Raw body must be preserved before parsing;
 *                 bodyParser is explicitly disabled for Stripe compliance.
 *                 No outbound calls — constructEvent verifies locally.
 *
 * ─── REGRESSION MAP (THE ZERO-WEB STANDARD) ──────────────────────────────────
 * INPUTS/PARAMS : HTTP POST with raw (unparsed) body.
 *                 Header: stripe-signature (required for HMAC verification)
 *                 Env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *                           STRIPE_PRICE_LIGHT, STRIPE_PRICE_STANDARD,
 *                           STRIPE_PRICE_PROFESSIONAL, STRIPE_PRICE_ENTERPRISE
 * EXTERNAL READS: Stripe SDK — constructEvent() (local verification, no
 *                 outbound call). SUPABASE_SERVICE_ROLE_KEY.
 * MUTATIONS/DB  : tenants table — 3 targeted UPDATE paths:
 *                   checkout.session.completed →
 *                     subscription_tier, billing_model,
 *                     stripe_customer_id, stripe_subscription_id
 *                   customer.subscription.updated →
 *                     subscription_tier (matched via stripe_subscription_id)
 *                   customer.subscription.deleted →
 *                     subscription_tier='free', billing_model='payg',
 *                     stripe_subscription_id=null
 * OUTPUTS/EMITS : HTTP 200 { received: true } for all handled events and all
 *                 unhandled event types (Stripe requires 200 for all events).
 *                 HTTP 400 on signature verification failure.
 *                 HTTP 405 on non-POST. HTTP 500 on processing error.
 *
 * ─── IN-FILE PRIME DIRECTIVES (MANDATORY) ────────────────────────────────────
 * 1. Never create new files to house extracted logic. Keep it in this file.
 * 2. Run a regression map before every single future edit.
 * 3. No CSS, no CSS variables, inline styles only if layout is touched.
 * 4. Every database mutation must keep its save guard (if applicable).
 * 5. Clean Slate Rule: If complex nesting or multi-path drift occurs,
 *    the engineer must rebuild this module from a blank canvas. No patching.
 * ============================================================================
 */

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
