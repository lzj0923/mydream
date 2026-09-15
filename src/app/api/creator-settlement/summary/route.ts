import {projectIncome} from "@/lib/creator-settlement/project-income";
import {projectPublicationRefs} from "@/lib/creator-video/project-analytics";
import {AppAccessError} from "@/lib/app-auth/access-error";
import {NextResponse} from "next/server";
import {videoViewer,appData,VideoApiError} from "@/lib/creator-video/server";
import {callAppApi} from "@/lib/app-auth/upstream";
import {loadCreatorRewards} from "@/lib/creator-rewards";
import {loadWithdrawals,earningsSummary} from "@/lib/creator-settlement/summary";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const {token,user}=await videoViewer();
  const [income,withdrawals]=await Promise.allSettled([
   loadCreatorRewards(user.id,async page=>appData(await callAppApi(`/api/user/getScoreConsumptionHistory?page=${page}&limit=100`,{token,method:"GET"}))),
   loadWithdrawals(user.id,async page=>appData(await callAppApi(`/api/user/getUserWithdrawal?page=${page}&limit=100`,{token,method:"GET"})))
  ]);
  for(const result of [income,withdrawals])if(result.status==="rejected"&&result.reason instanceof AppAccessError)throw result.reason;
  let projects=null;
  if(income.status==="fulfilled"){try{projects=projectIncome(income.value.rewards,await projectPublicationRefs(),income.value.rewardsComplete);}catch{ /* Keep unavailable distinct from zero income. */ }}
  return NextResponse.json({...earningsSummary(income.status==="fulfilled"?income.value.rewards:null,income.status==="fulfilled"&&income.value.rewardsComplete,withdrawals.status==="fulfilled"?withdrawals.value:null),projects},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({code:e instanceof VideoApiError||e instanceof AppAccessError?e.code:"APP_CONNECTION_UNAVAILABLE",message:e instanceof VideoApiError||e instanceof AppAccessError?e.message:"收益暫時無法讀取"},{status:e instanceof VideoApiError||e instanceof AppAccessError?e.status:502,headers:{"Cache-Control":"no-store"}});}
}
