CREATE DATABASE IF NOT EXISTS campus_service_booking;
USE campus_service_booking;

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS availability_slots;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
  service_id INT AUTO_INCREMENT PRIMARY KEY,
  service_name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  booking_rules TEXT,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE availability_slots (
  slot_id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NOT NULL,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

CREATE TABLE bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service_id INT NOT NULL,
  slot_id INT NOT NULL,
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_slot (user_id, slot_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(service_id),
  FOREIGN KEY (slot_id) REFERENCES availability_slots(slot_id) ON DELETE CASCADE
);

INSERT INTO users (full_name, email, password, role) VALUES
('Campus Administrator', 'admin@campus.local', '$2a$10$Qw9Nf9K2xwXaizgto0H0oaHsVnKzPiyzZJ4JY7DukRO1d4L/gcP7R2', 'admin');

INSERT INTO services (service_name, description, location, opening_time, closing_time, booking_rules, status) VALUES
('Career Guidance Clinic', 'CV and career counselling support', 'Student Affairs Centre', '09:00:00', '17:00:00', 'Book a 60-minute appointment.', 'active'),
('Health and Wellness Check', 'General health consultation', 'Main Clinic', '08:00:00', '18:00:00', 'Arrive 10 minutes early.', 'active'),
('Sports Equipment Loan', 'Loan equipment for campus sports', 'Sports Complex', '10:00:00', '19:00:00', 'Return all equipment by closing time.', 'active');

INSERT INTO availability_slots (service_id, slot_date, start_time, end_time, capacity) VALUES
(1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', '10:00:00', 4),
(1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:00:00', '12:00:00', 3),
(2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', '11:00:00', 2),
(3, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:00:00', '16:00:00', 5);
