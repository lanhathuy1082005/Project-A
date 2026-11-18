// Per-frame scan logging, on when SCAN_DEBUG=true. One line per event so a frame can
// be followed from the app request, to the model call, to the decision.
export const scanDebug = () => process.env.SCAN_DEBUG === 'true';

const fmt = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number' && !Number.isInteger(value)) return value.toFixed(2);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const scanLog = (event, fields = {}) => {
  if (!scanDebug()) return;
  const parts = Object.entries(fields).map(([key, value]) => `${key}=${fmt(value)}`);
  console.log(`[scan ${new Date().toISOString().slice(11, 23)}] ${event} ${parts.join(' ')}`);
};
