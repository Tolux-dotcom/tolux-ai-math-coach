(async () => {
  const modeWrap = document.querySelector('#testPrepModes');
  const categoryWrap = document.querySelector('#blueprintCategories');

  try {
    const response = await fetch('/staar-algebra1-blueprint.json');
    if (!response.ok) throw new Error(`Blueprint load failed: ${response.status}`);
    const blueprint = await response.json();

    modeWrap.replaceChildren(...blueprint.tolux_modes.map(mode => {
      const card = document.createElement('article');
      card.className = 'pricing-card';
      const points = mode.points ? ` • ${mode.points} points` : '';
      card.innerHTML = `
        <h3>${mode.label}</h3>
        <h2>${mode.questions} <small>questions${points}</small></h2>
        <p>${mode.description}</p>
        <button type="button" data-test-prep-mode="${mode.id}">Build This Session</button>
      `;
      return card;
    }));

    categoryWrap.replaceChildren(...blueprint.reporting_categories.map(category => {
      const card = document.createElement('article');
      card.className = 'pricing-card';
      card.innerHTML = `
        <small>Reporting Category ${category.id}</small>
        <h3>${category.name}</h3>
        <p><strong>${category.question_range[0]}–${category.question_range[1]}</strong> questions</p>
        <p><strong>${category.point_range[0]}–${category.point_range[1]}</strong> points</p>
      `;
      return card;
    }));

    document.addEventListener('click', event => {
      const button = event.target.closest('[data-test-prep-mode]');
      if (!button) return;
      const mode = blueprint.tolux_modes.find(item => item.id === button.dataset.testPrepMode);
      if (!mode) return;
      window.alert(`${mode.label} blueprint is ready. The next build step will assemble original TEKS-aligned STAAR-style questions into this session.`);
    });
  } catch (error) {
    console.error(error);
    if (modeWrap) modeWrap.textContent = 'Test Prep blueprint could not be loaded.';
  }
})();
