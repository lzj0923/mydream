-- 关于我们「AI 素材库」入口改为立即创作，并跳转 AI 宇宙提示词。
UPDATE cms_page_block block_row
JOIN cms_page_version version_row ON version_row.id=block_row.page_version_id
JOIN cms_page page_row ON page_row.id=version_row.page_id
SET block_row.props_json=JSON_SET(
  JSON_SET(block_row.props_json,'$.cardThreeAction','立即創作'),
  '$.cardThreeHref','/universe/prompts'
)
WHERE page_row.path='/about' AND block_row.zone_key='platform';
