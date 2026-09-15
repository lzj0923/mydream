-- 下载页保持前端固定布局；后台管理两个平台的文字、二维码与样式。
INSERT INTO cms_page (public_id,site_id,locale,path,page_key)
SELECT UUID(),1,'zh-Hant','/download','download'
WHERE NOT EXISTS (
  SELECT 1 FROM cms_page WHERE site_id=1 AND locale='zh-Hant' AND path='/download'
);

INSERT INTO cms_page_version (public_id,page_id,version_no,title,seo_json,status,change_note)
SELECT UUID(),page.id,1,'下載 APP',
  JSON_OBJECT('title','下載 APP｜MY DREAM','description','掃描 Android 或 iOS 專屬二維碼，安全下載 MY DREAM APP。'),
  'PUBLISHED','接入双平台二维码可视化管理'
FROM cms_page page
WHERE page.site_id=1 AND page.path='/download'
  AND NOT EXISTS (SELECT 1 FROM cms_page_version version WHERE version.page_id=page.id);

INSERT INTO cms_page_block
  (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'hero',0,TRUE,
  JSON_OBJECT(
    'eyebrow','MY DREAM APP',
    'title','下一個故事，從 My Dream 開始。',
    'description','選擇你的手機平台，掃描對應二維碼下載 MY DREAM APP。',
    'backgroundUrl','/cms-media/assets/v2/download.webp',
    'backgroundPosition','center center'
  ),
  JSON_OBJECT(
    'titleColor','#f4c542','descriptionColor','#cad6e7','eyebrowColor','#ffffff',
    'titleFontSize',58,'minHeight',560,'align','left'
  )
FROM cms_page page
JOIN cms_page_version version ON version.page_id=page.id
JOIN cms_block_definition definition ON definition.type_key='hero' AND definition.schema_version=1
WHERE page.path='/download'
  AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='hero');

INSERT INTO cms_page_block
  (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'store-status',1,TRUE,
  JSON_OBJECT(
    'eyebrow','DOWNLOAD MY DREAM',
    'title','選擇平台，掃描下載',
    'description','Android 與 iOS 使用各自的官方下載二維碼。',
    'androidTitle','Android 下載',
    'androidDescription','使用 Android 手機掃描此二維碼下載。',
    'androidQrMediaId','64ad7e29-0fa9-33d8-8ff9-3b42eb342ae8',
    'androidQrAlt','MY DREAM Android 下載二維碼',
    'iosTitle','iOS 下載',
    'iosDescription','使用 iPhone 或 iPad 掃描此二維碼下載。',
    'iosQrMediaId','58aaf607-07ba-3d6b-aaa2-8645b1787f64',
    'iosQrAlt','MY DREAM iOS 下載二維碼'
  ),
  JSON_OBJECT(
    'titleColor','#f4c542','descriptionColor','#aabbd0','eyebrowColor','#19bfff',
    'backgroundColor','#050b16','titleFontSize',42,'paddingTop',64,'paddingBottom',76,
    'columns',2,'gap',18,'radius',16,'align','left'
  )
FROM cms_page page
JOIN cms_page_version version ON version.page_id=page.id
JOIN cms_block_definition definition ON definition.type_key='feature-cards' AND definition.schema_version=1
WHERE page.path='/download'
  AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='store-status');

INSERT IGNORE INTO cms_release_page (release_id,page_id,page_version_id)
SELECT site.active_release_id,page.id,version.id
FROM cms_site site
JOIN cms_page page ON page.site_id=site.id
JOIN cms_page_version version ON version.page_id=page.id
WHERE site.id=1 AND site.active_release_id IS NOT NULL AND page.path='/download' AND version.version_no=1;
