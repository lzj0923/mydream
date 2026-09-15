CREATE TABLE fa_short_drama (
 id INT PRIMARY KEY, web_public_id CHAR(36), web_slug VARCHAR(180), web_locale VARCHAR(20) DEFAULT 'zh-Hant',
 title VARCHAR(80), description TEXT, cover_image TEXT, is_complete INT DEFAULT 0, drama_count INT DEFAULT 2,
 total_views INT DEFAULT 10, web_seo_json JSON, web_featured INT DEFAULT 0, web_sort_weight INT DEFAULT 0,
 web_published_at DATETIME, updated_at DATETIME, status VARCHAR(20) DEFAULT 'published', web_visible INT DEFAULT 1,
 start_time DATETIME, end_time DATETIME);
CREATE TABLE fa_short_drama_episode (
 id INT PRIMARY KEY, drama_id INT, web_public_id CHAR(36), web_slug VARCHAR(180), web_locale VARCHAR(20) DEFAULT 'zh-Hant',
 title VARCHAR(80), description TEXT, thumbnail TEXT, drama_num INT, unlock_price INT DEFAULT 0,
 video_attachment_id VARCHAR(80), video_url TEXT, views INT DEFAULT 0, likes INT DEFAULT 0, web_seo_json JSON,
 web_featured INT DEFAULT 0, web_sort_weight INT DEFAULT 0, web_published_at DATETIME, updated_at DATETIME,
 status VARCHAR(20) DEFAULT 'published', web_visible INT DEFAULT 1);
CREATE TABLE fa_attachment (sha1 VARCHAR(80),vod_cover_url TEXT,vod_source_url TEXT,vod_play_url_uhd TEXT,vod_play_url_hd TEXT,vod_play_url_sd TEXT,url TEXT);
CREATE TABLE web_drama_category_agg (drama_id INT,genre_names VARCHAR(100));
CREATE TABLE web_drama_episode_agg (drama_id INT,actual_episode_count INT,free_episode_count INT);
INSERT INTO fa_short_drama(id,title,web_slug,web_public_id) VALUES
 (722,'new',NULL,NULL),(723,'empty','',''),(700,'legacy','custom-legacy','legacy-public-id');
INSERT INTO fa_short_drama(id,title,status,web_visible,start_time,end_time) VALUES
 (800,'draft','draft',1,NULL,NULL),(801,'hidden','published',0,NULL,NULL),
 (802,'future','published',1,'2099-01-01',NULL),(803,'expired','published',1,NULL,'2000-01-01');
INSERT INTO fa_short_drama_episode(id,drama_id,title,drama_num,unlock_price,video_url,web_slug,web_public_id) VALUES
 (21201,722,'free',1,0,'https://example.test/free.mp4',NULL,NULL),
 (21202,722,'paid',2,30,'https://example.test/paid.mp4','',''),
 (21000,700,'legacy',1,0,'https://example.test/old.mp4','legacy-episode','legacy-episode-id'),
 (22000,800,'draft parent',1,0,'https://example.test/hidden.mp4',NULL,NULL);
