(() => {
  const EVENT_KEY_PREFIX = 'toluxGrowthEvent:';
  const nativeFetch = window.fetch.bind(window);

  async function getSession() {
    try {
      const client = window.supabase?.createClient
        ? window.__toluxGrowthSupabase || (window.__toluxGrowthSupabase = window.supabase.createClient(
            'https://xnadszfvjkyxltskywin.supabase.co',
            'sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN'
          ))
        : null;
      if (!client) return null;
      const { data } = await client.auth.getSession();
      return data?.session || null;
    } catch {
      return null;
    }
  }

  async function addAdminNavigation() {
    if (window.location.pathname !== '/' && !window.location.pathname.endsWith('/index.html')) return;
    const nav = document.querySelector('.sidebar nav');
    if (!nav || nav.querySelector('[data-growth-admin-link]')) return;
    const session = await getSession();
    if (!session?.access_token) return;
    try {
      const response = await nativeFetch('/api/admin/growth-auth-debug', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.adminStatus?.authorized) return;
      const link = document.createElement('a');
      link.href = '/growth-dashboard.html';
      link.className = 'nav';
      link.dataset.growthAdminLink = 'true';
      link.textContent = '📈 Growth Dashboard';
      link.style.textDecoration = 'none';
      nav.append(link);
    } catch {}
  }

  async function track(eventName, options = {}) {
    const session = await getSession();
    if (!session?.access_token) return false;
    try {
      const response = await nativeFetch('/api/growth-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ eventName, plan: options.plan || null, properties: options.properties || {} }),
        keepalive: true
      });
      return response.ok;
    } catch { return false; }
  }

  function trackOnce(eventName, key, options = {}) {
    const storageKey = `${EVENT_KEY_PREFIX}${key}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, '1');
    } catch {}
    void track(eventName, options);
  }

  function currentLearningContext() {
    const params = new URLSearchParams(window.location.search);
    return {
      module: params.get('module') || null,
      skill: params.get('skill') || null,
      start: params.get('start') || null
    };
  }

  function learningProperties(surface) {
    const context = currentLearningContext();
    const properties = { surface };
    if (context.module) properties.module = context.module;
    if (context.skill) properties.skill = context.skill;
    if (context.start) properties.start = context.start;
    return properties;
  }

  window.fetch = async function growthAwareFetch(input, init = {}) {
    const response = await nativeFetch(input, init);
    const url = typeof input === 'string' ? input : input?.url || '';
    const method = String(init?.method || 'GET').toUpperCase();
    if (method === 'POST' && url.includes('/api/create-checkout-session') && response.ok) {
      try {
        const body = JSON.parse(init.body || '{}');
        const plan = body.plan === 'family' ? 'family' : 'student';
        void track('checkout_started', { plan, properties: { surface: 'stripe_session_created' } });
      } catch {}
    }
    if (method === 'POST' && url.includes('/api/lesson-progress') && response.ok) {
      const params = new URLSearchParams(window.location.search);
      const moduleId = params.get('module') || 'unknown';
      if (params.get('start') === 'diagnostic') {
        trackOnce('diagnostic_completed', `diagnostic-complete:${moduleId}`, { properties: { module: moduleId, surface: 'lesson_progress_saved' } });
      } else {
        trackOnce('lesson_completed', `lesson-complete:${moduleId}`, { properties: { module: moduleId, surface: 'lesson_progress_saved' } });
      }
    }
    if (method === 'POST' && url.includes('/api/coach')) {
      try {
        const payload = await response.clone().json();
        if (response.ok && payload?.isSubscriber === false) trackOnce('trial_started', 'coach-trial-started', { properties: { surface: 'coach' } });
        if (response.status === 403 && payload?.limitReached) trackOnce('trial_exhausted', 'coach-trial-exhausted', { properties: { surface: 'coach' } });
      } catch {}
    }
    return response;
  };

  document.addEventListener('click', event => {
    const target = event.target.closest('button, a');
    if (!target) return;
    const id = target.id;
    if (id === 'freeDiagnosticBtn' || id === 'startReadinessDiagnosticBtn') void track('diagnostic_started', { properties: { surface: id } });
    if (id === 'startTutorLessonBtn') void track('lesson_started', { properties: { surface: 'dashboard' } });
    if (id === 'lessonStuckBtn') void track('help_requested', { properties: learningProperties('lesson_stuck_button') });
    if (id === 'lessonExplainBtn') void track('explain_another_way', { properties: learningProperties('lesson_explain_button') });
    if (id === 'lessonSimilarBtn') void track('similar_problem_requested', { properties: learningProperties('lesson_similar_button') });
    if (target.classList?.contains('tolux-show-solution')) void track('full_solution_requested', { properties: learningProperties('show_full_solution') });
    if (id === 'studentPlanBtn') void track('upgrade_clicked', { plan: 'student', properties: { surface: 'pricing' } });
    if (id === 'familyPlanBtn') void track('upgrade_clicked', { plan: 'family', properties: { surface: 'pricing' } });
  }, { capture: true });

  const params = new URLSearchParams(window.location.search);
  if (window.location.pathname.endsWith('/lesson.html')) {
    const start = params.get('start');
    const moduleId = params.get('module') || 'unknown';
    if (start === 'diagnostic') trackOnce('diagnostic_started', `diagnostic:${moduleId}`, { properties: { module: moduleId, surface: 'lesson_page' } });
    else trackOnce('lesson_started', `lesson:${moduleId}`, { properties: { module: moduleId, surface: 'lesson_page' } });
  }
  if (window.location.pathname.endsWith('/practice.html')) {
    const skill = params.get('skill') || 'unknown';
    trackOnce('practice_started', `practice:${skill}`, { properties: { skill, surface: 'practice_page' } });
  }

  window.addEventListener('load', () => { void addAdminNavigation(); });
  window.ToluxGrowth = { track };
})();
