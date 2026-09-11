const SUPABASE_URL = 'https://xnadszfvjkyxltskywin.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN';
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const status = document.querySelector('#growthStatus');
const metricsSection = document.querySelector('#growthMetrics');
const cards = document.querySelector('#growthCards');
const businessCards = document.querySelector('#businessCards');
const mrrNote = document.querySelector('#mrrNote');
const funnel = document.querySelector('#growthFunnel');
const trends = document.querySelector('#growthTrends');
const planMix = document.querySelector('#planMix');
const subscriberRows = document.querySelector('#subscriberRows');
const generated = document.querySelector('#growthGenerated');
const rangeButtons = document.querySelector('#growthRangeButtons');
const trendWindowLabel = document.querySelector('#trendWindowLabel');

const formatRate = value => `${((Number(value) || 0) * 100).toFixed(1)}%`;
const formatNumber = value => new Intl.NumberFormat().format(Number(value) || 0);
const formatMoney = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
const formatDate = value => value ? new Date(value).toLocaleDateString() : '—';

function card(label, value, note = '') {
  const el = document.createElement('article');
  el.className = 'growth-card';
  const span = document.createElement('span');
  const strong = document.createElement('strong');
  span.textContent = label;
  strong.textContent = value;
  el.append(span, strong);
  if (note) {
    const small = document.createElement('small');
    small.textContent = note;
    el.append(small);
  }
  return el;
}

function row(label, value) {
  const tr = document.createElement('tr');
  const left = document.createElement('td');
  const right = document.createElement('td');
  left.textContent = label;
  right.textContent = value;
  tr.append(left, right);
  return tr;
}

function subscriberRow(subscriber) {
  const tr = document.createElement('tr');
  for (const value of [
    subscriber.email,
    subscriber.planLabel,
    subscriber.status,
    formatDate(subscriber.registeredAt),
    formatDate(subscriber.lastSignInAt)
  ]) {
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(td);
  }
  return tr;
}

function renderTrend(metrics, rangeKey) {
  const data = metrics.trends?.[rangeKey] || {};
  const labelMap = { days7: 'Last 7 days', days30: 'Last 30 days', days90: 'Last 90 days' };
  trendWindowLabel.textContent = labelMap[rangeKey] || 'Selected period';
  trends.replaceChildren(
    row('New registrations', formatNumber(data.registrations)),
    row('Active learners', formatNumber(data.activeLearners)),
    row('Lesson completions', formatNumber(data.lessonCompletions)),
    row('Diagnostic starts', formatNumber(data.diagnosticStarts)),
    row('Diagnostic completions', formatNumber(data.diagnosticCompletions)),
    row('Upgrade clicks', formatNumber(data.upgradeClicks)),
    row('Checkout starts', formatNumber(data.checkoutStarts)),
    row('Subscription activations', formatNumber(data.subscriptionActivations)),
    row('Subscription cancellations', formatNumber(data.subscriptionCancellations)),
    row('Payment failures', formatNumber(data.paymentFailures))
  );
  for (const button of rangeButtons.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.range === rangeKey);
  }
}

async function load() {
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) {
    status.textContent = 'Sign in to Tolux AI Math Coach first, then reload this page.';
    return;
  }

  const response = await fetch('/api/admin/growth-metrics', {
    headers: { Authorization: `Bearer ${session.access_token}` }
  });

  if (!response.ok) {
    status.textContent = response.status === 404
      ? 'This account is not authorized for the growth dashboard.'
      : 'Growth metrics are temporarily unavailable.';
    return;
  }

  const { metrics } = await response.json();
  const business = metrics.business || {};
  const mix = business.planMix || { student: 0, family: 0, unknown: 0 };

  cards.replaceChildren(
    card('Registered users', formatNumber(metrics.registeredUsers)),
    card('Paid subscribers', formatNumber(metrics.paidSubscribers)),
    card('Registration → paid', formatRate(metrics.registrationToPaidRate)),
    card('Active learners · 7d', formatNumber(metrics.activeLearners7d)),
    card('Active learners · 30d', formatNumber(metrics.activeLearners30d)),
    card('Lesson completions · 30d', formatNumber(metrics.lessonCompletions30d))
  );

  businessCards.replaceChildren(
    card('Known-plan MRR', formatMoney(business.knownPlanMrr), 'Based only on active subscribers whose plan is tracked'),
    card('Student plan', formatNumber(mix.student), '$9.99 / month'),
    card('Family plan', formatNumber(mix.family), '$19.99 / month'),
    card('Unattributed paid', formatNumber(mix.unknown), 'Active subscriber, plan not yet attributable')
  );

  mrrNote.textContent = mix.unknown
    ? `Known-plan MRR is ${formatMoney(business.knownPlanMrr)}. ${formatNumber(mix.unknown)} active paid subscriber(s) are not included because their plan was not captured by the newer growth tracking.`
    : `Known-plan MRR is ${formatMoney(business.knownPlanMrr)} across all currently attributable active subscriptions.`;

  funnel.replaceChildren(
    row('Diagnostic starts', formatNumber(metrics.diagnosticStarts30d)),
    row('Diagnostic completions', formatNumber(metrics.diagnosticCompletions30d)),
    row('Trial starts', formatNumber(metrics.trialStarts30d)),
    row('Trial exhausted', formatNumber(metrics.trialExhausted30d)),
    row('Upgrade clicks', formatNumber(metrics.upgradeClicks30d)),
    row('Checkout starts', formatNumber(metrics.checkoutStarts30d)),
    row('Subscription activations', formatNumber(metrics.subscriptionActivations30d)),
    row('Subscription cancellations', formatNumber(metrics.subscriptionCancellations30d)),
    row('Payment failures', formatNumber(metrics.paymentFailures30d)),
    row('Upgrade → paid', formatRate(metrics.upgradeToPaidRate))
  );

  planMix.replaceChildren(
    row('Student', formatNumber(mix.student)),
    row('Family', formatNumber(mix.family)),
    row('Unattributed', formatNumber(mix.unknown))
  );

  const subscribers = business.subscribers || [];
  subscriberRows.replaceChildren(...(subscribers.length
    ? subscribers.map(subscriberRow)
    : [row('No active subscribers', '—')]));

  renderTrend(metrics, 'days30');
  rangeButtons.addEventListener('click', event => {
    const button = event.target.closest('button[data-range]');
    if (button) renderTrend(metrics, button.dataset.range);
  });

  generated.textContent = `Generated ${new Date(metrics.generatedAt).toLocaleString()}`;
  status.textContent = 'Growth metrics loaded.';
  metricsSection.hidden = false;
}

load().catch(error => {
  console.error(error);
  status.textContent = 'Growth metrics are temporarily unavailable.';
});
