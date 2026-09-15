INSERT INTO cms_site (id, public_id, site_key, name, primary_host, default_locale)
VALUES (1, '00000000-0000-0000-0000-000000000001', 'mydream', 'MY DREAM', 'localhost', 'zh-Hant');

INSERT INTO cms_site_locale (site_id, locale, display_name, is_default, enabled)
VALUES (1, 'zh-Hant', '繁體中文', TRUE, TRUE);

INSERT INTO cms_role (id, role_key, name) VALUES
  (1, 'SUPER_ADMIN', '超级管理员'),
  (2, 'SITE_ADMIN', '站点管理员'),
  (3, 'EDITOR', '编辑'),
  (4, 'REVIEWER', '审核发布'),
  (5, 'MEDIA_EDITOR', '媒体编辑');

INSERT INTO cms_permission (id, permission_key, name) VALUES
  (1, 'site.read', '读取站点'),
  (2, 'site.write', '编辑站点'),
  (3, 'page.read', '读取页面'),
  (4, 'page.write', '编辑页面'),
  (5, 'content.read', '读取内容'),
  (6, 'content.write', '编辑内容'),
  (7, 'media.read', '读取媒体'),
  (8, 'media.write', '编辑媒体'),
  (9, 'release.publish', '发布与回滚'),
  (10, 'user.manage', '管理用户'),
  (11, 'submission.read', '读取表单提交'),
  (12, 'submission.write', '处理表单提交');

INSERT INTO cms_role_permission (role_id, permission_id)
SELECT 1, id FROM cms_permission;
INSERT INTO cms_role_permission (role_id, permission_id)
SELECT 2, id FROM cms_permission WHERE permission_key <> 'user.manage';
INSERT INTO cms_role_permission (role_id, permission_id)
SELECT 3, id FROM cms_permission WHERE permission_key IN ('site.read','page.read','page.write','content.read','content.write','media.read');
INSERT INTO cms_role_permission (role_id, permission_id)
SELECT 4, id FROM cms_permission WHERE permission_key IN ('site.read','page.read','content.read','media.read','release.publish');
INSERT INTO cms_role_permission (role_id, permission_id)
SELECT 5, id FROM cms_permission WHERE permission_key IN ('site.read','media.read','media.write');

