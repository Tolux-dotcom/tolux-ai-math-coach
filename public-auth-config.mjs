export const DEFAULT_AUTH_CONFIG = Object.freeze({
  url: 'https://xnadszfvjkyxltskywin.supabase.co',
  publishableKey: 'sb_publishable_fDz2NjorGqEX4FVRPcrlIA_-xdX0KpN'
});

export function resolvePublicAuthConfig(env = {}) {
  const configuredUrl = env.SUPABASE_AUTH_URL;
  const configuredKey = env.SUPABASE_PUBLISHABLE_KEY;
  if (!configuredUrl && !configuredKey) return DEFAULT_AUTH_CONFIG;
  if (!configuredUrl || !configuredKey) throw new Error('Public authentication configuration requires both URL and publishable key.');
  let url;
  try { url = new URL(configuredUrl); } catch { throw new Error('Invalid public authentication URL.'); }
  if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Invalid public authentication URL.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(configuredKey)) throw new Error('Public authentication requires a publishable key.');
  return Object.freeze({url: url.origin, publishableKey: configuredKey});
}

export function publicAuthConfigScript(config) {
  const safe = { url: config.url, publishableKey: config.publishableKey };
  return `window.TOLUX_PUBLIC_CONFIG = Object.freeze(${JSON.stringify(safe)});`;
}
