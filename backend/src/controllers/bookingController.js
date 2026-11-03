import { all, get, run } from '../config/db.js';

export const getMyBookings = async (req, res) => {
  const bookings = await all(
    `SELECT b.*, s.service_name, s.location, a.slot_date, a.start_time, a.end_time
     FROM bookings b
     JOIN services s ON s.service_id = b.service_id
     JOIN availability_slots a ON a.slot_id = b.slot_id
     WHERE b.user_id = ?
     ORDER BY b.created_at DESC`,
    [req.user.user_id]
  );

  return res.json({ bookings });
};

export const getBookingById = async (req, res) => {
  const booking = await get(
    `SELECT b.*, s.service_name, s.location, a.slot_date, a.start_time, a.end_time, u.full_name AS student_name
     FROM bookings b
     JOIN services s ON s.service_id = b.service_id
     JOIN availability_slots a ON a.slot_id = b.slot_id
     JOIN users u ON u.user_id = b.user_id
     WHERE b.booking_id = ?`,
    [req.params.id]
  );

  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  if (req.user.role !== 'admin' && booking.user_id !== req.user.user_id) {
    return res.status(403).json({ message: 'You can only view your own bookings.' });
  }

  return res.json({ booking });
};

export const createBooking = async (req, res) => {
  const { serviceId, slotId } = req.body;

  if (!serviceId || !slotId) {
    return res.status(400).json({ message: 'Service and slot selection are required.' });
  }

  const service = await get('SELECT * FROM services WHERE service_id = ?', [serviceId]);
  if (!service || service.status !== 'active') {
    return res.status(400).json({ message: 'This service is not available for booking.' });
  }

  const slot = await get('SELECT * FROM availability_slots WHERE slot_id = ? AND service_id = ?', [slotId, serviceId]);
  if (!slot) {
    return res.status(404).json({ message: 'Selected slot does not exist for this service.' });
  }

  const existing = await get(
    `SELECT booking_id FROM bookings WHERE user_id = ? AND slot_id = ? AND status != 'cancelled'`,
    [req.user.user_id, slotId]
  );
  if (existing) {
    return res.status(409).json({ message: 'You have already booked this slot.' });
  }

  const bookedCount = await get(
    `SELECT COUNT(*) AS count FROM bookings WHERE slot_id = ? AND status IN ('pending', 'confirmed')`,
    [slotId]
  );
  const remaining = Number(slot.capacity) - Number(bookedCount.count);

  if (remaining <= 0) {
    return res.status(409).json({ message: 'This slot is full. Please select another time.' });
  }

  const booking = await run(
    `INSERT INTO bookings (user_id, service_id, slot_id, booking_date, status)
     VALUES (?, ?, ?, ?, 'confirmed')`,
    [req.user.user_id, serviceId, slotId, new Date().toISOString().slice(0, 10)]
  );

  const createdBooking = await get(
    `SELECT b.*, s.service_name, a.slot_date, a.start_time, a.end_time
     FROM bookings b
     JOIN services s ON s.service_id = b.service_id
     JOIN availability_slots a ON a.slot_id = b.slot_id
     WHERE b.booking_id = ?`,
    [booking.id]
  );

  return res.status(201).json({ message: 'Booking created successfully.', booking: createdBooking });
};

export const cancelBooking = async (req, res) => {
  const booking = await get('SELECT * FROM bookings WHERE booking_id = ?', [req.params.id]);
  if (!booking) {
    return res.status(404).json({ message: 'Booking not found.' });
  }

  if (req.user.role !== 'admin' && booking.user_id !== req.user.user_id) {
    return res.status(403).json({ message: 'You may only cancel your own bookings.' });
  }

  if (booking.status === 'cancelled') {
    return res.status(409).json({ message: 'This booking is already cancelled.' });
  }

  await run('UPDATE bookings SET status = ? WHERE booking_id = ?', ['cancelled', req.params.id]);
  return res.json({ message: 'Booking cancelled successfully.' });
};
