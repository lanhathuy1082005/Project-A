import 'dotenv/config';
import express    from 'express';
import cors       from 'cors';
import https      from 'https';
import http       from 'http';
import fs         from 'fs';

import { sessionMiddleware } from './config/session.js';
import { apiLimiter }        from './middleware/rateLimiter.js';
import { errorHandler }      from './middleware/errorHandler.js';
import authRoutes            from './routes/auth.routes.js';
import reservationRoutes     from './routes/reservation.routes.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials:         true,
  methods:             ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:      ['Content-Type', 'Authorization'],
  exposedHeaders:      ['X-Total-Count'],
  optionsSuccessStatus: 200,             
}));

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));  
app.use(sessionMiddleware);
app.use('/api', apiLimiter);               

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/reservations', reservationRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Error handler (phải đặt cuối cùng) ───────────────────────────────────────
app.use(errorHandler);

// ─── Server: HTTPS nếu có cert, HTTP fallback ──────────────────────────────────
const keyPath  = process.env.SSL_KEY_PATH;
const certPath = process.env.SSL_CERT_PATH;

const useHttps = keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath);

if (useHttps) {
  const sslOptions = {
    key:  fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  https.createServer(sslOptions, app).listen(PORT, '0.0.0.0', () => {
    console.log(`  HTTPS server running on port ${PORT}`);
    console.log(`    Allowed origins: ${allowedOrigins.join(', ')}`);
  });
} else {
  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    console.log(`  HTTP server running on port ${PORT}`);
    console.log(`    Tip: add SSL_KEY_PATH / SSL_CERT_PATH to .env for HTTPS`);
    console.log(`    Allowed origins: ${allowedOrigins.join(', ')}`);
  });
}
