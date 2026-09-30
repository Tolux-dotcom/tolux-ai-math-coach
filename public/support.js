export function buildSupportEmail({ topic, accountEmail, message }) {
  const subject = `Math Coach support: ${String(topic).slice(0, 100)}`;
  const body = `Request: ${topic}\nAccount email: ${accountEmail || 'Not supplied'}\n\n${message}`;
  return `mailto:info@tolux.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
if (typeof document !== 'undefined') {
  document.getElementById('supportForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const url = buildSupportEmail({ topic: data.get('topic'), accountEmail: data.get('accountEmail'), message: data.get('message') });
    document.getElementById('supportStatus').textContent = 'Opening your email app. Send the draft there to contact Tolux. If it does not open, email info@tolux.org directly.';
    window.location.href = url;
  });
}
