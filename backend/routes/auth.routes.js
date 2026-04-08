import express              from 'express';
import { login, logout, getMe, handleFaceCapture } from '../controllers/AuthController.js';
import { validateLogin }    from '../middleware/auth.js';
import { loginLimiter }     from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login',  loginLimiter, validateLogin, login);
router.post('/logout', logout);
router.get('/me',      getMe);
router.post('/face/capture', handleFaceCapture);

export default router;
