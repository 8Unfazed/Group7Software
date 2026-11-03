import { all, get, run } from '../config/db.js';

const mapSlotAvailability = async (slot) => {
  const bookedCount = await get(
    `SELECT COUNT(*) AS count FROM bookings WHERE slot_id = ? AND status IN ('pending', 'confirmed')`,
    [slot.slot_id]
  );

  return {
    ...slot,
    remaining_capacity: Number(slot.capacity) - Number(bookedCount.count),
  };
};

export const getServices = async (req, res) => {
  const statusFilter = req.user && req.user.role === 'admin' ? '' : ' WHERE s.status = "active"';
  const services = await all(
    `SELECT s.* FROM services s ${statusFilter} ORDER BY s.created_at DESC`
  );

  return res.json({ services });
};

export const getServiceById = async (req, res) => {
  const service = await get('SELECT * FROM services WHERE service_id = ?', [req.params.id]);
  if (!service) {
    return res.status(404).json({ message: 'Service not found.' });
  }

  const slots = await all(
    `SELECT * FROM availability_slots WHERE service_id = ? ORDER BY slot_date, start_time`,
    [req.params.id]
  );

  const enrichedSlots = await Promise.all(slots.map(mapSlotAvailability));
  return res.json({ service, slots: enrichedSlots });
};

export const getServiceSlots = async (req, res) => {
  const serviceId = Number(req.params.serviceId);
  const service = await get('SELECT * FROM services WHERE service_id = ?', [serviceId]);
  if (!service) {
    return res.status(404).json({ message: 'Service not found.' });
  }

  const slots = await all(
    `SELECT * FROM availability_slots WHERE service_id = ? ORDER BY slot_date, start_time`,
    [serviceId]
  );

  const enrichedSlots = await Promise.all(slots.map(mapSlotAvailability));
  return res.json({ service, slots: enrichedSlots });
};

export const createService = async (req, res) => {
  const { serviceName, description, location, openingTime, closingTime, bookingRules } = req.body;

  if (!serviceName || !description || !location || !openingTime || !closingTime) {
    return res.status(400).json({ message: 'Service name, description, location, opening time and closing time are required.' });
  }

  const created = await run(
    `INSERT INTO services (service_name, description, location, opening_time, closing_time, booking_rules, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [serviceName.trim(), description.trim(), location.trim(), openingTime, closingTime, bookingRules ? bookingRules.trim() : '']
  );

  const service = await get('SELECT * FROM services WHERE service_id = ?', [created.id]);
  return res.status(201).json({ message: 'Service created successfully.', service });
};

export const updateService = async (req, res) => {
  const { serviceName, description, location, openingTime, closingTime, bookingRules, status } = req.body;

  const service = await get('SELECT * FROM services WHERE service_id = ?', [req.params.id]);
  if (!service) {
    return res.status(404).json({ message: 'Service not found.' });
  }

  await run(
    `UPDATE services
     SET service_name = ?, description = ?, location = ?, opening_time = ?, closing_time = ?, booking_rules = ?, status = ?
     WHERE service_id = ?`,
    [
      serviceName ? String(serviceName).trim() : service.service_name,
      description ? String(description).trim() : service.description,
      location ? String(location).trim() : service.location,
      openingTime || service.opening_time,
      closingTime || service.closing_time,
      bookingRules !== undefined ? String(bookingRules).trim() : service.booking_rules,
      status || service.status,
      req.params.id,
    ]
  );

  const updated = await get('SELECT * FROM services WHERE service_id = ?', [req.params.id]);
  return res.json({ message: 'Service updated successfully.', service: updated });
};

export const deactivateService = async (req, res) => {
  const service = await get('SELECT * FROM services WHERE service_id = ?', [req.params.id]);
  if (!service) {
    return res.status(404).json({ message: 'Service not found.' });
  }

  await run('UPDATE services SET status = ? WHERE service_id = ?', ['inactive', req.params.id]);
  return res.json({ message: 'Service deactivated successfully.' });
};

export const createAvailability = async (req, res) => {
  const { slotDate, startTime, endTime, capacity } = req.body;
  const serviceId = Number(req.params.id);

  if (!slotDate || !startTime || !endTime || !capacity) {
    return res.status(400).json({ message: 'Slot date, start time, end time and capacity are required.' });
  }

  const service = await get('SELECT * FROM services WHERE service_id = ?', [serviceId]);
  if (!service) {
    return res.status(404).json({ message: 'Service not found.' });
  }

  const slot = await run(
    `INSERT INTO availability_slots (service_id, slot_date, start_time, end_time, capacity)
     VALUES (?, ?, ?, ?, ?)`,
    [serviceId, slotDate, startTime, endTime, Number(capacity)]
  );

  const created = await get('SELECT * FROM availability_slots WHERE slot_id = ?', [slot.id]);
  return res.status(201).json({ message: 'Availability slot created successfully.', slot: created });
};
