export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    const user = req.session.user;

    console.log("session user:", user);
    console.log("allowed roles:", allowedRoles);

    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}