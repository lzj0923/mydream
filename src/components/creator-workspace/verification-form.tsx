/* eslint-disable @next/next/no-img-element -- private document previews stay in the browser. */
"use client";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Building2, UserRound, Upload, Check, ShieldCheck, X, ImagePlus } from "lucide-react";

type Document = { kind: string; name: string; data: string };
const identitySlots = [{kind:"ID_FRONT",name:"證件正面"},{kind:"ID_BACK",name:"證件背面"}];
const passportSlots = [{kind:"PASSPORT",name:"護照資料頁"}];
const handSlot = {kind:"HANDHELD",name:"本人手持證件"};

function Field({title, name, placeholder, optional=false, type="text", maxLength=120}: {title:string;name:string;placeholder?:string;optional?:boolean;type?:string;maxLength?:number}) {
  return <label>{title}<span className="cv-field-note">{optional?"選填":"必填"}</span><input name={name} type={type} placeholder={placeholder} required={!optional} maxLength={maxLength}/></label>;
}
function Section({number,title,note,children}:{number:string;title:string;note:string;children:ReactNode}) {
  return <section className="cv-form-section"><div className="cv-section-title"><span>{number}</span><div><h2>{title}</h2><p>{note}</p></div></div>{children}</section>;
}
function UploadCard({slot,value,onChange}:{slot:{kind:string;name:string};value?:Document;onChange:(value?:Document)=>void}) {
  const ref=useRef<HTMLInputElement>(null);
  const [error,setError]=useState("");
  const [reading,setReading]=useState(false);
  async function choose(file?:File) {
    if(!file)return;
    setError("");setReading(true);
    try {
      if(!["image/jpeg","image/png"].includes(file.type)||file.size>5*1024*1024||!file.size)throw new Error("請使用 5 MB 以內的 JPG 或 PNG 圖片");
      const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("圖片讀取失敗，請重試"));reader.readAsDataURL(file);});
      const img=new Image();img.src=data;await img.decode();
      onChange({...slot,data});
    }catch(e){setError(e instanceof Error?e.message:"圖片讀取失敗");}finally{setReading(false);if(ref.current)ref.current.value="";}
  }
  return <div className="cv-upload-item"><div className="cv-upload-title">{slot.name}<span>必填</span></div><input ref={ref} className="cv-file-input" type="file" accept="image/png,image/jpeg" aria-label={`上傳${slot.name}`} tabIndex={-1} onChange={e=>void choose(e.target.files?.[0])}/>
    {value?<div className="cv-upload-filled"><img src={value.data} alt={`${slot.name}預覽`}/><div className="cv-upload-tools"><span><Check size={13}/>已上傳</span><button type="button" disabled={reading} onClick={()=>ref.current?.click()}>替換圖片</button><button type="button" aria-label={`刪除${slot.name}`} onClick={()=>{onChange();setError("");}}><X size={15}/></button></div></div>:<button type="button" className="cv-upload-empty" disabled={reading} onClick={()=>ref.current?.click()}><ImagePlus size={30}/><strong>{reading?"正在讀取…":"點擊上傳圖片"}</strong><span>JPG / PNG · 最大 5 MB</span></button>}
    {error&&<p className="cv-error" role="alert">{error}</p>}
  </div>;
}

