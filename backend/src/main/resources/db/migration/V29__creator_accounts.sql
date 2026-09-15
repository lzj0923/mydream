CREATE TABLE cms_creator_account (
  id CHAR(36) NOT NULL PRIMARY KEY,
  username VARCHAR(32) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  app_user_id BIGINT NULL,
  app_username VARCHAR(120) NULL,
  app_token_encrypted TEXT NULL,
  app_token_expires_at TIMESTAMP NULL,
  bound_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_creator_username (username),
  UNIQUE KEY uk_creator_app_user (app_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cms_creator_session (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_creator_session_account (account_id),
  INDEX idx_creator_session_expiry (expires_at),
  CONSTRAINT fk_creator_session_account FOREIGN KEY (account_id) REFERENCES cms_creator_account(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
