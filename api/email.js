// api/email.js — BakerOS email campaign endpoint via Resend

const rateLimitStore = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;
  if (!rateLimitStore.has(ip)) { rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs }); return false; }
  const record = rateLimitStore.get(ip);
  if (now > record.resetAt) { rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs }); return false; }
  record.count++;
  return record.count > maxRequests;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests' });

  const { to, subject, html, from, replyTo } = req.body;

  if (!to || !subject || !html) return res.status(400).json({ error: 'Missing required fields' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  // Send to array of recipients or single address
  const recipients = Array.isArray(to) ? to : [to];

  try {
    // Send individually to avoid exposing all customer emails to each other
    const results = await Promise.allSettled(
      recipients.map(recipient =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: from || 'BakerOS <hello@bakeros.app>',
            to: [recipient],
            subject,
            html,
            reply_to: replyTo || undefined,
          }),
        }).then(r => r.json())
      )
    );

    const succeeded = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
    const failed = results.length - succeeded;

    return res.status(200).json({ success: true, sent: succeeded, failed });
  } catch (e) {
    console.error('Resend error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
