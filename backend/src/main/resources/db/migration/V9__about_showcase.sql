-- 将“关于我们”升级为五个固定布局区块。所有视觉素材仅保存媒体库 public_id，
-- 公共接口由 MediaReferenceResolver 在读取时解析成可访问 URL。
INSERT INTO cms_page_version
  (public_id,page_id,version_no,title,seo_json,status,change_note)
SELECT UUID(),page.id,
  (SELECT COALESCE(MAX(existing.version_no),0) + 1 FROM cms_page_version existing WHERE existing.page_id=page.id),
  '關於我們',
  JSON_OBJECT('title','關於我們｜MY DREAM','description','了解 MY DREAM 如何以 AI、原創角色與世界觀打造新世代娛樂平台。'),
  'PUBLISHED','升级关于我们品牌展示与五区块可视化管理'
FROM cms_page page
WHERE page.site_id=1 AND page.locale='zh-Hant' AND page.path='/about';

INSERT INTO cms_page_block
  (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'hero',0,TRUE,
  JSON_OBJECT(
    'eyebrow','ABOUT MY DREAM','title','讓 AI 創造故事，','subtitle','讓世界愛上原創角色。',
    'description','My Dream 致力打造全球 AI 原創 IP 娛樂平台，\n通過 AI 技術結合故事、角色與世界觀，\n創造漫畫、漫劇、動畫、音樂與互動內容。',
    'backgroundMediaId','962b49b5-c217-36cf-a7d9-48ff8405837c','backgroundPosition','center center','mobileBackgroundPosition','56% center'
  ),
  JSON_OBJECT('titleColor','#ffffff','textColor','#ffd16f','descriptionColor','#c7d0df','eyebrowColor','#f4bd4d','titleFontSize',53,'minHeight',590,'copyWidth',570,'overlay',0.72,'align','left')
FROM cms_page page
JOIN cms_page_version version ON version.page_id=page.id AND version.version_no=(SELECT MAX(latest.version_no) FROM cms_page_version latest WHERE latest.page_id=page.id)
JOIN cms_block_definition definition ON definition.type_key='hero' AND definition.schema_version=1
WHERE page.site_id=1 AND page.path='/about';

INSERT INTO cms_page_block
  (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'story',1,TRUE,
  JSON_OBJECT(
    'eyebrow','BRAND STORY','title','品牌故事',
    'description','娛樂產業正在迎來新的轉變。\n過去，內容的價值來自一次觀看；未來，價值來自能持續成長的角色與世界。\n\nMy Dream 不只是創造影片，而是打造具有生命力的 AI 原創 IP。',
    'backgroundMediaId','6cd7b92f-c5d5-3950-9038-9bfb8a5d2472','backgroundPosition','center center'
  ),
  JSON_OBJECT('titleColor','#f4bd4d','descriptionColor','#c0cbd9','eyebrowColor','#f4bd4d','titleFontSize',36,'backgroundColor','#07101d','paddingTop',30,'paddingBottom',30,'columns',2,'gap',14,'align','left')
FROM cms_page page
JOIN cms_page_version version ON version.page_id=page.id AND version.version_no=(SELECT MAX(latest.version_no) FROM cms_page_version latest WHERE latest.page_id=page.id)
JOIN cms_block_definition definition ON definition.type_key='rich-text' AND definition.schema_version=1
WHERE page.site_id=1 AND page.path='/about';

INSERT INTO cms_page_block
  (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'platform',2,TRUE,
  JSON_OBJECT(
    'eyebrow','OUR PLATFORM','title','多元內容 × 學習 × 素材','description','My Dream 提供多元內容與豐富資源，陪伴你在娛樂、學習與創作的旅程中不斷探索與成長。',
    'cardOneTitle','AI 短劇','cardOneDescription','沉浸式故事娛樂體驗，原創劇情、豐富題材、多元世界觀。','cardOneAction','立即觀看','cardOneHref','/works','cardOneImageMediaId','f2ec4fdd-4b6b-3c49-9736-4cd52e75e641',
    'cardTwoTitle','AI 教學影片','cardTwoDescription','從基礎到進階，涵蓋 AI 影像、配音、剪輯與特效。','cardTwoAction','立即學習','cardTwoHref','/universe','cardTwoImageMediaId','33e2847e-3392-3944-801c-b04111a1672b',
    'cardThreeTitle','AI 素材庫','cardThreeDescription','角色、場景、音效、音樂與特效等高品質素材。','cardThreeAction','探索素材','cardThreeHref','/creator','cardThreeImageMediaId','c1f1df8f-3308-3331-a74a-5a7f61935eb1'
  ),
  JSON_OBJECT('titleColor','#ffffff','descriptionColor','#aebed1','eyebrowColor','#f4bd4d','titleFontSize',36,'backgroundColor','#07101d','paddingTop',28,'paddingBottom',28,'columns',3,'gap',15,'align','left')
FROM cms_page page
JOIN cms_page_version version ON version.page_id=page.id AND version.version_no=(SELECT MAX(latest.version_no) FROM cms_page_version latest WHERE latest.page_id=page.id)
JOIN cms_block_definition definition ON definition.type_key='feature-cards' AND definition.schema_version=1
WHERE page.site_id=1 AND page.path='/about';

INSERT INTO cms_page_block
  (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'join',3,TRUE,
  JSON_OBJECT(
    'eyebrow','JOIN MY DREAM','title','加入 My Dream','subtitle','開啟你的 AI 創作之旅',
    'description','無論你是喜愛故事的觀眾，還是探索 AI 創作的創作者，都能在 My Dream 找到屬於自己的精彩。','backgroundPosition','center center'
  ),
  JSON_OBJECT('titleColor','#ffffff','textColor','#f4bd4d','descriptionColor','#aebed0','eyebrowColor','#f4bd4d','titleFontSize',34,'backgroundColor','#07101d','paddingTop',28,'paddingBottom',28,'columns',4,'gap',12,'align','left')
FROM cms_page page
JOIN cms_page_version version ON version.page_id=page.id AND version.version_no=(SELECT MAX(latest.version_no) FROM cms_page_version latest WHERE latest.page_id=page.id)
JOIN cms_block_definition definition ON definition.type_key='cta' AND definition.schema_version=1
WHERE page.site_id=1 AND page.path='/about';

INSERT INTO cms_page_block
  (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'banner',4,TRUE,
  JSON_OBJECT(
    'eyebrow','MY DREAM','title','讓娛樂激發靈感，讓 AI 連結創意。','description','',
    'backgroundMediaId','c1f1df8f-3308-3331-a74a-5a7f61935eb1','backgroundPosition','center 58%'
  ),
  JSON_OBJECT('titleColor','#f4bd4d','descriptionColor','#c0cbd9','eyebrowColor','#ffffff','titleFontSize',22,'backgroundColor','#020817','paddingTop',45,'paddingBottom',45,'columns',1,'gap',0,'align','center')
FROM cms_page page
JOIN cms_page_version version ON version.page_id=page.id AND version.version_no=(SELECT MAX(latest.version_no) FROM cms_page_version latest WHERE latest.page_id=page.id)
JOIN cms_block_definition definition ON definition.type_key='rich-text' AND definition.schema_version=1
WHERE page.site_id=1 AND page.path='/about';

-- 现有本地环境立即切到新版 About；后续后台保存仍按正常发布流程生成新快照。
INSERT INTO cms_release_page(release_id,page_id,page_version_id)
SELECT site.active_release_id,page.id,version.id
FROM cms_site site
JOIN cms_page page ON page.site_id=site.id AND page.path='/about' AND page.locale='zh-Hant'
JOIN cms_page_version version ON version.page_id=page.id AND version.version_no=(SELECT MAX(latest.version_no) FROM cms_page_version latest WHERE latest.page_id=page.id)
WHERE site.id=1 AND site.active_release_id IS NOT NULL
ON DUPLICATE KEY UPDATE page_version_id=VALUES(page_version_id);
