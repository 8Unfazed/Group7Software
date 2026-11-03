import jwt from 'jsonwebtoken';
import { get } from '../config/db.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'campus-service-booking-secret');
    const user = await get(
      `SELECT user_id, full_name, email, role FROM users WHERE user_id = ?`,
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ message: 'User account not found.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(403).json({ message: 'Token is invalid or expired.' });
  }
};

export const requireRole = (requiredRole) => (req, res, next) => {
  if (!req.user || req.user.role !== requiredRole) {
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  }

  return next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access is required.' });
  }

  return next();
};
