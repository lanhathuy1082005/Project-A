import {
  loginUserService,
  captureFace,
  consumeTokenForFaceRegistration,
  consumeTokenForAttendanceCheck,
  checkStudentForFaceScan,
} from '../services/AuthService.js';
import { AppError } from '../utils/AppError.js';

export const login = async (req, res, next) => {
  try {
    const { id, password } = req.body;
    const user = await loginUserService(id, password);
    req.session.user = user;
    console.log(`[Login] Success for user=${id}`);
    return res.status(200).json({ message: 'Login successful', user });
  } catch (err) {
    console.error(`[Login] Error:`, err.message);
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
  if (!req.session?.user) return res.status(401).json({ message: 'Not logged in' });
  return res.status(200).json({ user: req.session.user });
};

export const handleFaceCapture = async (req, res, next) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl) throw new AppError('No image provided', 400);
    const token = await captureFace(dataUrl);
    return res.status(200).json({ token });
  } catch (err) { next(err); }
};

// Check if student ID is valid for the requested face scan mode.
// Registration: fails if face already registered.
// Attendance:   fails if no face registered yet.
// Returns the resolved student id so the UI can show a confirmation toast.
export const handleCheckStudentId = async (req, res, next) => {
  try {
    const { id, mode } = req.body;
    if (!id || !mode) throw new AppError('id and mode are required', 400);
    const { id: studentId } = await checkStudentForFaceScan(id, mode);
    return res.status(200).json({ ok: true, studentId });
  } catch (err) { next(err); }
};

export const handleFaceVerification = async (req, res, next) => {
  const { user_id, faceToken, mode } = req.body;

  if (!user_id || !faceToken || !mode) {
    return res.status(400).json({ message: 'user_id, faceToken and mode are required' });
  }

  try {
    if (mode === 'face-registration') {
      await consumeTokenForFaceRegistration(user_id, faceToken);
      return res.status(200).json({ message: 'Face registration successful' });
    }

    if (mode === 'attendance-check') {
      const record = await consumeTokenForAttendanceCheck(user_id, faceToken);
      return res.status(200).json({ message: 'Attendance check-in successful', data: record });
    }

    throw new AppError('Invalid mode', 400);
  } catch (err) { next(err); }
};
