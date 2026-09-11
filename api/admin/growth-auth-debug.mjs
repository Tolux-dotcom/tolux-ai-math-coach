import {
  authenticatedUser,
  growthAdminStatus,
  sendJson,
  serverUrl,
  SUPABASE_AUTH_URL
} from '../_growth-auth.mjs';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    return res.end();
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const user = await authenticatedUser(req);
  if (!user) {
    return sendJson(res, 401, { error: 'Please sign in.' });
  }

  const adminStatus = await growthAdminStatus(user.id);
  return sendJson(res, 200, {
    user: {
      id: user.id,
      email: user.email || null
    },
    adminStatus,
    serverProjectUrl: serverUrl,
    authProjectUrl: SUPABASE_AUTH_URL
  });
}
