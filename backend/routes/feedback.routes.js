import express from 'express';
import { requireRoles } from '../middleware/auth.js';
import { handleSubmitFeedback } from '../controllers/FeedbackController.js';

const router = express.Router();

router.post('/', requireRoles('student'), handleSubmitFeedback);

export default router;
