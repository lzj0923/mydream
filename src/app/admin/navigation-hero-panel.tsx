"use client";
import {useEffect,useState} from "react";
import {heroNumberFields,heroColorFields,resolveHeroSettings} from "@/content/cms/navigation-hero-settings";
import {publishLatestDraft} from "@/content/cms/admin-publish";
type Draft={lockVersion:number;value:Record<string,unknown>};
type Api=<T>(path:string,options?:RequestInit,csrf?:boolean)=>Promise<T>;
export function NavigationHeroPanel({site,api}:{site:{id:string},api:Api}) {
 const [draft,setDraft]=useState<Draft|null>(null);
 const [form,setForm]=useState(resolveHeroSettings(null));
 const [saving,setSaving]=useState(false); const [notice,setNotice]=useState("");
 useEffect(()=>{api<Draft>(`/admin-api/v1/sites/${site.id}/config`).then(d=>{setDraft(d);setForm(resolveHeroSettings(d.value.navigationHero));}).catch(e=>setNotice(String(e)));},[api,site.id]);
 const patch=(key:string,value:string|number)=>setForm(f=>({...f,[key]:value}));
 async function save(){if(!draft)return;setSaving(true);setNotice("");try{
  const saved=await api<Draft>(`/admin-api/v1/sites/${site.id}/config`,{method:"PUT",body:JSON.stringify({lockVersion:draft.lockVersion,value:{...draft.value,navigationHero:resolveHeroSettings(form)},changeNote:"統一導覽首屏文字設置"})},true);
  setDraft(saved);setForm(resolveHeroSettings(saved.value.navigationHero));
  await publishLatestDraft(api,site.id,"更新全部導覽頁首屏文字樣式");setNotice("已保存並更新官網，全部導覽首屏同步生效。");
 }catch(e){setNotice(e instanceof Error?e.message:String(e));}finally{setSaving(false);}}
 return <section className="admin-panel"><header><h2>首屏文字統一設置</h2><p className="admin-panel-note">AI 創作中心、價目表、關於我們、聯絡我們、IP 授權、最新消息共用此設置。文案和背景仍在各頁「首屏主視覺」編輯。六個導覽頁的整組文字與按鈕固定垂直置中；長文案自動撐高首屏，避免裁切。</p></header>
 <div className="admin-form-grid"><label>文字字體<select value={form.font} onChange={e=>patch("font",e.target.value)}><option value="sans">無襯線黑體</option><option value="serif">襯線明體</option></select></label>
 {heroNumberFields.filter(([key])=>key!=="top"&&key!=="mobileTop").map(([key,label,,min,max])=><label key={key}>{label}（px）<input type="number" min={min} max={max} value={form[key]} onChange={e=>patch(key,Number(e.target.value))}/></label>)}
 {heroColorFields.map(([key,label])=><label key={key}>{label}<input type="color" value={String(form[key])} onChange={e=>patch(key,e.target.value)}/></label>)}</div>
 <div style={{margin:"24px 0",padding:24,background:"#031022",border:"1px solid #234355",borderRadius:12}} aria-label="文字樣式預覽"><h3 style={{margin:0,color:String(form.titleColor),fontSize:Number(form.titleSize)}}>首屏主標題</h3><p style={{margin:`${form.gap}px 0`,color:String(form.subtitleColor),fontSize:Number(form.subtitleSize)}}>副標題效果</p><p style={{color:String(form.bodyColor),fontSize:Number(form.bodySize)}}>這裡顯示首屏說明文字的字號與顏色。</p></div>
 <button className="admin-primary" disabled={!draft||saving} onClick={save}>{saving?"正在更新…":"保存並套用全部導覽頁"}</button> <button className="admin-secondary" disabled={saving} onClick={()=>setForm(resolveHeroSettings(null))}>恢復預設（保存後生效）</button><p role="status">{notice}</p></section>;
}
