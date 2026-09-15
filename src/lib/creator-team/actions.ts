export async function requestTeamAction<T>(path:string,body:Record<string,unknown>):Promise<{data:T;message:string}>{
 const response=await fetch(`/api/creator/team/${path}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const data=await response.json();
 if(!response.ok)throw new Error(data.detail||data.message||"操作失敗，請重試");
 const message=path==="invite"?`邀請已發送給 ${body.account}，等待對方接受。`:body.action==="REMOVE"?"成員已移除，公司項目已保留。":body.action==="PERMISSIONS"?"成員權限已保存並生效。":body.action==="DECLINE"?"已拒絕邀請。":"邀請已接受，正在切換企業賬號…";
 return {data,message};
}
