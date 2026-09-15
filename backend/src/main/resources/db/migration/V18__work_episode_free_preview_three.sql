-- 作品统一显示全集，前 3 集免费试看，第 4 集起引导下载 APP。
UPDATE cms_content_version version_row
JOIN cms_content_entry entry_row ON entry_row.id=version_row.content_entry_id
SET version_row.data_json=JSON_SET(version_row.data_json, '$.freeEpisodeCount', 3, '$.showAllEpisodes', TRUE)
WHERE entry_row.content_type='work';
