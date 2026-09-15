-- Apply once to the App database (MySQL 5.7+, fa_ prefix). Back up before deployment.
CREATE TABLE fa_creator_operation_audit (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 entity_type VARCHAR(32) NOT NULL, entity_id VARCHAR(64) NOT NULL,
 action VARCHAR(32) NOT NULL, actor VARCHAR(128) NOT NULL,
 before_json JSON NULL, after_json JSON NULL, created_at BIGINT NOT NULL,
 INDEX entity_history(entity_type,entity_id,id), INDEX actor_history(actor,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE fa_user_withdrawal ADD payment_reference VARCHAR(200) NOT NULL DEFAULT '', ADD processed_by INT UNSIGNED NULL, ADD processed_at BIGINT NULL, ADD creator_request_id CHAR(36) NULL, ADD UNIQUE KEY creator_withdrawal_request(user_id,creator_request_id);
DELIMITER $$
CREATE TRIGGER creator_audit_no_update BEFORE UPDATE ON fa_creator_operation_audit FOR EACH ROW BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Audit records are append-only'; END$$
CREATE TRIGGER creator_audit_no_delete BEFORE DELETE ON fa_creator_operation_audit FOR EACH ROW BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Audit records are append-only'; END$$
CREATE TRIGGER creator_drama_insert AFTER INSERT ON fa_short_drama FOR EACH ROW BEGIN
INSERT INTO fa_creator_operation_audit(entity_type,entity_id,action,actor,before_json,after_json,created_at) VALUES ('drama',NEW.id,'INSERT',COALESCE(@creator_audit_actor,CONCAT('database:',CURRENT_USER())),NULL,JSON_OBJECT('title',NEW.title,'description',NEW.description,'cover_image',NEW.cover_image,'unlock_price',NEW.unlock_price,'status',NEW.status,'area',NEW.area,'drama_count',NEW.drama_count,'is_complete',NEW.is_complete),UNIX_TIMESTAMP());
END$$
CREATE TRIGGER creator_drama_update AFTER UPDATE ON fa_short_drama FOR EACH ROW BEGIN
IF NOT (JSON_OBJECT('title',OLD.title,'description',OLD.description,'cover_image',OLD.cover_image,'unlock_price',OLD.unlock_price,'status',OLD.status,'area',OLD.area,'drama_count',OLD.drama_count,'is_complete',OLD.is_complete) <=> JSON_OBJECT('title',NEW.title,'description',NEW.description,'cover_image',NEW.cover_image,'unlock_price',NEW.unlock_price,'status',NEW.status,'area',NEW.area,'drama_count',NEW.drama_count,'is_complete',NEW.is_complete)) THEN
INSERT INTO fa_creator_operation_audit(entity_type,entity_id,action,actor,before_json,after_json,created_at) VALUES ('drama',NEW.id,'UPDATE',COALESCE(@creator_audit_actor,CONCAT('database:',CURRENT_USER())),JSON_OBJECT('title',OLD.title,'description',OLD.description,'cover_image',OLD.cover_image,'unlock_price',OLD.unlock_price,'status',OLD.status,'area',OLD.area,'drama_count',OLD.drama_count,'is_complete',OLD.is_complete),JSON_OBJECT('title',NEW.title,'description',NEW.description,'cover_image',NEW.cover_image,'unlock_price',NEW.unlock_price,'status',NEW.status,'area',NEW.area,'drama_count',NEW.drama_count,'is_complete',NEW.is_complete),UNIX_TIMESTAMP());
END IF;
END$$
CREATE TRIGGER creator_drama_delete AFTER DELETE ON fa_short_drama FOR EACH ROW BEGIN
INSERT INTO fa_creator_operation_audit(entity_type,entity_id,action,actor,before_json,after_json,created_at) VALUES ('drama',OLD.id,'DELETE',COALESCE(@creator_audit_actor,CONCAT('database:',CURRENT_USER())),JSON_OBJECT('title',OLD.title,'description',OLD.description,'cover_image',OLD.cover_image,'unlock_price',OLD.unlock_price,'status',OLD.status,'area',OLD.area,'drama_count',OLD.drama_count,'is_complete',OLD.is_complete),NULL,UNIX_TIMESTAMP());
END$$
CREATE TRIGGER creator_episode_insert AFTER INSERT ON fa_short_drama_episode FOR EACH ROW BEGIN
INSERT INTO fa_creator_operation_audit(entity_type,entity_id,action,actor,before_json,after_json,created_at) VALUES ('episode',NEW.id,'INSERT',COALESCE(@creator_audit_actor,CONCAT('database:',CURRENT_USER())),NULL,JSON_OBJECT('drama_id',NEW.drama_id,'drama_num',NEW.drama_num,'title',NEW.title,'description',NEW.description,'thumbnail',NEW.thumbnail,'unlock_price',NEW.unlock_price,'status',NEW.status,'video_attachment_id',NEW.video_attachment_id,'video_hash',SHA2(NEW.video_url,256)),UNIX_TIMESTAMP());
END$$
CREATE TRIGGER creator_episode_update AFTER UPDATE ON fa_short_drama_episode FOR EACH ROW BEGIN
IF NOT (JSON_OBJECT('drama_id',OLD.drama_id,'drama_num',OLD.drama_num,'title',OLD.title,'description',OLD.description,'thumbnail',OLD.thumbnail,'unlock_price',OLD.unlock_price,'status',OLD.status,'video_attachment_id',OLD.video_attachment_id,'video_hash',SHA2(OLD.video_url,256)) <=> JSON_OBJECT('drama_id',NEW.drama_id,'drama_num',NEW.drama_num,'title',NEW.title,'description',NEW.description,'thumbnail',NEW.thumbnail,'unlock_price',NEW.unlock_price,'status',NEW.status,'video_attachment_id',NEW.video_attachment_id,'video_hash',SHA2(NEW.video_url,256))) THEN
INSERT INTO fa_creator_operation_audit(entity_type,entity_id,action,actor,before_json,after_json,created_at) VALUES ('episode',NEW.id,'UPDATE',COALESCE(@creator_audit_actor,CONCAT('database:',CURRENT_USER())),JSON_OBJECT('drama_id',OLD.drama_id,'drama_num',OLD.drama_num,'title',OLD.title,'description',OLD.description,'thumbnail',OLD.thumbnail,'unlock_price',OLD.unlock_price,'status',OLD.status,'video_attachment_id',OLD.video_attachment_id,'video_hash',SHA2(OLD.video_url,256)),JSON_OBJECT('drama_id',NEW.drama_id,'drama_num',NEW.drama_num,'title',NEW.title,'description',NEW.description,'thumbnail',NEW.thumbnail,'unlock_price',NEW.unlock_price,'status',NEW.status,'video_attachment_id',NEW.video_attachment_id,'video_hash',SHA2(NEW.video_url,256)),UNIX_TIMESTAMP());
END IF;
END$$
CREATE TRIGGER creator_episode_delete AFTER DELETE ON fa_short_drama_episode FOR EACH ROW BEGIN
INSERT INTO fa_creator_operation_audit(entity_type,entity_id,action,actor,before_json,after_json,created_at) VALUES ('episode',OLD.id,'DELETE',COALESCE(@creator_audit_actor,CONCAT('database:',CURRENT_USER())),JSON_OBJECT('drama_id',OLD.drama_id,'drama_num',OLD.drama_num,'title',OLD.title,'description',OLD.description,'thumbnail',OLD.thumbnail,'unlock_price',OLD.unlock_price,'status',OLD.status,'video_attachment_id',OLD.video_attachment_id,'video_hash',SHA2(OLD.video_url,256)),NULL,UNIX_TIMESTAMP());
END$$
CREATE TRIGGER creator_video_insert AFTER INSERT ON fa_video FOR EACH ROW BEGIN
INSERT INTO fa_creator_operation_audit(entity_type,entity_id,action,actor,before_json,after_json,created_at) VALUES ('video',NEW.id,'INSERT',COALESCE(@creator_audit_actor,CONCAT('database:',CURRENT_USER())),NULL,JSON_OBJECT('user_id',NEW.user_id,'title',NEW.title,'description',NEW.description,'cover_image',NEW.cover_image,'status',NEW.status,'deletetime',NEW.deletetime,'video_attachment_id',NEW.video_attachment_id,'video_hash',SHA2(NEW.video_file,256)),UNIX_TIMESTAMP());
END$$
CREATE TRIGGER creator_video_update AFTER UPDATE ON fa_video FOR EACH ROW BEGIN
IF NOT (JSON_OBJECT('user_id',OLD.user_id,'title',OLD.title,'description',OLD.description,'cover_image',OLD.cover_image,'status',OLD.status,'deletetime',OLD.deletetime,'video_attachment_id',OLD.video_attachment_id,'video_hash',SHA2(OLD.video_file,256)) <=> JSON_OBJECT('user_id',NEW.user_id,'title',NEW.title,'description',NEW.description,'cover_image',NEW.cover_image,'status',NEW.status,'deletetime',NEW.deletetime,'video_attachment_id',NEW.video_attachment_id,'video_hash',SHA2(NEW.video_file,256))) THEN
INSERT INTO fa_creator_operation_audit(entity_type,entity_id,action,actor,before_json,after_json,created_at) VALUES ('video',NEW.id,'UPDATE',COALESCE(@creator_audit_actor,CONCAT('database:',CURRENT_USER())),JSON_OBJECT('user_id',OLD.user_id,'title',OLD.title,'description',OLD.description,'cover_image',OLD.cover_image,'status',OLD.status,'deletetime',OLD.deletetime,'video_attachment_id',OLD.video_attachment_id,'video_hash',SHA2(OLD.video_file,256)),JSON_OBJECT('user_id',NEW.user_id,'title',NEW.title,'description',NEW.description,'cover_image',NEW.cover_image,'status',NEW.status,'deletetime',NEW.deletetime,'video_attachment_id',NEW.video_attachment_id,'video_hash',SHA2(NEW.video_file,256)),UNIX_TIMESTAMP());
END IF;
END$$
CREATE TRIGGER creator_video_delete AFTER DELETE ON fa_video FOR EACH ROW BEGIN
INSERT INTO fa_creator_operation_audit(entity_type,entity_id,action,actor,before_json,after_json,created_at) VALUES ('video',OLD.id,'DELETE',COALESCE(@creator_audit_actor,CONCAT('database:',CURRENT_USER())),JSON_OBJECT('user_id',OLD.user_id,'title',OLD.title,'description',OLD.description,'cover_image',OLD.cover_image,'status',OLD.status,'deletetime',OLD.deletetime,'video_attachment_id',OLD.video_attachment_id,'video_hash',SHA2(OLD.video_file,256)),NULL,UNIX_TIMESTAMP());
END$$
DELIMITER ;
