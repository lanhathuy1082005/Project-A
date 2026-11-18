import express from 'express';
import { requireRoles, paginate } from '../middleware/auth.js';
import {
  handleBorrow,
  handleReturn,
  handleGetMyReservations,
  handleGetAllReservations,
  handleVerifyKitFrame,
  handleVerifySingleFrame,
  handleGetAvailableKits,
} from '../controllers/ReservationController.js';

const router = express.Router();

// ── Student ───────────────────────────────────────────────────────────────────
router.post('/',                  requireRoles('student'),         handleBorrow);
router.post('/scan-frame/kit',    requireRoles('student'),         handleVerifyKitFrame);
router.post('/scan-frame/single', requireRoles('student'),         handleVerifySingleFrame);
router.get('/kits',               requireRoles('student'),         handleGetAvailableKits);
router.get('/me',                 requireRoles('student'), paginate, handleGetMyReservations);
router.patch('/:id/return',       requireRoles('student'),         handleReturn);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/',                   requireRoles('admin'),  paginate, handleGetAllReservations);

export default router;
