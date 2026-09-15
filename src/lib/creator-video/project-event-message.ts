import {projectAreas,projectCategories} from "./project-settings";

/** Render legacy audit payloads for creators; the stored administrator audit stays intact. */
export function projectEventMessage(note:string):string {
 if(!note.startsWith("更新項目上架資料：原值 "))return note;
 const match=/；新值 Settings\[([^\]]+)\]/.exec(note);
 if(!match)return "上架資料已更新，可在項目中查看最新設定。";
 const fields=Object.fromEntries(match[1].split(",").map(part=>{const i=part.indexOf("=");return [part.slice(0,i).trim(),part.slice(i+1).trim()];}));
 const area=projectAreas.find(item=>item.value===fields.area)?.label;
 const category=projectCategories[fields.area]?.find(item=>item.value===fields.category)?.label;
 const direction=fields.landscape==="true"?"橫屏":fields.landscape==="false"?"直屏":null;
 const price=/^\d+(?:\.\d+)?$/.test(fields.price||"")?(/^0+(?:\.0+)?$/.test(fields.price)?"免費":`單集解鎖價格 ${fields.price}`):null;
 if(!area||!category||!direction||!price)return "上架資料已更新，可在項目中查看最新設定。";
 return `上架資料已保存：${area}、${category}、${direction}、${price}。如已有 App 作品，將由平台同步更新。`;
}
