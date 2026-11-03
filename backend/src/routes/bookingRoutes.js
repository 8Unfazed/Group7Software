import express from 'express';
import { cancelBooking, createBooking, getBookingById, getMyBookings } from '../controllers/bookingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', authenticateToken, getMyBookings);
router.get('/:id', authenticateToken, getBookingById);
router.post('/', authenticateToken, createBooking);
router.patch('/:id/cancel', authenticateToken, cancelBooking);

export default router;
