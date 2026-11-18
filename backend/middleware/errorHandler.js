export const errorHandler = (err, req, res, _next) => {
  // CORS error
  if (err.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ message: err.message });
  }

  // Postgres check/foreign-key violations from bad input are client errors.
  if (err.code === '23514' || err.code === '23503') {
    return res.status(400).json({ message: 'Invalid value for this field' });
  }

  const status  = err.statusCode ?? 500;
  // AppError messages are written for users (e.g. "scan model is unavailable");
  // anything else that fails with a 5xx stays generic.
  const message = status < 500 || err.name === 'AppError' ? err.message : 'Internal server error';

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err);
  }

  return res.status(status).json({ message });
};
