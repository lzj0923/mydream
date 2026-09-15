-- V35 inherited the database default. MySQL 8 can default to 0900_ai_ci,
-- while the project/event tables use unicode_ci, making notification joins fail.
ALTER TABLE cms_creator_notification_read CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cms_creator_settings_sync CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cms_creator_material_review CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
