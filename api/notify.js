export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  const { customerName, item, amount, phone } = req.body;
 
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_FROM_NUMBER;
  const to         = process.env.TWILIO_TO_NUMBER;
 
  const message = `🧁 New BakerOS Order!\nCustomer: ${customerName}\nItem: ${item}\nAmount: $${amount}${phone ? `\nPhone: ${phone}` : ''}`;
 
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: to, Body: message }),
  });
 
  const data = await response.json();
  if (!response.ok) return res.status(500).json({ error: data.message });
  return res.status(200).json({ success: true, sid: data.sid });
}
 
