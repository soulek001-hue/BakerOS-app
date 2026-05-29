import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Rate limiting for POST requests
const rateLimitMap = new Map();
function checkRateLimit(ip, max = 5, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count <= max;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: Return baker's public storefront data ────────────────────────────
  if (req.method === 'GET') {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'slug required' });

    try {
      // Look up by generated slug column
      const { data: settings } = await supabase
        .from('baker_settings')
        .select('user_id, brand, baker_info, products, categories, photos, albums, social_links, tier')
        .eq('store_name_slug', slug)
        .single();

      if (!settings) return res.status(404).json({ error: 'Bakery not found' });

      // Filter to only active products — never expose PII
      const activeProducts = (settings.products || []).filter(p => p.active !== false);

      return res.status(200).json({
        bakerId:     settings.user_id,
        brand:       settings.brand || {},
        bakerInfo:   {
          // Only expose non-PII fields
          bio:            settings.baker_info?.bio,
          minOrder:       settings.baker_info?.minOrder,
          leadTime:       settings.baker_info?.leadTime,
          deposit:        settings.baker_info?.deposit,
          flavors:        settings.baker_info?.flavors,
          signatureItems: settings.baker_info?.signatureItems,
          acceptingOrders: settings.baker_info?.acceptingOrders,
        },
        products:    activeProducts,
        categories:  settings.categories || [],
        photos:      settings.photos || [],
        albums:      settings.albums || [],
        socialLinks: settings.social_links || {},
        tier:        settings.tier || 'starter',
      });
    } catch (err) {
      console.error('[storefront GET]', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // ── POST: Handle contact messages and NFC lead capture ───────────────────
  if (req.method === 'POST') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 5, 60000)) {
      return res.status(429).json({ error: 'Too many requests — try again in a minute' });
    }

    const { type, bakerId } = req.body;

    if (!bakerId) return res.status(400).json({ error: 'bakerId required' });

    // ── NFC Lead Capture ───────────────────────────────────────────────────
    if (type === 'nfc_lead') {
      const { customerName, customerPhone, customerEmail } = req.body;

      if (!customerName || !customerPhone) {
        return res.status(400).json({ error: 'Name and phone are required' });
      }

      const cleanPhone = customerPhone.replace(/\D/g, '');

      try {
        // Check if customer already exists (by phone) to avoid duplicates
        const { data: existing } = await supabase
          .from('baker_customers')
          .select('id, orders, spent, tags')
          .eq('baker_id', bakerId)
          .eq('phone', cleanPhone)
          .single();

        if (existing) {
          // Update existing customer — add NFC tag if not already there
          const tags = existing.tags || [];
          if (!tags.includes('NFC Lead')) tags.push('NFC Lead');
          await supabase
            .from('baker_customers')
            .update({
              name:       customerName,
              email:      customerEmail || existing.email || '',
              tags,
              sms_opt_in: true,
              last:       new Date().toISOString().split('T')[0],
            })
            .eq('id', existing.id);
        } else {
          // Create new customer with NFC source
          const insertData = {
            id:         randomUUID(),
            baker_id:   bakerId,
            name:       customerName,
            phone:      cleanPhone,
            email:      customerEmail || '',
            orders:     0,
            spent:      0,
            last:       new Date().toISOString().split('T')[0],
            tag:        'NFC Lead',
            notes:      'Captured via NFC tag',
            sms_opt_in: true,
            allergies:  '',
          };
          // Add optional columns if they exist in schema
          try { insertData.source = 'nfc'; } catch {}
          try { insertData.tags = ['NFC Lead']; } catch {}
          try { insertData.is_new_nfc = true; } catch {}

          const { error: insertError } = await supabase.from('baker_customers').insert(insertData);
          if (insertError) {
            console.error('[storefront NFC insert]', insertError.message);
            // Try without optional columns if insert failed
            delete insertData.source;
            delete insertData.tags;
            delete insertData.is_new_nfc;
            await supabase.from('baker_customers').insert(insertData);
          }
        }

        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('[storefront NFC lead]', err.message);
        return res.status(500).json({ error: 'Could not save lead' });
      }
    }

    // ── Contact Message ────────────────────────────────────────────────────
    if (type === 'message' || !type) {
      const { customerName, customerPhone, customerEmail, subject, body } = req.body;

      if (!customerName || !body) {
        return res.status(400).json({ error: 'Name and message are required' });
      }

      try {
        await supabase.from('baker_messages').insert({
          baker_id:       bakerId,
          customer_name:  customerName,
          customer_phone: customerPhone || '',
          customer_email: customerEmail || '',
          subject:        subject || 'New message from storefront',
          body:           body,
          read:           false,
          replied:        false,
          archived:       false,
        });

        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('[storefront message]', err.message);
        return res.status(500).json({ error: 'Could not save message' });
      }
    }

    return res.status(400).json({ error: 'Unknown request type' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
