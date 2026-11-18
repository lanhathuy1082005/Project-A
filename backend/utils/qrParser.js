// Unit stickers carry links like https://q.me-qr.com/<token>. The token (8 letters or
// digits, case preserved) identifies one physical unit. Nothing fetches the link.
const QR_HOST = 'q.me-qr.com';
const TOKEN = /^[A-Za-z0-9]{8}$/;

export const isQrToken = (value) => typeof value === 'string' && TOKEN.test(value);

export const parseQrToken = (text) => {
  if (typeof text !== 'string') return null;
  let url;
  try { url = new URL(text.trim()); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.hostname.toLowerCase() !== QR_HOST) return null;
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 1) return null;
  return isQrToken(segments[0]) ? segments[0] : null;
};
