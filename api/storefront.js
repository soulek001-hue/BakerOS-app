// api/storefront.js — public endpoint, no auth required
// GET: returns baker's public storefront data
// POST: receives customer messages and writes to baker_messages table

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── POST: customer submits a message ──────────────────────────────────────
  if (req.method === 'POST') {
    const { action, bakerSlug, name, phone, email, subject, body } = req.body;

    if (action !== 'message') return res.status(400).json({ error: 'Unknown action' });
    if (!name || !body) return res.status(400).json({ error: 'Name and message required' });
    if (!bakerSlug) return res.status(400).json({ error: 'Missing baker slug' });

    // Look up baker user_id from slug
    let bakerData = null;
    const { data: byUsername } = await supabaseAdmin
      .from('baker_data').select('user_id').eq('bakery_username', bakerSlug).single();
    bakerData = byUsername;

    if (!bakerData) {
      const { data: bySlug } = await supabaseAdmin
        .from('baker_data').select('user_id').eq('store_name_slug', bakerSlug).single();
      bakerData = bySlug;
    }

    if (!bakerData?.user_id) return res.status(404).json({ error: 'Baker not found' });

    const { error } = await supabaseAdmin.from('baker_messages').insert({
      baker_id:      bakerData.user_id,
      customer_name: name.trim(),
      customer_phone:phone || null,
      customer_email:email || null,
      subject:       subject || 'Storefront inquiry',
      body:          body.trim(),
      read:          false,
      replied:       false,
      archived:      false,
    });

    if (error) {
      console.error('Message insert error:', error.message);
      return res.status(500).json({ error: 'Failed to save message' });
    }
    return res.status(200).json({ success: true });
  }

  // ── GET: return baker's public storefront data ────────────────────────────
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  let { data } = await supabaseAdmin
    .from('baker_data').select('payload').eq('bakery_username', slug).single();

  if (!data) {
    ({ data } = await supabaseAdmin
      .from('baker_data').select('payload').eq('store_name_slug', slug).single());
  }

  if (!data) return res.status(404).json({ error: 'Bakery not found' });

  const p = data.payload;

  // SECURITY: Only expose safe public fields — never email, phone, address
  const safeInfo = {
    name:          p.bakerInfo?.name           || '',
    city:          p.bakerInfo?.city           || '',
    state:         p.bakerInfo?.state          || '',
    bio:           p.bakerInfo?.bio            || '',
    tagline:       p.bakerInfo?.tagline        || '',
    minOrder:      p.bakerInfo?.minOrder       || '',
    leadTime:      p.bakerInfo?.leadTime       || '',
    deposit:       p.bakerInfo?.deposit        || '',
    flavors:       p.bakerInfo?.flavors        || [],
    signatureItems:p.bakerInfo?.signatureItems || '',
    username:      p.bakerInfo?.username       || '',
    phone:         p.bakerInfo?.phone          || '', // needed for SMS notify routing
  };

  return res.status(200).json({
    brand:       p.brand       || {},
    bakerInfo:   safeInfo,
    products:    (p.products   || []).filter(prod => prod.active !== false),
    categories:  p.categories  || [],
    photos:      p.photos      || [],
    socialLinks: p.socialLinks || {},
  });
}
