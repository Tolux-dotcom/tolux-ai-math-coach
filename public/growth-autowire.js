(() => {
  const EVENT_KEY_PREFIX = 'toluxGrowthEvent:';

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

  async function track(eventName, options = {}) {
    const session = await getSession();
    if (!session?.access_token) return false;
    try {
      const response = await fetch('/api/growth-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          eventName,
          plan: options.plan || null,
          properties: options.properties || {}
        }),
        keepalive: true
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  function trackOnce(eventName, key, options = {}) {
    const storageKey = `${EVENT_KEY_PREFIX}${key}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, '1');
    } catch {}
    void track(eventName, options);
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('button, a');
    if (!target) return;
    const id = target.id;

    if (id === 'freeDiagnosticBtn' || id === 'startReadinessDiagnosticBtn') {
      void track('diagnostic_started', { properties: { surface: id } });
    }
    if (id === 'startTutorLessonBtn') {
      void track('lesson_started', { properties: { surface: 'dashboard' } });
    }
    if (id === 'studentPlanBtn') {
      void track('upgrade_clicked', { plan: 'student', properties: { surface: 'pricing' } });
      void track('checkout_started', { plan: 'student', properties: { surface: 'pricing' } });
    }
    if (id === 'familyPlanBtn') {
      void track('upgrade_clicked', { plan: 'family', properties: { surface: 'pricing' } });
      void track('checkout_started', { plan: 'family', properties: { surface: 'pricing' } });
    }
  }, { capture: true });

  const params = new URLSearchParams(window.location.search);
  if (window.location.pathname.endsWith('/lesson.html')) {
    const start = params.get('start');
    const moduleId = params.get('module') || 'unknown';
    if (start === 'diagnostic') {
      trackOnce('diagnostic_started', `diagnostic:${moduleId}`, { properties: { module: moduleId, surface: 'lesson_page' } });
    } else {
      trackOnce('lesson_started', `lesson:${moduleId}`, { properties: { module: moduleId, surface: 'lesson_page' } });
    }
  }

  if (window.location.pathname.endsWith('/practice.html')) {
    const skill = params.get('skill') || 'unknown';
    trackOnce('lesson_started', `practice:${skill}`, { properties: { skill, surface: 'practice_page' } });
  }

  window.ToluxGrowth = { track };
})();
