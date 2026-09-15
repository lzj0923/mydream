"""Run from a Docker host with mydream-mysql-1; creates and drops only its test schema."""
import os,subprocess,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
DB='mydream_route_regression_20260911'
def sql(query):
 cmd=['docker','exec','-i','mydream-mysql-1','sh','-c','MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot --default-character-set=utf8mb4 --batch --raw --skip-column-names']
 r=subprocess.run(cmd,input=query,text=True,capture_output=True)
 if r.returncode: raise RuntimeError(r.stderr)
 return r.stdout.strip()
assert sql("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='"+DB+"'")=='0','Test schema already exists'
sql('CREATE DATABASE '+DB+' CHARACTER SET utf8mb4')
try:
 fixture=(ROOT/'tests/sql/app-new-work-routing-fixture.sql').read_text(encoding='utf-8')
 v1=(ROOT/'database/app/V1__web_content_contract.sql').read_text(encoding='utf-8')
 v2=(ROOT/'database/app/V2__web_media_urls.sql').read_text(encoding='utf-8')
 original='CREATE OR REPLACE VIEW web_content_work AS'+v1.split('CREATE OR REPLACE VIEW web_content_work AS')[1].split('CREATE OR REPLACE VIEW')[0]+'CREATE OR REPLACE VIEW web_content_episode AS'+v2.split('CREATE OR REPLACE VIEW web_content_episode AS')[1].split('CREATE OR REPLACE VIEW')[0]
 migration=(ROOT/'database/app/V3__new_work_routes.sql').read_text(encoding='utf-8')
 sql('USE '+DB+';\n'+fixture+original)
 assert sql('USE '+DB+";SELECT COUNT(*) FROM web_content_work WHERE slug IS NULL OR slug=''")=='2'
 print('REPRODUCED: new and empty identifiers have no route',flush=True)
 sql('USE '+DB+';\n'+migration)
 def check(q,expected):
  actual=sql('USE '+DB+';\n'+q)
  assert actual==expected,(q,actual,expected)
 check("SELECT GROUP_CONCAT(slug ORDER BY slug) FROM web_content_work",'app-drama-722,app-drama-723,custom-legacy')
 check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.href')) FROM web_content_work WHERE slug='app-drama-722'",'/works/app-drama-722')
 check("SELECT GROUP_CONCAT(slug ORDER BY slug) FROM web_content_episode WHERE parent_slug='app-drama-722'",'app-episode-21201,app-episode-21202')
 check("SELECT COUNT(*) FROM web_content_episode e JOIN web_content_work w ON e.parent_slug=w.slug AND JSON_UNQUOTE(JSON_EXTRACT(e.data_json,'$.workId'))=w.content_id",'3')
 check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.videoUrl')) FROM web_content_episode WHERE slug='app-episode-21201'",'https://example.test/free.mp4')
 check("SELECT JSON_UNQUOTE(JSON_EXTRACT(data_json,'$.videoUrl')) FROM web_content_episode WHERE slug='app-episode-21202'",'null')
 check("SELECT content_id FROM web_content_work WHERE slug='custom-legacy'",'legacy-public-id')
 check("SELECT content_id FROM web_content_episode WHERE slug='legacy-episode'",'legacy-episode-id')
 # Future inserts must work without any backfill job.
 sql('USE '+DB+";INSERT INTO fa_short_drama(id,title) VALUES(900,'future insert')")
 check("SELECT slug FROM web_content_work WHERE title='future insert'",'app-drama-900')
 print('PASS: new/empty/legacy IDs, parent join, free/paid access, publication filters, future inserts',flush=True)
finally:
 sql('DROP DATABASE '+DB)
