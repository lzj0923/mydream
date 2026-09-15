import {NextRequest,NextResponse} from "next/server";
import {isAllowedOrigin} from "@/lib/app-auth/request-security";
import {publicErrorMessage} from "@/lib/app-auth/response";
import {videoViewer,VideoApiError} from "@/lib/creator-video/server";
import {projectRequest} from "@/lib/creator-video/project-server";
import {recoverProjectCover} from "@/lib/creator-video/store";
import {uploadVideoCover} from "@/lib/creator-video/upload-cover";
import {MAX_COVER_BYTES,safeMediaUrl} from "@/lib/creator-video/domain";

type Submission={id:string;state:string;revision:number;episodeNumber:number;version:number;title:string;description:string;coverUrl:string;note:string};
async function scope(request:NextRequest,write=false){
 const projectId=request.nextUrl.searchParams.get("projectId")??"",submissionId=request.nextUrl.searchParams.get("submissionId")??"";
 if(![projectId,submissionId].every(id=>/^[a-zA-Z0-9-]{1,80}$/.test(id)))throw new VideoApiError("請選擇有效項目和交付稿");
 const {token,user}=await videoViewer(write||request.nextUrl.searchParams.get("purpose")!=="SUBMIT"?"UPLOAD":"SUBMIT");
 const project=await projectRequest<{stage:string;submissions:Submission[];publications:{episodeNumber:number}[]}>(token,`projects/${projectId}/episodes`);
 const item=project.submissions.find(row=>row.id===submissionId);
 if(!item)throw new VideoApiError("交付稿不存在",404);
 const versions=project.submissions.filter(row=>row.episodeNumber===item.episodeNumber);
 if(project.stage!=="PRODUCING"||!['DRAFT','CHANGES_REQUESTED'].includes(item.state)||versions.some(row=>row.revision>item.revision||['SUBMITTED','APPROVED'].includes(row.state))||project.publications.some(row=>row.episodeNumber===item.episodeNumber))throw new VideoApiError("本集已更新或不可編輯，請刷新項目進度",409);
 return {token,user,projectId,submissionId,item};
}
function failure(error:unknown){return NextResponse.json({message:publicErrorMessage(error,"無法恢復草稿，請重試"),code:error instanceof VideoApiError?error.code:"VIDEO_ERROR"},{status:error instanceof VideoApiError?error.status:502});}
export async function GET(request:NextRequest){
 try{const {user,projectId,submissionId,item}=await scope(request);const coverUrl=item.coverUrl||await recoverProjectCover(user.id,projectId,submissionId);return NextResponse.json({coverUrl:safeMediaUrl(coverUrl,"https://new-mydream.oss-cn-hongkong.aliyuncs.com")||""},{headers:{"Cache-Control":"no-store"}});}catch(error){return failure(error);}
}
export async function POST(request:NextRequest){
 if(!isAllowedOrigin(request))return NextResponse.json({message:"請求來源無效"},{status:403});
 try{
  const {token,projectId,submissionId,item}=await scope(request,true);
  await projectRequest(token,`projects/${projectId}/episodes/${submissionId}/edit-check`,{});
  if(!request.body)throw new VideoApiError("請選擇封面圖片");
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX_COVER_BYTES+65536){await reader.cancel();throw new VideoApiError("封面圖片不能超過 5 MB",413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const form=await new Response(bytes,{headers:{"Content-Type":request.headers.get("content-type")||""}}).formData();const file=form.get("file");
  if(!(file instanceof File))throw new VideoApiError("請選擇封面圖片");
  const coverUrl=await uploadVideoCover(file,token);
  const saved=await projectRequest<Submission>(token,`projects/${projectId}/episodes/${submissionId}/metadata`,{title:item.title,description:item.description,coverUrl,note:item.note||"補充封面，等待提交",version:item.version});
  return NextResponse.json({coverUrl:saved.coverUrl,version:saved.version});
 }catch(error){return failure(error);}
}
