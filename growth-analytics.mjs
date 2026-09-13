const ALLOWED_APP_EVENTS = new Set([
  'diagnostic_started',
  'diagnostic_completed',
  'lesson_started',
  'lesson_completed',
  'practice_started',
  'help_requested',
  'explain_another_way',
  'similar_problem_requested',
  'full_solution_requested',
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
const PLAN_MONTHLY_PRICES = { student: 9.99, family: 19.99 };

export function normalizeGrowthEvent(input = {}, { source = 'app' } = {}) {
  const allowed = source === 'stripe' ? ALLOWED_STRIPE_EVENTS : ALLOWED_APP_EVENTS;
  const eventName = String(input.eventName || '').trim();
  if (!allowed.has(eventName)) throw new Error('Unsupported growth event.');

  const plan = input.plan == null ? null : String(input.plan).trim();
  if (plan && !ALLOWED_PLANS.has(plan)) throw new Error('Unsupported Tolux plan.');

  const properties = input.properties && typeof input.properties === 'object' && !Array.isArray(input.properties)
    ? input.properties
    : {};

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

  const since = days => new Date(now.getTime() - days * 86400000).toISOString();
  const since7 = since(7);
  const since30 = since(30);
  const since90 = since(90);

  const [usersResult, usageResult, lessonsResult, eventsResult, adminsResult] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabaseAdmin.from('student_usage').select('user_id,is_subscriber'),
    supabaseAdmin.from('lesson_completions').select('user_id,completed_at,qa_mode').gte('completed_at', since90),
    supabaseAdmin.from('growth_events').select('user_id,event_name,occurred_at,plan').gte('occurred_at', since90),
    supabaseAdmin.from('growth_admins').select('user_id')
  ]);

  if (usersResult.error) throw usersResult.error;
  if (usageResult.error) throw usageResult.error;
  if (lessonsResult.error) throw lessonsResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (adminsResult.error) throw adminsResult.error;

  const internalUserIds = new Set((adminsResult.data || []).map(row => row.user_id).filter(Boolean));
  const isExternalUserId = userId => !userId || !internalUserIds.has(userId);

  const allUsers = usersResult.data?.users || [];
  const users = allUsers.filter(user => !internalUserIds.has(user.id));
  const allUsage = usageResult.data || [];
  const usage = allUsage.filter(row => isExternalUserId(row.user_id));
  const lessons = (lessonsResult.data || []).filter(row => !row.qa_mode && isExternalUserId(row.user_id));
  const events = (eventsResult.data || []).filter(row => isExternalUserId(row.user_id));
  const paidUsage = usage.filter(row => row.is_subscriber);
  const userById = new Map(users.map(user => [user.id, user]));

  const eventsSince = cutoff => events.filter(row => row.occurred_at >= cutoff);
  const lessonsSince = cutoff => lessons.filter(row => row.completed_at >= cutoff);
  const countEvent = (name, cutoff) => eventsSince(cutoff).filter(row => row.event_name === name).length;
  const activeLearners = cutoff => new Set(lessonsSince(cutoff).map(row => row.user_id).filter(Boolean)).size;
  const newRegistrations = cutoff => users.filter(user => user.created_at && user.created_at >= cutoff).length;

  const latestPlanByUser = new Map();
  for (const event of [...events].sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)))) {
    if (event.user_id && ALLOWED_PLANS.has(event.plan)) latestPlanByUser.set(event.user_id, event.plan);
  }

  const subscribers = paidUsage.map(row => {
    const user = userById.get(row.user_id);
    const plan = latestPlanByUser.get(row.user_id) || null;
    return {
      userId: row.user_id,
      email: user?.email || 'Unknown email',
      plan,
      planLabel: plan === 'student' ? 'Student' : plan === 'family' ? 'Family' : 'Unattributed',
      status: 'Active',
      registeredAt: user?.created_at || null,
      lastSignInAt: user?.last_sign_in_at || null
    };
  }).sort((a, b) => String(b.registeredAt || '').localeCompare(String(a.registeredAt || '')));

  const planMix = subscribers.reduce((mix, subscriber) => {
    const key = subscriber.plan || 'unknown';
    mix[key] += 1;
    return mix;
  }, { student: 0, family: 0, unknown: 0 });

  const knownPlanMrr = subscribers.reduce((sum, subscriber) => {
    return sum + (PLAN_MONTHLY_PRICES[subscriber.plan] || 0);
  }, 0);

  const trendFor = cutoff => ({
    registrations: newRegistrations(cutoff),
    activeLearners: activeLearners(cutoff),
    lessonCompletions: lessonsSince(cutoff).length,
    diagnosticStarts: countEvent('diagnostic_started', cutoff),
    diagnosticCompletions: countEvent('diagnostic_completed', cutoff),
    lessonStarts: countEvent('lesson_started', cutoff),
    lessonCompletionEvents: countEvent('lesson_completed', cutoff),
    practiceStarts: countEvent('practice_started', cutoff),
    helpRequests: countEvent('help_requested', cutoff),
    explainAnotherWayRequests: countEvent('explain_another_way', cutoff),
    similarProblemRequests: countEvent('similar_problem_requested', cutoff),
    fullSolutionRequests: countEvent('full_solution_requested', cutoff),
    upgradeClicks: countEvent('upgrade_clicked', cutoff),
    checkoutStarts: countEvent('checkout_started', cutoff),
    subscriptionActivations: countEvent('subscription_activated', cutoff),
    subscriptionCancellations: countEvent('subscription_cancelled', cutoff),
    paymentFailures: countEvent('payment_failed', cutoff)
  });

  const registeredUsers = users.length;
  const paidSubscribers = subscribers.length;
  const upgradeClicks30d = countEvent('upgrade_clicked', since30);
  const activations30d = countEvent('subscription_activated', since30);

  return {
    generatedAt: now.toISOString(),
    internalAccountsExcluded: internalUserIds.size,
    registeredUsers,
    studentUsageRows: usage.length,
    paidSubscribers,
    registrationToPaidRate: registeredUsers ? paidSubscribers / registeredUsers : 0,
    activeLearners7d: activeLearners(since7),
    activeLearners30d: activeLearners(since30),
    lessonCompletions30d: lessonsSince(since30).length,
    diagnosticStarts30d: countEvent('diagnostic_started', since30),
    diagnosticCompletions30d: countEvent('diagnostic_completed', since30),
    lessonStarts30d: countEvent('lesson_started', since30),
    lessonCompletionEvents30d: countEvent('lesson_completed', since30),
    practiceStarts30d: countEvent('practice_started', since30),
    helpRequests30d: countEvent('help_requested', since30),
    explainAnotherWayRequests30d: countEvent('explain_another_way', since30),
    similarProblemRequests30d: countEvent('similar_problem_requested', since30),
    fullSolutionRequests30d: countEvent('full_solution_requested', since30),
    trialStarts30d: countEvent('trial_started', since30),
    trialExhausted30d: countEvent('trial_exhausted', since30),
    upgradeClicks30d,
    checkoutStarts30d: countEvent('checkout_started', since30),
    subscriptionActivations30d: activations30d,
    subscriptionCancellations30d: countEvent('subscription_cancelled', since30),
    paymentFailures30d: countEvent('payment_failed', since30),
    upgradeToPaidRate: upgradeClicks30d ? activations30d / upgradeClicks30d : 0,
    business: {
      knownPlanMrr,
      mrrCurrency: 'USD',
      unattributedPaidSubscribers: planMix.unknown,
      planMix,
      subscribers
    },
    trends: {
      days7: trendFor(since7),
      days30: trendFor(since30),
      days90: trendFor(since90)
    }
  };
}
