export type PrototypeImage = {
  src: string;
  alt: string;
  position?: string;
};

export type PrototypeIp = {
  slug: string;
  name: string;
  englishName: string;
  category: string;
  description: string;
  worldSetting: string;
  image: PrototypeImage;
  accent: "gold" | "cyan" | "blue" | "violet";
  stats: { characters: number; works: number; stage: string };
};

export type PrototypeCharacter = {
  slug: string;
  name: string;
  title: string;
  ipSlug: string;
  ipName: string;
  profile: string;
  ability: string;
  image: PrototypeImage;
  accent: "gold" | "cyan" | "blue" | "violet";
};

export type PrototypeWork = {
  slug: string;
  title: string;
  type: "AI漫畫" | "AI漫劇" | "AI動畫" | "AI音樂";
  typeSlug: "comics" | "comic-drama" | "animation" | "music";
  ipSlug: string;
  ipName: string;
  description: string;
  image: PrototypeImage;
  status: string;
};

export type PrototypeHomeGenre = "古風" | "都市" | "漫劇" | "奇幻" | "穿越" | "重生" | "懸疑" | "宮鬥宅鬥" | "女性成長" | "逆襲" | "校園" | "腦洞" | "現代" | "科幻" | "玄幻" | "愛情";

export type PrototypeHomeDrama = {
  slug: string;
  title: string;
  format: "AI漫劇" | "AI短劇" | "AI動畫";
  genre: PrototypeHomeGenre;
  genres?: readonly PrototypeHomeGenre[];
  description: string;
  image: PrototypeImage;
  episodeLabel: string;
  heat: string;
  episodes?: readonly PrototypeDramaEpisode[];
};

export type PrototypeDramaEpisode = {
  label: string;
  title: string;
  videoSrc: string;
};

export const prototypeNavigation = [
  { id: "home", label: "首頁", href: "/" },
  { id: "universe", label: "AI宇宙", href: "/universe" },
  { id: "creator-id", label: "AI KOL", href: "/creator-id" },
  { id: "pricing", label: "價目表", href: "/tasks" },
  { id: "news", label: "最新消息", href: "/news" },
  { id: "about", label: "關於我們", href: "/about" },
  { id: "professional-rights", label: "專業權益", href: "/creator-id/protection" },
  { id: "contact", label: "聯絡我們", href: "/contact" },
] as const;

export const contentMatrix = [
  { key: "comics", title: "AI漫畫", english: "AI COMICS", description: "從分鏡到完整篇章，以 AI 放大視覺敘事。", href: "/works/comics" },
  { key: "comic-drama", title: "AI漫劇", english: "COMIC DRAMA", description: "讓漫畫角色進入聲音、節奏與動態演出。", href: "/works/comic-drama" },
  { key: "animation", title: "AI動畫", english: "AI ANIMATION", description: "建立能持續擴張的動畫世界與影像語言。", href: "/works/animation" },
  { key: "music", title: "AI音樂", english: "AI MUSIC", description: "為角色與世界打造可辨識的聲音資產。", href: "/works/music" },
  { key: "characters", title: "AI角色", english: "AI CHARACTERS", description: "從人格、能力到形象，建立可長期經營的角色。", href: "/characters" },
  { key: "licensing", title: "IP授權", english: "IP LICENSING", description: "串接品牌、發行與跨媒介內容合作。", href: "/business" },
] as const;

export const prototypeHomeCategories = [
  { label: "全部", value: "all" },
  { label: "古風", value: "ancient-style" },
  { label: "都市", value: "urban" },
  { label: "漫劇", value: "comic-drama" },
  { label: "奇幻", value: "fantasy" },
  { label: "穿越", value: "time-travel" },
  { label: "重生", value: "rebirth" },
  { label: "懸疑", value: "suspense" },
  { label: "宮鬥宅鬥", value: "palace-house" },
  { label: "女性成長", value: "women-growth" },
  { label: "逆襲", value: "comeback" },
  { label: "校園", value: "campus" },
  { label: "腦洞", value: "imagination" },
  { label: "現代", value: "modern" },
] as const;

