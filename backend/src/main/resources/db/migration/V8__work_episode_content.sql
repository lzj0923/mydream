-- 每一集是独立内容条目，并通过 episode-of 关系关联所属作品。
INSERT INTO cms_content_entry(public_id,site_id,locale,content_type,slug)
SELECT UUID(),1,'zh-Hant','episode',seed.slug
FROM (
  SELECT 'du-jing-wu-ep01' slug UNION ALL
  SELECT 'du-jing-wu-ep02' UNION ALL
  SELECT 'du-jing-wu-ep03' UNION ALL
  SELECT 'du-jing-wu-ep04'
) seed
WHERE NOT EXISTS (
  SELECT 1 FROM cms_content_entry existing
  WHERE existing.site_id=1 AND existing.content_type='episode' AND existing.slug=seed.slug
);

INSERT INTO cms_content_version
  (public_id,content_entry_id,version_no,title,summary,cover_media_id,data_json,featured,sort_weight,status,change_note)
SELECT UUID(),episode.id,1,
  CONCAT('渡京霧 第 ',CAST(RIGHT(episode.slug,2) AS UNSIGNED),' 集'),
  CONCAT('《渡京霧》第 ',CAST(RIGHT(episode.slug,2) AS UNSIGNED),' 集完整内容。'),
  cover.id,
  JSON_OBJECT(
    'workId',work.public_id,
    'workSlug',work.slug,
    'workTitle','渡京霧',
    'episodeNumber',CAST(RIGHT(episode.slug,2) AS UNSIGNED),
    'episodeLabel',CONCAT('EP',RIGHT(episode.slug,2)),
    'contentLabel','AI 原創短劇',
    'duration','完整內容',
    'views','待統計',
    'publishedAt',CASE episode.slug
      WHEN 'du-jing-wu-ep01' THEN '2026/08/10'
      WHEN 'du-jing-wu-ep02' THEN '2026/08/11'
      WHEN 'du-jing-wu-ep03' THEN '2026/08/12'
      ELSE '2026/08/13' END,
    'videoMediaId',CASE episode.slug
      WHEN 'du-jing-wu-ep01' THEN '54dd310e-7f76-35a5-8be5-7012cd2edc2e'
      WHEN 'du-jing-wu-ep02' THEN '65b42192-ac65-308b-bec7-90124ec395bf'
      WHEN 'du-jing-wu-ep03' THEN '61d7a37e-4932-31c7-b9d1-677a83defd0c'
      ELSE '958b758e-8e8c-3633-8069-7704b3f64966' END,
    'visible',TRUE
  ),
  TRUE,100 + CAST(RIGHT(episode.slug,2) AS UNSIGNED),'PUBLISHED','迁移现有作品剧集'
FROM cms_content_entry episode
JOIN cms_content_entry work ON work.site_id=episode.site_id AND work.content_type='work' AND work.slug='du-jing-wu'
JOIN cms_media_asset cover ON cover.public_id='04719d93-ca7c-315e-a4a5-d8c87f0c412f' AND cover.site_id=episode.site_id
WHERE episode.site_id=1 AND episode.content_type='episode' AND episode.slug LIKE 'du-jing-wu-ep%'
  AND NOT EXISTS (SELECT 1 FROM cms_content_version version WHERE version.content_entry_id=episode.id);

INSERT INTO cms_content_relation(source_version_id,relation_type,target_entry_id,sort_order)
SELECT version.id,'episode-of',work.id,
       CAST(RIGHT(episode.slug,2) AS UNSIGNED)
FROM cms_content_entry episode
JOIN cms_content_version version ON version.content_entry_id=episode.id AND version.version_no=1
JOIN cms_content_entry work ON work.site_id=episode.site_id AND work.content_type='work' AND work.slug='du-jing-wu'
WHERE episode.site_id=1 AND episode.content_type='episode' AND episode.slug LIKE 'du-jing-wu-ep%'
  AND NOT EXISTS (
    SELECT 1 FROM cms_content_relation relation_row
    WHERE relation_row.source_version_id=version.id AND relation_row.relation_type='episode-of'
  );

INSERT IGNORE INTO cms_release_content(release_id,content_entry_id,content_version_id)
SELECT site.active_release_id,episode.id,version.id
FROM cms_site site
JOIN cms_content_entry episode ON episode.site_id=site.id AND episode.content_type='episode'
JOIN cms_content_version version ON version.content_entry_id=episode.id AND version.version_no=1
WHERE site.id=1 AND site.active_release_id IS NOT NULL;
