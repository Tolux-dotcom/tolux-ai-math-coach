(() => {
  const SUPABASE_URL = 'https://xnadszfvjkyxltskywin.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN';

  const accessNote = document.querySelector('#testPrepAccessNote');
  const resultGate = document.querySelector('#testPrepResultGate');
  const missedReview = document.querySelector('#missedReview');
  const results = document.querySelector('#testResults');

  let signedIn = false;

  async function resolveSession() {
    try {
      if (!window.supabase?.createClient) return null;
      const client = window.__toluxTestPrepSupabase || (window.__toluxTestPrepSupabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      ));
      const { data } = await client.auth.getSession();
      return data?.session || null;
    } catch {
      return null;
    }
  }

  function renderAccessState() {
    if (accessNote) {
      accessNote.innerHTML = signedIn
        ? '<strong>You are signed in.</strong> Your Quick Check result can be used with Tolux remediation and future saved-history features.'
        : '<strong>No sign-in required for Quick Check.</strong> Take all 10 questions and see your score and reporting-category summary immediately.';
    }

    if (!resultGate) return;
    if (signedIn) {
      resultGate.hidden = true;
      if (missedReview) missedReview.hidden = false;
      return;
    }

    if (missedReview) missedReview.hidden = true;
    resultGate.hidden = false;
    resultGate.innerHTML = `
      <div class="panel">
        <span class="eyebrow">Keep your progress</span>
        <h3>Create a free Tolux account for the detailed TEKS review</h3>
        <p>Your Quick Check score and reporting-category summary are free. Sign in or create an account to view missed-question explanations, remediation links, and to support saved Test Prep history as it rolls out.</p>
        <div class="practice-launch-actions">
          <a class="button-link" href="/#authPanel">Sign in or create free account</a>
          <a class="button-link" href="/#practiceModePanel">Open Practice Mode</a>
        </div>
      </div>`;
  }

  const observer = new MutationObserver(() => {
    if (!results?.hidden) renderAccessState();
  });
  if (results) observer.observe(results, { attributes: true, attributeFilter: ['hidden'] });

  resolveSession().then(session => {
    signedIn = Boolean(session?.user);
    renderAccessState();
  });
})();
