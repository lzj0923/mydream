"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {X} from "lucide-react";
export function WithdrawalDialog({balance,onClose,onSubmitted}:{balance:string|null;onClose:()=>void;onSubmitted:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),sending=useRef(false),requestId=useRef("");
 const [bank,setBank]=useState<{bound:boolean;bankName?:string;holderName?:string;maskedAccountNumber?:string}|null>(null);
 const [state,setState]=useState("LOADING"),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{dialog.current?.showModal();const controller=new AbortController();
  Promise.all(["bank-account","withdrawals"].map(async path=>{const r=await fetch(`/api/creator/${path}`,{cache:"no-store",signal:controller.signal});const d=await r.json();if(!r.ok)throw new Error(d.detail||"無法讀取提現資料");return d;})).then(([b,s])=>{if(!controller.signal.aborted){setBank(b);setState(s.state);setMessage(s.message||"");}}).catch(e=>{if(!controller.signal.aborted){setState("ERROR");setMessage(e.message);}});
  return()=>controller.abort();
 },[]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);setMessage("");
  const form=event.currentTarget,fields=new FormData(form);requestId.current ||= crypto.randomUUID();
  try{
   const r=await fetch("/api/creator/withdrawals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:requestId.current,points:Number(fields.get("points")),password:fields.get("password"),bankLastFour:bank?.maskedAccountNumber,confirmed:fields.get("confirmed")==="on"})});
   const d=await r.json();
   if(!r.ok){if(r.status>=500){setState("UNKNOWN");setMessage("提交結果待核對，請查看提現記錄，勿重複提交。");}else{setMessage(d.detail||"申請未完成");}return;}
   setState(d.state);setMessage(d.message);onSubmitted();
  }catch{setState("UNKNOWN");setMessage("網絡中斷，提交結果待核對。請查看 App 提現記錄，勿重複提交。");}
  finally{const password=form.elements.namedItem("password") as HTMLInputElement|null;if(password)password.value="";sending.current=false;setBusy(false);}
 }
 return <dialog className="ce-modal ce-bank-dialog" ref={dialog} onCancel={e=>{if(busy)e.preventDefault();else onClose();}} onClose={onClose}>
  <button className="ce-close" aria-label="關閉" disabled={busy} onClick={onClose}><X size={20}/></button><h3>申請提現</h3>
  {state==="LOADING"?<p>正在讀取收款資料…</p>:null}
  {message&&<p role="status">{message}</p>}
  {bank&&!bank.bound&&<p>請先返回「銀行卡信息」綁定收款銀行卡。</p>}
  {bank?.bound&&state==="READY"&&<form onSubmit={submit}><fieldset disabled={busy}>
   <div className="ce-bank-saved"><strong>{bank.bankName}</strong><b>{bank.maskedAccountNumber}</b><span>{bank.holderName}</span></div>
   <p>App 當前可用餘額：{balance??"—"} 積分</p>
   <label>提現積分<input name="points" type="number" min="1" max={balance===null?2147483647:Math.min(2147483647,Math.floor(Number(balance)))} step="1" required placeholder="輸入整數積分"/></label>
   <p>兌換比例及最低提現金額由 App 決定。提交成功後將扣除相應積分，實際金額以提現記錄為準，由平台審核打款。</p>
   <label>驗證本人身份（創作者平台登錄密碼）<input name="password" type="password" required maxLength={72} autoComplete="current-password" placeholder="請輸入登錄創作者平台時使用的密碼" aria-describedby="withdraw-password-help"/></label><p id="withdraw-password-help" className="ce-field-help">為確認是您本人申請提現，請輸入平台登錄密碼。請勿輸入銀行卡密碼或提款密碼。</p>
   <label className="ce-confirm"><input name="confirmed" type="checkbox" required/>我已核對收款人、銀行卡及提現積分，確認提交。</label>
   <div className="ce-bank-actions"><button type="button" className="cw-outline" onClick={onClose}>取消</button><button className="ce-bank" type="submit">{busy?"正在提交…":"確認申請提現"}</button></div>
  </fieldset></form>}
  {["ACCEPTED","UNKNOWN","SENDING","REJECTED"].includes(state)&&<a className="ce-bank" href="#withdrawals" onClick={onClose}>查看提現記錄</a>}
 </dialog>;
}
