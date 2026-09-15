-- 将主导航固定页面接入可视化 CMS；页面布局仍由前端组件锁定。
INSERT INTO cms_page (public_id,site_id,locale,path,page_key)
SELECT UUID(),1,'zh-Hant',seed.path,seed.page_key
FROM (
  SELECT '/universe' path,'universe' page_key UNION ALL
  SELECT '/tasks','pricing' UNION ALL
  SELECT '/news','news' UNION ALL
  SELECT '/about','about' UNION ALL
  SELECT '/contact','contact'
) seed
WHERE NOT EXISTS (SELECT 1 FROM cms_page page WHERE page.site_id=1 AND page.path=seed.path AND page.locale='zh-Hant');

INSERT INTO cms_page_version (public_id,page_id,version_no,title,seo_json,status,change_note)
SELECT UUID(),page.id,1,
  CASE page.path WHEN '/universe' THEN 'AI宇宙' WHEN '/tasks' THEN '价目表' WHEN '/news' THEN '最新消息' WHEN '/about' THEN '关于我们' ELSE '联系我们' END,
  JSON_OBJECT(
    'title',CASE page.path WHEN '/universe' THEN 'AI宇宙｜学习・创造・启发' WHEN '/tasks' THEN '价目表' WHEN '/news' THEN '最新消息' WHEN '/about' THEN '关于我们' ELSE '联系我们' END,
    'description',CASE page.path WHEN '/universe' THEN '观看原创 AI 影片、探索提示词技巧并学习 AI 创作流程。' WHEN '/tasks' THEN '选择适合你的金币与会员方案。' WHEN '/news' THEN '掌握 MY DREAM 最新活动与平台更新。' WHEN '/about' THEN '了解 MY DREAM AI 原创娱乐平台。' ELSE '与 MY DREAM 探索 AI 原创娱乐合作。' END
  ),'PUBLISHED','接入固定页面可视化管理'
FROM cms_page page
WHERE page.site_id=1 AND page.path IN ('/universe','/tasks','/news','/about','/contact')
  AND NOT EXISTS (SELECT 1 FROM cms_page_version version WHERE version.page_id=page.id);

-- AI 宇宙
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'hero',0,TRUE,
 JSON_OBJECT('eyebrow','AI 宇宙','title','探索 AI 的無限宇宙，\n學習・創造・啟發','description','在這裡，你可以觀看原創 AI 影片、探索提示詞技巧、學習 AI 創作流程，開啟屬於你的創意之旅。','backgroundUrl','/prototype/jyg/ip-worlds.webp','backgroundPosition','58% 50%'),
 JSON_OBJECT('titleColor','#f4c542','descriptionColor','#cad6e7','eyebrowColor','#ffffff','titleFontSize',58,'minHeight',590,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='hero' AND definition.schema_version=1
WHERE page.path='/universe' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='hero');
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'categories',1,TRUE,JSON_OBJECT('title','學習分類','description','選擇適合你的 AI 學習與創作內容。','backgroundUrl',''),JSON_OBJECT('titleColor','#f4c542','descriptionColor','#aabbd0','backgroundColor','#07101d','titleFontSize',32,'paddingTop',50,'paddingBottom',46,'columns',4,'gap',14,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='category-tabs' AND definition.schema_version=1 WHERE page.path='/universe' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='categories');
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'content',2,TRUE,JSON_OBJECT('title','最新內容','description','查看最新上架的 AI 原創與教學內容。','backgroundUrl',''),JSON_OBJECT('titleColor','#f4c542','descriptionColor','#aabbd0','backgroundColor','#050b16','titleFontSize',32,'paddingTop',54,'paddingBottom',72,'columns',4,'gap',14,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='content-grid' AND definition.schema_version=1 WHERE page.path='/universe' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='content');

-- 价目表
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'hero',0,TRUE,JSON_OBJECT('eyebrow','AI ORIGINAL ENTERTAINMENT','title','價目表','subtitle','選擇適合你的方案，\n暢享 AI 原創短劇內容','description','充值金幣，解鎖更多精彩短劇內容；開通會員，享受高清觀看與更多會員福利。','backgroundUrl','/assets/jyg/pricing-hero-ai-energy-city-hd.png','backgroundPosition','50% 50%'),JSON_OBJECT('titleColor','#f4c542','textColor','#edf2fa','descriptionColor','#b8c4d7','eyebrowColor','#ffffff','titleFontSize',72,'minHeight',590,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='hero' AND definition.schema_version=1 WHERE page.path='/tasks' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='hero');
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'coins',1,TRUE,JSON_OBJECT('eyebrow','COIN RECHARGE','title','金幣充值','description','充值金幣，解鎖更多精彩內容與專屬服務','backgroundUrl',''),JSON_OBJECT('titleColor','#f4c542','descriptionColor','#aabbd0','backgroundColor','#041126','titleFontSize',34,'paddingTop',64,'paddingBottom',64,'columns',4,'gap',16,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='pricing-grid' AND definition.schema_version=1 WHERE page.path='/tasks' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='coins');
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'membership',2,TRUE,JSON_OBJECT('eyebrow','DRAMA MEMBERSHIP','title','短劇會員充值','description','開通會員，暢享海量優質短劇內容','backgroundUrl',''),JSON_OBJECT('titleColor','#f4c542','descriptionColor','#aabbd0','backgroundColor','#06101f','titleFontSize',34,'paddingTop',64,'paddingBottom',64,'columns',4,'gap',16,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='pricing-grid' AND definition.schema_version=1 WHERE page.path='/tasks' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='membership');

