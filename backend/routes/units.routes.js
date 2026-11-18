import express from 'express';
import { requireRoles } from '../middleware/auth.js';
import { handleResolveUnit } from '../controllers/ReservationController.js';

const router = express.Router();

// Raw scanned QR text in, { item_unit_id, is_kit, ... } out.
router.post('/resolve', requireRoles('student', 'admin'), handleResolveUnit);

export default router;
