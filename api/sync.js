// api/sync.js — BakerOS backend sync endpoint
// Verifies the Supabase JWT, then upserts baker data server-side
// This prevents unauthorized writes even if the anon key is exposed

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service role key — never expose to client
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the user's JWT from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  // Verify token and get user
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { payload } = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Missing payload' });
  }

  // Upsert baker data — server-side, bypasses RLS safely
  const { error: dbError } = await supabaseAdmin
    .from('baker_data')
    .upsert({
      user_id:    user.id,
      payload,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (dbError) {
    console.error('[sync] DB error:', dbError.message);
    return res.status(500).json({ error: dbError.message });
  }

  return res.status(200).json({ success: true, updated_at: new Date().toISOString() });
}
