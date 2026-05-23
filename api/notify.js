// api/notify.js — BakerOS SMS notification endpoint
// Architecture:
//   type "order"          → SMS to baker (looked up server-side from Supabase)
//   type "message"        → SMS to baker (bakerPhone passed from public storefront)
//   type "campaign"       → SMS to individual opted-in customer
//   type "customer_message" → SMS to customer (decline/cancel/refund)

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const rateLimitStore = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 5;
  if (!rateLimitStore.has(ip)) { rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs }); return false; }
  const record = rateLimitStore.get(ip);
  if (now > record.resetAt) { rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs }); return false; }
  record.count++;
  return record.count > maxRequests;
}

let cleanupCounter = 0;
function maybeCleanup() {
  if (++cleanupCounter < 100) return;
  cleanupCounter = 0;
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) rateLimitStore.delete(ip);
  }
}

function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return '+' + digits;
}

async function sendSMS(from, to, body, accountSid, authToken) {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Twilio error');
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  maybeCleanup();
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests' });

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    return res.status(500).json({ error: 'Twilio credentials not configured' });
  }

  const { type, customerName, item, amount, phone, customMessage, bakerPhone, bakerId } = req.body;

  if (!customerName || typeof customerName !== 'string') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    // ── Type: order or message → notify baker ─────────────────────────────
    if (type === 'order' || type === 'message') {
      let bakerTo = null;

      // Look up baker phone server-side from Supabase (more secure than client-sent phone)
      if (bakerId) {
        const { data } = await supabaseAdmin
          .from('baker_data')
          .select('payload')
          .eq('user_id', bakerId)
          .single();
        bakerTo = formatPhone(data?.payload?.bakerInfo?.phone);
      }

      // Fall back to env var (for storefront messages where bakerId isn't available)
      if (!bakerTo && bakerPhone) bakerTo = formatPhone(bakerPhone);
      if (!bakerTo) bakerTo = process.env.TWILIO_TO_NUMBER;

      if (!bakerTo) return res.status(400).json({ error: 'No baker phone configured' });

      const message = type === 'message'
        ? `New BakerOS Message!\nFrom: ${customerName}${phone ? `\nPhone: ${phone}` : ''}\nSubject: ${item?.replace('Message: ', '') || 'Storefront inquiry'}`
        : `New BakerOS Order!\nCustomer: ${customerName}\nItem: ${item}\nAmount: $${amount}${phone ? `\nPhone: ${phone}` : ''}`;

      await sendSMS(from, bakerTo, message, accountSid, authToken);
      return res.status(200).json({ success: true });
    }

    // ── Type: campaign → SMS to opted-in customer ─────────────────────────
    if (type === 'campaign') {
      if (!phone || !customMessage) return res.status(400).json({ error: 'Phone and message required for campaign' });
      const to = formatPhone(phone);
      if (!to) return res.status(400).json({ error: 'Invalid customer phone' });
      await sendSMS(from, to, customMessage, accountSid, authToken);
      return res.status(200).json({ success: true });
    }

    // ── Type: customer_message → SMS to customer (decline/cancel/refund) ──
    if (type === 'customer_message') {
      if (!phone || !customMessage) return res.status(400).json({ error: 'Phone and message required' });
      const to = formatPhone(phone);
      if (!to) return res.status(400).json({ error: 'Invalid customer phone' });
      // Never fall back to baker's number — always go to customer
      await sendSMS(from, to, customMessage, accountSid, authToken);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown notification type' });

  } catch (e) {
    console.error('Notify error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
