import { all, get, run } from '../config/db.js';

export const getAdminDashboard = async (req, res) => {
  const stats = await Promise.all([
    get('SELECT COUNT(*) AS count FROM users'),
    get('SELECT COUNT(*) AS count FROM services WHERE status = "active"'),
    get('SELECT COUNT(*) AS count FROM bookings'),
    get('SELECT COUNT(*) AS count FROM bookings WHERE status = "pending"'),
    get('SELECT COUNT(*) AS count FROM bookings WHERE status = "confirmed"'),
    get('SELECT COUNT(*) AS count FROM bookings WHERE status = "cancelled"'),
  ]);

  return res.json({
    summary: {
      totalUsers: Number(stats[0].count),
      activeServices: Number(stats[1].count),
      totalBookings: Number(stats[2].count),
      pendingBookings: Number(stats[3].count),
      confirmedBookings: Number(stats[4].count),
      cancelledBookings: Number(stats[5].count),
    },
  });
};

export const getAllBookings = async (req, res) => {
  const bookings = await all(
    `SELECT b.*, s.service_name, u.full_name, a.slot_date, a.start_time, a.end_time
     FROM bookings b
     JOIN users u ON u.user_id = b.user_id
     JOIN services s ON s.service_id = b.service_id
     JOIN availability_slots a ON a.slot_id = b.slot_id
     ORDER BY b.created_at DESC`
  );

  return res.json({ bookings });
};

export const updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'cancelled'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'A valid booking status is required.' });
  }

  const booking = await get('SELECT * FROM bookings WHERE booking_id = ?', [req.params.id]);
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  await run('UPDATE bookings SET status = ? WHERE booking_id = ?', [status, req.params.id]);
  return res.json({ message: 'Booking status updated successfully.' });
};
