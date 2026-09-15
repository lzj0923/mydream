CREATE TABLE cms_creator_project_settings (
 project_id CHAR(36) PRIMARY KEY,
 area VARCHAR(16) NOT NULL,
 category_id VARCHAR(20) NOT NULL,
 landscape BOOLEAN NOT NULL DEFAULT FALSE,
 unlock_price DECIMAL(8,2) NOT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_creator_project_settings FOREIGN KEY (project_id) REFERENCES cms_creator_script(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
