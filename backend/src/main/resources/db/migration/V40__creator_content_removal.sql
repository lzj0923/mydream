CREATE TABLE cms_creator_removal_request (
 id CHAR(36) PRIMARY KEY,
 script_id CHAR(36) NOT NULL,
 submission_id VARCHAR(36) NOT NULL DEFAULT '',
 state VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 reason VARCHAR(1000) NOT NULL,
 review_note VARCHAR(1000) NOT NULL DEFAULT '',
 actor_key VARCHAR(191) NOT NULL,
 reviewer VARCHAR(191) NOT NULL DEFAULT '',
 lock_version INT NOT NULL DEFAULT 0,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_removal_project (script_id,state),
 CONSTRAINT fk_removal_project FOREIGN KEY(script_id) REFERENCES cms_creator_script(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
