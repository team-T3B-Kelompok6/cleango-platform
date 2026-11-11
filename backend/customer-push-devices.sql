CREATE TABLE IF NOT EXISTS customer_push_devices (
  token_hash BINARY(32) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(4096) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_customer_push_devices_user_id (user_id),
  CONSTRAINT fk_customer_push_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
