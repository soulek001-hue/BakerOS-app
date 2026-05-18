// api/notify.js — BakerOS SMS notification endpoint

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { customerName, item, amount, phone, customMessage } = req.body;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_FROM_NUMBER;
  const bakerPhone = process.env.TWILIO_TO_NUMBER;

  // Log all env vars (masked) so we can debug
  console.log('TWILIO_ACCOUNT_SID:', accountSid ? accountSid.slice(0,6)+'...' : 'MISSING');
  console.log('TWILIO_AUTH_TOKEN:', authToken ? authToken.slice(0,4)+'...' : 'MISSING');
  console.log('TWILIO_FROM_NUMBER:', from || 'MISSING');
  console.log('TWILIO_TO_NUMBER:', bakerPhone || 'MISSING');
  console.log('Body received:', JSON.stringify({ customerName, item, amount, phone, customMessage }));

  if (!accountSid || !authToken || !from || !bakerPhone) {
    console.error('Missing Twilio credentials');
    return res.status(500).json({ error: 'Twilio credentials not configured', missing: { accountSid: !accountSid, authToken: !authToken, from: !from, bakerPhone: !bakerPhone } });
  }

  let to, message;

  if (customMessage) {
    if (!phone) return res.status(400).json({ error: 'Customer phone required for campaign' });
    to = phone;
    message = customMessage;
  } else if (item?.startsWith('Message:')) {
    to = bakerPhone;
    message = `💬 New BakerOS Message!\nFrom: ${customerName}${phone ? `\nPhone: ${phone}` : ''}\nSubject: ${item.replace('Message: ', '')}`;
  } else {
    to = bakerPhone;
    message = `🧁 New BakerOS Order!\nCustomer: ${customerName}\nItem: ${item}\nAmount: $${amount}${phone ? `\nPhone: ${phone}` : ''}`;
  }

  console.log('Sending SMS — From:', from, 'To:', to);

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
    console.log('Twilio response status:', response.status);
    console.log('Twilio response body:', JSON.stringify(data));

    if (!response.ok) return res.status(500).json({ error: data.message, code: data.code, moreInfo: data.more_info });
    return res.status(200).json({ success: true, sid: data.sid });
  } catch (e) {
    console.error('Twilio fetch error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
