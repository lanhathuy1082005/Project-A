const QR_HOST = 'q.me-qr.com';

const parseQrToken = (text) => {
  let url;
  try { url = new URL(String(text).trim()); } catch { return null; }
  if (url.hostname.toLowerCase() !== QR_HOST) return null;
  const last = url.pathname.split('/').filter(Boolean).pop();
  return /^[A-Za-z0-9]{8}$/.test(last ?? '') ? last : null;
};