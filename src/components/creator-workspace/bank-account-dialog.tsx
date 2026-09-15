"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { BankIdentityFields } from "./bank-identity-fields";
type BankAccount = { bound: boolean; username?: string; holderName?: string; bankName?: string; branch?: string; maskedAccountNumber?: string };
export function BankAccountDialog({ onClose }: { onClose: () => void }) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [account,setAccount]=useState<BankAccount | null>(null),[error,setError]=useState(""),[saving,setSaving]=useState(false),[editing,setEditing]=useState(false),[saved,setSaved]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{dialog.current?.showModal();},[]);
  useEffect(()=>{const controller=new AbortController();fetch("/api/creator/bank-account",{cache:"no-store",signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.detail||"無法讀取銀行卡信息");return data;}).then(data=>{setAccount(data);setEditing(!data.bound);setError("");}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[revision]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving)return;
    const form=event.currentTarget,fields=new FormData(form);fields.delete("username");const body=Object.fromEntries(fields);
    setSaving(true);setError("");setSaved(false);
    try{const response=await fetch("/api/creator/bank-account",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.detail||"綁定未完成，請重試");setAccount(data);setEditing(false);setSaved(true);form.reset();}
    catch(e){setError(e instanceof Error?e.message:"網絡連接失敗，請重試");}
    finally{const password=form.elements.namedItem("password") as HTMLInputElement|null;if(password)password.value="";setSaving(false);}
  }
  return <dialog className="ce-modal ce-bank-dialog" ref={dialog} onCancel={event=>{if(saving)event.preventDefault();else onClose();}} onClose={onClose}>
    <button className="ce-close" aria-label="關閉" disabled={saving} onClick={onClose}><X size={20}/></button><h3>銀行卡信息</h3>
    {error&&<p role="alert" className="ce-bank-error">{error}{!account&&<button onClick={()=>setRevision(n=>n+1)}>重試</button>}</p>}
    {!account&&!error&&<p role="status">正在讀取…</p>}
    {saved&&<p role="status">收款銀行卡已保存，待核驗。</p>}
    {account&&!editing&&<><div className="ce-bank-saved"><strong>{account.bankName}</strong><b>{account.maskedAccountNumber}</b><span>持卡人：{account.holderName}</span>{account.branch&&<span>開戶支行：{account.branch}</span>}<small>待核驗</small></div><p>已保存至本站收款資料，尚未完成銀行核驗；申請提現時會將此收款資料提交 App，由平台核驗打款。</p><button className="ce-bank" onClick={()=>{setEditing(true);setSaved(false);}}>更換銀行卡</button></>}
    {account&&editing&&<form onSubmit={submit}><fieldset disabled={saving}>
      <label>持卡人姓名<input name="holderName" required maxLength={100} defaultValue={account.holderName} autoComplete="off" placeholder="請填寫本人姓名"/></label>
      <label>開戶銀行<input name="bankName" required maxLength={100} defaultValue={account.bankName} placeholder="請填寫銀行全稱"/></label>
      <label>開戶支行（選填）<input name="branch" maxLength={150} defaultValue={account.branch}/></label>
      <label>銀行卡號 / 收款賬號<input name="accountNumber" required inputMode="numeric" pattern="[0-9 -]{6,50}" maxLength={50} autoComplete="off" placeholder="請填寫完整銀行卡號或收款賬號"/></label>
      <label>再次輸入銀行卡號 / 收款賬號<input name="confirmAccountNumber" required inputMode="numeric" pattern="[0-9 -]{6,50}" maxLength={50} autoComplete="off" placeholder="請再次輸入上方相同的號碼" aria-describedby="bank-confirm-help"/></label><p id="bank-confirm-help" className="ce-field-help">請與上方號碼保持一致，避免輸入錯誤導致無法收款。</p>
      <BankIdentityFields username={account.username||""}/>
      <p>收款資料加密保存，保存後僅顯示賬號尾號。申請提現時使用此資料，由 App 平台審核打款。</p><div className="ce-bank-actions"><button className="cw-outline" type="button" onClick={()=>account.bound?setEditing(false):onClose()}>取消</button><button className="ce-bank" type="submit">{saving?"正在保存…":"確認綁定"}</button></div>
    </fieldset></form>}
  </dialog>;
}
