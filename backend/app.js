import express    from 'express';
import cors       from 'cors';

import { sessionMiddleware } from './config/session.js';
import { apiLimiter }        from './middleware/rateLimiter.js';
import { errorHandler }      from './middleware/errorHandler.js';
import authRoutes            from './routes/auth.routes.js';
import reservationRoutes     from './routes/reservation.routes.js';
import unitRoutes            from './routes/units.routes.js';
import timetableRoutes       from './routes/timetable.routes.js';
import feedbackRoutes        from './routes/feedback.routes.js';
import adminRoutes           from './routes/admin.routes.js';

const app  = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
export const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:8081')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials:         true,
  methods:             ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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
app.use('/api/units',        unitRoutes);
app.use('/api/timetable',    timetableRoutes);
app.use('/api/feedback',     feedbackRoutes);
app.use('/api/admin',        adminRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Error handler (must be placed last) ───────────────────────────────────────
app.use(errorHandler);

export default app;
