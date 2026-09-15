export const planPrefixes = ["One", "Two", "Three", "Four", "Five"] as const;
const defaults:Record<string,string>={
 planningTitle:"未來規劃",planningSubtitle:"IP 周邊共創計畫",planningTagline:"讓喜歡的 IP，不只存在螢幕裡",
 planningDescription:"My Dream 未來將開放原創 IP 的內容、授權與角色互動，進一步讓 IP 周邊共同創作與個人化訂製。\n\n使用者可以選擇自己喜愛的角色與 IP，自由設定想要的商品類型、設計風格與呈現方式，由 My Dream 提供合作供應鏈，協助創意製作成真正可以收藏、使用的實體商品。",
};
const steps=[
 ["選擇專屬 IP","從豐富的原創角色中，選出你心中的最愛。","/assets/generated/about-flagship-wukong-v2.png","68% center"],
 ["自由創作周邊","自訂產品類型、設計風格與商品規格。","/prototype/jyg/character-lineup.webp","7% center"],
 ["實體方案","完善產品規格與製作方式，讓創意成形。","/assets/generated/about-merch-future-v2.png","78% center"],
 ["串接合作廠商","平台整合供應鏈，提供合作製作資源。","/assets/generated/about-merch-future-v2.png","91% center"],
 ["從創意到實體","專業製作完成商品，讓作品真正走進生活。","/assets/generated/about-flagship-wukong-v2.png","81% center"]
];
planPrefixes.forEach((prefix,i)=>["Title","Description","ImageUrl","ImagePosition"].forEach((field,j)=>{defaults[`step${prefix}${field}`]=steps[i][j];}));
/** New plan fields avoid overwriting legacy platform-card content. Explicit empty values remain empty. */
export function aboutPlanProps(props:Record<string,unknown>={}) {return {...defaults,...props} as Record<string,string>;}

export function aboutTextOffset(value:unknown):number {
 const n=typeof value==="number"||typeof value==="string"?Number(value):0;
 return Number.isFinite(n)?Math.max(-300,Math.min(300,Math.round(n))):0;
}
export function aboutTextPosition(props:Record<string,unknown>={}) {
 return {"--about-text-x":`${aboutTextOffset(props.textOffsetX)}px`,"--about-text-y":`${aboutTextOffset(props.textOffsetY)}px`};
}
