-- CleanGo database schema
-- Target: MySQL 8.0+ / MariaDB 10.5+
-- Sources: PRD_CleanGo.md and UTS Express + Next.js requirements

CREATE DATABASE IF NOT EXISTS cleango
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cleango;

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(30) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  INDEX idx_users_role_active (role, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS addresses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(80) NOT NULL,
  recipient_name VARCHAR(120) NOT NULL,
  recipient_phone VARCHAR(30) NOT NULL,
  street_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Malang',
  province VARCHAR(100) NOT NULL DEFAULT 'Jawa Timur',
  postal_code VARCHAR(15) NULL,
  landmark VARCHAR(255) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addresses_user (user_id),
  INDEX idx_addresses_coordinates (latitude, longitude)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  icon_url VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_categories_name (name),
  INDEX idx_service_categories_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  description TEXT NULL,
  price DECIMAL(12,2) NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_services_category
    FOREIGN KEY (category_id) REFERENCES service_categories(id),
  CONSTRAINT chk_services_price CHECK (price >= 0),
  CONSTRAINT chk_services_duration CHECK (duration_minutes > 0),
  UNIQUE KEY uq_services_slug (slug),
  UNIQUE KEY uq_services_category_name (category_id, name),
  INDEX idx_services_category_active (category_id, is_active),
  INDEX idx_services_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service_inclusions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(255) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_service_inclusions_service
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE KEY uq_service_inclusions (service_id, description),
  INDEX idx_service_inclusions_order (service_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cleaners (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  photo_url VARCHAR(500) NULL,
  status ENUM('available', 'busy', 'offline') NOT NULL DEFAULT 'offline',
  average_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_cleaners_rating CHECK (average_rating BETWEEN 0 AND 5),
  UNIQUE KEY uq_cleaners_phone (phone),
  INDEX idx_cleaners_status_active (status, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  discount_type ENUM('percentage', 'fixed') NOT NULL,
  discount_value DECIMAL(12,2) NOT NULL,
  maximum_discount DECIMAL(12,2) NULL,
  minimum_order DECIMAL(12,2) NOT NULL DEFAULT 0,
  quota INT UNSIGNED NULL,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_promos_value CHECK (discount_value > 0),
  CONSTRAINT chk_promos_period CHECK (ends_at > starts_at),
  CONSTRAINT chk_promos_quota CHECK (quota IS NULL OR used_count <= quota),
  UNIQUE KEY uq_promos_code (code),
  INDEX idx_promos_active_period (is_active, starts_at, ends_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(32) NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  address_id BIGINT UNSIGNED NOT NULL,
  promo_id BIGINT UNSIGNED NULL,
  scheduled_date DATE NOT NULL,
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME NULL,
  customer_notes TEXT NULL,
  service_price DECIMAL(12,2) NOT NULL,
  platform_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  status ENUM(
    'awaiting_payment',
    'confirmed',
    'assigned',
    'departed',
    'en_route',
    'in_progress',
    'completed',
    'cancelled',
    'rescheduled'
  ) NOT NULL DEFAULT 'awaiting_payment',
  cancellation_reason VARCHAR(255) NULL,
  completed_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_customer
    FOREIGN KEY (customer_id) REFERENCES users(id),
  CONSTRAINT fk_bookings_service
    FOREIGN KEY (service_id) REFERENCES services(id),
  CONSTRAINT fk_bookings_address
    FOREIGN KEY (address_id) REFERENCES addresses(id),
  CONSTRAINT fk_bookings_promo
    FOREIGN KEY (promo_id) REFERENCES promos(id) ON DELETE SET NULL,
  CONSTRAINT chk_bookings_amounts CHECK (
    service_price >= 0 AND platform_fee >= 0 AND discount_amount >= 0
    AND total_amount = service_price + platform_fee - discount_amount
  ),
  UNIQUE KEY uq_bookings_code (booking_code),
  INDEX idx_bookings_customer_status (customer_id, status),
  INDEX idx_bookings_schedule (scheduled_date, scheduled_start_time),
  INDEX idx_bookings_service (service_id),
  INDEX idx_bookings_status_created (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cleaner_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  cleaner_id BIGINT UNSIGNED NOT NULL,
  assigned_by BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  link_token_hash CHAR(64) NOT NULL,
  link_expires_at DATETIME NOT NULL,
  link_status ENUM('active', 'expired', 'revoked', 'completed') NOT NULL DEFAULT 'active',
  location_sharing_started_at DATETIME NULL,
  location_sharing_ended_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_assignments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_cleaner
    FOREIGN KEY (cleaner_id) REFERENCES cleaners(id),
  CONSTRAINT fk_assignments_admin
    FOREIGN KEY (assigned_by) REFERENCES users(id),
  CONSTRAINT chk_assignments_expiry CHECK (link_expires_at > assigned_at),
  UNIQUE KEY uq_assignments_booking (booking_id),
  UNIQUE KEY uq_assignments_token_hash (link_token_hash),
  INDEX idx_assignments_cleaner (cleaner_id, assigned_at),
  INDEX idx_assignments_link_status (link_status, link_expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cleaner_schedules (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cleaner_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  schedule_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cleaner_schedules_cleaner
    FOREIGN KEY (cleaner_id) REFERENCES cleaners(id),
  CONSTRAINT fk_cleaner_schedules_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT chk_cleaner_schedules_time CHECK (end_time > start_time),
  UNIQUE KEY uq_cleaner_schedules_booking (booking_id),
  INDEX idx_cleaner_schedules_slot (cleaner_id, schedule_date, start_time, end_time)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_status_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  status ENUM(
    'awaiting_payment',
    'confirmed',
    'assigned',
    'departed',
    'en_route',
    'in_progress',
    'completed',
    'cancelled',
    'rescheduled'
  ) NOT NULL,
  actor_type ENUM('system', 'customer', 'admin', 'cleaner') NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_cleaner_id BIGINT UNSIGNED NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_history_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_history_user
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_history_cleaner
    FOREIGN KEY (actor_cleaner_id) REFERENCES cleaners(id) ON DELETE SET NULL,
  INDEX idx_booking_history_timeline (booking_id, created_at),
  INDEX idx_booking_history_status (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cleaner_locations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT UNSIGNED NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy_meters DECIMAL(8,2) NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cleaner_locations_assignment
    FOREIGN KEY (assignment_id) REFERENCES cleaner_assignments(id) ON DELETE CASCADE,
  INDEX idx_cleaner_locations_timeline (assignment_id, recorded_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  method ENUM('dana', 'gopay', 'qris', 'cash') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('pending', 'paid', 'failed', 'expired', 'refunded') NOT NULL DEFAULT 'pending',
  gateway_reference VARCHAR(150) NULL,
  paid_at DATETIME NULL,
  failed_reason VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT chk_payments_amount CHECK (amount >= 0),
  UNIQUE KEY uq_payments_booking (booking_id),
  UNIQUE KEY uq_payments_gateway_reference (gateway_reference),
  INDEX idx_payments_status_created (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promo_usages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  promo_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  discount_amount DECIMAL(12,2) NOT NULL,
  used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_promo_usages_promo
    FOREIGN KEY (promo_id) REFERENCES promos(id),
  CONSTRAINT fk_promo_usages_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_promo_usages_user
    FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT chk_promo_usages_amount CHECK (discount_amount >= 0),
  UNIQUE KEY uq_promo_usages_booking (booking_id),
  INDEX idx_promo_usages_user (user_id, used_at),
  INDEX idx_promo_usages_promo (promo_id, used_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  service_id BIGINT UNSIGNED NOT NULL,
  cleaner_id BIGINT UNSIGNED NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_reviews_customer
    FOREIGN KEY (customer_id) REFERENCES users(id),
  CONSTRAINT fk_reviews_service
    FOREIGN KEY (service_id) REFERENCES services(id),
  CONSTRAINT fk_reviews_cleaner
    FOREIGN KEY (cleaner_id) REFERENCES cleaners(id) ON DELETE SET NULL,
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  UNIQUE KEY uq_reviews_booking (booking_id),
  INDEX idx_reviews_service (service_id, created_at),
  INDEX idx_reviews_cleaner (cleaner_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS review_photos (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  review_id BIGINT UNSIGNED NOT NULL,
  photo_url VARCHAR(500) NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_review_photos_review
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  INDEX idx_review_photos_order (review_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  recipient_user_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NULL,
  type ENUM('order', 'payment', 'promo', 'risk_alert', 'system') NOT NULL,
  channel ENUM('in_app', 'push', 'whatsapp') NOT NULL DEFAULT 'in_app',
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  delivery_status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at DATETIME NULL,
  read_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_recipient
    FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_notifications_inbox (recipient_user_id, is_read, created_at),
  INDEX idx_notifications_delivery (delivery_status, created_at),
  INDEX idx_notifications_booking (booking_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_risk_alerts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  booking_id BIGINT UNSIGNED NOT NULL,
  risk_type ENUM('late_departure', 'late_arrival', 'location_inactive', 'no_show') NOT NULL,
  severity ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  message VARCHAR(255) NOT NULL,
  status ENUM('open', 'acknowledged', 'resolved') NOT NULL DEFAULT 'open',
  detected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_by BIGINT UNSIGNED NULL,
  acknowledged_at DATETIME NULL,
  resolved_at DATETIME NULL,
  CONSTRAINT fk_risk_alerts_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_risk_alerts_admin
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_risk_alerts_status (status, severity, detected_at),
  INDEX idx_risk_alerts_booking (booking_id, detected_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS faqs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(100) NULL,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_faqs_question (question),
  INDEX idx_faqs_active_order (is_active, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NULL,
  session_token CHAR(36) NOT NULL,
  topic VARCHAR(100) NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  CONSTRAINT fk_chatbot_conversations_customer
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_chatbot_conversations_session (session_token),
  INDEX idx_chatbot_conversations_customer (customer_id, started_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender ENUM('customer', 'bot') NOT NULL,
  message TEXT NOT NULL,
  faq_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chatbot_messages_conversation
    FOREIGN KEY (conversation_id) REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_chatbot_messages_faq
    FOREIGN KEY (faq_id) REFERENCES faqs(id) ON DELETE SET NULL,
  INDEX idx_chatbot_messages_timeline (conversation_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT UNSIGNED NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_audit_logs_admin
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_admin_audit_logs_admin (admin_id, created_at),
  INDEX idx_admin_audit_logs_entity (entity_type, entity_id, created_at)
) ENGINE=InnoDB;

-- Initial master data. These inserts are safe to run more than once.
-- Dummy admin for local development: admin@cleango.id / 321321
-- The password is stored as a bcrypt hash, never as plain text.
INSERT INTO users (name, email, password_hash, role, is_active) VALUES
  ('CleanGo Admin', 'admin@cleango.id',
   '$2b$12$Q9y1zdGchHC.UCIv4vLF3.U/HNDQph43Zdnttu8YXeYb19z0e3Wgm',
   'admin', TRUE)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  is_active = VALUES(is_active);

INSERT INTO service_categories (name, description, is_active) VALUES
  ('Rumah', 'Layanan kebersihan rumah', TRUE),
  ('Kamar dan Kos', 'Layanan kebersihan kamar atau tempat kos', TRUE),
  ('Kantor', 'Layanan kebersihan kantor', TRUE),
  ('Sofa dan Kasur', 'Pembersihan sofa dan kasur', TRUE),
  ('AC', 'Pembersihan dan perawatan AC', TRUE)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  is_active = VALUES(is_active);

INSERT INTO services (
  category_id, name, slug, description, price, duration_minutes, is_active
)
SELECT id, 'Basic Home Cleaning', 'basic-home-cleaning',
       'Pembersihan rutin untuk area rumah', 100000.00, 120, TRUE
FROM service_categories
WHERE name = 'Rumah'
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  price = VALUES(price),
  duration_minutes = VALUES(duration_minutes),
  is_active = VALUES(is_active);

INSERT INTO services (
  category_id, name, slug, description, price, duration_minutes, is_active
)
SELECT id, 'Kost Room Cleaning', 'kost-room-cleaning',
       'Pembersihan menyeluruh untuk kamar kos', 75000.00, 90, TRUE
FROM service_categories
WHERE name = 'Kamar dan Kos'
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  price = VALUES(price),
  duration_minutes = VALUES(duration_minutes),
  is_active = VALUES(is_active);

INSERT INTO services (
  category_id, name, slug, description, price, duration_minutes, is_active
)
SELECT id, 'Office Cleaning', 'office-cleaning',
       'Pembersihan rutin untuk ruang kantor', 250000.00, 180, TRUE
FROM service_categories
WHERE name = 'Kantor'
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  price = VALUES(price),
  duration_minutes = VALUES(duration_minutes),
  is_active = VALUES(is_active);

INSERT INTO services (
  category_id, name, slug, description, price, duration_minutes, is_active
)
SELECT id, 'Sofa Cleaning', 'sofa-cleaning',
       'Pembersihan sofa untuk membantu mengangkat debu dan noda', 150000.00, 120, TRUE
FROM service_categories
WHERE name = 'Sofa dan Kasur'
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  price = VALUES(price),
  duration_minutes = VALUES(duration_minutes),
  is_active = VALUES(is_active);

INSERT INTO service_inclusions (service_id, description, sort_order)
SELECT id, 'Menyapu dan mengepel lantai', 1
FROM services
WHERE slug = 'basic-home-cleaning'
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

INSERT INTO service_inclusions (service_id, description, sort_order)
SELECT id, 'Membersihkan debu pada permukaan furnitur', 2
FROM services
WHERE slug = 'basic-home-cleaning'
ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order);

INSERT INTO faqs (category, question, answer, sort_order, is_active) VALUES
  ('Pemesanan', 'Bagaimana cara memesan layanan CleanGo?',
   'Pilih layanan, tentukan jadwal dan alamat, lalu selesaikan checkout.', 1, TRUE),
  ('Pesanan', 'Bagaimana cara melihat status pesanan?',
   'Buka menu Pesanan untuk melihat tahapan status dan estimasi kedatangan cleaner.', 2, TRUE),
  ('Pembayaran', 'Metode pembayaran apa yang tersedia?',
   'CleanGo mendukung DANA, GoPay, QRIS, dan pembayaran tunai.', 3, TRUE)
ON DUPLICATE KEY UPDATE
  answer = VALUES(answer),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active);
