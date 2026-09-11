import { createClient } from '@supabase/supabase-js';

const SUPABASE_AUTH_URL = 'https://xnadszfvjkyxltskywin.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN';

const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const serverUrl = process.env.SUPABASE_URL || SUPABASE_AUTH_URL;

export const authClient = createClient(SUPABASE_AUTH_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

export const adminClient = serverKey
  ? createClient(serverUrl, serverKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

const adminUserIds = new Set(
  String(process.env.GROWTH_ADMIN_USER_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

export async function authenticatedUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function growthAdminStatus(userId) {
  if (!userId || !adminClient) {
    return {
      authorized: false,
      databaseMatch: false,
      environmentMatch: false,
      lookupError: adminClient ? null : 'Server database client is not configured.'
    };
  }

  const { data, error } = await adminClient
    .from('growth_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  const databaseMatch = !error && data?.user_id === userId;
  const environmentMatch = adminUserIds.has(userId);

  if (error) console.error('[growth] admin lookup error:', error.message);

  return {
    authorized: databaseMatch || environmentMatch,
    databaseMatch,
    environmentMatch,
    lookupError: error?.message || null
  };
}

export { serverUrl, SUPABASE_AUTH_URL };