INSERT INTO cms_block_definition (type_key, schema_version, display_name, props_schema_json, style_schema_json) VALUES
  ('hero', 1, '主视觉', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('section-heading', 1, '区块标题', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('work-grid', 1, '作品网格', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('content-grid', 1, '内容网格', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('category-tabs', 1, '分类标签', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('image-gallery', 1, '图片画廊', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('video-player', 1, '视频播放器', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('episode-list', 1, '选集列表', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('rich-text', 1, '富文本', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('feature-cards', 1, '功能卡片', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('pricing-grid', 1, '价目表', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('cta', 1, '行动按钮', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('contact-form', 1, '联系表单', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('legal-document', 1, '法律文档', JSON_OBJECT('type','object'), JSON_OBJECT('type','object')),
  ('spacer', 1, '间距', JSON_OBJECT('type','object'), JSON_OBJECT('type','object'));

INSERT INTO cms_site_config_version (id, public_id, site_id, version_no, status, config_json, change_note)
VALUES (1, '10000000-0000-0000-0000-000000000001', 1, 1, 'PUBLISHED',
  JSON_OBJECT(
    'name','MY DREAM',
    'locale','zh-Hant',
    'siteUrl','http://localhost:3000',
    'logo',JSON_OBJECT('url','/brand/logo-transparent.png','alt','MY DREAM'),
    'defaultSeo',JSON_OBJECT('title','MY DREAM｜AI 原创娱乐平台','description','AI 原创 IP 娱乐生态平台')
  ), '初始化站点配置');

INSERT INTO cms_theme (id, public_id, site_id, theme_key, name)
VALUES (1, '20000000-0000-0000-0000-000000000001', 1, 'default', 'MY DREAM 默认主题');
INSERT INTO cms_theme_version (id, public_id, theme_id, version_no, status, tokens_json, change_note)
VALUES (1, '21000000-0000-0000-0000-000000000001', 1, 1, 'PUBLISHED',
  JSON_OBJECT(
    'colors',JSON_OBJECT('background','#030814','surface','#081425','text','#f6f9ff','muted','#91a5bb','accent','#f4b73f','cyan','#19bfff'),
    'fonts',JSON_OBJECT('heading','Arial, sans-serif','body','Arial, sans-serif'),
    'radius',JSON_OBJECT('card',12,'button',8),
    'containerWidth',1360
  ), '初始化主题');

INSERT INTO cms_navigation (id, public_id, site_id, nav_key, name)
VALUES (1, '30000000-0000-0000-0000-000000000001', 1, 'primary', '主导航');
INSERT INTO cms_navigation_version (id, public_id, navigation_id, version_no, status, change_note)
VALUES (1, '31000000-0000-0000-0000-000000000001', 1, 1, 'PUBLISHED', '初始化主导航');
INSERT INTO cms_navigation_item (public_id, navigation_version_id, label, link_type, link_value, sort_order) VALUES
  ('32000000-0000-0000-0000-000000000001',1,'首页','INTERNAL','/',0),
  ('32000000-0000-0000-0000-000000000002',1,'AI宇宙','INTERNAL','/universe',1),
  ('32000000-0000-0000-0000-000000000003',1,'价目表','INTERNAL','/tasks',2),
  ('32000000-0000-0000-0000-000000000004',1,'最新消息','INTERNAL','/news',3),
  ('32000000-0000-0000-0000-000000000005',1,'关于我们','INTERNAL','/about',4),
  ('32000000-0000-0000-0000-000000000006',1,'联系我们','INTERNAL','/contact',5);

INSERT INTO cms_page (id, public_id, site_id, locale, path, page_key)
VALUES (1, '40000000-0000-0000-0000-000000000001', 1, 'zh-Hant', '/', 'home');
INSERT INTO cms_page_version (id, public_id, page_id, version_no, title, seo_json, status, change_note)
VALUES (1, '41000000-0000-0000-0000-000000000001', 1, 1, '首页',
  JSON_OBJECT('title','MY DREAM｜AI 原创娱乐平台','description','AI 原创 IP 娱乐生态平台'), 'PUBLISHED', '初始化首页');
INSERT INTO cms_page_block (public_id, page_version_id, block_definition_id, zone_key, sort_order, visible, props_json, style_json)
SELECT '42000000-0000-0000-0000-000000000001', 1, id, 'main', 0, TRUE,
  JSON_OBJECT(
    'eyebrow','AI + ORIGINAL IP + ENTERTAINMENT',
    'title','当 AI 开始创造故事',
    'subtitle','娱乐产业将重新定义',
    'description','打造全球领先的 AI 原创 IP 娱乐生态系。',
    'backgroundUrl','/assets/jyg/ai-universe-hero-v2.webp',
    'backgroundAlt','AI 原创娱乐世界'
  ), JSON_OBJECT('variant','cinematic','minHeight',720)
FROM cms_block_definition WHERE type_key='hero' AND schema_version=1;

INSERT INTO cms_form_definition (public_id, site_id, form_key, schema_json)
VALUES ('50000000-0000-0000-0000-000000000001', 1, 'business-contact',
  JSON_OBJECT('required',JSON_ARRAY('company','name','phone','email','cooperationNeeds','consent')));

INSERT INTO cms_site_release (id, public_id, site_id, release_no, site_config_version_id, theme_version_id, status, change_note)
VALUES (1, '60000000-0000-0000-0000-000000000001', 1, 1, 1, 1, 'PUBLISHED', '初始化发布');
INSERT INTO cms_release_page (release_id, page_id, page_version_id) VALUES (1,1,1);
INSERT INTO cms_release_navigation (release_id, navigation_id, navigation_version_id) VALUES (1,1,1);
UPDATE cms_site SET active_release_id=1 WHERE id=1;
