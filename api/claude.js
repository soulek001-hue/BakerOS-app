import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Features gated by tier
const PRO_FEATURES   = ['ai_campaigns', 'marketing_sms', 'marketing_email'];
const ELITE_FEATURES = ['receipt_scan'];
const TIER_ORDER     = ['starter', 'growth', 'pro', 'elite'];

function tierAtLeast(tier, min) {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min);
}

// Extend Vercel function timeout — receipt scanning can take 15-20 seconds
export const maxDuration = 30;

// Explicit body parsing config for Vercel
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // receipt images can be large
    },
  },
};

// Rate limiter — max 20 calls per user per minute
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

  // ── Parse body safely ──────────────────────────────────────────────────────
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON body' }); }
  }
  if (!body) return res.status(400).json({ error: 'Empty request body' });

  const { feature, userId, model, max_tokens, messages, system } = body;

  // ── Server-side tier enforcement ───────────────────────────────────────────
  if (feature && userId) {
    try {
      if (!checkRateLimit(userId)) {
        return res.status(429).json({ error: 'Too many requests — slow down and try again' });
      }

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
      // GateWall in frontend already blocks non-eligible users
      // If Supabase lookup fails, log and allow through
      console.warn('[claude.js] Tier check error — allowing through:', err.message);
    }
  }

  // ── Claude API call ────────────────────────────────────────────────────────
  try {
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const response = await anthropic.messages.create({
      model:      model      || 'claude-sonnet-4-5',
      max_tokens: max_tokens || 1000,
      ...(system ? { system } : {}),
      messages,
    });

    return res.status(200).json(response);
  } catch (err) {
    console.error('[claude.js] Anthropic error:', err.message, err.status, err.error);
    return res.status(500).json({
      error: err.message || 'Claude API error',
      status: err.status,
      details: err.error,
    });
  }
}
