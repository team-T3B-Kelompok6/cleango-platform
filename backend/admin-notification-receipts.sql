CREATE TABLE IF NOT EXISTS admin_notification_receipts (
  admin_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_id, booking_id),
  CONSTRAINT fk_admin_notification_receipts_admin
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_notification_receipts_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);