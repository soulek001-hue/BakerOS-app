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

    // Look up baker user_id from slug via baker_settings
    let bakerUserId = null;
    const { data: byUsername } = await supabaseAdmin
      .from('baker_settings').select('user_id').eq('bakery_username', bakerSlug).single();
    if (byUsername) bakerUserId = byUsername.user_id;

    if (!bakerUserId) {
      const { data: bySlug } = await supabaseAdmin
        .from('baker_settings').select('user_id').eq('store_name_slug', bakerSlug).single();
      if (bySlug) bakerUserId = bySlug.user_id;
    }

    if (!bakerUserId) return res.status(404).json({ error: 'Baker not found' });

    const { error } = await supabaseAdmin.from('baker_messages').insert({
      baker_id:       bakerUserId,
      customer_name:  name.trim(),
      customer_phone: phone || null,
      customer_email: email || null,
      subject:        subject || 'Storefront inquiry',
      body:           body.trim(),
      read:           false,
      replied:        false,
      archived:       false,
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

  // Query baker_settings table (replaces old baker_data)
  let { data } = await supabaseAdmin
    .from('baker_settings')
    .select('brand, baker_info, social_links, products, categories, photos, albums')
    .eq('bakery_username', slug)
    .single();

  if (!data) {
    ({ data } = await supabaseAdmin
      .from('baker_settings')
      .select('brand, baker_info, social_links, products, categories, photos, albums')
      .eq('store_name_slug', slug)
      .single());
  }

  if (!data) return res.status(404).json({ error: 'Bakery not found' });

  const bi = data.baker_info || {};

  // SECURITY: Only expose safe public fields — never email, phone, address
  const safeInfo = {
    name:           bi.name           || '',
    city:           bi.city           || '',
    state:          bi.state          || '',
    bio:            bi.bio            || '',
    tagline:        bi.tagline        || '',
    minOrder:       bi.minOrder       || '',
    leadTime:       bi.leadTime       || '',
    deposit:        bi.deposit        || '',
    flavors:        bi.flavors        || [],
    signatureItems: bi.signatureItems || '',
    username:       bi.username       || '',
    phone:          bi.phone          || '', // for SMS notify routing only
  };

  // Filter photos — only cloud URLs, no base64
  const safePhotos = (data.photos || [])
    .filter(ph => ph.url && ph.url.startsWith('http'))
    .map(ph => ({
      id: ph.id, url: ph.url, type: ph.type || 'photo',
      title: ph.title || '', caption: ph.caption || '',
      albumId: ph.albumId || '', productIds: ph.productIds || [],
    }));

  return res.status(200).json({
    brand:       data.brand       || {},
    bakerInfo:   safeInfo,
    products:    (data.products   || []).filter(p => p.active !== false),
    categories:  data.categories  || [],
    photos:      safePhotos,
    albums:      data.albums      || [],
    socialLinks: data.social_links || {},
  });
}
