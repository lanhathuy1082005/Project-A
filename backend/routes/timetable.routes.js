import express from 'express';
import { requireRoles } from '../middleware/auth.js';
import { handleGetMyTimetable } from '../controllers/TimetableController.js';

const router = express.Router();

router.get('/me', requireRoles('student'), handleGetMyTimetable);

export default router;
