type Options={signal:AbortSignal;onWaiting:()=>void;maxAttempts?:number;wait?:(signal:AbortSignal)=>Promise<void>};
function pause(signal:AbortSignal):Promise<void>{
 return new Promise((resolve,reject)=>{
  signal.throwIfAborted();
  const abort=()=>{clearTimeout(timer);reject(signal.reason);};
  const timer=setTimeout(()=>{signal.removeEventListener("abort",abort);resolve();},5000);
  signal.addEventListener("abort",abort,{once:true});
 });
}
/** Retry only explicit processing responses; ambiguous write/network failures are not replayed. */
export async function submitWhenProcessed<T>(submit:()=>Promise<T>,options:Options):Promise<T>{
 const attempts=options.maxAttempts??24;
 for(let attempt=0;attempt<attempts;attempt++){
  options.signal.throwIfAborted();
  try{return await submit();}
  catch(error){
   if(!(error instanceof Error)||!("code" in error)||error.code!=="MEDIA_PROCESSING")throw error;
   if(attempt===attempts-1)throw Object.assign(new Error("雲端處理時間較長，已暫停自動等待。請稍後重試提交，無需重新上傳視頻或封面"),{code:"MEDIA_PROCESSING_TIMEOUT"});
   options.onWaiting();await (options.wait??pause)(options.signal);
  }
 }
 throw new Error("未能完成視頻提交");
}