export const prototypeHomeDramas: PrototypeHomeDrama[] = [
  {
    slug: "du-jing-wu",
    title: "渡京霧",
    format: "AI短劇",
    genre: "愛情",
    genres: ["愛情", "都市"],
    description: "迷霧籠罩的都市裡，幾段被命運牽引的關係，逐步揭開愛情與身份背後的真相。",
    image: {
      src: "/cms-media/prototype/jyg/works/du-jing-wu/cover.jpg",
      alt: "《渡京霧》AI 原創短劇封面",
      position: "center top",
    },
    episodeLabel: "連載中 · 4 集",
    heat: "NEW",
    episodes: [
      { label: "EP01", title: "第 1 集", videoSrc: "/cms-media/prototype/jyg/works/du-jing-wu/ep01.mp4" },
      { label: "EP02", title: "第 2 集", videoSrc: "/cms-media/prototype/jyg/works/du-jing-wu/ep02.mp4" },
      { label: "EP03", title: "第 3 集", videoSrc: "/cms-media/prototype/jyg/works/du-jing-wu/ep03.mp4" },
      { label: "EP04", title: "第 4 集", videoSrc: "/cms-media/prototype/jyg/works/du-jing-wu/ep04.mp4" },
    ],
  },
  {
    slug: "night-and-you",
    title: "夜色與你",
    format: "AI短劇",
    genre: "愛情",
    description: "霓虹城市裡，兩段被演算法錯配的人生再次相遇。",
    image: { src: "/cms-media/assets/v2/drama-night-and-you.webp", alt: "《夜色與你》AI 短劇封面" },
    episodeLabel: "全 36 集",
    heat: "9.8",
  },
  {
    slug: "song-mystery",
    title: "大宋懸王",
    format: "AI漫劇",
    genre: "懸疑",
    description: "一卷失落圖譜，牽動朝堂與異聞世界的雙重真相。",
    image: { src: "/cms-media/assets/v2/drama-song-mystery.webp", alt: "《大宋懸王》AI 漫劇封面" },
    episodeLabel: "更新至 24 集",
    heat: "9.6",
  },
  {
    slug: "rising-star",
    title: "逆襲之星途璀璨",
    format: "AI短劇",
    genre: "都市",
    description: "被遺忘的新人帶著第二次機會，重新改寫自己的舞台。",
    image: { src: "/cms-media/assets/v2/drama-rising-star.webp", alt: "《逆襲之星途璀璨》AI 短劇封面" },
    episodeLabel: "全 42 集",
    heat: "9.5",
  },
  {
    slug: "forbidden-romance",
    title: "別和小叔談戀愛",
    format: "AI短劇",
    genre: "愛情",
    description: "一紙家族協議，讓不能靠近的兩個人走進同一場局。",
    image: { src: "/cms-media/assets/v2/drama-forbidden-romance.webp", alt: "《別和小叔談戀愛》AI 短劇封面" },
    episodeLabel: "全 30 集",
    heat: "9.3",
  },
  {
    slug: "three-needles",
    title: "我以三針助你成皇",
    format: "AI漫劇",
    genre: "玄幻",
    description: "醫術、權謀與異能交鋒，她以三針逆轉王朝命數。",
    image: { src: "/cms-media/assets/v2/drama-three-needles.webp", alt: "《我以三針助你成皇》AI 漫劇封面" },
    episodeLabel: "更新至 28 集",
    heat: "9.2",
  },
  {
    slug: "reborn-heiress",
    title: "重生後我成了豪門",
    format: "AI短劇",
    genre: "懸疑",
    description: "醒來後所有人都認識她，唯獨她找不到自己的過去。",
    image: { src: "/cms-media/assets/v2/drama-reborn-heiress.webp", alt: "《重生後我成了豪門》AI 短劇封面" },
    episodeLabel: "全 40 集",
    heat: "9.1",
  },
  {
    slug: "neon-trace",
    title: "霓虹追跡者",
    format: "AI動畫",
    genre: "科幻",
    description: "城市記憶遭到重寫，一名追跡者開始尋找真實版本。",
    image: { src: "/cms-media/assets/v2/drama-night-and-you.webp", alt: "《霓虹追跡者》AI 動畫封面" },
    episodeLabel: "更新至 16 集",
    heat: "8.9",
  },
  {
    slug: "spirit-city-files",
    title: "靈城異聞錄",
    format: "AI漫劇",
    genre: "玄幻",
    description: "每到午夜，城市就會出現一條只屬於異界的街道。",
    image: { src: "/cms-media/assets/v2/drama-song-mystery.webp", alt: "《靈城異聞錄》AI 漫劇封面" },
    episodeLabel: "全 26 集",
    heat: "8.8",
  },
  {
    slug: "zero-echo",
    title: "零號迴聲",
    format: "AI動畫",
    genre: "科幻",
    description: "來自未來的訊號，每晚都在預告城市下一次消失。",
    image: { src: "/cms-media/assets/v2/drama-rising-star.webp", alt: "《零號迴聲》AI 動畫封面" },
    episodeLabel: "更新至 12 集",
    heat: "8.7",
  },
  {
    slug: "destiny-reversed",
    title: "天命逆轉局",
    format: "AI漫劇",
    genre: "玄幻",
    description: "當命運成為可交易的籌碼，最弱的人決定推翻規則。",
    image: { src: "/cms-media/assets/v2/drama-three-needles.webp", alt: "《天命逆轉局》AI 漫劇封面" },
    episodeLabel: "全 32 集",
    heat: "8.6",
  },
  {
    slug: "city-heart-proof",
    title: "都會心證",
    format: "AI短劇",
    genre: "都市",
    description: "她能看見每句謊言的顏色，卻看不懂他的真心。",
    image: { src: "/cms-media/assets/v2/drama-forbidden-romance.webp", alt: "《都會心證》AI 短劇封面" },
    episodeLabel: "更新至 20 集",
    heat: "8.5",
  },
  {
    slug: "seventh-scene",
    title: "消失的第七幕",
    format: "AI短劇",
    genre: "懸疑",
    description: "劇組拍到不存在的第七幕，每位演員都成了故事角色。",
    image: { src: "/cms-media/assets/v2/drama-reborn-heiress.webp", alt: "《消失的第七幕》AI 短劇封面" },
    episodeLabel: "全 18 集",
    heat: "8.4",
  },
];

