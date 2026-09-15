-- 将官网现有消息迁入 CMS；之后消息、正文区块与 SEO 都由后台维护。
INSERT INTO cms_content_entry(public_id,site_id,locale,content_type,slug)
SELECT UUID(),1,'zh-Hant','article',seed.slug
FROM (
  SELECT 'my-dream-ai-drama-app-launch-event' slug UNION ALL
  SELECT 'my-dream-app-update-announcement' UNION ALL
  SELECT 'member-preview-event' UNION ALL
  SELECT 'ai-entertainment-collaboration-announcement' UNION ALL
  SELECT 'what-is-ai-short-drama' UNION ALL
  SELECT 'ai-video-production-workflow' UNION ALL
  SELECT 'ai-entertainment-industry-trend'
) seed
WHERE NOT EXISTS (
  SELECT 1 FROM cms_content_entry existing
  WHERE existing.site_id=1 AND existing.locale='zh-Hant'
    AND existing.content_type='article' AND existing.slug=seed.slug
);

INSERT INTO cms_content_version
  (public_id,content_entry_id,version_no,title,summary,cover_media_id,data_json,featured,sort_weight,status,change_note)
SELECT UUID(),entry.id,1,seed.title,seed.summary,cover.id,
  JSON_OBJECT(
    'subtitle',seed.subtitle,
    'categoryId',seed.category_id,
    'category',seed.category_name,
    'author',seed.author_name,
    'publishedAt',seed.published_at,
    'coverImageMediaId',seed.cover_public_id,
    'coverAlt',seed.cover_alt,
    'visible',TRUE,
    'bodyBlocks',JSON_EXTRACT(seed.body_json,'$'),
    'seo',JSON_OBJECT(
      'title',seed.seo_title,
      'description',seed.summary,
      'keywords',JSON_ARRAY(seed.category_name,'AI娛樂','AI原創內容','MY DREAM'),
      'canonicalPath',CONCAT('/news/',seed.slug),
      'ogImageMediaId',seed.cover_public_id,
      'ogImageAlt',seed.cover_alt,
      'noIndex',FALSE
    )
  ),
  seed.featured,seed.sort_weight,'PUBLISHED','迁移官网现有消息至可视化消息管理'
