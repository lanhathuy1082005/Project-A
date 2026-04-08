import { loginUserService, captureFace, consumeToken } from '../services/AuthService.js';
import { AppError }         from '../utils/AppError.js';

export const login = async (req, res, next) => {
  try {
    const { id, password, faceToken } = req.body;
    // If face token is provided, attempt to consume it (link face image to user)
    if (faceToken) {
      await consumeToken(id, faceToken);
    }

    // Proceed with normal login flow
    const user = await loginUserService(id, password);
    req.session.user = user;
    return res.status(200).json({ message: 'Login successful', user });
  } catch (err) { next(err); }
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
    const { dataURL } = req.body;
    if (!dataURL) throw new AppError('No image provided', 400);

    const token = await captureFace(dataURL);
    return res.status(200).json({ token });
  } catch (err) { next(err); }
}