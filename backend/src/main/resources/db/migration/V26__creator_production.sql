ALTER TABLE cms_creator_script
  ADD COLUMN production_stage VARCHAR(30) NOT NULL DEFAULT 'PENDING_CONTRACT',
  ADD COLUMN contract_reference VARCHAR(200) NOT NULL DEFAULT '',
  ADD COLUMN production_note VARCHAR(1000) NOT NULL DEFAULT '';

CREATE TABLE cms_creator_delivery (
  script_id CHAR(36) NOT NULL,
  video_id BIGINT NOT NULL,
  video_title VARCHAR(200) NOT NULL,
  linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (script_id,video_id),
  UNIQUE KEY uk_creator_delivery_video (video_id),
  CONSTRAINT fk_creator_delivery_script FOREIGN KEY(script_id) REFERENCES cms_creator_script(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cms_creator_project_event (
  id CHAR(36) NOT NULL PRIMARY KEY,
  script_id CHAR(36) NOT NULL,
  actor_key VARCHAR(191) NOT NULL,
  stage VARCHAR(30) NOT NULL,
  note VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_project_event (script_id,created_at),
  CONSTRAINT fk_creator_event_script FOREIGN KEY(script_id) REFERENCES cms_creator_script(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
