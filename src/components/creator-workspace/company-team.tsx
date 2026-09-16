"use client";
import {createContext,useContext,useEffect,useRef,useState} from "react";
import "./company-team.css";
import {Building2,Users,UserPlus,CheckCircle2,ShieldCheck,LoaderCircle,Info,X} from "lucide-react";
import {memberRoles,memberPermissions,memberPermissionValues,memberIdentityLabel,roleLabel,type PermissionScope,type MemberPermission} from "@/lib/creator-team/roles";
import {requestTeamAction} from "@/lib/creator-team/actions";
export type Team=PermissionScope & {member:boolean;company:boolean;unavailable:boolean;ownerId:string;name:string;canEdit:boolean;canUpload:boolean;canSubmit:boolean;invitations:{ownerId:string;name:string;state:string}[];members?:Member[];history?:{username:string;action:string;createdAt:string}[]};
type Member=PermissionScope & {extraPermissions?:string;accountId:string;username:string;displayName:string;state:string;canEdit:boolean;canUpload:boolean;canSubmit:boolean};
export const CompanyPermissions=createContext<PermissionScope>({member:false,canEdit:true,canUpload:true,canSubmit:true});
export const useCompanyPermissions=()=>useContext(CompanyPermissions);
export function CompanyTeam(){
 const [data,setData]=useState<Team|null>(null),[error,setError]=useState(""),[pending,setPending]=useState(""),[notice,setNotice]=useState("");
 const [inviteRole,setInviteRole]=useState("VIEWER"),[invitePermissions,setInvitePermissions]=useState<MemberPermission[]>([]);
 const [inviteOpen,setInviteOpen]=useState(false);const inviteDialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(inviteOpen)inviteDialog.current?.showModal();},[inviteOpen]);
 const submitting=useRef(false);const busy=!!pending;
 useEffect(()=>{const c=new AbortController();fetch("/api/creator/team",{cache:"no-store",signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.detail||"讀取失敗");return d;}).then(setData).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 async function act(path:string,body:Record<string,unknown>,switching=false){
  if(submitting.current)return false;submitting.current=true;setPending(path);setError("");setNotice("");
  try{const result=await requestTeamAction<Team>(path,body);setData(result.data);setNotice(result.message);if(switching){history.replaceState(null,"","#home");window.location.reload();}return true;}catch(e){setError(e instanceof Error&&e.name!=="TimeoutError"?e.message:"連接超時，請刷新成員列表確認是否已發送，再重試。");return false;}finally{submitting.current=false;setPending("");}
 }

 return <section className="cw-card ct-team"><header className="ct-heading"><div><h1 className="cw-page-title">成員管理</h1><p>{data?.name||"公司邀請與協作身份"}</p></div>{data?.company&&!data.member&&!data.unavailable&&<button className="cw-primary" onClick={()=>{setError("");setInviteOpen(true);}}><UserPlus size={16}/>添加成員</button>}</header>
 {error&&<p className="ct-feedback is-error" role="alert">{error}</p>}{notice&&<p className="ct-feedback" role="status"><CheckCircle2 size={17}/>{notice}</p>}{!data&&!error&&<p>正在讀取…</p>}
 {data&&(data.member||data.unavailable)&&<p>點擊右上角賬號，可切換企業賬號與個人賬號。</p>}
 {!!data?.invitations.length&&<section><h3>我的公司邀請與團隊</h3>{data.invitations.map(i=><div className="ct-member" key={i.ownerId}><div><strong>{i.name}</strong><small>{i.state==="INVITED"?"邀請您加入公司，接受後可查看公司項目；操作權限由總管理員分配。":"已加入"}</small></div><div>{i.state==="INVITED"?<><button disabled={busy} onClick={()=>void act("select",{ownerId:i.ownerId,action:"DECLINE"})}>拒絕</button><button className="cw-primary" disabled={busy} onClick={()=>void act("select",{ownerId:i.ownerId,action:"ACCEPT"},true)}>接受邀請</button></>:<small>在右上角切換企業賬號</small>}</div></div>)}</section>}
 {data?.member&&<div className="ct-my-role"><h3>{memberIdentityLabel(data)}</h3><p>可查看企業項目及視頻進度。{memberPermissionValues(data).map(p=>memberPermissions[p]).filter(Boolean).join("、")||"目前為只讀權限"}。</p><small>銀行卡、提現及企業管理由總管理員負責。</small></div>}
 {data?.company&&!data.member&&!data.unavailable&&<><p className="ct-info"><Info size={17}/>總管理員管理企業全部內容；成員按身份開放業務權限，銀行卡與提現僅總管理員可操作。</p>{inviteOpen&&<dialog ref={inviteDialog} className="ct-role-dialog ct-invite-dialog" onCancel={e=>{e.preventDefault();if(!busy)setInviteOpen(false);}}><button className="ct-dialog-close" aria-label="關閉邀請" disabled={busy} onClick={()=>setInviteOpen(false)}><X size={20}/></button>{error&&<p role="alert" className="ct-feedback is-error">{error}</p>}<form className="ct-invite" aria-busy={pending==="invite"} onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);if(await act("invite",{account:String(f.get("account")||"").trim(),role:inviteRole,permissions:invitePermissions})){form.reset();setInviteOpen(false);}}}>
 <div className="ct-section-title"><UserPlus size={19}/><div><h3>邀請成員</h3><p>輸入對方的個人創作者賬號，選擇成員身份，即可套用對應權限。</p></div></div>
 <fieldset disabled={busy}><label className="ct-account-label">個人創作者賬號<input name="account" required maxLength={32} placeholder="輸入對方登錄創作者平台的賬號"/><small>對方需先註冊，接受邀請後才能使用企業賬號。</small></label>
 <RolePicker role={inviteRole} permissions={invitePermissions} onChange={(role,permissions)=>{setInviteRole(role);setInvitePermissions(permissions);}}/>
 <footer className="ct-invite-footer"><span><ShieldCheck size={16}/>收益、銀行卡、提現、簽約及企業管理僅總管理員可用。</span><button className="cw-primary" disabled={busy}>{pending==="invite"?<LoaderCircle className="ct-spinner" size={16}/>:<UserPlus size={16}/>} {pending==="invite"?"正在發送…":"發送邀請"}</button></footer></fieldset></form></dialog>}
 <section className="ct-roster"><div className="ct-section-title"><Users size={19}/><h3>團隊成員</h3><span className="ct-count">已加入 {data.members?.filter(m=>m.state==="ACTIVE").length||0}</span><span className="ct-count">待接受 {data.members?.filter(m=>m.state==="INVITED").length||0}</span></div><div className="ct-table-wrap"><table className="ct-table"><thead><tr><th>成員信息</th><th>賬號狀態</th><th>成員類型</th><th>操作</th></tr></thead><tbody><tr><td><div className="ct-person"><span className="ct-avatar"><Building2 size={20}/></span><div><strong>{data.name}（我）</strong><small>企業賬號</small></div></div></td><td><span className="ct-status is-active">使用中</span></td><td>總管理員</td><td><span className="ct-muted">不可移除</span></td></tr>{data.members?.map(m=><MemberRow key={`${m.accountId}:${m.state}:${m.canEdit}:${m.canUpload}:${m.canSubmit}:${m.role}:${m.extraPermissions}`} member={m} busy={busy} change={body=>act("member",body)}/>)}</tbody></table></div>{!data.members?.length&&<div className="ct-empty"><Users size={26}/><strong>還沒有團隊成員</strong><p>發出第一份邀請，在這裡查看接受狀態並管理權限。</p></div>}</section>

 <details><summary>團隊操作記錄（最近 100 條）</summary>{data.history?.map((h,i)=><details className="ct-audit-entry" key={i}><summary>{h.username} · {actionLabel(h.action)}<small>{new Date(h.createdAt).toLocaleString("zh-TW")}</small></summary><p>{h.action}</p></details>)}</details></>}
 {data&&!data.company&&!data.member&&!data.invitations.length&&<p>暫無公司邀請。公司身份認證通過後，可在這裡管理團隊。</p>}
 </section>;
}
function RolePicker({role,permissions,onChange}:{role:string;permissions:MemberPermission[];onChange:(role:string,permissions:MemberPermission[])=>void}){
 const preset=memberRoles[role as keyof typeof memberRoles];
 const custom=!!preset&&JSON.stringify([...preset.permissions].sort())!==JSON.stringify([...permissions].sort());
 function toggle(p:MemberPermission,checked:boolean){let next=checked?[...permissions,p]:permissions.filter(v=>v!==p);if(checked&&p==="delivery.submit")next.push("video.edit");if(checked&&p==="traffic.export")next.push("traffic.view");if(checked&&p==="cooperation.edit")next.push("cooperation.view");if(!checked&&p==="video.edit")next=next.filter(v=>v!=="delivery.submit");if(!checked&&p==="traffic.view")next=next.filter(v=>v!=="traffic.export");if(!checked&&p==="cooperation.view")next=next.filter(v=>v!=="cooperation.edit");onChange(role,[...new Set(next)]);}
 return <div className="ct-role-picker"><label>成員身份<select value={role} onChange={e=>{const key=e.target.value;onChange(key,[...memberRoles[key as keyof typeof memberRoles].permissions]);}}>{!preset&&<option value="CUSTOM">自定義成員</option>}{Object.entries(memberRoles).map(([key,r])=><option key={key} value={key}>{r.label}</option>)}</select></label><p>{preset?.description||"保留現有權限組合"}{custom&&" · 自定義"}</p><details><summary>微調業務權限</summary><div className="ct-permission-cards">{Object.entries(memberPermissions).map(([key,label])=><label key={key}><input type="checkbox" checked={permissions.includes(key as MemberPermission)} onChange={e=>toggle(key as MemberPermission,e.target.checked)}/><span>{label}</span></label>)}</div></details></div>;
}
function MemberRow({member:m,busy,change}:{member:Member;busy:boolean;change:(body:Record<string,unknown>)=>Promise<boolean>}){
 const [open,setOpen]=useState(false),[role,setRole]=useState(m.role||"CUSTOM"),[permissions,setPermissions]=useState(memberPermissionValues(m));
 const dialog=useRef<HTMLDialogElement>(null);useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
 const active=["ACTIVE","INVITED"].includes(m.state);
 return <tr><td><div className="ct-person"><span className="ct-avatar">{(m.displayName||m.username).slice(0,1)}</span><div><strong>{m.displayName||m.username}</strong><small>賬號：{m.username}</small></div></div></td><td><span className={`ct-status ${m.state==="ACTIVE"?"is-active":""}`}>{{ACTIVE:"使用中",INVITED:"待接受",REMOVED:"已移除",DECLINED:"已拒絕"}[m.state]||m.state}</span></td><td>{memberIdentityLabel(m)}</td><td>{active&&<div><button disabled={busy} onClick={()=>{setRole(m.role||"CUSTOM");setPermissions(memberPermissionValues(m));setOpen(true);}}>調整身份</button><button className="ct-remove" disabled={busy} onClick={()=>{if(confirm("移除此成員後，對方將無法訪問企業賬號；公司項目會保留。"))void change({accountId:m.accountId,action:"REMOVE"});}}>移除</button></div>}{open&&<dialog ref={dialog} className="ct-role-dialog" onCancel={e=>{e.preventDefault();setOpen(false);}}><form onSubmit={async e=>{e.preventDefault();if(await change({accountId:m.accountId,action:"PERMISSIONS",role,permissions}))setOpen(false);}}><h2>調整成員身份</h2><p>{m.displayName} · 原身份：{memberIdentityLabel(m)}</p><fieldset disabled={busy}><RolePicker role={role} permissions={permissions} onChange={(r,p)=>{setRole(r);setPermissions(p);}}/><p>保存後立即生效；不包含財務及企業管理權限。</p><footer><button type="button" onClick={()=>setOpen(false)}>取消</button><button className="cw-primary" type="submit">{busy?"保存中…":"保存身份"}</button></footer></fieldset></form></dialog>}</td></tr>;
}

function actionLabel(action:string){
 if(action.startsWith("PERMISSIONS "))return "更新成員權限";
 if(action.startsWith("REMOVE "))return "移除成員";
 if(action.includes("/episodes/")&&action.endsWith("/draft"))return "保存視頻待提交稿";
 if(action.includes("/episodes/")&&action.endsWith("/submit"))return "提交劇集驗收";
 if(action.endsWith("/uploads"))return "開始上傳視頻";
 if(action.endsWith("/materials"))return "更新項目補充資料";
 if(action.endsWith("/settings"))return "更新項目上架資料";
 if(action.endsWith("/projects"))return "建立公司項目";
 if(action.endsWith("/notifications/read"))return "閱讀審核通知";
 if(action.startsWith("POST /"))return "確認操作資格";
 return action;
}
