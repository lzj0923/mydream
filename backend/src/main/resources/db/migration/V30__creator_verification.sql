CREATE TABLE cms_creator_verification (
 id CHAR(36) PRIMARY KEY,
 owner_key VARCHAR(191) NOT NULL,
 creator_type VARCHAR(20) NOT NULL,
 entity_type VARCHAR(20) NOT NULL,
 state VARCHAR(20) NOT NULL,
 payload_encrypted MEDIUMTEXT NOT NULL,
 review_note VARCHAR(1000) NOT NULL DEFAULT '',
 reviewer VARCHAR(191) NULL,
 version INT NOT NULL DEFAULT 1,
 submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 reviewed_at TIMESTAMP NULL,
 UNIQUE KEY uk_verification_owner (owner_key),
 INDEX idx_verification_state (state, submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE cms_creator_verification_event (
 id CHAR(36) PRIMARY KEY,
 verification_id CHAR(36) NOT NULL,
 actor VARCHAR(191) NOT NULL,
 action VARCHAR(20) NOT NULL,
 version INT NOT NULL,
 note VARCHAR(1000) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_verification_event (verification_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
