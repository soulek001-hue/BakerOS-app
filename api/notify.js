// api/notify.js — BakerOS SMS notification endpoint
// Handles 3 types of notifications:
// 1. New order submitted → SMS to baker
// 2. New storefront message → SMS to baker  
// 3. Marketing campaign → SMS to individual customer

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { customerName, item, amount, phone, customMessage } = req.body;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_FROM_NUMBER;
  const bakerPhone = process.env.TWILIO_TO_NUMBER; // baker's own phone number

  if (!accountSid || !authToken || !from || !bakerPhone) {
    return res.status(500).json({ error: 'Twilio credentials not configured' });
  }

  let to, message;

  if (customMessage) {
    // Marketing campaign — send to the customer's phone
    if (!phone) return res.status(400).json({ error: 'Customer phone required for campaign' });
    to = phone;
    message = customMessage;
  } else if (item?.startsWith('Message:')) {
    // Storefront message notification — alert baker
    to = bakerPhone;
    message = `💬 New BakerOS Message!\nFrom: ${customerName}${phone ? `\nPhone: ${phone}` : ''}\nSubject: ${item.replace('Message: ', '')}`;
  } else {
    // New order notification — alert baker
    to = bakerPhone;
    message = `🧁 New BakerOS Order!\nCustomer: ${customerName}\nItem: ${item}\nAmount: $${amount}${phone ? `\nPhone: ${phone}` : ''}`;
  }

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
    if (!response.ok) return res.status(500).json({ error: data.message });
    return res.status(200).json({ success: true, sid: data.sid });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
