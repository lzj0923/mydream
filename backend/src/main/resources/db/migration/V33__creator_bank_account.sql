CREATE TABLE cms_creator_bank_account (
  account_id CHAR(36) NOT NULL PRIMARY KEY,
  payload_encrypted TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_creator_bank_owner FOREIGN KEY (account_id) REFERENCES cms_creator_account(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
