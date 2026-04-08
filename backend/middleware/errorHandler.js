export const errorHandler = (err, req, res, _next) => {
  // CORS error
  if (err.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ message: err.message });
  }

  const status  = err.statusCode ?? 500;
  const message = status < 500 ? err.message : 'Internal server error';

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err);
  }

  return res.status(status).json({ message });
};
