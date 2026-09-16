"use client";
import {useEffect,useState} from "react";
import {UserRound,Building2} from "lucide-react";
export function CreatorAvatar({current=false,enterprise=false,size=32}:{current?:boolean;enterprise?:boolean;size?:number}){
 const [url,setUrl]=useState("");
 useEffect(()=>{let alive=true,objectUrl="",controller:AbortController|undefined;let version=0;
 const load=async()=>{const requestVersion=++version;controller?.abort();controller=new AbortController();try{const r=await fetch(`/api/creator-auth/avatar${current?"?scope=current":""}`,{cache:"no-store",signal:controller.signal});if(!r.ok||r.status===204)return;const blob=await r.blob();if(!alive||requestVersion!==version)return;const next=URL.createObjectURL(blob);if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=next;setUrl(next);}catch{}};
 void load();window.addEventListener("creator-avatar-updated",load);return()=>{alive=false;controller?.abort();window.removeEventListener("creator-avatar-updated",load);if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[current]);
 return url?<img src={url} alt="賬號頭像" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:enterprise?<Building2 size={size}/>:<UserRound size={size}/>;
}
