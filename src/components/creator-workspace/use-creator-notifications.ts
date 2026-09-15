"use client";
import {useEffect,useRef,useState} from "react";
export type Notice={id:string;projectId:string;title:string;message:string;createdAt:string;isRead:boolean|number;kind:string;href:string};
export function useCreatorNotifications(enabled:boolean){
 const [items,setItems]=useState<Notice[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(enabled),[marking,setMarking]=useState(false),[revision,setRevision]=useState(0);
 const sequence=useRef(0);
 useEffect(()=>{if(!enabled){setItems([]);setLoading(false);return;}const controller=new AbortController();let pending=false;async function load(){if(pending)return;pending=true;const ticket=++sequence.current;try{const r=await fetch("/api/creator/notifications",{cache:"no-store",signal:controller.signal});const d=await r.json();if(!r.ok)throw Error(d.detail||"通知讀取失敗");if(ticket===sequence.current){setItems(d.items);setError("");}}catch(e){if(!controller.signal.aborted&&ticket===sequence.current)setError(e instanceof Error?e.message:"讀取失敗");}finally{pending=false;if(!controller.signal.aborted)setLoading(false);}}setLoading(true);void load();const visible=()=>{if(document.visibilityState==="visible")void load();};const timer=setInterval(visible,30000);window.addEventListener("focus",visible);return()=>{controller.abort();clearInterval(timer);window.removeEventListener("focus",visible);};},[enabled,revision]);
 async function read(ids:string[]){if(!ids.length||marking)return;setMarking(true);try{const r=await fetch("/api/creator/notifications/read",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});const d=await r.json();if(!r.ok)throw Error(d.detail||"標記失敗");++sequence.current;setItems(rows=>rows.map(n=>ids.includes(n.id)?{...n,isRead:true}:n));setError("");}catch(e){setError(e instanceof Error?e.message:"標記失敗");}finally{setMarking(false);}}
 return {items,error,loading,marking,read,refresh:()=>setRevision(n=>n+1),unread:items.filter(n=>!n.isRead).length};
}
export type NotificationFeed=ReturnType<typeof useCreatorNotifications>;
