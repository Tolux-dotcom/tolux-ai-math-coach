import { getGrowthMetrics } from '../../growth-analytics.mjs';
import {
  adminClient,
  authenticatedUser,
  growthAdminStatus,
  sendJson
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

  if (!adminClient) {
    return sendJson(res, 503, { error: 'Growth analytics storage is not configured.' });
  }

  const user = await authenticatedUser(req);
  if (!user) {
    return sendJson(res, 401, { error: 'Please sign in.' });
  }

  const status = await growthAdminStatus(user.id);
  if (!status.authorized) {
    return sendJson(res, 404, { error: 'Not found.' });
  }

  try {
    const metrics = await getGrowthMetrics(adminClient);
    return sendJson(res, 200, { metrics });
  } catch (error) {
    console.error('[growth] metrics error:', error);
    return sendJson(res, 500, { error: 'Unable to load growth metrics.' });
  }
}
