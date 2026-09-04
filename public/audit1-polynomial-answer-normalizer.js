(() => {
  const params = new URLSearchParams(window.location.search);
  const lessonModules = new Set([
    'alg1-a10a-add-subtract-polynomials',
    'alg1-a10b-multiply-polynomials',
    'alg1-a10c-divide-polynomials'
  ]);
  const practiceSkills = new Set(['A.10A','A.10B','A.10C']);
  if (!lessonModules.has(params.get('module')) && !practiceSkills.has(params.get('skill'))) return;

  const superscriptMap = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'};

  function asciiMath(value) {
    let text = String(value ?? '').normalize('NFKC').replace(/[−–—]/g,'-');
    text = text.replace(/([a-zA-Z])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, base, supers) =>
      `${base}^${Array.from(supers, ch => superscriptMap[ch] || ch).join('')}`
    );
    return text.replace(/[×·*]/g,'').replace(/\s+/g,'');
  }

  function parsePolynomial(raw) {
    if (!raw || /[()=<>≤≥]/.test(raw)) return null;
    let text = asciiMath(raw);
    const remainderMatch = text.match(/(?:remainder|rem|r)([+-]?\d+(?:\.\d+)?)$/i);
    const remainder = remainderMatch ? Number(remainderMatch[1]) : null;
    if (remainderMatch) text = text.slice(0, remainderMatch.index);
    if (!text || text.includes('/')) return null;

    const variables = [...new Set((text.match(/[a-zA-Z]/g) || []).map(v => v.toLowerCase()))];
    if (variables.length > 1) return null;
    const variable = variables[0] || 'x';
    text = text.replace(/-/g,'+-');
    if (text.startsWith('+-')) text = text.slice(1);
    const terms = text.split('+').filter(Boolean);
    if (!terms.length) return null;
    const coefficients = new Map();

    for (const term of terms) {
      const match = term.match(/^([+-]?)(\d*(?:\.\d+)?)?([a-zA-Z])?(?:\^(\d+))?$/);
      if (!match) return null;
      const sign = match[1] === '-' ? -1 : 1;
      const hasVariable = Boolean(match[3]);
      if (hasVariable && match[3].toLowerCase() !== variable) return null;
      const coefficientText = match[2] || '';
      const coefficient = sign * (coefficientText === '' ? 1 : Number(coefficientText));
      const exponent = hasVariable ? Number(match[4] || 1) : 0;
      if (!Number.isFinite(coefficient) || !Number.isInteger(exponent)) return null;
      coefficients.set(exponent, (coefficients.get(exponent) || 0) + coefficient);
    }

    return { variable, coefficients, remainder };
  }

  function formatNumber(number) {
    return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(8)));
  }

  function canonicalPolynomial(value) {
    const parsed = parsePolynomial(value);
    if (!parsed) return String(value ?? '');
    const exponents = [...parsed.coefficients.keys()].sort((a,b) => b-a);
    let output = '';
    for (const exponent of exponents) {
      const coefficient = parsed.coefficients.get(exponent);
      if (Math.abs(coefficient) < 1e-10) continue;
      const negative = coefficient < 0;
      const abs = Math.abs(coefficient);
      const sign = output ? (negative ? '-' : '+') : (negative ? '-' : '');
      let term;
      if (exponent === 0) term = formatNumber(abs);
      else {
        const coefficientPart = Math.abs(abs - 1) < 1e-10 ? '' : formatNumber(abs);
        term = `${coefficientPart}${parsed.variable}${exponent === 1 ? '' : `^${exponent}`}`;
      }
      output += sign + term;
    }
    if (!output) output = '0';
    if (parsed.remainder !== null) output += ` remainder ${formatNumber(parsed.remainder)}`;
    return output;
  }

  function normalizeInput(input) {
    if (!input) return;
    const original = input.value;
    const canonical = canonicalPolynomial(original);
    if (canonical !== original) {
      input.value = canonical;
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }

  document.addEventListener('click', event => {
    if (event.target.closest('#submitLessonAnswer')) normalizeInput(document.querySelector('#lessonAnswer'));
    if (event.target.closest('#checkPracticeAnswer')) normalizeInput(document.querySelector('#practiceAnswer'));
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.matches?.('#lessonAnswer, #practiceAnswer')) normalizeInput(event.target);
  }, true);

  window.__toluxCanonicalPolynomial = canonicalPolynomial;
})();