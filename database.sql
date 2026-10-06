CREATE DATABASE IF NOT EXISTS cleango
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cleango;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS addresses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(80) NOT NULL,
  recipient_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(15) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addresses_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NULL,
  icon VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_categories_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  price DECIMAL(12,2) NOT NULL,
  duration_minutes INT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_services_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT chk_services_price CHECK (price >= 0),
  CONSTRAINT chk_services_duration CHECK (duration_minutes > 0),
  UNIQUE KEY uq_services_category_name (category_id, name),
  INDEX idx_services_active_category (is_active, category_id),
  INDEX idx_services_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_inclusions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_service_inclusions_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  INDEX idx_service_inclusions_service (service_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cleaners (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  photo_url VARCHAR(500) NULL,
  status ENUM('available', 'busy', 'offline') NOT NULL DEFAULT 'offline',
  average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_cleaners_rating CHECK (average_rating >= 0 AND average_rating <= 5),
  INDEX idx_cleaners_availability (is_active, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(32) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  cleaner_id BIGINT UNSIGNED NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  address_id BIGINT UNSIGNED NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  notes TEXT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  additional_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL,
  status ENUM(
    'pending', 'confirmed', 'cleaner_assigned', 'on_the_way',
    'arrived', 'cleaning', 'completed', 'cancelled'
  ) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES users(id),
  CONSTRAINT fk_bookings_cleaner FOREIGN KEY (cleaner_id) REFERENCES cleaners(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_service FOREIGN KEY (service_id) REFERENCES services(id),
  CONSTRAINT fk_bookings_address FOREIGN KEY (address_id) REFERENCES addresses(id),
  CONSTRAINT chk_bookings_amounts CHECK (
    subtotal >= 0 AND additional_fee >= 0 AND discount_amount >= 0
    AND total_price = subtotal + additional_fee - discount_amount
  ),
  INDEX idx_bookings_customer_status (customer_id, status),
  INDEX idx_bookings_cleaner_status (cleaner_id, status),
  INDEX idx_bookings_schedule (booking_date, booking_time),
  INDEX idx_bookings_service (service_id),
  INDEX idx_bookings_address (address_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  status ENUM(
    'pending', 'confirmed', 'cleaner_assigned', 'on_the_way',
    'arrived', 'cleaning', 'completed', 'cancelled'
  ) NOT NULL,
  description VARCHAR(255) NULL,
  changed_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_history_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_booking_history_booking (booking_id, created_at),
  INDEX idx_booking_history_changed_by (changed_by)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cleaner_schedules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cleaner_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL UNIQUE,
  schedule_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cleaner_schedules_cleaner FOREIGN KEY (cleaner_id) REFERENCES cleaners(id),
  CONSTRAINT fk_cleaner_schedules_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT chk_cleaner_schedule_time CHECK (end_time > start_time),
  INDEX idx_cleaner_schedules_slot (cleaner_id, schedule_date, start_time, end_time)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL UNIQUE,
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  transaction_reference VARCHAR(150) NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT chk_payments_amount CHECK (amount >= 0),
  INDEX idx_payments_status (payment_status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  cleaner_id BIGINT UNSIGNED NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES users(id),
  CONSTRAINT fk_reviews_cleaner FOREIGN KEY (cleaner_id) REFERENCES cleaners(id) ON DELETE SET NULL,
  CONSTRAINT fk_reviews_service FOREIGN KEY (service_id) REFERENCES services(id),
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  INDEX idx_reviews_customer (customer_id),
  INDEX idx_reviews_cleaner (cleaner_id),
  INDEX idx_reviews_service (service_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, is_read, created_at),
  INDEX idx_notifications_booking (booking_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS support_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_support_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_support_customer FOREIGN KEY (customer_id) REFERENCES users(id),
  INDEX idx_support_customer (customer_id, created_at),
  INDEX idx_support_status (status, created_at)
) ENGINE=InnoDB;

INSERT INTO categories (name, description, icon, is_active) VALUES
  ('Rumah', 'Layanan kebersihan rumah', 'home', TRUE),
  ('Kantor', 'Layanan kebersihan kantor', 'building', TRUE),
  ('Kost', 'Layanan kebersihan kamar kost', 'bed', TRUE),
  ('Deep Clean', 'Pembersihan mendalam dan menyeluruh', 'sparkles', TRUE),
  ('AC', 'Pembersihan dan perawatan AC', 'snowflake', TRUE)
ON DUPLICATE KEY UPDATE description = VALUES(description), icon = VALUES(icon);

INSERT INTO services (category_id, name, description, price, duration_minutes, image_url, is_active)
SELECT id, 'Basic Home Cleaning', 'Pembersihan rutin area rumah', 100000, 120, NULL, TRUE
FROM categories WHERE name = 'Rumah'
ON DUPLICATE KEY UPDATE description = VALUES(description), price = VALUES(price), duration_minutes = VALUES(duration_minutes);

INSERT INTO services (category_id, name, description, price, duration_minutes, image_url, is_active)
SELECT id, 'Office Cleaning', 'Pembersihan rutin ruang kantor', 250000, 180, NULL, TRUE
FROM categories WHERE name = 'Kantor'
ON DUPLICATE KEY UPDATE description = VALUES(description), price = VALUES(price), duration_minutes = VALUES(duration_minutes);

INSERT INTO services (category_id, name, description, price, duration_minutes, image_url, is_active)
SELECT id, 'Deep Cleaning', 'Pembersihan mendalam untuk seluruh ruangan', 350000, 300, NULL, TRUE
FROM categories WHERE name = 'Deep Clean'
ON DUPLICATE KEY UPDATE description = VALUES(description), price = VALUES(price), duration_minutes = VALUES(duration_minutes);

INSERT INTO service_inclusions (service_id, description, sort_order)
SELECT s.id, 'Menyapu dan mengepel lantai', 1
FROM services s
WHERE s.name = 'Basic Home Cleaning'
  AND NOT EXISTS (
    SELECT 1 FROM service_inclusions i
    WHERE i.service_id = s.id AND i.description = 'Menyapu dan mengepel lantai'
  );
