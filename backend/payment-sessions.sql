CREATE TABLE IF NOT EXISTS payment_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  reference_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(255) NULL,
  method ENUM('qris', 'dana', 'gopay') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  checkout_url TEXT NULL,
  expires_at DATETIME NULL,
  status ENUM('creating', 'active', 'completed', 'expired', 'canceled', 'unknown') NOT NULL DEFAULT 'creating',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_sessions_reference_id (reference_id),
  UNIQUE KEY uq_payment_sessions_session_id (session_id),
  KEY idx_payment_sessions_booking_id (booking_id),
  CONSTRAINT fk_payment_sessions_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE CASCADE
) ENGINE=InnoDB;
