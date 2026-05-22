// api/claude.js — BakerOS AI endpoint powered by Anthropic Claude

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system, max_tokens = 1000 } = req.body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens,
        system,
        messages,
      }),
    });

    const data = await response.json();
    console.log('Anthropic response status:', response.status);
    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return res.status(500).json({ error: data.error?.message || 'Anthropic API error' });
    }
    return res.status(200).json(data);
  } catch (e) {
    console.error('Claude fetch error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
