import { loginUserService, captureFace, consumeTokenForFaceRegistration, consumeTokenForAttendanceCheck } from '../services/AuthService.js';
import { AppError }         from '../utils/AppError.js';

export const login = async (req, res, next) => {
  try {
    const { id, password, faceToken, mode } = req.body;
    console.log(`[Login] id=${id}, faceToken=${faceToken ? 'present' : 'none'}, mode=${mode}`)
    const user = await loginUserService(id, password);
    // If face token is provided, attempt to consume it (link face image to user)
    let msg = 'Login successful'
    if (faceToken && mode === 'face-registration') {
      console.log(`[Login] Entering face-registration flow`)
      await consumeTokenForFaceRegistration(user.id, faceToken);
      msg = 'Face registration successful'
    } else if (faceToken && mode === 'attendance-check') {
      console.log(`[Login] Entering attendance-check flow`)
      await consumeTokenForAttendanceCheck(user.id, faceToken);
      msg = 'Attendance check-in successful'
    } else {
      console.log(`[Login] Normal login (no face flow). faceToken=${faceToken}, mode=${mode}`)
    }

    // Proceed with normal login flow
    req.session.user = user;
    console.log(`[Login] Success: ${msg}`)
    return res.status(200).json({ message: msg, user });
  } catch (err) { 
    console.error(`[Login] Error:`, err.message)
    next(err); 
  }
};

export const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(new AppError('Cannot logout', 500));
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logout successful' });
  });
};

export const getMe = (req, res) => {
  console.log("Session data:", req.session?.user);
  if (!req.session?.user)
    return res.status(401).json({ message: 'Not logged in' });
  return res.status(200).json({ user: req.session.user });
};

export const handleFaceCapture = async (req, res, next) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl) throw new AppError('No image provided', 400);

    const token = await captureFace(dataUrl);
    return res.status(200).json({ token });
  } catch (err) { next(err); }
}