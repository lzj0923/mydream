import "server-only";
import {readCreatorToken} from "../creator-auth/server";
import {callAppApi} from "../app-auth/upstream";
import {appData} from "./server";
import {loadProjectAnalytics,type PublicationRef} from "./project-analytics-data";
export async function projectPublicationRefs(){
 const token=await readCreatorToken();if(!token)throw Error("Creator login required");
 const r=await fetch((process.env.CMS_API_URL||"http://127.0.0.1:8080").replace(/\/$/,"")+"/creator-api/v1/project-publications",{headers:{Authorization:`Bearer ${token}`},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error("Project associations unavailable");
 const refs:PublicationRef[]=await r.json();if(!Array.isArray(refs))throw Error("Invalid associations");
 return refs;
}
export async function projectAnalytics(assetBase:string){
 const refs=await projectPublicationRefs();
 return loadProjectAnalytics(refs,assetBase,async(id,page)=>appData(await callAppApi(`/api/drama/dramaDetail?id=${encodeURIComponent(id)}&page=${page}&limit=100`,{method:"GET"})));
}
