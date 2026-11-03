import express from 'express';
import { getAdminDashboard, getAllBookings, updateBookingStatus } from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', authenticateToken, requireAdmin, getAdminDashboard);
router.get('/bookings', authenticateToken, requireAdmin, getAllBookings);
router.patch('/bookings/:id/status', authenticateToken, requireAdmin, updateBookingStatus);

export default router;
