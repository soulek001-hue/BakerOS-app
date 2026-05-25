import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── Security: shared secret check ─────────────────────────────────────────
const API_SECRET = process.env.BAKEROS_API_SECRET;

// ── Rate limiting ──────────────────────────────────────────────────────────
const rateLimitMap = new Map();
function checkRateLimit(key, max = 10, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  rateLimitMap.set(key, entry);
  return entry.count <= max;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://app.bakeros.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-bakeros-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth check — only allow requests from BakerOS app ──────────────────
  if (API_SECRET && req.headers['x-bakeros-secret'] !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── Rate limit per baker ────────────────────────────────────────────────
  const { type, bakerId, customerName, item, amount, phone } = req.body;
  const rateLimitKey = `notify:${bakerId || 'anon'}`;
  if (!checkRateLimit(rateLimitKey, 30, 60000)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  try {
    let toNumber = null;

    // ── For baker notifications — look up baker's phone server-side ───────
    if (['order', 'message'].includes(type) && bakerId) {
      const { data: settings } = await supabase
        .from('baker_settings')
        .select('baker_info')
        .eq('user_id', bakerId)
        .single();
      const bakerPhone = settings?.baker_info?.phone;
      if (!bakerPhone) {
        console.warn(`[notify] No phone for baker ${bakerId}`);
        return res.status(200).json({ ok: true, skipped: 'no baker phone' });
      }
      toNumber = bakerPhone.replace(/\D/g, '');
      if (!toNumber.startsWith('1')) toNumber = '1' + toNumber;
      toNumber = '+' + toNumber;
    }

    // ── For customer messages — use provided phone ────────────────────────
    if (['customer_message', 'campaign'].includes(type) && phone) {
      toNumber = phone.startsWith('+') ? phone : '+1' + phone.replace(/\D/g, '');
    }

    if (!toNumber) return res.status(200).json({ ok: true, skipped: 'no phone resolved' });

    let body = '';
    switch (type) {
      case 'order':
        body = `🎂 New BakerOS order! ${customerName} ordered ${item} ($${amount}). Check your BakerOS dashboard.`;
        break;
      case 'message':
        body = `💬 New message from ${customerName} on your BakerOS storefront. Open your app to reply.`;
        break;
      case 'customer_message':
        body = req.body.message || '';
        break;
      case 'campaign':
        body = req.body.message || '';
        break;
      default:
        return res.status(400).json({ error: 'Unknown notification type' });
    }

    if (!body) return res.status(400).json({ error: 'Empty message body' });

    await client.messages.create({
      body,
      from: process.env.TWILIO_FROM_NUMBER,
      to: toNumber,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[notify] Twilio error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
