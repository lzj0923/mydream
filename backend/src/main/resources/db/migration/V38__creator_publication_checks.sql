CREATE TABLE cms_creator_publication_check (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 script_id CHAR(36) NOT NULL,
 episode_number INT NOT NULL,
 submission_id CHAR(36) NOT NULL,
 app_drama_id BIGINT NOT NULL,
 app_episode_id BIGINT NOT NULL,
 status VARCHAR(30) NOT NULL,
 message VARCHAR(1000) NOT NULL,
 actor_key VARCHAR(191) NOT NULL,
 checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_publication_check (script_id,episode_number,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
