// api/notify.js — BakerOS SMS notification endpoint
// Rate limited: max 5 requests per IP per 60 seconds

// In-memory rate limit store (resets on cold start — good enough for Vercel serverless)
const rateLimitStore = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 60 seconds
  const maxRequests = 5;

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  const record = rateLimitStore.get(ip);

  // Reset window if expired
  if (now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }

  // Increment count
  record.count++;
  if (record.count > maxRequests) return true;
  return false;
}

// Clean up old entries every 100 requests to prevent memory leak
let cleanupCounter = 0;
function maybeCleanup() {
  if (++cleanupCounter < 100) return;
  cleanupCounter = 0;
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) rateLimitStore.delete(ip);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limiting — get real IP from Vercel headers
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';

  maybeCleanup();

  if (isRateLimited(ip)) {
    console.warn('Rate limit hit for IP:', ip);
    return res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
  }

  const { customerName, item, amount, phone, customMessage, bakerPhone } = req.body;

  // Basic input validation
  if (!customerName || typeof customerName !== 'string') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_FROM_NUMBER;
  const toNumber   = bakerPhone ? formatPhone(bakerPhone) : process.env.TWILIO_TO_NUMBER;

  if (!accountSid || !authToken || !from || !toNumber) {
    return res.status(500).json({ error: 'Twilio credentials not configured' });
  }

  let to, message;

  if (customMessage) {
    if (!phone) return res.status(400).json({ error: 'Customer phone required' });
    to = formatPhone(phone);
    message = customMessage;
  } else if (item?.startsWith('Message:')) {
    to = toNumber;
    message = `💬 New BakerOS Message!\nFrom: ${customerName}${phone ? `\nPhone: ${phone}` : ''}\nSubject: ${item.replace('Message: ', '')}`;
  } else {
    to = toNumber;
    message = `🧁 New BakerOS Order!\nCustomer: ${customerName}\nItem: ${item}\nAmount: $${amount}${phone ? `\nPhone: ${phone}` : ''}`;
  }

  if (!to) return res.status(400).json({ error: 'No destination phone number' });

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: from, To: to, Body: message }),
      }
    );

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.message, code: data.code });
    return res.status(200).json({ success: true, sid: data.sid });
  } catch (e) {
    console.error('Twilio error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return '+' + digits;
}
