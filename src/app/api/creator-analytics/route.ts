import { NextResponse } from "next/server";
import { videoViewer, appData, VideoApiError } from "@/lib/creator-video/server";
import { callAppApi } from "@/lib/app-auth/upstream";
import { record } from "@/lib/creator-video/domain";
import { counter } from "@/lib/creator-analytics";

import {loadCreatorRewards} from "@/lib/creator-rewards";
import {projectAnalytics} from "@/lib/creator-video/project-analytics";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const {token,user}=await videoViewer();
    const rewardsPromise=loadCreatorRewards(user.id,async page=>appData(await callAppApi(`/api/user/getScoreConsumptionHistory?page=${page}&limit=100`,{token,method:"GET"})))
      .catch(()=>({rewards:null,rewardsComplete:false}));
    // The upstream defaults to the authenticated owner when userId is omitted.
    const assetBase=process.env.CMS_APP_PUBLIC_BASE_URL || "https://new-mydream.oss-cn-hongkong.aliyuncs.com";
    const projectsPromise=projectAnalytics(assetBase).catch(()=>({videos:[],projectComplete:false,projectCount:0,projectIncomeAvailable:false}));
    const profilePromise=callAppApi('/api/video/getCreatorInfo',{token,method:'GET'}).then(result=>{
      const profile=record(appData(result));
      if(Number(profile.id)!==user.id)throw new Error('Invalid owner');
      return {fans:counter(profile.fansNum),profileUnavailable:false};
    }).catch(()=>({fans:null,profileUnavailable:true}));
    const projectData=await projectsPromise;
    return NextResponse.json({...projectData,videos:projectData.videos,...await profilePromise,...await rewardsPromise,complete:projectData.projectComplete,videosUnavailable:!projectData.projectComplete,updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    return NextResponse.json({message:error instanceof VideoApiError?error.message:'創作數據暫時無法讀取，請稍後重試'},{status:error instanceof VideoApiError?error.status:502,headers:{'Cache-Control':'no-store'}});
  }
}
