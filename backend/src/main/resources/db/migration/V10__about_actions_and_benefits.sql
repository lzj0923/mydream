-- About 的按钮与“加入平台”四项功能也交给 CMS 管理。
UPDATE cms_page_block block
JOIN cms_page_version version ON version.id=block.page_version_id
JOIN cms_page page ON page.id=version.page_id AND page.site_id=1 AND page.path='/about' AND page.locale='zh-Hant'
SET block.props_json=JSON_SET(block.props_json,
  '$.actionLabel','認識 My Dream',
  '$.actionHref','/universe'
)
WHERE version.version_no=(SELECT MAX(latest.version_no) FROM cms_page_version latest WHERE latest.page_id=page.id)
  AND block.zone_key IN ('hero','story');

UPDATE cms_page_block block
JOIN cms_page_version version ON version.id=block.page_version_id
JOIN cms_page page ON page.id=version.page_id AND page.site_id=1 AND page.path='/about' AND page.locale='zh-Hant'
SET block.props_json=JSON_SET(block.props_json,
  '$.actionLabel','立即加入我們',
  '$.actionHref','/download',
  '$.benefitOneTitle','觀看精彩內容',
  '$.benefitOneDescription','沉浸於 AI 原創故事，探索更多精彩世界。',
  '$.benefitTwoTitle','學習創作技能',
  '$.benefitTwoDescription','學習 AI 工具與創作技巧，從新手到高手。',
  '$.benefitThreeTitle','分享創作靈感',
  '$.benefitThreeDescription','與創作者交流、互動，讓想法被看見。',
  '$.benefitFourTitle','實現無限創意',
  '$.benefitFourDescription','利用平台資源與工具，將想像化為現實。'
)
WHERE version.version_no=(SELECT MAX(latest.version_no) FROM cms_page_version latest WHERE latest.page_id=page.id)
  AND block.zone_key='join';

