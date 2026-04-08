import session from 'express-session';

export const sessionMiddleware = session({
  secret:            process.env.SESSION_SECRET || 'fallback_secret',
  resave:            false,
  saveUninitialized: false,               // false: không lưu session rỗng
  cookie: {
    secure:   process.env.NODE_ENV === 'production' || process.env.SSL_KEY_PATH ? true : false,
    httpOnly: true,                       // JS không đọc được cookie
    sameSite: 'lax',
    maxAge:   8 * 60 * 60 * 1000,        // 8 giờ
  },
});
