"""Regression test against an isolated, disposable MySQL schema (no App writes)."""
import os
import pathlib
import subprocess
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[2]
DB = 'mydream_media_test_' + uuid.uuid4().hex[:12]
MYSQL = os.environ.get('MYSQL_TEST_BIN', r'D:\MySQL\mysql-5.7.37-winx64\mysql-5.7.37-winx64\bin\mysql.exe')


def sql(query):
    result = subprocess.run([MYSQL, '--host=127.0.0.1', '--port=3309', '--user=root',
                             '--default-character-set=utf8mb4', '--batch', '--raw', '--skip-column-names'],
                            input=query, text=True, encoding='utf-8', capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


def check(query, expected):
    actual = sql('USE ' + DB + ';' + query)
    assert actual == expected, (query, actual, expected)


sql('CREATE DATABASE ' + DB + ' CHARACTER SET utf8mb4')
try:
    sql('USE ' + DB + ';' + """
CREATE TABLE cms_site(id INT,site_key VARCHAR(30),active_release_id INT);
CREATE TABLE cms_content_entry(id INT,site_id INT,content_type VARCHAR(30),archived BOOLEAN);
CREATE TABLE cms_content_version(
 id INT AUTO_INCREMENT PRIMARY KEY,public_id VARCHAR(36),content_entry_id INT,version_no INT,
 title VARCHAR(240),summary TEXT,cover_media_id INT,data_json JSON,featured BOOLEAN,
 sort_weight INT,status VARCHAR(24),change_note TEXT,created_by INT);
CREATE TABLE cms_release_content(release_id INT,content_entry_id INT,content_version_id INT);
CREATE TABLE cms_content_relation(source_version_id INT,relation_type VARCHAR(80),target_entry_id INT,sort_order INT);
CREATE TABLE fa_attachment(sha1 VARCHAR(100),vod_source_url TEXT,vod_play_url_uhd TEXT,
 vod_play_url_hd TEXT,vod_play_url_sd TEXT,url TEXT);
INSERT INTO cms_site VALUES(1,'mydream',1);
INSERT INTO fa_attachment(sha1,vod_source_url) VALUES('free','http://media.oss-cn-hongkong.aliyuncs.com/free.mp4'),('paid','https://cdn.test/paid.mp4');
INSERT INTO fa_attachment(sha1,vod_play_url_hd) VALUES('hd','https://cdn.test/hd.mp4');
INSERT INTO cms_content_entry VALUES
 (1,1,'episode',FALSE),(2,1,'episode',FALSE),(3,1,'original-video',FALSE),
 (4,1,'episode',FALSE),(5,1,'work',FALSE),(6,1,'original-video',FALSE),(7,1,'episode',FALSE);
INSERT INTO cms_content_version(id,public_id,content_entry_id,version_no,title,summary,cover_media_id,data_json,featured,sort_weight,status,created_by)
VALUES
 (1,'old1',1,1,'Custom title','Keep this',42,JSON_OBJECT('source','app','externalCoverUrl','/uploads/cover.webp','imageUrl','/uploads/cover.webp','videoUrl','/vod/free','videoAttachmentId','free','isFree',TRUE),TRUE,99,'PUBLISHED',7),
 (2,'old2',2,1,'Paid',NULL,NULL,JSON_OBJECT('source','app','externalCoverUrl','/uploads/cover.webp','videoUrl','https://cdn.test/paid.mp4','videoAttachmentId','paid','isFree',FALSE),FALSE,0,'PUBLISHED',NULL),
 (3,'old3',3,1,'HD',NULL,NULL,JSON_OBJECT('source','app','externalCoverUrl','https://cdn.test/cover.webp','videoUrl','/vod/hd','videoAttachmentId','hd'),FALSE,0,'PUBLISHED',NULL),
 (4,'old4',4,1,'Missing',NULL,NULL,JSON_OBJECT('source','app','externalCoverUrl','/uploads/missing.webp','videoUrl','/vod/missing','videoAttachmentId','missing','isFree',TRUE),FALSE,0,'PUBLISHED',NULL),
 (5,'old5',5,1,'CMS work',NULL,NULL,JSON_OBJECT('source','cms','externalCoverUrl','/uploads/local.webp'),FALSE,0,'PUBLISHED',NULL),
 (6,'old6',6,1,'Direct',NULL,NULL,JSON_OBJECT('source','app','externalCoverUrl','https://cdn.test/cover.webp','videoUrl','https://cdn.test/custom.mp4','videoAttachmentId','free'),FALSE,0,'PUBLISHED',NULL),
 (7,'old7',7,1,'Unknown access',NULL,NULL,JSON_OBJECT('source','app','externalCoverUrl','https://cdn.test/cover.webp','videoUrl','/vod/free','videoAttachmentId','free'),FALSE,0,'PUBLISHED',NULL),
 (99,'draft',1,2,'Unpublished edit',NULL,NULL,JSON_OBJECT('draft',TRUE),FALSE,0,'DRAFT',NULL);
INSERT INTO cms_release_content VALUES(1,1,1),(1,2,2),(1,3,3),(1,4,4),(1,5,5),(1,6,6),(1,7,7);
INSERT INTO cms_content_relation VALUES(1,'episode-of',5,1);
""")
    check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.videoUrl')) FROM cms_content_version WHERE id=1", '/vod/free')
    print('REPRODUCED: relative cover and VOD placeholder in published CMS content', flush=True)
    normalize = (ROOT / 'database/cms/normalize_app_media.sql').read_text(encoding='utf-8').replace('lc0401_app.', DB + '.')
    repair = (ROOT / 'database/cms/repair_app_media.sql').read_text(encoding='utf-8').replace('USE mydream_cms;', 'USE ' + DB + ';')
    repair = "SET @app_media_base_url='https://images.test';" + repair.replace('-- NORMALIZE_APP_MEDIA', normalize)
    sql(repair)
    active = ' FROM cms_release_content r JOIN cms_content_version v ON v.id=r.content_version_id WHERE r.content_entry_id='
    check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.videoUrl'))" + active + '1', 'https://media.oss-cn-hongkong.aliyuncs.com/free.mp4')
    check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.externalCoverUrl'))" + active + '1', 'https://images.test/uploads/cover.webp')
    check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.imageUrl'))" + active + '1', 'https://images.test/uploads/cover.webp')
    check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.videoUrl'))" + active + '2', 'null')
    check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.videoUrl'))" + active + '3', 'https://cdn.test/hd.mp4')
    check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.videoUrl'))" + active + '4', 'null')
    check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.videoUrl'))" + active + '7', 'null')
    check('SELECT CONCAT_WS(\'|\',title,summary,cover_media_id,featured,sort_weight,created_by,version_no)' + active + '1', 'Custom title|Keep this|42|1|99|7|3')
    check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.videoUrl')) FROM cms_content_version WHERE id=1", '/vod/free')
    check("SELECT title FROM cms_content_version WHERE id=99", 'Unpublished edit')
    check('SELECT content_version_id FROM cms_release_content WHERE content_entry_id=5', '5')
    check('SELECT content_version_id FROM cms_release_content WHERE content_entry_id=6', '6')
    check('SELECT COUNT(*) FROM cms_content_relation rel JOIN cms_release_content r ON rel.source_version_id=r.content_version_id WHERE r.content_entry_id=1 AND target_entry_id=5 AND sort_order=1', '1')
    before = sql('USE ' + DB + ';SELECT COUNT(*) FROM cms_content_version')
    sql(repair)
    check('SELECT COUNT(*) FROM cms_content_version', before)
    print('PASS: image origin, VOD/HD resolution, paid/unknown access, missing attachment, custom URL, text/cover/draft/history/relations, idempotency', flush=True)
finally:
    # Only the random schema created by this invocation is removed.
    assert DB.startswith('mydream_media_test_') and len(DB) == len('mydream_media_test_') + 12
    sql('DROP DATABASE ' + DB)
