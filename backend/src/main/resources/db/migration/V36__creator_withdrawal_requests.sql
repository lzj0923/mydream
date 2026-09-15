CREATE TABLE cms_creator_withdrawal_gate (
 app_user_id BIGINT NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE cms_creator_withdrawal_request (
 app_user_id BIGINT NOT NULL,
 request_id CHAR(36) NOT NULL,
 account_id CHAR(36) NOT NULL,
 points BIGINT NOT NULL,
 state VARCHAR(16) NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(app_user_id,request_id),
 KEY idx_withdrawal_owner(account_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
