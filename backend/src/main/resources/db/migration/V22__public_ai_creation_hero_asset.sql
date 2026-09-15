-- 内置的 AI 创作中心背景随前端发布，不应依赖 CMS 媒体代理。
-- 只迁移这一条历史默认值，保留管理员上传的自定义背景。
UPDATE cms_page_block block_row
JOIN cms_page_version version_row ON version_row.id = block_row.page_version_id
JOIN cms_page page_row ON page_row.id = version_row.page_id
SET block_row.props_json = JSON_SET(
  block_row.props_json,
  '$.backgroundUrl', '/assets/jyg/ai-creation-center-hero-v1.png'
)
WHERE page_row.path = '/universe'
  AND block_row.zone_key = 'hero'
  AND JSON_UNQUOTE(JSON_EXTRACT(block_row.props_json, '$.backgroundUrl')) =
    '/cms-media/assets/jyg/ai-creation-center-hero-v1.png';
