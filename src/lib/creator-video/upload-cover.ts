import "server-only";
import {appAuthConfig} from "@/lib/app-auth/config";
import {coverMime,MAX_COVER_BYTES,record,safeMediaUrl} from "./domain";
import {appData,VideoApiError} from "./server";

export async function uploadVideoCover(file:File,token:string):Promise<string>{
 if(!file.size||file.size>MAX_COVER_BYTES)throw new VideoApiError("請選擇 5 MB 以內的封面圖片");
 const mime=coverMime(new Uint8Array(await file.slice(0,16).arrayBuffer()));
 if(!mime)throw new VideoApiError("封面僅支持 JPG、PNG、WebP 圖片");
 const body=new FormData();body.set("file",new Blob([await file.arrayBuffer()],{type:mime}),`cover.${mime==="image/jpeg"?"jpg":mime.split("/")[1]}`);
 const response=await fetch(`${appAuthConfig().baseUrl}/api/common/upload`,{method:"POST",headers:{token,Accept:"application/json","Accept-Language":"zh-cn"},body,cache:"no-store",signal:AbortSignal.timeout(60000),redirect:"error"});
 if(!response.ok)throw new VideoApiError("封面上傳失敗，請稍後重試");
 const data=record(appData(await response.json()));const url=safeMediaUrl(typeof data.url==="string"?data.url:data.fullurl,"https://new-mydream.oss-cn-hongkong.aliyuncs.com");
 if(!url)throw new VideoApiError("封面上傳結果無效");return url;
}
