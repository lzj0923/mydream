import "server-only";
import {mkdir,open,readFile,writeFile,rename,unlink} from "node:fs/promises";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {DraftError} from "./app-draft";
export type PublicationOperation={dramaId?:number;creating?:boolean;title?:string};
export async function withProjectPublication<T>(id:string,action:(state:PublicationOperation,save:(s:PublicationOperation)=>Promise<void>)=>Promise<T>){
 if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw new DraftError("項目編號無效",400);
 const dir=path.join(process.cwd(),".data","project-publications");await mkdir(dir,{recursive:true,mode:0o700});
 const file=path.join(dir,id+".json"),lock=file+".lock";let handle;
 try{handle=await open(lock,"wx",0o600);}catch{throw new DraftError("此項目正在上架，請稍後核對");}
 try{let state:PublicationOperation={};try{state=JSON.parse(await readFile(file,"utf8"));}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
 return await action(state,async value=>{const tmp=file+randomUUID();await writeFile(tmp,JSON.stringify(value),{mode:0o600});await rename(tmp,file);});
 }finally{await handle.close();await unlink(lock);}
}
