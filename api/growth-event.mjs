import { recordGrowthEvent } from '../growth-analytics.mjs';
import { createInternalQaController } from '../internal-qa.mjs';
import {
  adminClient,
  authenticatedUser,
  sendJson
} from './_growth-auth.mjs';

const internalQa = createInternalQaController();

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 64_000) throw new Error('Request too large.');
  }
  return JSON.parse(body || '{}');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    return res.end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  if (!adminClient) {
    return sendJson(res, 503, { error: 'Growth analytics storage is not configured.' });
  }

  const user = await authenticatedUser(req);
  if (!user) {
    return sendJson(res, 401, { error: 'Please sign in.' });
  }

  if (internalQa.readSession(req.headers.cookie, user.id)) {
    return sendJson(res, 202, { recorded: false, qaMode: true });
  }

  try {
    const input = await readBody(req);
    const event = await recordGrowthEvent(adminClient, user.id, input, { source: 'app' });
    return sendJson(res, 201, { recorded: true, eventName: event.eventName });
  } catch (error) {
    return sendJson(res, 400, { error: error?.message || 'Unable to record event.' });
  }
}