export const prototypeIps: PrototypeIp[] = [
  {
    slug: "journey-taiwan",
    name: "西遊台灣",
    englishName: "JOURNEY · TAIWAN",
    category: "神話新編",
    description: "古老神話落在未來島嶼，讓熟悉的角色穿越城市、信仰與科技。",
    worldSetting: "當靈脈與智慧城市同時甦醒，島嶼成為人、神、資料生命共同爭奪的世界節點。取經不再是一條路，而是一場重新理解文明的長期旅程。",
    image: { src: "/cms-media/prototype/jyg/ip-worlds.webp", alt: "神話與未來城市交會的西遊台灣原型世界", position: "0% center" },
    accent: "gold",
    stats: { characters: 12, works: 8, stage: "核心開發" },
  },
  {
    slug: "shanhai-archive",
    name: "山海經宇宙",
    englishName: "SHANHAI ARCHIVE",
    category: "東方奇幻",
    description: "把神獸、地景與遠古傳說重組為可持續擴張的東方幻想宇宙。",
    worldSetting: "漂浮山海之間，每一種神獸都守護一段被遺忘的文明記憶。探索者以 AI 檔案重建傳說，也改寫傳說。",
    image: { src: "/cms-media/prototype/jyg/ip-worlds.webp", alt: "漂浮山海與神獸構成的東方幻想世界", position: "33% center" },
    accent: "cyan",
    stats: { characters: 18, works: 6, stage: "世界觀建構" },
  },
  {
    slug: "future-echo",
    name: "未來迴聲",
    englishName: "FUTURE ECHO",
    category: "科幻懸疑",
    description: "記憶可以交易的城市裡，角色必須決定什麼才是真正的自己。",
    worldSetting: "月環城市以個人記憶驅動能源，所有人的過去都被量化。當一段不存在的記憶流入市場，城市開始看見另一個未來。",
    image: { src: "/cms-media/prototype/jyg/ip-worlds.webp", alt: "藍色環形城市構成的未來科幻世界", position: "67% center" },
    accent: "blue",
    stats: { characters: 9, works: 5, stage: "概念孵化" },
  },
  {
    slug: "immortal-sky",
    name: "天域修行誌",
    englishName: "IMMORTAL SKY",
    category: "修仙冒險",
    description: "把修行、選擇與群體命運轉化為新世代的成長型 IP。",
    worldSetting: "九座天城沿著時間瀑布運行，修行者累積的不是力量，而是能否承擔一個世界的選擇。",
    image: { src: "/cms-media/prototype/jyg/ip-worlds.webp", alt: "金色天空宮殿與瀑布構成的修仙世界", position: "100% center" },
    accent: "violet",
    stats: { characters: 14, works: 7, stage: "視覺開發" },
  },
];

