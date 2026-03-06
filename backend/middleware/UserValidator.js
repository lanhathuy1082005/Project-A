export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    const user = req.session.user;

    if (!user) {
      return res.status(401);
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403);
    }

    next();
  };
}