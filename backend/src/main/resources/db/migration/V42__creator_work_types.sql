ALTER TABLE cms_creator_script ADD COLUMN work_type VARCHAR(24) NOT NULL DEFAULT 'UNCLASSIFIED';
UPDATE cms_creator_script SET work_type='SHORT_DRAMA' WHERE format IN ('真人短剧','真人短劇','短剧','短劇');
UPDATE cms_creator_script SET work_type='COMIC' WHERE format IN ('漫剧','漫劇','AI 短剧','AI 短劇');
CREATE INDEX idx_creator_script_type ON cms_creator_script(owner_key,work_type,status);
CREATE TABLE cms_creator_work_context (
 account_id CHAR(36) PRIMARY KEY,
 work_type VARCHAR(24) NOT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE cms_creator_team_member ADD COLUMN work_types VARCHAR(64) NOT NULL DEFAULT 'COMIC,SHORT_DRAMA';

ALTER TABLE cms_creator_ip_interest ADD COLUMN work_type VARCHAR(24) NOT NULL DEFAULT 'UNCLASSIFIED';
UPDATE cms_creator_ip_interest SET work_type='SHORT_DRAMA' WHERE format IN ('真人短剧','真人短劇','短剧','短劇');
UPDATE cms_creator_ip_interest SET work_type='COMIC' WHERE format IN ('漫剧','漫劇','AI 短剧','AI 短劇');
ALTER TABLE cms_creator_ip_interest DROP INDEX uk_creator_interest, ADD UNIQUE KEY uk_creator_interest(owner_key,work_slug,work_type);
ALTER TABLE cms_creator_cooperation_draft ADD COLUMN work_type VARCHAR(24) NOT NULL DEFAULT 'UNCLASSIFIED';
