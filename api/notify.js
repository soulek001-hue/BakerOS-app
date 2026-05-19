// api/notify.js — BakerOS SMS notification endpoint
// Uses baker's own phone number when provided, falls back to env var

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { customerName, item, amount, phone, customMessage, bakerPhone } = req.body;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_FROM_NUMBER;
  // Use baker's own phone if provided, otherwise fall back to env var (your number)
  const toNumber   = bakerPhone ? formatPhone(bakerPhone) : process.env.TWILIO_TO_NUMBER;

  console.log('TWILIO_FROM:', from || 'MISSING');
  console.log('Baker phone:', bakerPhone || 'not provided, using env var');
  console.log('Sending to:', toNumber || 'MISSING');

  if (!accountSid || !authToken || !from || !toNumber) {
    return res.status(500).json({ error: 'Twilio credentials not configured' });
  }

  let to, message;

  if (customMessage) {
    // Marketing campaign — send to the customer's phone
    if (!phone) return res.status(400).json({ error: 'Customer phone required' });
    to = formatPhone(phone);
    message = customMessage;
  } else if (item?.startsWith('Message:')) {
    // Storefront message — notify baker
    to = toNumber;
    message = `💬 New BakerOS Message!\nFrom: ${customerName}${phone ? `\nPhone: ${phone}` : ''}\nSubject: ${item.replace('Message: ', '')}`;
  } else {
    // New order — notify baker
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
    console.log('Twilio status:', response.status, '— SID:', data.sid || data.message);
    if (!response.ok) return res.status(500).json({ error: data.message, code: data.code });
    return res.status(200).json({ success: true, sid: data.sid });
  } catch (e) {
    console.error('Twilio error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}

// Normalize phone to E.164 format (+1XXXXXXXXXX)
function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  return '+' + digits;
}
