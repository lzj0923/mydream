CREATE TABLE cms_media_alias (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  media_asset_id BIGINT UNSIGNED NOT NULL,
  alias_key VARCHAR(700) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_media_alias_site_key (site_id, alias_key),
  KEY idx_media_alias_asset (media_asset_id),
  CONSTRAINT fk_media_alias_site FOREIGN KEY (site_id) REFERENCES cms_site(id) ON DELETE CASCADE,
  CONSTRAINT fk_media_alias_asset FOREIGN KEY (media_asset_id) REFERENCES cms_media_asset(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

UPDATE cms_page_block
SET props_json = CAST(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CAST(props_json AS CHAR),
    '"/assets/', '"/cms-media/assets/'),
    '"/prototype/', '"/cms-media/prototype/'),
    '"/video/', '"/cms-media/video/'),
    '"/brand/', '"/cms-media/brand/'),
    '"/app/', '"/cms-media/app/') AS JSON);

UPDATE cms_content_version
SET data_json = CAST(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CAST(data_json AS CHAR),
    '"/assets/', '"/cms-media/assets/'),
    '"/prototype/', '"/cms-media/prototype/'),
    '"/video/', '"/cms-media/video/'),
    '"/brand/', '"/cms-media/brand/'),
    '"/app/', '"/cms-media/app/') AS JSON);

UPDATE cms_site_config_version
SET config_json = CAST(
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CAST(config_json AS CHAR),
    '"/assets/', '"/cms-media/assets/'),
    '"/prototype/', '"/cms-media/prototype/'),
    '"/video/', '"/cms-media/video/'),
    '"/brand/', '"/cms-media/brand/'),
    '"/app/', '"/cms-media/app/') AS JSON);
