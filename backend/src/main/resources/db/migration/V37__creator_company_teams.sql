CREATE TABLE cms_creator_team_member (
 company_owner CHAR(36) NOT NULL,
 account_id CHAR(36) NOT NULL,
 state VARCHAR(16) NOT NULL DEFAULT 'INVITED',
 can_edit BOOLEAN NOT NULL DEFAULT FALSE,
 can_upload BOOLEAN NOT NULL DEFAULT FALSE,
 can_submit BOOLEAN NOT NULL DEFAULT FALSE,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(company_owner,account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE cms_creator_team_context (
 account_id CHAR(36) NOT NULL PRIMARY KEY,
 company_owner CHAR(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE cms_creator_team_audit (
 id CHAR(36) NOT NULL PRIMARY KEY,
 company_owner CHAR(36) NOT NULL,
 actor_id CHAR(36) NOT NULL,
 action VARCHAR(255) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY team_history(company_owner,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