export function VerificationForm({creatorType,version,onBusy}:{creatorType:string;version:number;onBusy:(value:boolean)=>void}) {
  const [entity,setEntity]=useState("PERSONAL"),[documentType,setDocumentType]=useState("ID_CARD");
  const [documents,setDocuments]=useState<Record<string,Document>>({});
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const business=entity==="BUSINESS";
  const slots=business?[{kind:"BUSINESS_LICENSE",name:"企業登記證明"},{kind:"AUTHORIZATION",name:"企業授權書"}]:[...(documentType==="PASSPORT"?passportSlots:identitySlots),handSlot];
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;setError("");
    const missing=slots.filter(slot=>!documents[slot.kind]);
    if(missing.length){setError(`請補充上傳：${missing.map(slot=>slot.name).join("、")}`);return;}
    const form=new FormData(event.currentTarget);
    const get=(key:string)=>String(form.get(key)||"").trim();
    const profile=Object.fromEntries(["displayName","email","phone","city","address","introduction","portfolioUrl","representative","contactRole"].map(key=>[key,get(key)]));
    profile.documentType=business?"BUSINESS_LICENSE":documentType;
    setBusy(true);onBusy(true);
    try {
      const r=await fetch("/api/creator/verification",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({creatorType,entityType:entity,name:get("name"),documentNumber:get("documentNumber"),contactName:business?get("contactName"):get("name"),contact:get("email"),region:get("region"),profile,documents:slots.map(slot=>documents[slot.kind]),accepted:form.get("accepted")==="on",version})});
      const result=await r.json();if(!r.ok)throw new Error(result.detail||"認證提交失敗");
      window.location.assign("/creator/workspace");
    }catch(e){setError(e instanceof Error?e.message:"提交失敗，請稍後重試");setBusy(false);onBusy(false);}
  }
  return <div className="cv-application"><nav className="cv-steps" aria-label="認證流程"><span><Check size={14}/>選擇創作身份</span><i/><span className="active"><b>2</b>填寫認證資料</span><i/><span><b>3</b>提交並進入平台</span></nav><form className="cv-form cv-form-redesign" onSubmit={submit}><fieldset disabled={busy}>
    <Section number="01" title="認證主體" note="以個人身份創作，或代表企業管理及發佈作品。"><div className="cv-entities">{["PERSONAL","BUSINESS"].map(value=><label key={value} className={entity===value?"selected":""}><input type="radio" name="entity" checked={entity===value} onChange={()=>{setEntity(value);setDocuments({});setError("");}}/>{value==="PERSONAL"?<UserRound size={23}/>:<Building2 size={23}/>}<span><strong>{value==="PERSONAL"?"個人認證":"企業認證"}</strong><small>{value==="PERSONAL"?"獨立創作者、自由工作者":"公司、工作室及製作機構"}</small></span></label>)}</div></Section>
    <div key={entity}>
    <Section number="02" title={business?"企業基本資料":"身份基本資料"} note="請與提交的證明資料保持一致，以下資料僅供認證審核。"><div className="cv-fields">
      <Field title={business?"企業全稱":"真實姓名"} name="name" placeholder={business?"與企業登記證明一致":"與身份證件一致"}/><label>國家或地區<span className="cv-field-note">必填</span><select name="region" required defaultValue=""><option value="" disabled>請選擇國家或地區</option>{["台灣","中國大陸","香港","澳門","新加坡","馬來西亞","日本","韓國","美國","加拿大","英國","澳大利亞","紐西蘭","德國","法國","義大利","西班牙","荷蘭","瑞士","瑞典","泰國","越南","印度尼西亞","菲律賓","印度","阿拉伯聯合大公國","其他國家或地區"].map(region=><option key={region} value={region}>{region}</option>)}</select></label>
      {!business&&<label>證件類型<span className="cv-field-note">必填</span><select value={documentType} onChange={e=>{setDocumentType(e.target.value);setDocuments({});setError("");}}><option value="ID_CARD">身份證</option><option value="PASSPORT">護照</option></select></label>}
      <Field title={business?"企業登記編號 / 統一編號":documentType==="PASSPORT"?"護照號碼":"身份證號碼"} name="documentNumber" placeholder="請完整輸入證件上的號碼" maxLength={80}/>
      {business&&<><Field title="法定代表人 / 企業負責人" name="representative" maxLength={80}/><Field title="企業登記地址" name="address" placeholder="與企業登記證明一致" maxLength={240}/></>}
    </div></Section>
    <Section number="03" title="聯絡資料" note="用於認證資料補充及作品合作聯繫，請填寫常用聯絡方式。"><div className="cv-fields">{business&&<><Field title="經辦聯絡人" name="contactName" maxLength={80}/><Field title="聯絡人職務" name="contactRole" placeholder="例如：製作人、營運負責人" maxLength={80}/></>}<Field title="聯絡電子郵箱" name="email" type="email" placeholder="name@example.com"/><Field title="聯絡電話" name="phone" type="tel" placeholder="包含國際區號，例如 +886" maxLength={40}/><Field title="所在城市" name="city" placeholder="日常創作或辦公所在城市" maxLength={80}/></div></Section>
    <Section number="04" title="創作資料" note="讓平台了解你的創作方向與經驗，方便後續合作。"><div className="cv-fields"><Field title={business?"品牌 / 工作室名稱":"創作者名稱"} name="displayName" placeholder={business?"對外使用的品牌名稱":"筆名或對外使用的創作名稱"} maxLength={80}/><Field title="作品集 / 主頁連結" name="portfolioUrl" type="url" placeholder="https://" optional maxLength={500}/><label className="cv-field-wide">創作簡介<span className="cv-field-note">必填</span><textarea name="introduction" required maxLength={1000} rows={4} placeholder="介紹擅長題材、創作方式、代表作品或團隊經驗；剛開始創作也可以填寫你的創作計畫。"/></label></div></Section>
    </div>
    <Section number="05" title="證明資料" note={business?"分別提交清晰的企業登記證明與授權書，授權書請註明企業、經辦人及平台認證用途並簽署或蓋章。":"請確保證件完整、文字清晰且無遮擋；手持照片需同時清楚呈現本人面容與所選證件。"}><div className="cv-uploads">{slots.map(slot=><UploadCard key={slot.kind} slot={slot} value={documents[slot.kind]} onChange={value=>{setDocuments(current=>{const next={...current};if(value)next[slot.kind]=value;else delete next[slot.kind];return next;});setError("");}}/>)}</div><p className="cv-privacy"><ShieldCheck size={16}/>認證資料僅供平台審核，不公開展示。</p></Section>
    <div className="cv-submit-area"><label className="cv-consent"><input name="accepted" type="checkbox" required/>我確認以上資料真實有效，並同意平台將資料用於身份認證審核。</label>{error&&<p className="cv-error" role="alert">{error}</p>}<div className="cv-submit-row"><p>提交後即可進入平台<br/><span>審核通過後開啟正式發佈權限</span></p><button className="cv-primary" disabled={busy}><Upload size={16}/>{busy?"正在提交…":"提交認證並進入平台"}</button></div></div>
  </fieldset></form></div>;
}
