-- 将 AI 创作中心的教学、社群与资源入口纳入固定页面 CMS 管理。
INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'tutorials',3,TRUE,
  JSON_OBJECT('title','AI 教學影片','description','從基礎到進階，學會 AI 創作的關鍵技巧','backgroundUrl',''),
  JSON_OBJECT('titleColor','#f1c45b','descriptionColor','#9cabbc','backgroundColor','#030a1b','titleFontSize',27,'paddingTop',18,'paddingBottom',34,'columns',4,'gap',14,'align','left')
FROM cms_page page
JOIN cms_page_version version ON version.page_id=page.id
JOIN cms_block_definition definition ON definition.type_key='content-grid' AND definition.schema_version=1
WHERE page.path='/universe'
  AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='tutorials');

INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(),version.id,definition.id,'community',4,TRUE,
  JSON_OBJECT('title','加入創作者社群，交流 AI 創作心得，\n獲得更多靈感與資源！','actionLabel','立即加入社群','actionHref','/download','backgroundUrl',''),
  JSON_OBJECT('titleColor','#f1c45b','descriptionColor','#9cabbc','backgroundColor','#030a1b','titleFontSize',20,'paddingTop',14,'paddingBottom',18,'columns',1,'gap',14,'align','left')
FROM cms_page page
JOIN cms_page_version version ON version.page_id=page.id
JOIN cms_block_definition definition ON definition.type_key='content-grid' AND definition.schema_version=1
WHERE page.path='/universe'
  AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='community');

INSERT INTO cms_page_block (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,
  props_json,style_json)
SELECT UUID(),version.id,definition.id,'quicklinks',5,TRUE,
  JSON_OBJECT(
    'title','AI 創作中心快速入口',
    'linkOneTitle','新手入門指南','linkOneDescription','快速了解 AI 創作','linkOneHref','#ai-tutorials',
    'linkTwoTitle','創作工具推薦','linkTwoDescription','精選實用工具','linkTwoHref','/universe/prompts',
    'linkThreeTitle','熱門提示詞','linkThreeDescription','社群常用精選','linkThreeHref','/universe/prompts',
    'linkFourTitle','創作案例分享','linkFourDescription','看更多精彩作品','linkFourHref','/universe/videos',
    'backgroundUrl',''),
  JSON_OBJECT('titleColor','#f1c45b','descriptionColor','#9cabbc','backgroundColor','#030a1b','titleFontSize',18,'paddingTop',0,'paddingBottom',0,'columns',4,'gap',14,'align','left')
FROM cms_page page
JOIN cms_page_version version ON version.page_id=page.id
JOIN cms_block_definition definition ON definition.type_key='content-grid' AND definition.schema_version=1
WHERE page.path='/universe'
  AND NOT EXISTS (SELECT 1 FROM cms_page_block block WHERE block.page_version_id=version.id AND block.zone_key='quicklinks');
