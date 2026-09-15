-- AI 宇宙的原创影片是独立内容，不再复用作品剧集。
INSERT INTO cms_content_entry(public_id,site_id,locale,content_type,slug)
SELECT UUID(),site.id,'zh-Hant','original-video',seed.slug
FROM cms_site site
JOIN (
  SELECT 'star-traveler' slug UNION ALL
  SELECT 'endless-realm'
) seed
WHERE site.site_key='mydream'
  AND NOT EXISTS (
    SELECT 1 FROM cms_content_entry existing
    WHERE existing.site_id=site.id AND existing.locale='zh-Hant'
      AND existing.content_type='original-video' AND existing.slug=seed.slug
  );

INSERT INTO cms_content_version
  (public_id,content_entry_id,version_no,title,summary,cover_media_id,data_json,featured,sort_weight,status,change_note)
SELECT UUID(),entry.id,1,seed.title,seed.summary,poster.id,
  JSON_OBJECT(
    'contentLabel',seed.content_label,
    'duration',seed.duration_label,
    'durationSeconds',seed.duration_seconds,
    'views','待統計',
    'publishedAt','2026/06',
    'videoMediaId',seed.video_public_id,
    'href',CONCAT('/universe/videos/',seed.slug),
    'posterAlt',seed.poster_alt,
    'visible',TRUE
  ),
  TRUE,seed.sort_weight,'PUBLISHED','迁移 AI 宇宙原创影片'
FROM (
  SELECT
    'star-traveler' slug,'《星之旅人》' title,'AI 原創動畫' content_label,
    '循著海岸與光的方向前進，一段關於旅程、記憶與重新出發的 AI 原創短片。' summary,
    '00:15' duration_label,15.09 duration_seconds,200 sort_weight,
    '68b37610-63f5-38d5-8320-001a5e1594bc' poster_public_id,
    '970e7fb0-81ba-356c-b66b-0260151311b7' video_public_id,
    '《星之旅人》AI 原創動畫影片封面' poster_alt
  UNION ALL SELECT
    'endless-realm','《無盡之境》','AI 科幻概念短片',
    '當機械樂團喚醒沉睡城市，聲音成為穿越未知世界的第一道訊號。',
    '00:08',8.45,100,
    '5e34026d-2a9f-3634-9f59-653f7e67fb8e',
    'e840a90d-1ad4-3610-8f67-8406d1a580c3',
    '《無盡之境》AI 科幻概念影片封面'
) seed
JOIN cms_site site ON site.site_key='mydream'
JOIN cms_content_entry entry
  ON entry.site_id=site.id AND entry.locale='zh-Hant'
  AND entry.content_type='original-video' AND entry.slug=seed.slug
JOIN cms_media_asset poster
  ON poster.site_id=site.id AND poster.public_id=seed.poster_public_id
WHERE NOT EXISTS (
  SELECT 1 FROM cms_content_version version WHERE version.content_entry_id=entry.id
);

INSERT IGNORE INTO cms_release_content(release_id,content_entry_id,content_version_id)
SELECT site.active_release_id,entry.id,version.id
FROM cms_site site
JOIN cms_content_entry entry
  ON entry.site_id=site.id AND entry.content_type='original-video' AND entry.archived=FALSE
JOIN cms_content_version version
  ON version.content_entry_id=entry.id AND version.version_no=1
WHERE site.site_key='mydream' AND site.active_release_id IS NOT NULL;