-- 最新消息
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'hero',0,TRUE,JSON_OBJECT('eyebrow','LATEST NEWS','title','最新消息','description','掌握 My Dream 最新活動、平台更新與 AI 原創娛樂相關資訊。','backgroundUrl','/assets/jyg/news-hero-ai-information-center-hd.png','backgroundPosition','50% 50%'),JSON_OBJECT('titleColor','#f4c542','descriptionColor','#cad6e7','eyebrowColor','#ffffff','titleFontSize',64,'minHeight',540,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='hero' AND definition.schema_version=1 WHERE page.path='/news' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='hero');
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'news-library',1,TRUE,JSON_OBJECT('title','最新消息列表','description','管理消息区域的背景与展示格式。','backgroundUrl',''),JSON_OBJECT('backgroundColor','#050b16','paddingTop',48,'paddingBottom',72,'columns',2,'gap',18,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='content-grid' AND definition.schema_version=1 WHERE page.path='/news' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='news-library');

-- 关于我们
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'hero',0,TRUE,JSON_OBJECT('eyebrow','ABOUT MY DREAM · AI ORIGINAL ENTERTAINMENT','title','關於我們','subtitle','開啟 AI 原創娛樂新時代','description','我們打造下一代 AI 原創娛樂平台，用科技與創意，為全球用戶帶來更精彩的數位娛樂體驗。','backgroundUrl','/assets/jyg/about-hero-journey-to-west-hd.png','backgroundPosition','50% 50%'),JSON_OBJECT('titleColor','#f4c542','textColor','#ffffff','descriptionColor','#cad6e7','eyebrowColor','#ffffff','titleFontSize',64,'minHeight',590,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='hero' AND definition.schema_version=1 WHERE page.path='/about' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='hero');
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'capabilities',1,TRUE,JSON_OBJECT('eyebrow','ABOUT MY DREAM · 01','title','關於劇有梗','subtitle','AI 原創娛樂平台，重新定義內容生產方式。','description','以 AI 短劇、漫劇、動畫與角色宇宙，打造連接創意、內容與全球觀眾的新世代娛樂體驗。','backgroundUrl',''),JSON_OBJECT('titleColor','#f4c542','textColor','#ffffff','descriptionColor','#aabbd0','backgroundColor','#07101d','titleFontSize',42,'paddingTop',72,'paddingBottom',72,'columns',4,'gap',14,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='feature-cards' AND definition.schema_version=1 WHERE page.path='/about' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='capabilities');
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'vision',2,TRUE,JSON_OBJECT('eyebrow','OUR VISION · 02','title','我們的願景','subtitle','讓每一個故事，\n都有機會被世界看見。','description','讓 AI 成為創意的延伸，讓每一個原創世界都能被看見、被體驗，並跨越語言與市場。','backgroundUrl','/prototype/jyg/ip-worlds.webp','backgroundPosition','center center'),JSON_OBJECT('titleColor','#f4c542','textColor','#ffffff','descriptionColor','#cad6e7','eyebrowColor','#ffffff','titleFontSize',42,'minHeight',520,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='rich-text' AND definition.schema_version=1 WHERE page.path='/about' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='vision');
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'business',3,TRUE,JSON_OBJECT('eyebrow','BUSINESS ECOSYSTEM · 03','title','商業布局','description','管理商業合作方向與區塊展示。','backgroundUrl',''),JSON_OBJECT('titleColor','#f4c542','descriptionColor','#aabbd0','backgroundColor','#050b16','titleFontSize',42,'paddingTop',72,'paddingBottom',72,'columns',4,'gap',14,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='content-grid' AND definition.schema_version=1 WHERE page.path='/about' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='business');

-- 联系我们
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'hero',0,TRUE,JSON_OBJECT('eyebrow','CONTACT US','title','聯絡我們','subtitle','與劇有梗一起探索\nAI 原創娛樂合作新可能。','description','無論是 IP 授權、品牌合作、內容合作或海外市場拓展，我們期待與您建立連結。','backgroundUrl','/assets/jyg/contact-hero-global-network-hd.png','backgroundPosition','50% 50%'),JSON_OBJECT('titleColor','#f4c542','textColor','#ffffff','descriptionColor','#cad6e7','eyebrowColor','#ffffff','titleFontSize',60,'minHeight',560,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='hero' AND definition.schema_version=1 WHERE page.path='/contact' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='hero');
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'contact-form',1,TRUE,JSON_OBJECT('eyebrow','BUSINESS COLLABORATION · 04','title','聯絡我們','description','串聯原創 IP、品牌與全球市場，一起創造下一個娛樂新世界。','backgroundUrl',''),JSON_OBJECT('titleColor','#f4c542','descriptionColor','#cad6e7','backgroundColor','#050b16','titleFontSize',42,'paddingTop',72,'paddingBottom',72,'align','left')
FROM cms_page page JOIN cms_page_version version ON version.page_id=page.id JOIN cms_block_definition definition ON definition.type_key='contact-form' AND definition.schema_version=1 WHERE page.path='/contact' AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='contact-form');

-- 让新增页面立即进入当前发布快照；后续每次后台保存会正常生成新快照。
INSERT IGNORE INTO cms_release_page (release_id,page_id,page_version_id)
SELECT site.active_release_id,page.id,version.id
FROM cms_site site JOIN cms_page page ON page.site_id=site.id JOIN cms_page_version version ON version.page_id=page.id
WHERE site.id=1 AND site.active_release_id IS NOT NULL AND page.path IN ('/universe','/tasks','/news','/about','/contact') AND version.version_no=1;
