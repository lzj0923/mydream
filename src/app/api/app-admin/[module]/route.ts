import { NextRequest } from "next/server";
import { isAllowedOrigin } from "@/lib/app-auth/request-security";
import { moduleKey, modules, editFields, record, formToken } from "@/lib/app-admin/domain";
import { state, persist, response, upstream, exclusive, authenticated, list, AdminError, errorResponse } from "@/lib/app-admin/server";
type Context={params:Promise<{module:string}>};
export async function GET(request:NextRequest,context:Context){
  try{const key=moduleKey((await context.params).module),s=await state();authenticated(s);
    const page=Math.min(10000,Math.max(1,Number(request.nextUrl.searchParams.get("page"))||1));
    return await exclusive(s,async()=>{const data=await list(s,key,Math.floor(page),(request.nextUrl.searchParams.get("search")??"").slice(0,100));await persist(s);return response(s,{rows:data.rows,total:data.total,page});});
  }catch(e){return errorResponse(e);}
}
export async function POST(request:NextRequest,context:Context){
  if(!isAllowedOrigin(request))return errorResponse(new AdminError("請求來源無效",403));
  try{const key=moduleKey((await context.params).module),s=await state();authenticated(s);
    if(Number(request.headers.get("content-length"))>8192)throw new AdminError("請求過大");
    const body=record(await request.json()),id=String(body.id??"");if(!/^[1-9][0-9]{0,14}$/.test(id))throw new AdminError("記錄編號無效");
    return await exclusive(s,async()=>{
      const current=await list(s,key,1,"",id),index=current.rows.findIndex(r=>String(r.id)===id);
      if(index<0)throw new AdminError("記錄不存在或無訪問權限",404);
      if(current.rows[index].revision!==body.revision)throw new AdminError("App 數據已變化，請刷新後重試",409);
      const params=new URLSearchParams();let route=modules[key].path;
      if(body.action==="status"){
        const status=String(body.status??"");if(!(modules[key].statuses as readonly string[]).includes(status))throw new AdminError("狀態無效");
        if(key==="dramas"){route+="/editstatus/ids/"+id;params.set("row[status]",status);}
        else{route+="/multi";params.set("ids",id);params.set("params","status="+status);}
      }else if(body.action==="edit"){
        const fields=editFields(key,body.fields);route+="/edit/ids/"+id;
        const html=await upstream(s,route,undefined,true) as string;const token=formToken(html);if(token)params.set("__token__",token);
        if(key==="users"&&!fields.username)fields.username=String(record(current.raw[index]).username??"");
        if(key==="dramas"){
          const relation=record(current.raw[index]).typerelation;
          if(!Array.isArray(relation)||!relation.length)throw new AdminError("該短劇分類需要在 App 原後台補全後再編輯");
          for(const item of relation){const category=String(record(item).type_id??"");if(!/^[1-9][0-9]*$/.test(category))throw new AdminError("短劇分類返回異常");params.append("type[]",category);}
        }
        for(const [field,value]of Object.entries(fields))params.set(`row[${field}]`,value);
      }else throw new AdminError("不支持的操作");
      await upstream(s,route,params);await persist(s);return response(s,{ok:true});
    });
  }catch(e){return errorResponse(e);}
}
