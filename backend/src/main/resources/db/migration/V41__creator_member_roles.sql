ALTER TABLE cms_creator_team_member
 ADD COLUMN role_key VARCHAR(24) NOT NULL DEFAULT 'CUSTOM',
 ADD COLUMN extra_permissions VARCHAR(500) NOT NULL DEFAULT '';
UPDATE cms_creator_team_member SET role_key='VIEWER' WHERE can_edit=0 AND can_upload=0 AND can_submit=0;
UPDATE cms_creator_team_member SET role_key='CREATOR' WHERE can_edit=1 AND can_upload=1 AND can_submit=1;
ALTER TABLE cms_creator_team_audit MODIFY COLUMN action TEXT NOT NULL;
CREATE TABLE cms_creator_cooperation_draft (
 company_owner CHAR(36) NOT NULL,
 id CHAR(36) NOT NULL,
 title VARCHAR(120) NOT NULL,
 body TEXT NOT NULL,
 version INT NOT NULL DEFAULT 1,
 updated_by CHAR(36) NOT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(company_owner,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
