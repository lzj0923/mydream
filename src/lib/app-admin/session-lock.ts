import {mkdir, open, readFile, unlink} from "node:fs/promises";
import path from "node:path";
import {setTimeout as delay} from "node:timers/promises";

export class SessionLockError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status=status; }
}
type Session = {id: string; expires: number; actor?: unknown};

/** Serialize a session's PHP requests, including requests from different workers. */
export async function withSessionLock<S extends Session,T>(directory:string,value:S,action:()=>Promise<T>,waitMs=30_000):Promise<T>{
  await mkdir(directory,{recursive:true,mode:0o700});
  const file=path.join(directory,value.id+".lock"),deadline=Date.now()+waitMs;
  let handle;
  for(;;){
    try{handle=await open(file,"wx",0o600);break;}
    catch(e){
      if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;
      if(Date.now()>=deadline)throw new SessionLockError("操作仍在處理中，請稍後重試",503);
      await delay(Math.min(50,Math.max(1,deadline-Date.now())));
    }
  }
  try{
    // A queued request must not overwrite newer cookies or resurrect a logged-out session.
    if(value.actor){
      let latest:S;
      try{latest=JSON.parse(await readFile(path.join(directory,value.id+".json"),"utf8")) as S;}
      catch{throw new SessionLockError("App 管理員會話已失效，請重新登錄",401);}
      if(latest.id!==value.id||!latest.actor||latest.expires<=Date.now())throw new SessionLockError("App 管理員會話已失效，請重新登錄",401);
      Object.assign(value,latest);
    }
    return await action();
  }finally{await handle.close();await unlink(file).catch(()=>undefined);}
}