export const prototypeCharacters: PrototypeCharacter[] = [
  {
    slug: "sun-wukong",
    name: "孫悟空",
    title: "靈網行者",
    ipSlug: "journey-taiwan",
    ipName: "西遊台灣",
    profile: "能看見城市靈網裂縫的異界行者，率先發現島嶼正在被另一個世界重寫。",
    ability: "七十二形態模擬、靈網穿梭、金箍資料場",
    image: { src: "/cms-media/prototype/jyg/character-lineup.webp", alt: "金色戰甲的靈網行者孫悟空原型角色", position: "0% center" },
    accent: "gold",
  },
  {
    slug: "tang-sanzang",
    name: "唐三藏",
    title: "文明導航者",
    ipSlug: "journey-taiwan",
    ipName: "西遊台灣",
    profile: "保存舊世界語言模型的最後導航者，相信理解比征服更接近真正的答案。",
    ability: "文明解碼、心識共振、路徑預演",
    image: { src: "/cms-media/prototype/jyg/character-lineup.webp", alt: "象牙白長袍的文明導航者唐三藏原型角色", position: "34% center" },
    accent: "cyan",
  },
  {
    slug: "zhu-bajie",
    name: "豬八戒",
    title: "重裝守界人",
    ipSlug: "journey-taiwan",
    ipName: "西遊台灣",
    profile: "掌管舊城地下能源的守界人，用最現實的判斷守住最不願失去的人。",
    ability: "重力護甲、地脈感知、能量回收",
    image: { src: "/cms-media/prototype/jyg/character-lineup.webp", alt: "深色重甲的守界人豬八戒原型角色", position: "67% center" },
    accent: "violet",
  },
  {
    slug: "sha-wujing",
    name: "沙悟淨",
    title: "潮汐記錄者",
    ipSlug: "journey-taiwan",
    ipName: "西遊台灣",
    profile: "由河流記憶誕生的藍色生命，負責保存每次世界重啟前被抹去的真相。",
    ability: "液態塑形、記憶潮汐、深層追跡",
    image: { src: "/cms-media/prototype/jyg/character-lineup.webp", alt: "藍色水元素構成的潮汐記錄者沙悟淨原型角色", position: "100% center" },
    accent: "blue",
  },
];

