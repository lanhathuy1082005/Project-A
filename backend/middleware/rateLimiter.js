import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// A whole lab usually shares one public IP, so logged-in requests are limited per
// user; only anonymous requests fall back to the IP.
const userOrIpKey = (req) =>
  req.session?.user?.id ? `user:${req.session.user.id}` : `ip:${ipKeyGenerator(req.ip)}`;

// Brute-force login protection
export const loginLimiter = rateLimit({
  windowMs:        Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:             Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  message:         { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true,           // skip counting successful logins
});

// General API limiter. Scan frames have their own budget below.
export const apiLimiter = rateLimit({
  windowMs:        Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max:             Number(process.env.API_RATE_LIMIT_MAX) || 60,
  keyGenerator:    userOrIpKey,
  skip:            (req) => req.path.startsWith('/reservations/scan-frame/'),
  message:         { message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// The camera loop sends about 1–3 frames per second while a student is scanning.
export const scanFrameLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             Number(process.env.SCAN_FRAME_RATE_LIMIT_MAX) || 240,
  keyGenerator:    userOrIpKey,
  message:         { message: 'Scanning too fast. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders:   false,
});
