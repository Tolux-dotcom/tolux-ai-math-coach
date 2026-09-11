const SUPABASE_URL = 'https://xnadszfvjkyxltskywin.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN';
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const status = document.querySelector('#growthStatus');
const metricsSection = document.querySelector('#growthMetrics');
const cards = document.querySelector('#growthCards');
const funnel = document.querySelector('#growthFunnel');
const generated = document.querySelector('#growthGenerated');
const formatRate = value => `${((Number(value) || 0) * 100).toFixed(1)}%`;
const formatNumber = value => new Intl.NumberFormat().format(Number(value) || 0);
function card(label, value) { const el = document.createElement('article'); el.className = 'growth-card'; el.innerHTML = `<span>${label}</span><strong>${value}</strong>`; return el; }
function row(label, value) { const tr = document.createElement('tr'); const left = document.createElement('td'); const right = document.createElement('td'); left.textContent = label; right.textContent = value; tr.append(left, right); return tr; }
async function load() {
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) { status.textContent = 'Sign in to Tolux AI Math Coach first, then reload this page.'; return; }
  const response = await fetch('/api/admin/growth-metrics', { headers: { Authorization: `Bearer ${session.access_token}` } });
  if (!response.ok) { status.textContent = response.status === 404 ? 'This account is not authorized for the growth dashboard.' : 'Growth metrics are temporarily unavailable.'; return; }
  const { metrics } = await response.json();
  cards.replaceChildren(
    card('Registered users', formatNumber(metrics.registeredUsers)),
    card('Paid subscribers', formatNumber(metrics.paidSubscribers)),
    card('Registration → paid', formatRate(metrics.registrationToPaidRate)),
    card('Active learners · 7d', formatNumber(metrics.activeLearners7d)),
    card('Active learners · 30d', formatNumber(metrics.activeLearners30d)),
    card('Lesson completions · 30d', formatNumber(metrics.lessonCompletions30d))
  );
  funnel.replaceChildren(
    row('Diagnostic starts', formatNumber(metrics.diagnosticStarts30d)), row('Diagnostic completions', formatNumber(metrics.diagnosticCompletions30d)),
    row('Trial starts', formatNumber(metrics.trialStarts30d)), row('Trial exhausted', formatNumber(metrics.trialExhausted30d)),
    row('Upgrade clicks', formatNumber(metrics.upgradeClicks30d)), row('Checkout starts', formatNumber(metrics.checkoutStarts30d)),
    row('Subscription activations', formatNumber(metrics.subscriptionActivations30d)), row('Subscription cancellations', formatNumber(metrics.subscriptionCancellations30d)),
    row('Payment failures', formatNumber(metrics.paymentFailures30d)), row('Upgrade → paid', formatRate(metrics.upgradeToPaidRate))
  );
  generated.textContent = `Generated ${new Date(metrics.generatedAt).toLocaleString()}`;
  status.textContent = 'Growth metrics loaded.'; metricsSection.hidden = false;
}
load().catch(error => { console.error(error); status.textContent = 'Growth metrics are temporarily unavailable.'; });
