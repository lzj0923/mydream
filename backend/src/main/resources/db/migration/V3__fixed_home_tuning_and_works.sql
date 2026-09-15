-- 固定首页微调模型：布局由前端锁定，后台只管理文案、视觉参数和作品数据。
UPDATE cms_page_block block
JOIN cms_block_definition definition ON definition.id = block.block_definition_id
JOIN cms_page_version version ON version.id = block.page_version_id
JOIN cms_page page ON page.id = version.page_id
SET block.props_json = JSON_OBJECT(
      'eyebrow','AI + ORIGINAL IP + ENTERTAINMENT',
      'title','當 AI 開始創造故事',
      'subtitle','娛樂產業將重新定義',
      'description','打造全球領先的 AI 原創 IP 娛樂生態系。從世界觀與角色出發，延伸漫畫、漫劇、動畫、音樂與互動體驗。',
      'backgroundUrl','/assets/jyg/ai-universe-hero-v2.webp',
      'backgroundAlt','原創東方神話角色與未來城市構成的 AI 內容宇宙'
    ),
    block.style_json = JSON_OBJECT(
      'titleColor','#f4c542','descriptionColor','#cad6e7','eyebrowColor','#ffffff',
      'titleFontSize',56,'minHeight',620,'copyWidth',620
    )
WHERE page.path='/' AND version.version_no=1 AND definition.type_key='hero';

