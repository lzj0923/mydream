-- 作品默认采用“全集显示、前 4 集免费试看”的 APP 解锁策略。
UPDATE cms_content_version version_row
JOIN cms_content_entry entry_row ON entry_row.id=version_row.content_entry_id
SET version_row.data_json=JSON_SET(version_row.data_json, '$.freeEpisodeCount', 4)
WHERE entry_row.content_type='work'
  AND JSON_EXTRACT(version_row.data_json, '$.freeEpisodeCount') IS NULL;

UPDATE cms_content_version version_row
JOIN cms_content_entry entry_row ON entry_row.id=version_row.content_entry_id
SET version_row.data_json=JSON_SET(version_row.data_json, '$.showAllEpisodes', TRUE)
WHERE entry_row.content_type='work'
  AND JSON_EXTRACT(version_row.data_json, '$.showAllEpisodes') IS NULL;
