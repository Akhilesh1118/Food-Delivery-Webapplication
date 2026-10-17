import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret_food_del_key";

// Base Authentication Middleware
const authMiddleware = async (req, res, next) => {
  let token = req.headers.token || req.headers['x-access-token'] || req.query.token;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(" ");
    if (parts.length === 2 && (parts[0] === "Bearer" || parts[0] === "token")) {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please log in."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role || "customer"
    };
    if (!req.body) req.body = {};
    req.body.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session. Please log in again."
    });
  }
};

// RBAC: Requires Staff or Admin role
export const requireStaffOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  if (req.user.role === "staff" || req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden: Staff or Administrator role required"
  });
};

// RBAC: Requires Admin role strictly
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  if (req.user.role === "admin") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Forbidden: Administrator role required"
  });
};

export default authMiddleware;