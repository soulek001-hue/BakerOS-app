import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Price IDs from BakerOS Stripe sandbox
const PRICE_IDS = {
  growth: 'price_1Tap8vFFT3hfRfa4mpjN7VIO',
  pro:    'price_1TapAcFFT3hfRfa40tQ1wIcz',
  elite:  'price_1TapBEFFT3hfRfa4kpl9CDND',
};

// Tier mapped from Stripe price ID (for webhook)
const PRICE_TO_TIER = {
  'price_1Tap8vFFT3hfRfa4mpjN7VIO': 'growth',
  'price_1TapAcFFT3hfRfa40tQ1wIcz': 'pro',
  'price_1TapBEFFT3hfRfa4kpl9CDND': 'elite',
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.query;

  // ── CREATE CHECKOUT SESSION ─────────────────────────────────────────────
  if (action === 'create-checkout') {
    try {
      const { tierId, userId, userEmail, currentStripeCustomerId } = req.body;

      if (!PRICE_IDS[tierId]) {
        return res.status(400).json({ error: 'Invalid tier' });
      }

      const appUrl = process.env.VITE_APP_URL || 'https://app.bakeros.app';

      // Reuse existing Stripe customer or create new one
      let customerId = currentStripeCustomerId;
      if (!customerId && userEmail) {
        // Check if customer already exists in Stripe
        const existing = await stripe.customers.list({ email: userEmail, limit: 1 });
        if (existing.data.length > 0) {
          customerId = existing.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: userEmail,
            metadata: { baker_id: userId },
          });
          customerId = customer.id;
        }

        // Save stripe_customer_id to baker_settings for future use
        if (userId) {
          await supabase
            .from('baker_settings')
            .update({ stripe_customer_id: customerId })
            .eq('user_id', userId);
        }
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId || undefined,
        customer_email: customerId ? undefined : userEmail,
        line_items: [{ price: PRICE_IDS[tierId], quantity: 1 }],
        success_url: `${appUrl}?stripe=success&tier=${tierId}`,
        cancel_url:  `${appUrl}?stripe=cancel`,
        metadata: { baker_id: userId, tier: tierId },
        subscription_data: {
          metadata: { baker_id: userId, tier: tierId },
        },
        allow_promotion_codes: true,
      });

      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('Stripe checkout error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── CUSTOMER PORTAL (manage/cancel subscription) ────────────────────────
  if (action === 'portal') {
    try {
      const { stripeCustomerId } = req.body;
      if (!stripeCustomerId) {
        return res.status(400).json({ error: 'No Stripe customer ID' });
      }

      const appUrl = process.env.VITE_APP_URL || 'https://app.bakeros.app';
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: appUrl,
      });

      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('Stripe portal error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── WEBHOOK (Stripe → update tier in Supabase) ──────────────────────────
  if (action === 'webhook') {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      // Raw body required for webhook signature verification
      const rawBody = await getRawBody(req);
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    try {
      switch (event.type) {

        // Payment succeeded — activate tier
        case 'checkout.session.completed': {
          const session = event.data.object;
          const bakerId = session.metadata?.baker_id;
          const tier    = session.metadata?.tier;
          if (bakerId && tier) {
            await supabase
              .from('baker_settings')
              .update({
                tier,
                stripe_customer_id:    session.customer,
                stripe_subscription_id: session.subscription,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', bakerId);
          }
          break;
        }

        // Subscription updated (upgrade/downgrade)
        case 'customer.subscription.updated': {
          const sub    = event.data.object;
          const priceId = sub.items?.data?.[0]?.price?.id;
          const tier    = PRICE_TO_TIER[priceId];
          const bakerId = sub.metadata?.baker_id;

          if (bakerId && tier && sub.status === 'active') {
            await supabase
              .from('baker_settings')
              .update({ tier, updated_at: new Date().toISOString() })
              .eq('user_id', bakerId);
          }
          break;
        }

        // Subscription cancelled or payment failed — downgrade to starter
        case 'customer.subscription.deleted':
        case 'invoice.payment_failed': {
          const obj     = event.data.object;
          const bakerId = obj.metadata?.baker_id;
          if (bakerId) {
            await supabase
              .from('baker_settings')
              .update({ tier: 'starter', updated_at: new Date().toISOString() })
              .eq('user_id', bakerId);
          }
          break;
        }

        default:
          // Ignore other events
          break;
      }

      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('Webhook handler error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
}

// Helper: read raw body for Stripe webhook signature verification
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
