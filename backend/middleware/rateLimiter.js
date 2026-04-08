import rateLimit from 'express-rate-limit';

// Brute-force login protection
export const loginLimiter = rateLimit({
  windowMs:        Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:             Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  message:         { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true,           // không đếm login thành công
});

// General API limiter
export const apiLimiter = rateLimit({
  windowMs:        Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max:             Number(process.env.API_RATE_LIMIT_MAX) || 60,
  message:         { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});
