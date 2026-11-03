import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../../data');
const DB_PATH = process.env.DB_PATH || path.join(dataDir, 'campus_service_booking.db');

fs.mkdirSync(dataDir, { recursive: true });

const sqlite = sqlite3.verbose();
export const db = new sqlite.Database(DB_PATH);

export const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function runCallback(err) {
    if (err) return reject(err);
    resolve({ id: this.lastID, changes: this.changes });
  });
});

export const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

export const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

const addSampleServiceSlots = async () => {
  const serviceCount = await get('SELECT COUNT(*) AS count FROM services');
  if (serviceCount.count > 0) return;

  const services = [
    {
      service_name: 'Career Guidance Clinic',
      description: 'Book appointments for CV review, career counselling and internship planning.',
      location: 'Student Affairs Centre',
      opening_time: '09:00',
      closing_time: '17:00',
      booking_rules: 'Appointments are booked in 60-minute slots and must be confirmed by the student.',
    },
    {
      service_name: 'Health and Wellness Check',
      description: 'Consult a campus nurse for general wellness or medical guidance support.',
      location: 'Main Clinic',
      opening_time: '08:00',
      closing_time: '18:00',
      booking_rules: 'Students should arrive 10 minutes prior to the start of their appointment.',
    },
    {
      service_name: 'Sports Equipment Loan',
      description: 'Borrow volleyball, football or gym equipment for campus recreation.',
      location: 'Sports Complex',
      opening_time: '10:00',
      closing_time: '19:00',
      booking_rules: 'Equipment must be returned by the appointment end time.',
    },
  ];

  for (const service of services) {
    const serviceInsert = await run(
      `INSERT INTO services (service_name, description, location, opening_time, closing_time, booking_rules, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [service.service_name, service.description, service.location, service.opening_time, service.closing_time, service.booking_rules]
    );

    const serviceId = serviceInsert.id;
    for (let offset = 1; offset <= 5; offset += 1) {
      const date = new Date(Date.now() + offset * 86400000);
      const shortDate = date.toISOString().slice(0, 10);
      const startTimes = ['09:00', '11:00', '13:00', '15:00'];
      for (const time of startTimes) {
        const endHour = Number(time.slice(0, 2)) + 1;
        const endTime = `${String(endHour).padStart(2, '0')}:00`;
        await run(
          `INSERT INTO availability_slots (service_id, slot_date, start_time, end_time, capacity)
           VALUES (?, ?, ?, ?, ?)`,
          [serviceId, shortDate, time, endTime, 4]
        );
      }
    }
  }
};

export const initializeDatabase = async () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'admin')) DEFAULT 'student',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
      service_id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_name TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT NOT NULL,
      opening_time TEXT NOT NULL,
      closing_time TEXT NOT NULL,
      booking_rules TEXT,
      status TEXT NOT NULL CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS availability_slots (
      slot_id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      slot_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      capacity INTEGER NOT NULL CHECK(capacity > 0),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(service_id) REFERENCES services(service_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      slot_id INTEGER NOT NULL,
      booking_date TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'confirmed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, slot_id),
      FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY(service_id) REFERENCES services(service_id),
      FOREIGN KEY(slot_id) REFERENCES availability_slots(slot_id) ON DELETE CASCADE
    );
  `;

  const statements = schema
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await run(statement);
  }

  const adminExists = await get('SELECT user_id FROM users WHERE email = ?', ['admin@campus.local']);
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('Admin@123', 10);
    await run(
      `INSERT INTO users (full_name, email, password, role)
       VALUES (?, ?, ?, 'admin')`,
      ['Campus Administrator', 'admin@campus.local', passwordHash]
    );
  }

  await addSampleServiceSlots();
  return db;
};

export default db;
