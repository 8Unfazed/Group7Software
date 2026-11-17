import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { all, get, run } from '../config/db.js';

const generateToken = (user) => jwt.sign(
  { userId: user.user_id, email: user.email, role: user.role },
  process.env.JWT_SECRET || 'campus-service-booking-secret',
  { expiresIn: '8h' }
);

const generateResetToken = () => crypto.randomBytes(32).toString('hex');

export const register = async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Full name, email and password are required.' });
  }

  const cleanFullName = String(fullName).trim();
  const cleanedEmail = String(email).trim().toLowerCase();
  if (cleanFullName.length < 2) {
    return res.status(400).json({ message: 'Please provide a valid full name.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

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
    [cleanFullName, cleanedEmail, passwordHash]
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

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'An email address is required.' });
  }

  const cleanedEmail = String(email).trim().toLowerCase();
  const user = await get('SELECT user_id, email FROM users WHERE email = ?', [cleanedEmail]);

  if (!user) {
    return res.json({
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  }

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await run(
    `INSERT INTO password_reset_tokens (token, user_id, expires_at)
     VALUES (?, ?, ?)`,
    [token, user.user_id, expiresAt]
  );

  return res.json({
    message: 'If an account exists for that email, a password reset link has been sent.',
    resetToken: token,
  });
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Reset token and new password are required.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }

  const resetRequest = await get(
    `SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > ?`,
    [token, new Date().toISOString()]
  );

  if (!resetRequest) {
    return res.status(400).json({ message: 'The reset link is invalid or has expired.' });
  }

  const user = await get('SELECT user_id FROM users WHERE user_id = ?', [resetRequest.user_id]);
  if (!user) {
    return res.status(404).json({ message: 'User account no longer exists.' });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  await run('UPDATE users SET password = ? WHERE user_id = ?', [passwordHash, user.user_id]);
  await run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.user_id]);

  return res.json({ message: 'Password reset successfully. You can log in with your new password.' });
};

export const getCurrentUser = async (req, res) => {
  return res.json({ user: req.user });
};

export const logout = async (req, res) => {
  return res.json({ message: 'Logged out successfully.' });
};
