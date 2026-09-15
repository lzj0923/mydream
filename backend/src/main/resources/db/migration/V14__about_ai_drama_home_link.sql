-- 关于我们「AI 短剧」入口定位到首页热门作品区。
UPDATE cms_page_block block_row
JOIN cms_page_version version_row ON version_row.id=block_row.page_version_id
JOIN cms_page page_row ON page_row.id=version_row.page_id
SET block_row.props_json=JSON_SET(block_row.props_json,'$.cardOneHref','/#ai-universe')
WHERE page_row.path='/about' AND block_row.zone_key='platform';
