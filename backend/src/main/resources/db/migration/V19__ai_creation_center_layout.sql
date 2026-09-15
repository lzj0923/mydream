-- 将 AI 宇宙入口升级为 AI 创作中心；只替换历史默认背景，保留管理员上传的自定义背景。
UPDATE cms_page_block block_row
JOIN cms_page_version version_row ON version_row.id = block_row.page_version_id
JOIN cms_page page_row ON page_row.id = version_row.page_id
SET block_row.props_json = JSON_SET(
      block_row.props_json,
      '$.title', 'AI 創作中心',
      '$.description', '從原創成片、實戰教學到提示詞資源，\n一站式探索 AI 創作的無限可能。',
      '$.backgroundUrl', '/cms-media/assets/jyg/ai-creation-center-hero-v1.png',
      '$.backgroundPosition', '50% 50%',
      '$.mobileBackgroundPosition', '72% 50%'
    ),
    block_row.style_json = JSON_SET(
      block_row.style_json,
      '$.titleColor', '#f4c542',
      '$.descriptionColor', '#e5e5e1',
      '$.titleFontSize', 72,
      '$.minHeight', 548,
      '$.overlay', 1
    )
WHERE page_row.path = '/universe'
  AND block_row.zone_key = 'hero'
  AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(block_row.props_json, '$.backgroundUrl')), '') IN (
    '',
    '/prototype/jyg/ip-worlds.webp',
    '/cms-media/prototype/jyg/ip-worlds.webp'
  );

-- 内容仍来自原有原创影片与教学影片资料，只更新入口页的栏目名称。
UPDATE cms_page_block block_row
JOIN cms_page_version version_row ON version_row.id = block_row.page_version_id
JOIN cms_page page_row ON page_row.id = version_row.page_id
SET block_row.props_json = JSON_SET(
      block_row.props_json,
      '$.title', 'AI 原創影片',
      '$.description', '探索最新 AI 原創短劇與動畫作品'
    )
WHERE page_row.path = '/universe'
  AND block_row.zone_key = 'content'
  AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(block_row.props_json, '$.title')), '') IN (
    '',
    '最新內容',
    '最新 AI 內容',
    '最新AI內容',
    '最新原創影片'
  );

-- 将旧区块的默认样式同步为新入口页基线；后续仍可在后台继续调整。
UPDATE cms_page_block block_row
JOIN cms_page_version version_row ON version_row.id = block_row.page_version_id
JOIN cms_page page_row ON page_row.id = version_row.page_id
SET block_row.style_json = JSON_SET(
      block_row.style_json,
      '$.backgroundColor', '#030a1b',
      '$.paddingTop', 0,
      '$.paddingBottom', 46,
      '$.columns', 3,
      '$.gap', 16
    )
WHERE page_row.path = '/universe'
  AND block_row.zone_key = 'categories';

UPDATE cms_page_block block_row
JOIN cms_page_version version_row ON version_row.id = block_row.page_version_id
JOIN cms_page page_row ON page_row.id = version_row.page_id
SET block_row.style_json = JSON_SET(
      block_row.style_json,
      '$.backgroundColor', '#030a1b',
      '$.paddingTop', 8,
      '$.paddingBottom', 34,
      '$.columns', 4,
      '$.gap', 14
    )
WHERE page_row.path = '/universe'
  AND block_row.zone_key = 'content';

UPDATE cms_page_version version_row
JOIN cms_page page_row ON page_row.id = version_row.page_id
SET version_row.title = 'AI 創作中心',
    version_row.seo_json = JSON_SET(
      version_row.seo_json,
      '$.title', 'AI創作中心｜學習・創造・啟發',
      '$.description', '在 AI 創作中心觀看原創影片、探索提示詞資源並學習 AI 創作流程。'
    )
WHERE page_row.path = '/universe';
