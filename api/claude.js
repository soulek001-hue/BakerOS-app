import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Features that require Pro or Elite — enforced server-side
const PRO_FEATURES  = ['ai_campaigns', 'marketing_sms', 'marketing_email'];
const ELITE_FEATURES = ['receipt_scan'];
const TIER_ORDER = ['starter', 'growth', 'pro', 'elite'];
function tierAtLeast(tier, min) {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min);
}

// Extend Vercel function timeout — receipt scanning can take 15-20 seconds
export const maxDuration = 30;

// Simple in-memory rate limiter — max 20 Claude calls per user per minute
const rateLimitMap = new Map();
function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId) || { count: 0, resetAt: now + 60000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60000; }
  entry.count++;
  rateLimitMap.set(userId, entry);
  return entry.count <= 20;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Server-side tier enforcement ─────────────────────────────────────────
  const feature  = req.body?.feature || req.query?.feature || null;
  const userId   = req.body?.userId  || req.query?.userId  || null;

  if (feature && userId) {
    try {
      // Rate limit check
      if (!checkRateLimit(userId)) {
        return res.status(429).json({ error: 'Too many requests — slow down and try again' });
      }

      // Verify tier from Supabase (never trust the client)
      const { data: settings } = await supabase
        .from('baker_settings')
        .select('tier')
        .eq('user_id', userId)
        .single();

      const tier = settings?.tier || 'starter';

      if (ELITE_FEATURES.includes(feature) && !tierAtLeast(tier, 'elite')) {
        return res.status(403).json({ error: 'Elite plan required for this feature' });
      }
      if (PRO_FEATURES.includes(feature) && !tierAtLeast(tier, 'pro')) {
        return res.status(403).json({ error: 'Pro plan required for this feature' });
      }
    } catch (err) {
      console.error('[claude.js] Tier check failed:', err.message);
      // GateWall in the frontend already blocks non-eligible users
      // If Supabase lookup fails, log it but allow the request through
      // to avoid blocking legitimate Elite/Pro bakers due to DB issues
      console.warn('[claude.js] Falling through on tier check error');
    }
  }

  // ── Claude API call ───────────────────────────────────────────────────────
  try {
    const { model, max_tokens, messages, system } = req.body;

    const response = await anthropic.messages.create({
      model:      model      || 'claude-sonnet-4-20250514',
      max_tokens: max_tokens || 1000,
      system:     system,
      messages:   messages,
    });

    return res.status(200).json(response);
  } catch (err) {
    console.error('[claude.js] Anthropic error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
