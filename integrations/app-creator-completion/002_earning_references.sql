-- Nullable reference fields preserve historical account-level rewards without guessing attribution.
ALTER TABLE fa_user_score_log ADD source_scope VARCHAR(20) NULL, ADD drama_id INT UNSIGNED NULL, ADD episode_id INT UNSIGNED NULL, ADD attribution_basis VARCHAR(200) NULL, ADD INDEX creator_work_income(user_id,drama_id,episode_id,id);
INSERT INTO fa_auth_rule(name,title,type,ismenu,status,createtime,updatetime) VALUES ('creator/audit/index','完整操作记录','file',0,'normal',UNIX_TIMESTAMP(),UNIX_TIMESTAMP()) ON DUPLICATE KEY UPDATE name=VALUES(name);
