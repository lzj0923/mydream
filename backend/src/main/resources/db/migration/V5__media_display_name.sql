ALTER TABLE cms_media_asset
  ADD COLUMN display_name VARCHAR(255) NULL AFTER original_name;

UPDATE cms_media_asset
SET display_name = original_name
WHERE display_name IS NULL OR TRIM(display_name) = '';

ALTER TABLE cms_media_asset
  MODIFY COLUMN display_name VARCHAR(255) NOT NULL;
