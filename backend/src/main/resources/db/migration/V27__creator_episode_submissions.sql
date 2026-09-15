CREATE TABLE cms_creator_episode_submission (
  id CHAR(36) NOT NULL PRIMARY KEY,
  script_id CHAR(36) NOT NULL,
  episode_number INT NOT NULL,
  revision_no INT NOT NULL,
  title VARCHAR(128) NOT NULL,
  description TEXT NOT NULL,
  filename VARCHAR(180) NOT NULL,
  file_size BIGINT NOT NULL,
  vod_video_id VARCHAR(100) NOT NULL,
  attachment_id VARCHAR(100) NOT NULL,
  cover_url VARCHAR(2000) NOT NULL DEFAULT '',
  media_url VARCHAR(2000) NOT NULL DEFAULT '',
  state VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  note TEXT NOT NULL,
  review_note TEXT NOT NULL,
  lock_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_creator_episode_revision (script_id,episode_number,revision_no),
  UNIQUE KEY uk_creator_episode_vod (vod_video_id),
  CONSTRAINT fk_creator_episode_script FOREIGN KEY (script_id) REFERENCES cms_creator_script(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cms_creator_episode_publication (
  script_id CHAR(36) NOT NULL,
  episode_number INT NOT NULL,
  submission_id CHAR(36) NOT NULL,
  app_drama_id BIGINT NOT NULL,
  app_episode_id BIGINT NOT NULL,
  app_title VARCHAR(200) NOT NULL,
  verified_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_by VARCHAR(191) NOT NULL,
  PRIMARY KEY (script_id,episode_number),
  UNIQUE KEY uk_creator_app_episode (app_episode_id),
  CONSTRAINT fk_creator_publication_submission FOREIGN KEY (submission_id) REFERENCES cms_creator_episode_submission(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
