-- 作品题材分类统一为后台可筛选的新分类，保留语义最接近的历史映射。
UPDATE cms_content_version version_row
JOIN cms_content_entry entry_row ON entry_row.id=version_row.content_entry_id
SET version_row.data_json=JSON_REPLACE(version_row.data_json, '$.genre', '腦洞')
WHERE entry_row.content_type='work'
  AND JSON_UNQUOTE(JSON_EXTRACT(version_row.data_json, '$.genre'))='科幻';

UPDATE cms_content_version version_row
JOIN cms_content_entry entry_row ON entry_row.id=version_row.content_entry_id
SET version_row.data_json=JSON_REPLACE(version_row.data_json, '$.genre', '奇幻')
WHERE entry_row.content_type='work'
  AND JSON_UNQUOTE(JSON_EXTRACT(version_row.data_json, '$.genre'))='玄幻';

UPDATE cms_content_version version_row
JOIN cms_content_entry entry_row ON entry_row.id=version_row.content_entry_id
SET version_row.data_json=JSON_REPLACE(version_row.data_json, '$.genre', '現代')
WHERE entry_row.content_type='work'
  AND JSON_UNQUOTE(JSON_EXTRACT(version_row.data_json, '$.genre'))='愛情';
