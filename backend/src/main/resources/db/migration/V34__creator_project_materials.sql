CREATE TABLE cms_creator_project_materials (
  project_id CHAR(36) NOT NULL PRIMARY KEY,
  payload_encrypted LONGTEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_project_materials FOREIGN KEY (project_id) REFERENCES cms_creator_script(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
