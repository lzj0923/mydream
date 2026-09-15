import { createHmac } from "node:crypto";
export function reviewToken(actorId:number,method:string,uri:string,key:string,now=Date.now()):string {
 if(key.length<32) throw new Error("Review bridge is not configured");
 if(!Number.isSafeInteger(actorId)||actorId<1) throw new Error("Invalid App administrator");
 const payload=Buffer.from(JSON.stringify({actor:String(actorId),expires:Math.floor(now/1000)+30,method,uri})).toString("base64url");
 return "ar_"+payload+"."+createHmac("sha256",key).update(payload).digest("base64url");
}
