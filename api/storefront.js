// api/storefront.js — public endpoint, no auth required
// Fetches baker's public storefront data by username slug

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

  // Fetch all rows and filter in JS — simplest approach for small user base
  // When users scale, add a generated column + index for username lookups
  const { data, error } = await supabaseAdmin
    .from('baker_data')
    .select('payload');

  if (error) return res.status(500).json({ error: error.message });

  // Find baker whose username matches the slug
  const match = (data || []).find(row => {
    const p = row.payload;
    const username = p?.brand?.bakeryUsername || p?.bakerInfo?.username || '';
    const nameSlug = (p?.brand?.storeName || '')
      .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return username === slug || nameSlug === slug;
  });

  if (!match) return res.status(404).json({ error: 'Bakery not found' });

  const p = match.payload;
  return res.status(200).json({
    brand:       p.brand       || {},
    bakerInfo:   p.bakerInfo   || {},
    products:    (p.products   || []).filter(prod => prod.active !== false),
    categories:  p.categories  || [],
    photos:      p.photos      || [],
    socialLinks: p.socialLinks || {},
  });
}
