import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// ── Validate env vars at startup so failures are obvious in logs ─────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) console.error('[storefront] MISSING env var: VITE_SUPABASE_URL');
if (!SUPABASE_KEY) console.error('[storefront] MISSING env var: SUPABASE_SERVICE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

  // Fail fast if env vars are missing — makes the problem visible immediately
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[storefront] Aborting — Supabase env vars not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // ── GET: Return baker's public storefront data or invoice data ───────────
  if (req.method === 'GET') {
    const { slug, invoice: invoiceId } = req.query;

    // ── Invoice lookup ────────────────────────────────────────────────────
    if (invoiceId) {
      try {
        // Find the invoice
        const { data: inv, error: invError } = await supabase
          .from('baker_invoices')
          .select('*')
          .eq('id', invoiceId.toUpperCase())
          .single();

        if (invError || !inv) {
          return res.status(404).json({ error: 'Invoice not found' });
        }

        // Get baker's brand + pay handles
        const { data: settings } = await supabase
          .from('baker_settings')
          .select('brand, pay_handles')
          .eq('user_id', inv.baker_id)
          .single();

        return res.status(200).json({
          invoice: {
            id:            inv.id,
            customer:      inv.customer,
            amount:        parseFloat(inv.amount) || 0,
            status:        inv.status,
            due:           inv.due,
            items:         inv.items || 'Custom order',
            finalImageURL: inv.final_image_url || null,
            depositAmount:    parseFloat(inv.deposit_amount) || 0,
            balance:          parseFloat(inv.balance) || 0,
            depositReceived:  inv.deposit_received || false,
          },
          baker: {
            storeName: settings?.brand?.storeName || 'Your Baker',
            logo:      settings?.brand?.logo || null,
            theme:     settings?.brand?.theme || { primary: '#C47B00' },
          },
          payHandles: settings?.pay_handles || {},
        });
      } catch (err) {
        console.error('[storefront invoice GET]', err.message);
        return res.status(500).json({ error: 'Server error' });
      }
    }

    if (!slug) return res.status(400).json({ error: 'slug required' });

    try {
      const { data: settings, error: fetchError } = await supabase
        .from('baker_settings')
        .select('user_id, brand, baker_info, products, categories, photos, albums, social_links, tier')
        .eq('store_name_slug', slug)
        .single();

      if (fetchError) {
        console.error('[storefront GET] Supabase error:', fetchError.message);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!settings) return res.status(404).json({ error: 'Bakery not found' });

      const activeProducts = (settings.products || []).filter(p => p.active !== false);

      return res.status(200).json({
        bakerId:     settings.user_id,
        brand:       settings.brand || {},
        bakerInfo:   {
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
      console.error('[storefront GET] Unexpected error:', err.message);
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

    // ── Mark Invoice Paid ─────────────────────────────────────────────────
    if (type === 'mark_paid') {
      const { invoiceId } = req.body;
      if (!invoiceId) return res.status(400).json({ error: 'invoiceId required' });

      try {
        const { data: inv } = await supabase
          .from('baker_invoices')
          .select('baker_id, customer, amount')
          .eq('id', invoiceId.toUpperCase())
          .single();

        if (!inv) return res.status(404).json({ error: 'Invoice not found' });

        await supabase
          .from('baker_invoices')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', invoiceId.toUpperCase());

        console.log(`[storefront] Invoice ${invoiceId} marked paid by customer`);
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('[storefront mark_paid]', err.message);
        return res.status(500).json({ error: 'Could not update invoice' });
      }
    }

    // ── NFC Lead Capture ───────────────────────────────────────────────────
    if (type === 'nfc_lead') {
      const { customerName, customerPhone, customerEmail } = req.body;

      if (!customerName || !customerPhone) {
        return res.status(400).json({ error: 'Name and phone are required' });
      }

      const cleanPhone = customerPhone.replace(/\D/g, '');
      console.log(`[storefront NFC] Saving lead for bakerId=${bakerId} phone=${cleanPhone}`);

      try {
        // Check for duplicate by phone
        const { data: existing, error: lookupError } = await supabase
          .from('baker_customers')
          .select('id, tags')
          .eq('baker_id', bakerId)
          .eq('phone', cleanPhone)
          .maybeSingle();  // maybeSingle() returns null instead of error when no row found

        if (lookupError) {
          console.error('[storefront NFC] Lookup error:', lookupError.message);
          // Don't abort — try insert anyway
        }

        if (existing) {
          // Update existing customer — add NFC tag if not already there
          const tags = Array.isArray(existing.tags) ? existing.tags : [];
          if (!tags.includes('NFC Lead')) tags.push('NFC Lead');

          const { error: updateError } = await supabase
            .from('baker_customers')
            .update({
              name:       customerName,
              email:      customerEmail || '',
              tags,
              source:     'nfc',
              sms_opt_in: true,
              is_new_nfc: true,
              last:       new Date().toISOString().split('T')[0],
            })
            .eq('id', existing.id);

          if (updateError) console.error('[storefront NFC] Update error:', updateError.message);
          else console.log('[storefront NFC] Updated existing customer:', existing.id);

        } else {
          // Insert new customer
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
            tags:       ['NFC Lead'],
            notes:      'Captured via NFC tag',
            sms_opt_in: true,
            allergies:  '',
            source:     'nfc',
            is_new_nfc: true,
          };

          const { error: insertError } = await supabase
            .from('baker_customers')
            .insert(insertData);

          if (insertError) {
            console.error('[storefront NFC] Insert error:', insertError.message, insertError.details, insertError.hint);
            return res.status(500).json({ error: 'Could not save lead: ' + insertError.message });
          }

          console.log('[storefront NFC] Inserted new customer:', insertData.id);
        }

        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('[storefront NFC lead] Unexpected error:', err.message);
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
        const { error: msgError } = await supabase.from('baker_messages').insert({
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

        if (msgError) {
          console.error('[storefront message] Insert error:', msgError.message);
          return res.status(500).json({ error: 'Could not save message' });
        }

        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('[storefront message] Unexpected error:', err.message);
        return res.status(500).json({ error: 'Could not save message' });
      }
    }

    return res.status(400).json({ error: 'Unknown request type' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
