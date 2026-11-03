import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { get, run } from '../config/db.js';

const generateToken = (user) => jwt.sign(
  { userId: user.user_id, email: user.email, role: user.role },
  process.env.JWT_SECRET || 'campus-service-booking-secret',
  { expiresIn: '8h' }
);

export const register = async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Full name, email and password are required.' });
  }

  const cleanedEmail = String(email).trim().toLowerCase();
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  const existing = await get('SELECT user_id FROM users WHERE email = ?', [cleanedEmail]);
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await run(
    `INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'student')`,
    [String(fullName).trim(), cleanedEmail, passwordHash]
  );

  const createdUser = await get(
    `SELECT user_id, full_name, email, role, created_at FROM users WHERE user_id = ?`,
    [user.id]
  );

  return res.status(201).json({
    message: 'Registration successful.',
    token: generateToken(createdUser),
    user: createdUser,
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const cleanedEmail = String(email).trim().toLowerCase();
  const user = await get(
    `SELECT user_id, full_name, email, password, role FROM users WHERE email = ?`,
    [cleanedEmail]
  );

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const safeUser = {
    user_id: user.user_id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
  };

  return res.json({
    message: 'Login successful.',
    token: generateToken(safeUser),
    user: safeUser,
  });
};

export const getCurrentUser = async (req, res) => {
  return res.json({ user: req.user });
};

export const logout = async (req, res) => {
  return res.json({ message: 'Logged out successfully.' });
};
