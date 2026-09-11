import http from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { getGrowthMetrics, recordGrowthEvent } from './growth-analytics.mjs';
import { createInternalQaController } from './internal-qa.mjs';
import { GROWTH_ACCESS_PATH, resolveGrowthAccess } from './growth-admin-access.mjs';

const SUPABASE_AUTH_URL = 'https://xnadszfvjkyxltskywin.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN';
const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const serverUrl = process.env.SUPABASE_URL || SUPABASE_AUTH_URL;
const authClient = createClient(SUPABASE_AUTH_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const adminClient = serverKey
  ? createClient(serverUrl, serverKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const internalQa = createInternalQaController();
const adminUserIds = new Set(
  String(process.env.GROWTH_ADMIN_USER_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);

function sendJson(res, status, body) {
  if (res.headersSent) return;
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 64_000) throw new Error('Request too large.');
  }
  return JSON.parse(body || '{}');
}

async function authenticatedUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await authClient.auth.getUser(token);
  return error ? null : data?.user || null;
}

async function growthAdminStatus(userId) {
  if (!userId) {
    return { authorized: false, databaseMatch: false, environmentMatch: false, previewQaMatch: false, lookupError: null };
  }

  const { data, error } = await adminClient
    .from('growth_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  const databaseMatch = !error && data?.user_id === userId;
  const environmentMatch = adminUserIds.has(userId);
  const previewQaMatch = process.env.VERCEL_ENV === 'preview' && internalQa.isAuthorized(userId);

  if (error) console.error('[growth] admin lookup error:', error.message);

  return {
    authorized: databaseMatch || environmentMatch || previewQaMatch,
    databaseMatch,
    environmentMatch,
    previewQaMatch,
    lookupError: error?.message || null
  };
}

async function isGrowthAdmin(userId) {
  return (await growthAdminStatus(userId)).authorized;
}

async function handleGrowthRequest(req, res) {
  if (!adminClient) {
    sendJson(res, 503, { error: 'Growth analytics storage is not configured.' });
    return true;
  }

  if (req.method === 'POST' && req.url === '/api/growth-event') {
    const user = await authenticatedUser(req);
    if (!user) {
      sendJson(res, 401, { error: 'Please sign in.' });
      return true;
    }

    if (internalQa.readSession(req.headers.cookie, user.id)) {
      sendJson(res, 202, { recorded: false, qaMode: true });
      return true;
    }

    try {
      const input = await readJson(req);
      const event = await recordGrowthEvent(adminClient, user.id, input, { source: 'app' });
      sendJson(res, 201, { recorded: true, eventName: event.eventName });
    } catch (error) {
      sendJson(res, 400, { error: error?.message || 'Unable to record event.' });
    }
    return true;
  }

  if (req.method === 'GET' && req.url === GROWTH_ACCESS_PATH) {
    const access = await resolveGrowthAccess(await authenticatedUser(req), growthAdminStatus);
    sendJson(res, access.status, access.body);
    return true;
  }

  if (req.method === 'GET' && req.url === '/api/admin/growth-metrics') {
    const user = await authenticatedUser(req);
    if (!user || !(await isGrowthAdmin(user.id))) {
      sendJson(res, 404, { error: 'Not found.' });
      return true;
    }
    try {
      sendJson(res, 200, { metrics: await getGrowthMetrics(adminClient) });
    } catch (error) {
      console.error('[growth] metrics error:', error);
      sendJson(res, 500, { error: 'Unable to load growth metrics.' });
    }
    return true;
  }

  return false;
}

function injectGrowthTracker(res) {
  const originalEnd = res.end.bind(res);
  res.end = function patchedEnd(chunk, encoding, callback) {
    try {
      const contentType = String(res.getHeader('Content-Type') || '');
      if (contentType.includes('text/html') && chunk) {
        const body = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
        if (!body.includes('/growth-autowire.js')) {
          chunk = body.replace(
            /<\/body>/i,
            '<script src="/growth-autowire.js" defer></script></body>'
          );
        }
      }
    } catch (error) {
      console.error('[growth] HTML injection error:', error);
    }
    return originalEnd(chunk, encoding, callback);
  };
}

const originalCreateServer = http.createServer.bind(http);
http.createServer = function patchedCreateServer(listener) {
  return originalCreateServer(async (req, res) => {
    try {
      if (await handleGrowthRequest(req, res)) return;
    } catch (error) {
      console.error('[growth] request error:', error);
      if (!res.headersSent) return sendJson(res, 500, { error: 'Unexpected analytics error.' });
    }

    injectGrowthTracker(res);
    return listener(req, res);
  });
};

await import('./server.mjs');