export const prototypeWorks: PrototypeWork[] = [
  {
    slug: "journey-taiwan-zero",
    title: "西遊台灣：零號靈脈",
    type: "AI漫劇",
    typeSlug: "comic-drama",
    ipSlug: "journey-taiwan",
    ipName: "西遊台灣",
    description: "台北上空出現第二座城市，四位旅人從不同時間線同時醒來。",
    image: { src: "/cms-media/prototype/jyg/ai-universe-hero.webp", alt: "西遊台灣零號靈脈作品原型視覺", position: "70% center" },
    status: "概念預告",
  },
  {
    slug: "shanhai-night-log",
    title: "山海夜行錄",
    type: "AI漫畫",
    typeSlug: "comics",
    ipSlug: "shanhai-archive",
    ipName: "山海經宇宙",
    description: "新手檔案員深入浮島，找回被神獸帶走的城市記憶。",
    image: { src: "/cms-media/prototype/jyg/ip-worlds.webp", alt: "山海夜行錄作品原型視覺", position: "34% center" },
    status: "連載企劃",
  },
  {
    slug: "echo-city-2099",
    title: "迴聲城 2099",
    type: "AI動畫",
    typeSlug: "animation",
    ipSlug: "future-echo",
    ipName: "未來迴聲",
    description: "記憶偵探追查一段從未發生、卻人人都記得的城市災難。",
    image: { src: "/cms-media/prototype/jyg/ip-worlds.webp", alt: "迴聲城 2099 作品原型視覺", position: "68% center" },
    status: "製作開發",
  },
  {
    slug: "nine-skies-suite",
    title: "九天序曲",
    type: "AI音樂",
    typeSlug: "music",
    ipSlug: "immortal-sky",
    ipName: "天域修行誌",
    description: "以九座天城的運行週期，建立角色與世界共同呼吸的聲音系統。",
    image: { src: "/cms-media/prototype/jyg/ip-worlds.webp", alt: "九天序曲作品原型視覺", position: "100% center" },
    status: "聲音概念",
  },
  {
    slug: "spirit-network-files",
    title: "靈網角色檔案",
    type: "AI漫畫",
    typeSlug: "comics",
    ipSlug: "journey-taiwan",
    ipName: "西遊台灣",
    description: "四位核心角色的前史，以互相衝突的記憶版本同步展開。",
    image: { src: "/cms-media/prototype/jyg/character-lineup.webp", alt: "靈網角色檔案作品原型視覺", position: "48% center" },
    status: "角色篇章",
  },
  {
    slug: "world-engine",
    title: "世界引擎",
    type: "AI動畫",
    typeSlug: "animation",
    ipSlug: "future-echo",
    ipName: "未來迴聲",
    description: "四個宇宙第一次互相看見，也第一次意識到自己可能只是故事。",
    image: { src: "/cms-media/prototype/jyg/ai-universe-hero.webp", alt: "世界引擎作品原型視覺", position: "54% center" },
    status: "旗艦企劃",
  },
];

export const creatorSteps = [
  { step: "01", title: "想法", description: "把一句概念轉成可被開發的故事核心。" },
  { step: "02", title: "角色生成", description: "建立外形、人格、能力與角色關係。" },
  { step: "03", title: "故事生成", description: "發展世界規則、篇章與長期敘事線。" },
  { step: "04", title: "漫畫", description: "形成分鏡、畫面語言與首批讀者驗證。" },
  { step: "05", title: "漫劇", description: "加入聲音、動態與角色表演。" },
  { step: "06", title: "動畫", description: "讓成熟 IP 進入更完整的影像製作。" },
] as const;

export const prototypeNews = [
  { category: "作品發布", title: "《西遊台灣》公開第一階段 AI 漫劇企劃", date: "2026.08.06" },
  { category: "IP動態", title: "山海經宇宙首批角色概念設計完成", date: "2026.08.03" },
  { category: "AI娛樂趨勢", title: "生成式角色一致性工作流進入測試階段", date: "2026.07.29" },
  { category: "品牌新聞", title: "MY DREAM AI 原創娛樂平台 Prototype 正式公開", date: "2026.07.24" },
] as const;

export const cooperationTracks = [
  { title: "IP授權", english: "LICENSING", description: "角色、世界觀與跨媒介商品授權。" },
  { title: "品牌合作", english: "BRAND", description: "以原創角色共同打造品牌敘事。" },
  { title: "海外發行", english: "GLOBAL", description: "多語內容、本地化與市場合作。" },
] as const;

export function findPrototypeIp(slug: string) {
  return prototypeIps.find((item) => item.slug === slug);
}

export function findPrototypeCharacter(slug: string) {
  return prototypeCharacters.find((item) => item.slug === slug);
}

export function findPrototypeWork(slug: string) {
  return prototypeWorks.find((item) => item.slug === slug);
}
