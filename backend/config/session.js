import session from 'express-session';
import fs from 'fs';

const keyPath = process.env.SSL_KEY_PATH;
const certPath = process.env.SSL_CERT_PATH;
const useHttps = keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath);

export const sessionMiddleware = session({
  secret:            process.env.SESSION_SECRET || 'fallback_secret',
  resave:            false,
  saveUninitialized: false,               
  cookie: {
    secure:   process.env.NODE_ENV === 'production' || Boolean(useHttps),
    httpOnly: true,                       
    sameSite: 'lax',
    maxAge:   8 * 60 * 60 * 1000,        // 8 hours
  },
});
