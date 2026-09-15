CREATE TABLE cms_external_content_sync (
  source_system VARCHAR(40) NOT NULL,
  source_type VARCHAR(80) NOT NULL,
  source_id VARCHAR(128) NOT NULL,
  content_entry_id BIGINT UNSIGNED NOT NULL,
  source_updated_at DATETIME NULL,
  source_hash CHAR(64) NOT NULL,
  last_synced_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (source_system, source_type, source_id),
  UNIQUE KEY uk_external_content_entry (content_entry_id),
  KEY idx_external_content_synced (source_system, last_synced_at),
  CONSTRAINT fk_external_content_entry FOREIGN KEY (content_entry_id)
    REFERENCES cms_content_entry(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
