// api/storefront.js — public endpoint, no auth required
// Uses indexed generated columns for O(log n) lookup
// bakerInfo is filtered to exclude sensitive fields (email, phone, address)

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });

  // Try exact bakery_username match first (indexed)
  let { data } = await supabaseAdmin
    .from('baker_data')
    .select('payload')
    .eq('bakery_username', slug)
    .single();

  // Fall back to store_name_slug match (also indexed)
  if (!data) {
    ({ data } = await supabaseAdmin
      .from('baker_data')
      .select('payload')
      .eq('store_name_slug', slug)
      .single());
  }

  if (!data) return res.status(404).json({ error: 'Bakery not found' });

  const p = data.payload;

  // SECURITY: Only expose safe public fields from bakerInfo
  // Never expose: email, phone, address, SSN, or any PII
  const safeInfo = {
    name:          p.bakerInfo?.name          || '',
    city:          p.bakerInfo?.city          || '',
    state:         p.bakerInfo?.state         || '',
    bio:           p.bakerInfo?.bio           || '',
    tagline:       p.bakerInfo?.tagline       || '',
    minOrder:      p.bakerInfo?.minOrder      || '',
    leadTime:      p.bakerInfo?.leadTime      || '',
    deposit:       p.bakerInfo?.deposit       || '',
    flavors:       p.bakerInfo?.flavors       || [],
    signatureItems:p.bakerInfo?.signatureItems|| '',
    username:      p.bakerInfo?.username      || '',
    // EXPLICITLY EXCLUDED: email, phone, address
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
