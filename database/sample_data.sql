USE campus_service_booking;

INSERT INTO users (full_name, email, password, role) VALUES
('Mary Njeri', 'mary@student.ac.ke', '$2a$10$Qw9Nf9K2xwXaizgto0H0oaHsVnKzPiyzZJ4JY7DukRO1d4L/gcP7R2', 'student'),
('Charles Otieno', 'charles@student.ac.ke', '$2a$10$Qw9Nf9K2xwXaizgto0H0oaHsVnKzPiyzZJ4JY7DukRO1d4L/gcP7R2', 'student');

INSERT INTO bookings (user_id, service_id, slot_id, booking_date, status) VALUES
(2, 1, 1, NOW(), 'confirmed'),
(3, 2, 3, NOW(), 'pending');
