import {mkdir,readFile,writeFile,rename,unlink} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import path from "node:path";
import sharp from "sharp";
export const MAX_AVATAR_BYTES=5*1024*1024;
function target(id:string){if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw Error("Invalid account");return path.join(process.env.CREATOR_AVATAR_DIR||path.join(process.cwd(),".data","creator-avatars"),`${id}.webp`);}
export async function readAvatar(id:string){try{return await readFile(target(id));}catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return null;throw e;}}
export async function saveAvatar(id:string,bytes:Buffer){
 if(!bytes.length||bytes.length>MAX_AVATAR_BYTES)throw Error("請選擇 5 MB 以內的圖片");
 const input=sharp(bytes,{limitInputPixels:20000000,animated:false});
 const meta=await input.metadata();if(!["jpeg","png","webp"].includes(meta.format||""))throw Error("僅支持 JPG、PNG、WebP 圖片");
 const output=await input.rotate().resize(256,256,{fit:"cover",position:"centre"}).webp({quality:85}).toBuffer();
 const file=target(id),temp=`${file}.${randomUUID()}.tmp`;await mkdir(path.dirname(file),{recursive:true,mode:0o700});
 try{await writeFile(temp,output,{mode:0o600,flag:"wx"});await rename(temp,file);}finally{await unlink(temp).catch(()=>{});}
 return output;
}
