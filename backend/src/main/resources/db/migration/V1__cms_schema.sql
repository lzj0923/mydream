CREATE TABLE cms_site (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_key VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  primary_host VARCHAR(255) NOT NULL,
  default_locale VARCHAR(20) NOT NULL,
  active_release_id BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_site_public_id (public_id),
  UNIQUE KEY uk_site_key (site_key),
  UNIQUE KEY uk_site_host (primary_host)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_site_locale (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  locale VARCHAR(20) NOT NULL,
  display_name VARCHAR(80) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uk_site_locale (site_id, locale),
  CONSTRAINT fk_site_locale_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_admin_user (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  failed_login_count INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME(6) NULL,
  last_login_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admin_user_public_id (public_id),
  UNIQUE KEY uk_admin_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_role (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_key VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_role_key (role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_permission (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  permission_key VARCHAR(100) NOT NULL,
  name VARCHAR(160) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_permission_key (permission_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_user_role (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id, site_id),
  CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES cms_admin_user(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES cms_role(id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_role_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_role_permission (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permission_role FOREIGN KEY (role_id) REFERENCES cms_role(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permission_permission FOREIGN KEY (permission_id) REFERENCES cms_permission(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_media_asset (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  asset_type VARCHAR(24) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(700) NOT NULL,
  mime_type VARCHAR(160) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  duration_ms BIGINT UNSIGNED NULL,
  alt_text VARCHAR(500) NULL,
  caption VARCHAR(1000) NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'READY',
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_media_public_id (public_id),
  UNIQUE KEY uk_media_storage_key (storage_key),
  KEY idx_media_duplicate (site_id, checksum_sha256, size_bytes),
  KEY idx_media_type_status (site_id, asset_type, status),
  CONSTRAINT fk_media_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT,
  CONSTRAINT fk_media_creator FOREIGN KEY (created_by) REFERENCES cms_admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_media_variant (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  media_asset_id BIGINT UNSIGNED NOT NULL,
  variant_key VARCHAR(80) NOT NULL,
  storage_key VARCHAR(700) NOT NULL,
  mime_type VARCHAR(160) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_media_variant (media_asset_id, variant_key),
  UNIQUE KEY uk_media_variant_storage (storage_key),
  CONSTRAINT fk_media_variant_asset FOREIGN KEY (media_asset_id) REFERENCES cms_media_asset(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_site_config_version (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  config_json JSON NOT NULL,
  change_note VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_site_config_public_id (public_id),
  UNIQUE KEY uk_site_config_version (site_id, version_no),
  CONSTRAINT fk_site_config_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT,
  CONSTRAINT fk_site_config_creator FOREIGN KEY (created_by) REFERENCES cms_admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_theme (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  theme_key VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_theme_public_id (public_id),
  UNIQUE KEY uk_theme_key (site_id, theme_key),
  CONSTRAINT fk_theme_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_theme_version (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  theme_id BIGINT UNSIGNED NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  tokens_json JSON NOT NULL,
  change_note VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_theme_version_public_id (public_id),
  UNIQUE KEY uk_theme_version (theme_id, version_no),
  CONSTRAINT fk_theme_version_theme FOREIGN KEY (theme_id) REFERENCES cms_theme(id) ON DELETE RESTRICT,
  CONSTRAINT fk_theme_version_creator FOREIGN KEY (created_by) REFERENCES cms_admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_font_family (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  fallback_stack VARCHAR(500) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uk_font_family_public_id (public_id),
  UNIQUE KEY uk_font_family_name (site_id, name),
  CONSTRAINT fk_font_family_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_font_face (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  font_family_id BIGINT UNSIGNED NOT NULL,
  media_asset_id BIGINT UNSIGNED NOT NULL,
  weight SMALLINT UNSIGNED NOT NULL DEFAULT 400,
  style VARCHAR(20) NOT NULL DEFAULT 'normal',
  format VARCHAR(20) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_font_face (font_family_id, weight, style),
  CONSTRAINT fk_font_face_family FOREIGN KEY (font_family_id) REFERENCES cms_font_family(id) ON DELETE CASCADE,
  CONSTRAINT fk_font_face_media FOREIGN KEY (media_asset_id) REFERENCES cms_media_asset(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_navigation (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  nav_key VARCHAR(80) NOT NULL,
  name VARCHAR(160) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_navigation_public_id (public_id),
  UNIQUE KEY uk_navigation_key (site_id, nav_key),
  CONSTRAINT fk_navigation_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_navigation_version (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  navigation_id BIGINT UNSIGNED NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  change_note VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_navigation_version_public_id (public_id),
  UNIQUE KEY uk_navigation_version (navigation_id, version_no),
  CONSTRAINT fk_navigation_version_navigation FOREIGN KEY (navigation_id) REFERENCES cms_navigation(id) ON DELETE RESTRICT,
  CONSTRAINT fk_navigation_version_creator FOREIGN KEY (created_by) REFERENCES cms_admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_navigation_item (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  navigation_version_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  label VARCHAR(160) NOT NULL,
  link_type VARCHAR(24) NOT NULL,
  link_value VARCHAR(1000) NOT NULL,
  target VARCHAR(20) NOT NULL DEFAULT '_self',
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uk_navigation_item_public_id (public_id),
  KEY idx_navigation_item_order (navigation_version_id, parent_id, sort_order),
  CONSTRAINT fk_navigation_item_version FOREIGN KEY (navigation_version_id) REFERENCES cms_navigation_version(id) ON DELETE CASCADE,
  CONSTRAINT fk_navigation_item_parent FOREIGN KEY (parent_id) REFERENCES cms_navigation_item(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_page (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  locale VARCHAR(20) NOT NULL,
  path VARCHAR(500) NOT NULL,
  page_key VARCHAR(120) NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_page_public_id (public_id),
  UNIQUE KEY uk_page_path (site_id, locale, path),
  UNIQUE KEY uk_page_key (site_id, locale, page_key),
  CONSTRAINT fk_page_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_page_version (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  page_id BIGINT UNSIGNED NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  seo_json JSON NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  change_note VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_page_version_public_id (public_id),
  UNIQUE KEY uk_page_version (page_id, version_no),
  CONSTRAINT fk_page_version_page FOREIGN KEY (page_id) REFERENCES cms_page(id) ON DELETE RESTRICT,
  CONSTRAINT fk_page_version_creator FOREIGN KEY (created_by) REFERENCES cms_admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_block_definition (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type_key VARCHAR(100) NOT NULL,
  schema_version INT UNSIGNED NOT NULL,
  display_name VARCHAR(160) NOT NULL,
  props_schema_json JSON NOT NULL,
  style_schema_json JSON NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uk_block_definition (type_key, schema_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_page_block (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  page_version_id BIGINT UNSIGNED NOT NULL,
  block_definition_id BIGINT UNSIGNED NOT NULL,
  parent_block_id BIGINT UNSIGNED NULL,
  zone_key VARCHAR(80) NOT NULL DEFAULT 'main',
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  props_json JSON NOT NULL,
  style_json JSON NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_page_block_public_id (public_id),
  KEY idx_page_block_order (page_version_id, zone_key, parent_block_id, sort_order),
  CONSTRAINT fk_page_block_version FOREIGN KEY (page_version_id) REFERENCES cms_page_version(id) ON DELETE CASCADE,
  CONSTRAINT fk_page_block_definition FOREIGN KEY (block_definition_id) REFERENCES cms_block_definition(id) ON DELETE RESTRICT,
  CONSTRAINT fk_page_block_parent FOREIGN KEY (parent_block_id) REFERENCES cms_page_block(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_content_entry (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  locale VARCHAR(20) NOT NULL,
  content_type VARCHAR(80) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_content_entry_public_id (public_id),
  UNIQUE KEY uk_content_entry_slug (site_id, locale, content_type, slug),
  KEY idx_content_entry_type (site_id, locale, content_type, archived),
  CONSTRAINT fk_content_entry_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_content_version (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  content_entry_id BIGINT UNSIGNED NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  title VARCHAR(240) NOT NULL,
  summary VARCHAR(1200) NULL,
  cover_media_id BIGINT UNSIGNED NULL,
  data_json JSON NOT NULL,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_weight INT NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  change_note VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_content_version_public_id (public_id),
  UNIQUE KEY uk_content_version (content_entry_id, version_no),
  KEY idx_content_version_listing (featured, sort_weight, version_no),
  CONSTRAINT fk_content_version_entry FOREIGN KEY (content_entry_id) REFERENCES cms_content_entry(id) ON DELETE RESTRICT,
  CONSTRAINT fk_content_version_cover FOREIGN KEY (cover_media_id) REFERENCES cms_media_asset(id) ON DELETE RESTRICT,
  CONSTRAINT fk_content_version_creator FOREIGN KEY (created_by) REFERENCES cms_admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_content_relation (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_version_id BIGINT UNSIGNED NOT NULL,
  relation_type VARCHAR(80) NOT NULL,
  target_entry_id BIGINT UNSIGNED NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_content_relation (source_version_id, relation_type, target_entry_id),
  KEY idx_content_relation_order (source_version_id, relation_type, sort_order),
  CONSTRAINT fk_content_relation_source FOREIGN KEY (source_version_id) REFERENCES cms_content_version(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_relation_target FOREIGN KEY (target_entry_id) REFERENCES cms_content_entry(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_taxonomy_term (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  locale VARCHAR(20) NOT NULL,
  vocabulary VARCHAR(80) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  name VARCHAR(180) NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_taxonomy_public_id (public_id),
  UNIQUE KEY uk_taxonomy_slug (site_id, locale, vocabulary, slug),
  CONSTRAINT fk_taxonomy_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT,
  CONSTRAINT fk_taxonomy_parent FOREIGN KEY (parent_id) REFERENCES cms_taxonomy_term(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_content_version_term (
  content_version_id BIGINT UNSIGNED NOT NULL,
  term_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (content_version_id, term_id),
  CONSTRAINT fk_content_term_version FOREIGN KEY (content_version_id) REFERENCES cms_content_version(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_term_term FOREIGN KEY (term_id) REFERENCES cms_taxonomy_term(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_block_binding (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  page_block_id BIGINT UNSIGNED NOT NULL,
  binding_key VARCHAR(100) NOT NULL,
  binding_type VARCHAR(24) NOT NULL,
  content_entry_id BIGINT UNSIGNED NULL,
  query_json JSON NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_block_binding_order (page_block_id, binding_key, sort_order),
  CONSTRAINT fk_block_binding_block FOREIGN KEY (page_block_id) REFERENCES cms_page_block(id) ON DELETE CASCADE,
  CONSTRAINT fk_block_binding_content FOREIGN KEY (content_entry_id) REFERENCES cms_content_entry(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_media_reference (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  media_asset_id BIGINT UNSIGNED NOT NULL,
  owner_type VARCHAR(60) NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  field_path VARCHAR(300) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_media_reference (media_asset_id, owner_type, owner_id, field_path),
  CONSTRAINT fk_media_reference_asset FOREIGN KEY (media_asset_id) REFERENCES cms_media_asset(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_redirect (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  source_path VARCHAR(500) NOT NULL,
  target_type VARCHAR(24) NOT NULL,
  target_value VARCHAR(1000) NOT NULL,
  http_status SMALLINT UNSIGNED NOT NULL DEFAULT 308,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uk_redirect_public_id (public_id),
  UNIQUE KEY uk_redirect_source (site_id, source_path),
  CONSTRAINT fk_redirect_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_form_definition (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  form_key VARCHAR(100) NOT NULL,
  schema_json JSON NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  lock_version INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_form_definition_public_id (public_id),
  UNIQUE KEY uk_form_definition_key (site_id, form_key),
  CONSTRAINT fk_form_definition_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_form_submission (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  form_key VARCHAR(100) NOT NULL,
  payload_encrypted MEDIUMTEXT NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'NEW',
  source_path VARCHAR(500) NOT NULL,
  consented_at DATETIME(6) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_form_submission_public_id (public_id),
  KEY idx_form_submission_queue (site_id, form_key, status, created_at),
  CONSTRAINT fk_form_submission_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_site_release (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  release_no INT UNSIGNED NOT NULL,
  site_config_version_id BIGINT UNSIGNED NOT NULL,
  theme_version_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PUBLISHED',
  change_note VARCHAR(500) NULL,
  published_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  published_by BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_release_public_id (public_id),
  UNIQUE KEY uk_release_number (site_id, release_no),
  CONSTRAINT fk_release_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT,
  CONSTRAINT fk_release_site_config FOREIGN KEY (site_config_version_id) REFERENCES cms_site_config_version(id) ON DELETE RESTRICT,
  CONSTRAINT fk_release_theme FOREIGN KEY (theme_version_id) REFERENCES cms_theme_version(id) ON DELETE RESTRICT,
  CONSTRAINT fk_release_publisher FOREIGN KEY (published_by) REFERENCES cms_admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_release_page (
  release_id BIGINT UNSIGNED NOT NULL,
  page_id BIGINT UNSIGNED NOT NULL,
  page_version_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (release_id, page_id),
  CONSTRAINT fk_release_page_release FOREIGN KEY (release_id) REFERENCES cms_site_release(id) ON DELETE CASCADE,
  CONSTRAINT fk_release_page_page FOREIGN KEY (page_id) REFERENCES cms_page(id) ON DELETE RESTRICT,
  CONSTRAINT fk_release_page_version FOREIGN KEY (page_version_id) REFERENCES cms_page_version(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_release_content (
  release_id BIGINT UNSIGNED NOT NULL,
  content_entry_id BIGINT UNSIGNED NOT NULL,
  content_version_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (release_id, content_entry_id),
  CONSTRAINT fk_release_content_release FOREIGN KEY (release_id) REFERENCES cms_site_release(id) ON DELETE CASCADE,
  CONSTRAINT fk_release_content_entry FOREIGN KEY (content_entry_id) REFERENCES cms_content_entry(id) ON DELETE RESTRICT,
  CONSTRAINT fk_release_content_version FOREIGN KEY (content_version_id) REFERENCES cms_content_version(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_release_navigation (
  release_id BIGINT UNSIGNED NOT NULL,
  navigation_id BIGINT UNSIGNED NOT NULL,
  navigation_version_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (release_id, navigation_id),
  CONSTRAINT fk_release_navigation_release FOREIGN KEY (release_id) REFERENCES cms_site_release(id) ON DELETE CASCADE,
  CONSTRAINT fk_release_navigation_navigation FOREIGN KEY (navigation_id) REFERENCES cms_navigation(id) ON DELETE RESTRICT,
  CONSTRAINT fk_release_navigation_version FOREIGN KEY (navigation_version_id) REFERENCES cms_navigation_version(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_preview_token (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  draft_selection_json JSON NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6) NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_preview_token_hash (token_hash),
  KEY idx_preview_expiry (site_id, expires_at, revoked_at),
  CONSTRAINT fk_preview_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT,
  CONSTRAINT fk_preview_creator FOREIGN KEY (created_by) REFERENCES cms_admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE cms_audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  actor_id BIGINT UNSIGNED NULL,
  action VARCHAR(120) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id VARCHAR(80) NOT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip_hash CHAR(64) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_audit_resource (site_id, resource_type, resource_id, created_at),
  KEY idx_audit_actor (actor_id, created_at),
  CONSTRAINT fk_audit_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE RESTRICT,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES cms_admin_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE cms_site
  ADD CONSTRAINT fk_site_active_release FOREIGN KEY (active_release_id) REFERENCES cms_site_release(id) ON DELETE RESTRICT;
