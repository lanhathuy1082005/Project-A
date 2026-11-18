import { AppError } from '../utils/AppError.js';

export const requireRoles = (...allowedRoles) => (req, _res, next) => {
  const user = req.session?.user;
  if (!user)                          throw new AppError('Not logged in', 401);
  if (!allowedRoles.includes(user.role)) throw new AppError('Insufficient permissions', 403);
  next();
};

export const validateLogin = (req, _res, next) => {
  const { id, password } = req.body;
  if (!id || !password)
    throw new AppError('Please enter both username and password', 400);
  next();
};

export const paginate = (req, _res, next) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  req.pagination = { limit, offset: (page - 1) * limit, page };
  next();
};