INSERT INTO cms_page_block
  (public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
SELECT UUID(), version.id, definition.id, 'main', 1, TRUE,
  JSON_OBJECT(
    'eyebrow','HOT AI ORIGINALS',
    'title','熱門 AI 原創作品',
    'description','12 部 AI 短劇、漫劇與動畫集中展示，從都市情感到科幻懸疑，快速找到現在就想看的故事。',
    'actionLabel','查看全部作品','actionHref','/universe'
  ),
  JSON_OBJECT(
    'titleColor','#f4c542','descriptionColor','#b9c7da','eyebrowColor','#19bfff',
    'titleFontSize',44,'backgroundColor','#060b16','paddingTop',64,'paddingBottom',82
  )
FROM cms_page_version version
JOIN cms_page page ON page.id=version.page_id
JOIN cms_block_definition definition ON definition.type_key='section-heading' AND definition.schema_version=1
WHERE page.path='/' AND version.version_no=1;

INSERT INTO cms_content_entry (public_id,site_id,locale,content_type,slug) VALUES
  (UUID(),1,'zh-Hant','work','du-jing-wu'),
  (UUID(),1,'zh-Hant','work','night-and-you'),
  (UUID(),1,'zh-Hant','work','song-mystery'),
  (UUID(),1,'zh-Hant','work','rising-star'),
  (UUID(),1,'zh-Hant','work','forbidden-romance'),
  (UUID(),1,'zh-Hant','work','three-needles'),
  (UUID(),1,'zh-Hant','work','reborn-heiress'),
  (UUID(),1,'zh-Hant','work','neon-trace'),
  (UUID(),1,'zh-Hant','work','spirit-city-files'),
  (UUID(),1,'zh-Hant','work','zero-echo'),
  (UUID(),1,'zh-Hant','work','destiny-reversed'),
  (UUID(),1,'zh-Hant','work','city-heart-proof');

INSERT INTO cms_content_version
  (public_id,content_entry_id,version_no,title,summary,data_json,featured,sort_weight,status,change_note)
SELECT UUID(), entry.id, 1,
  CASE entry.slug
    WHEN 'du-jing-wu' THEN '渡京霧' WHEN 'night-and-you' THEN '夜色與你'
    WHEN 'song-mystery' THEN '大宋懸王' WHEN 'rising-star' THEN '逆襲之星途璀璨'
    WHEN 'forbidden-romance' THEN '別和小叔談戀愛' WHEN 'three-needles' THEN '我以三針助你成皇'
    WHEN 'reborn-heiress' THEN '重生後我成了豪門' WHEN 'neon-trace' THEN '霓虹追跡者'
    WHEN 'spirit-city-files' THEN '靈城異聞錄' WHEN 'zero-echo' THEN '零號迴聲'
    WHEN 'destiny-reversed' THEN '天命逆轉局' ELSE '都會心證' END,
  CASE entry.slug
    WHEN 'du-jing-wu' THEN '迷霧籠罩的都市裡，幾段被命運牽引的關係，逐步揭開愛情與身份背後的真相。'
    WHEN 'night-and-you' THEN '霓虹城市裡，兩段被演算法錯配的人生再次相遇。'
    WHEN 'song-mystery' THEN '一卷失落圖譜，牽動朝堂與異聞世界的雙重真相。'
    WHEN 'rising-star' THEN '被遺忘的新人帶著第二次機會，重新改寫自己的舞台。'
    WHEN 'forbidden-romance' THEN '一紙家族協議，讓不能靠近的兩個人走進同一場局。'
    WHEN 'three-needles' THEN '醫術、權謀與異能交鋒，她以三針逆轉王朝命數。'
    WHEN 'reborn-heiress' THEN '醒來後所有人都認識她，唯獨她找不到自己的過去。'
    WHEN 'neon-trace' THEN '城市記憶遭到重寫，一名追跡者開始尋找真實版本。'
    WHEN 'spirit-city-files' THEN '每到午夜，城市就會出現一條只屬於異界的街道。'
    WHEN 'zero-echo' THEN '來自未來的訊號，每晚都在預告城市下一次消失。'
    WHEN 'destiny-reversed' THEN '當命運成為可交易的籌碼，最弱的人決定推翻規則。'
    ELSE '她能看見每句謊言的顏色，卻看不懂他的真心。' END,
  JSON_OBJECT(
    'format', CASE entry.slug WHEN 'song-mystery' THEN 'AI漫劇' WHEN 'three-needles' THEN 'AI漫劇' WHEN 'spirit-city-files' THEN 'AI漫劇' WHEN 'destiny-reversed' THEN 'AI漫劇' WHEN 'neon-trace' THEN 'AI動畫' WHEN 'zero-echo' THEN 'AI動畫' ELSE 'AI短劇' END,
    'genre', CASE entry.slug WHEN 'song-mystery' THEN '懸疑' WHEN 'rising-star' THEN '都市' WHEN 'three-needles' THEN '玄幻' WHEN 'neon-trace' THEN '科幻' WHEN 'spirit-city-files' THEN '玄幻' WHEN 'zero-echo' THEN '科幻' WHEN 'destiny-reversed' THEN '玄幻' WHEN 'city-heart-proof' THEN '都市' ELSE '愛情' END,
    'episodeLabel', CASE entry.slug WHEN 'du-jing-wu' THEN '連載中 · 4 集' WHEN 'night-and-you' THEN '全 36 集' WHEN 'song-mystery' THEN '更新至 24 集' WHEN 'rising-star' THEN '全 42 集' WHEN 'forbidden-romance' THEN '全 30 集' WHEN 'three-needles' THEN '更新至 28 集' WHEN 'reborn-heiress' THEN '全 40 集' WHEN 'neon-trace' THEN '更新至 16 集' WHEN 'spirit-city-files' THEN '全 26 集' WHEN 'zero-echo' THEN '更新至 12 集' WHEN 'destiny-reversed' THEN '全 32 集' ELSE '更新至 20 集' END,
    'heat', CASE entry.slug WHEN 'du-jing-wu' THEN 'NEW' WHEN 'night-and-you' THEN '9.8' WHEN 'song-mystery' THEN '9.6' WHEN 'rising-star' THEN '9.5' WHEN 'forbidden-romance' THEN '9.3' WHEN 'three-needles' THEN '9.2' WHEN 'reborn-heiress' THEN '9.1' WHEN 'neon-trace' THEN '8.9' WHEN 'spirit-city-files' THEN '8.8' WHEN 'zero-echo' THEN '8.7' WHEN 'destiny-reversed' THEN '8.6' ELSE '8.5' END,
    'href', CONCAT('/works/',entry.slug),
    'imageUrl', CASE entry.slug WHEN 'du-jing-wu' THEN '/prototype/jyg/works/du-jing-wu/cover.jpg' WHEN 'night-and-you' THEN '/assets/v2/drama-night-and-you.webp' WHEN 'song-mystery' THEN '/assets/v2/drama-song-mystery.webp' WHEN 'rising-star' THEN '/assets/v2/drama-rising-star.webp' WHEN 'forbidden-romance' THEN '/assets/v2/drama-forbidden-romance.webp' WHEN 'three-needles' THEN '/assets/v2/drama-three-needles.webp' WHEN 'reborn-heiress' THEN '/assets/v2/drama-reborn-heiress.webp' WHEN 'neon-trace' THEN '/assets/v2/drama-night-and-you.webp' WHEN 'spirit-city-files' THEN '/assets/v2/drama-song-mystery.webp' WHEN 'zero-echo' THEN '/assets/v2/drama-rising-star.webp' WHEN 'destiny-reversed' THEN '/assets/v2/drama-three-needles.webp' ELSE '/assets/v2/drama-forbidden-romance.webp' END,
    'imageAlt', CONCAT('《', CASE entry.slug WHEN 'du-jing-wu' THEN '渡京霧' WHEN 'night-and-you' THEN '夜色與你' WHEN 'song-mystery' THEN '大宋懸王' WHEN 'rising-star' THEN '逆襲之星途璀璨' WHEN 'forbidden-romance' THEN '別和小叔談戀愛' WHEN 'three-needles' THEN '我以三針助你成皇' WHEN 'reborn-heiress' THEN '重生後我成了豪門' WHEN 'neon-trace' THEN '霓虹追跡者' WHEN 'spirit-city-files' THEN '靈城異聞錄' WHEN 'zero-echo' THEN '零號迴聲' WHEN 'destiny-reversed' THEN '天命逆轉局' ELSE '都會心證' END, '》AI 原創作品封面'),
    'visible',TRUE,
    'isNew', entry.slug IN ('du-jing-wu','night-and-you','song-mystery','rising-star')
  ),
  TRUE,
  1300 - entry.id,
  'PUBLISHED',
  '初始化首页作品卡片'
FROM cms_content_entry entry
WHERE entry.site_id=1 AND entry.content_type='work';

INSERT INTO cms_release_content (release_id,content_entry_id,content_version_id)
SELECT site_release.id, entry.id, version.id
FROM cms_site_release site_release
JOIN cms_content_entry entry ON entry.site_id=site_release.site_id AND entry.content_type='work'
JOIN cms_content_version version ON version.content_entry_id=entry.id AND version.version_no=1
WHERE site_release.id=1;
