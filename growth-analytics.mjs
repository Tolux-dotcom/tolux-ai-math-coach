const ALLOWED_APP_EVENTS = new Set([
  'diagnostic_started',
  'diagnostic_completed',
  'lesson_started',
  'trial_started',
  'trial_exhausted',
  'upgrade_clicked',
  'checkout_started'
]);

const ALLOWED_STRIPE_EVENTS = new Set([
  'subscription_activated',
  'subscription_cancelled',
  'payment_failed'
]);

const ALLOWED_PLANS = new Set(['student', 'family']);

export function normalizeGrowthEvent(input = {}, { source = 'app' } = {}) {
  const allowed = source === 'stripe' ? ALLOWED_STRIPE_EVENTS : ALLOWED_APP_EVENTS;
  const eventName = String(input.eventName || '').trim();
  if (!allowed.has(eventName)) throw new Error('Unsupported growth event.');

  const plan = input.plan == null ? null : String(input.plan).trim();
  if (plan && !ALLOWED_PLANS.has(plan)) throw new Error('Unsupported Tolux plan.');

  const properties = input.properties && typeof input.properties === 'object' && !Array.isArray(input.properties)
    ? input.properties
    : {};

  // Keep event payloads intentionally small and non-sensitive.
  const safeProperties = {};
  for (const [key, value] of Object.entries(properties).slice(0, 12)) {
    if (!/^[a-zA-Z0-9_]{1,40}$/.test(key)) continue;
    if (typeof value === 'string') safeProperties[key] = value.slice(0, 160);
    else if (typeof value === 'number' && Number.isFinite(value)) safeProperties[key] = value;
    else if (typeof value === 'boolean') safeProperties[key] = value;
    else if (value == null) safeProperties[key] = null;
  }

  return { eventName, plan, properties: safeProperties, source };
}

export async function recordGrowthEvent(supabaseAdmin, userId, input, options = {}) {
  if (!supabaseAdmin) throw new Error('Growth analytics storage is not configured.');
  const event = normalizeGrowthEvent(input, options);
  const { error } = await supabaseAdmin.from('growth_events').insert({
    user_id: userId || null,
    event_name: event.eventName,
    event_source: event.source,
    plan: event.plan,
    properties: event.properties
  });
  if (error) throw error;
  return event;
}

export async function getGrowthMetrics(supabaseAdmin, { now = new Date() } = {}) {
  if (!supabaseAdmin) throw new Error('Growth analytics storage is not configured.');
  const since30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const since7 = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [usersResult, usageResult, lessonsResult, eventsResult] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabaseAdmin.from('student_usage').select('user_id,is_subscriber'),
    supabaseAdmin.from('lesson_completions').select('user_id,completed_at,qa_mode').gte('completed_at', since30),
    supabaseAdmin.from('growth_events').select('user_id,event_name,occurred_at').gte('occurred_at', since30)
  ]);

  if (usersResult.error) throw usersResult.error;
  if (usageResult.error) throw usageResult.error;
  if (lessonsResult.error) throw lessonsResult.error;
  if (eventsResult.error) throw eventsResult.error;

  const users = usersResult.data?.users || [];
  const usage = usageResult.data || [];
  const lessons = (lessonsResult.data || []).filter(row => !row.qa_mode);
  const events = eventsResult.data || [];
  const active7 = new Set(
    lessons.filter(row => row.completed_at >= since7).map(row => row.user_id).filter(Boolean)
  );
  const active30 = new Set(lessons.map(row => row.user_id).filter(Boolean));

  const countEvent = name => events.filter(row => row.event_name === name).length;
  const paidSubscribers = usage.filter(row => row.is_subscriber).length;
  const registeredUsers = users.length;
  const upgradeClicks = countEvent('upgrade_clicked');
  const activated = countEvent('subscription_activated');

  return {
    generatedAt: now.toISOString(),
    registeredUsers,
    studentUsageRows: usage.length,
    paidSubscribers,
    registrationToPaidRate: registeredUsers ? paidSubscribers / registeredUsers : 0,
    activeLearners7d: active7.size,
    activeLearners30d: active30.size,
    lessonCompletions30d: lessons.length,
    diagnosticStarts30d: countEvent('diagnostic_started'),
    diagnosticCompletions30d: countEvent('diagnostic_completed'),
    trialStarts30d: countEvent('trial_started'),
    trialExhausted30d: countEvent('trial_exhausted'),
    upgradeClicks30d: upgradeClicks,
    checkoutStarts30d: countEvent('checkout_started'),
    subscriptionActivations30d: activated,
    subscriptionCancellations30d: countEvent('subscription_cancelled'),
    paymentFailures30d: countEvent('payment_failed'),
    upgradeToPaidRate: upgradeClicks ? activated / upgradeClicks : 0
  };
}