FROM (
  SELECT
    'my-dream-ai-drama-app-launch-event' slug,
    'MY DREAM AI短劇APP正式上線｜AI短劇、AI教學一次滿足，8月限定活動開跑' title,
    '讓追劇與 AI 創作學習，在同一個平台展開。' subtitle,
    'MY DREAM AI短劇APP正式推出，結合AI短劇觀看與AI創作教學，8月推出星河啟航盛典，新用戶註冊、首充優惠、任務獎勵與好友邀請活動同步開跑。' summary,
    'activity-announcement' category_id,'活動公告' category_name,'My Dream 編輯部' author_name,'2026-08-12' published_at,
    '418e76b0-0501-355b-8582-f483f29d4c79' cover_public_id,'MY DREAM 星河啟航盛典 APP 上線限定活動' cover_alt,
    TRUE featured,700 sort_weight,
    'MY DREAM AI短劇APP正式上線｜AI短劇、AI教學與8月限定活動' seo_title,
    '[{"id":"launch-1","type":"paragraph","text":"想追劇，也想學會製作AI短劇？"},{"id":"launch-2","type":"paragraph","text":"MY DREAM AI短劇APP正式推出，結合 AI 短劇觀看與 AI 創作教學兩大功能，讓使用者不只可以追熱門短劇，也能從零開始了解AI短劇的製作方式。"},{"id":"launch-3","type":"heading1","text":"MY DREAM星河啟航盛典"},{"id":"launch-4","type":"paragraph","text":"為慶祝APP上線，8/12～8/31推出 MY DREAM星河啟航盛典。"},{"id":"launch-5","type":"heading2","text":"新用戶註冊送1000金幣"},{"id":"launch-6","type":"paragraph","text":"完成註冊即可獲得活動獎勵。"},{"id":"launch-7","type":"heading2","text":"首充限時優惠"},{"id":"launch-8","type":"paragraph","text":"完成首次充值，享限定優惠。"},{"id":"launch-9","type":"heading2","text":"新手任務與好友邀請"},{"id":"launch-10","type":"paragraph","text":"完成指定任務，或邀請好友一起追劇，即可解鎖活動獎勵。"},{"id":"launch-11","type":"quote","text":"看AI短劇、學AI創作，就從MY DREAM開始。"}]' body_json
  UNION ALL SELECT
    'my-dream-app-update-announcement','My Dream APP 體驗更新公告','內容探索與播放體驗全面升級。',
    '全新內容探索與播放體驗陸續開放，讓使用者更快找到想看的 AI 原創短劇。',
    'activity-announcement','活動公告','My Dream 編輯部','2026-08-10',
    '8cdcd3ac-d5e9-33f1-84a9-8df2c5e5b6e2','My Dream APP 更新公告視覺',TRUE,600,
    'My Dream APP 體驗更新公告｜內容探索與播放升級',
    '[{"id":"update-1","type":"paragraph","text":"My Dream 持續優化內容探索、作品分類與播放流程，讓每一次觀看都更直覺。"},{"id":"update-2","type":"paragraph","text":"本次更新將分階段開放，實際功能與上線時間以官方公告為準。"}]'
  UNION ALL SELECT
    'member-preview-event','AI 原創短劇會員搶先看活動','會員限定內容，搶先走進下一段故事。',
    '精選 AI 原創內容限時開放搶先體驗，邀請會員一起探索下一段故事。',
    'activity-announcement','活動公告','My Dream 編輯部','2026-08-08',
    'ff0b639c-de86-332a-b064-21a9f8b688db','AI 原創短劇會員活動視覺',FALSE,500,
    'AI 原創短劇會員搶先看活動｜MY DREAM',
    '[{"id":"member-1","type":"paragraph","text":"My Dream 將不定期推出會員限定內容與作品搶先看活動。"},{"id":"member-2","type":"paragraph","text":"活動資格、期間與參與方式，將依各期活動頁面公布資訊為準。"}]'
  UNION ALL SELECT
    'ai-entertainment-collaboration-announcement','AI 原創娛樂合作提案正式開放','與品牌及內容夥伴，共同拓展原創娛樂新市場。',
    '面向品牌、內容夥伴與海外市場，展開 AI 原創娛樂內容的多元合作。',
    'activity-announcement','活動公告','My Dream 編輯部','2026-08-05',
    '111f5acd-506e-351f-8f09-2fb183398d13','AI 原創娛樂合作公告視覺',FALSE,400,
    'AI 原創娛樂合作提案正式開放｜MY DREAM',
    '[{"id":"partner-1","type":"paragraph","text":"My Dream 開放 IP 授權、品牌合作、內容合作與海外發行等合作提案。"},{"id":"partner-2","type":"paragraph","text":"有合作需求的企業與團隊，可透過聯絡我們頁面提交完整資訊。"}]'
  UNION ALL SELECT
    'what-is-ai-short-drama','AI 短劇是什麼？從內容生成到觀看體驗','從創作流程認識 AI 短劇的核心價值。',
    '從劇本、角色到影像製作，認識 AI 如何參與短劇內容的完整創作流程。',
    'seo-article','SEO文章','My Dream 內容團隊','2026-08-03',
    '50bccb27-dddf-30b0-92cd-19878a089455','AI 短劇製作與觀看體驗',TRUE,300,
    'AI 短劇是什麼？內容生成、製作流程與觀看體驗',
    '[{"id":"guide-1","type":"heading1","text":"AI 短劇的製作方式"},{"id":"guide-2","type":"paragraph","text":"AI 短劇結合生成式工具與傳統影像敘事，協助團隊更快完成角色、場景與分鏡驗證。"},{"id":"guide-3","type":"paragraph","text":"真正重要的仍是故事、節奏與角色關係；AI 是擴大創作可能性的工具。"}]'
  UNION ALL SELECT
    'ai-video-production-workflow','AI 影片製作流程：從提示詞到完整畫面','建立可重複使用的 AI 影片創作流程。',
    '整理角色一致性、場景生成、鏡頭設計與後期整合的實用工作流程。',
    'seo-article','SEO文章','My Dream 內容團隊','2026-08-01',
    '9485876d-5f58-3ecf-85cd-232f6c858dc5','AI 影片製作流程示意',FALSE,200,
    'AI 影片製作流程｜從提示詞、分鏡到完整畫面',
    '[{"id":"workflow-1","type":"heading1","text":"穩定的 AI 影片工作流程"},{"id":"workflow-2","type":"paragraph","text":"穩定的 AI 影片工作流程，通常從角色設定、視覺規範與鏡頭清單開始。"},{"id":"workflow-3","type":"paragraph","text":"先建立可重複使用的提示詞結構，再逐步完成素材生成、剪輯與聲音設計。"}]'
  UNION ALL SELECT
    'ai-entertainment-industry-trend','AI 娛樂產業趨勢：原創內容的新機會','AI 工具正在拓展原創 IP 的內容邊界。',
    '解析 AI 工具如何改變內容開發效率，並為原創角色與娛樂品牌帶來新可能。',
    'seo-article','SEO文章','My Dream 內容團隊','2026-07-28',
    'c1f1df8f-3308-3331-a74a-5a7f61935eb1','AI 娛樂產業與未來城市',FALSE,100,
    'AI 娛樂產業趨勢｜原創內容與 IP 發展新機會',
    '[{"id":"trend-1","type":"heading1","text":"原創內容的新機會"},{"id":"trend-2","type":"paragraph","text":"AI 工具正在縮短內容概念到視覺驗證的距離，也讓小型團隊有機會發展完整世界觀。"},{"id":"trend-3","type":"paragraph","text":"面向未來，原創 IP 的一致性、內容品質與長期營運仍是品牌價值的核心。"}]'
) seed
JOIN cms_content_entry entry
  ON entry.site_id=1 AND entry.locale='zh-Hant' AND entry.content_type='article' AND entry.slug=seed.slug
LEFT JOIN cms_media_asset cover
  ON cover.site_id=entry.site_id AND cover.public_id=seed.cover_public_id
WHERE NOT EXISTS (
  SELECT 1 FROM cms_content_version version WHERE version.content_entry_id=entry.id
);

INSERT IGNORE INTO cms_release_content(release_id,content_entry_id,content_version_id)
SELECT site.active_release_id,entry.id,version.id
FROM cms_site site
JOIN cms_content_entry entry ON entry.site_id=site.id AND entry.content_type='article' AND entry.archived=FALSE
JOIN cms_content_version version ON version.content_entry_id=entry.id AND version.version_no=1
WHERE site.id=1 AND site.active_release_id IS NOT NULL;
