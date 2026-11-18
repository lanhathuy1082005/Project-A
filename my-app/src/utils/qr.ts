// Unit stickers carry links like https://q.me-qr.com/<token>; the token (8 letters or
// digits, case preserved) identifies one physical unit. Mirrors backend/utils/qrParser.js.
const QR_HOST = 'q.me-qr.com';
const TOKEN = /^[A-Za-z0-9]{8}$/;

export function parseQrToken(text: string): string | null {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.hostname.toLowerCase() !== QR_HOST) return null;
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 1) return null;
  return TOKEN.test(segments[0]) ? segments[0] : null;
}
