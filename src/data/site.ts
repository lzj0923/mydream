import type { Article, CreatorStep, Drama } from "@/types/content";
import { v2Navigation } from "@/features/v2/home-model";

export const navigation = v2Navigation;
export const categories = ["全部", "都市", "情感", "甜寵", "古裝", "重生", "豪門", "懸疑", "逆襲"];
export const dramas: Drama[] = [
  { slug: "love-after-rain", title: "雨後的心動", category: "情感", synopsis: "一場突如其來的雨，讓兩個不再相信愛的人重新相遇。", tags: ["治癒", "都會"], cover: "linear-gradient(145deg,#f2bb91,#9a3d5f 52%,#1e294e)", featured: true, episodes: 48, status: "熱播中" },
  { slug: "ceo-secret", title: "總裁的秘密劇本", category: "豪門", synopsis: "她以為只是代班，卻走進一場寫好的命運。", tags: ["豪門", "反轉"], cover: "linear-gradient(160deg,#d4ad74,#492349 48%,#101b34)", featured: true, episodes: 60, status: "全劇上架" },
  { slug: "reborn-into-spring", title: "重生在春天", category: "重生", synopsis: "重回選擇的那天，她決定為自己改寫所有結局。", tags: ["重生", "成長"], cover: "linear-gradient(155deg,#92b6a1,#2b6570 45%,#172646)", episodes: 52, status: "熱播中" },
  { slug: "moonlit-case", title: "月光下的證詞", category: "懸疑", synopsis: "每一個證詞，都藏著不願被看見的真相。", tags: ["懸疑", "推理"], cover: "linear-gradient(150deg,#5879ad,#171b36 52%,#090b16)", episodes: 36, status: "搶先看" },
  { slug: "palace-letters", title: "宮牆書信", category: "古裝", synopsis: "一封沒有署名的信，串起了跨越十年的等待。", tags: ["古裝", "愛情"], cover: "linear-gradient(155deg,#be8d5d,#7e2337 45%,#21152a)", episodes: 45, status: "熱播中" },
  { slug: "our-small-city", title: "小城的夏天", category: "都市", synopsis: "在熟悉又陌生的小城裡，重新找到自己的節奏。", tags: ["都市", "生活"], cover: "linear-gradient(145deg,#75b9c9,#e69868 48%,#29436e)", episodes: 30, status: "全劇上架" },
];
export const creatorSteps: CreatorStep[] = [
  { step: "01", title: "建立創作者身份", description: "完善你的個人頁面，讓第一個作品就有被看見的起點。" },
  { step: "02", title: "完成實名認證", description: "以清楚的流程確認身份，為你的內容建立信任。" },
  { step: "03", title: "上傳你的作品", description: "短影音、Vlog 與故事片段，都能成為你的創作舞台。" },
  { step: "04", title: "發佈並分享", description: "把作品交給喜歡內容的人，也慢慢累積屬於你的社群。" },
];
export const articles: Article[] = [
  { slug: "summer-short-drama-guide", title: "本週值得追的 5 部短劇：從心動到反轉一次收下", excerpt: "用不同情緒打開這週的追劇清單，找到剛好適合你的故事。", category: "短劇推薦", cover: "linear-gradient(135deg,#1764a5,#e5a875 58%,#47234e)", publishedAt: "2026-07-21", author: "My Dream 編輯部", body: ["短劇最迷人的地方，是在短短幾分鐘內把情緒推到眼前。這份清單收集了本週最值得停下來看的五種故事節奏。", "無論你想要一點心動、一次反轉，或一段能陪你放慢腳步的日常，都可以從這裡開始。"] },
  { slug: "creator-first-video", title: "第一次發佈短影音前，先把這三件事想清楚", excerpt: "不只教你按下發佈，更幫你建立第一支作品的方向。", category: "創作者教學", cover: "linear-gradient(135deg,#0b779d,#5b2c6e 55%,#1b1e41)", publishedAt: "2026-07-16", author: "創作者中心", body: ["第一支作品不必完美，但需要清楚。先確認你想讓誰看見、他會因為什麼停下來，以及你希望他看完後記得什麼。", "把鏡頭留給真實的你，剩下的，交給持續創作。"] },
  { slug: "new-discovery-experience", title: "My Dream 探索頁更新：更快找到想看的故事", excerpt: "分類、關鍵字與最新內容，現在都有更清楚的入口。", category: "平台消息", cover: "linear-gradient(135deg,#213b72,#0c9ee8 60%,#e6c477)", publishedAt: "2026-07-11", author: "My Dream 團隊", body: ["我們持續讓找內容這件事更直覺。新的探索體驗把題材、熱門與新上線內容放在更好理解的位置。", "接下來也會持續更新，讓每一次打開都更接近你想看的故事。"] },
];
export const faqs = [
  ["如何成為 My Dream 創作者？", "先透過 APP 完成創作者身份與認證流程，再依指引上傳作品。正式規則以 APP 公告為準。"],
  ["可以發布哪些類型的內容？", "短影音、Vlog 與其他符合平台規範的原創影音內容都能成為創作的一部分。"],
  ["官網可以直接看完整短劇嗎？", "目前官網提供內容探索、劇情介紹與預覽；完整觀看體驗以 My Dream APP 為主。"],
] as const;
