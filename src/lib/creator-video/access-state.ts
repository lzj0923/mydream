export const videoConnectionFailure={message:"App 暫時無法連接，請稍後重試；不需要重複綁定。",status:503,code:"APP_CONNECTION_UNAVAILABLE"} as const;
export function videoAccessNotice(code:string){
 if(code==="APP_BINDING_REQUIRED")return {title:"綁定 App 賬號開啟視頻創作",action:"綁定 App 賬號",href:"#account"};
 if(code==="APP_REAUTH_REQUIRED")return {title:"App 賬號已綁定，登錄狀態需更新",action:"更新 App 登錄狀態",href:"#account"};
 if(code==="UNAUTHENTICATED")return {title:"請先登錄創作者賬號",action:"登錄創作者賬號",href:"/creator/login?next=%2Fcreator%2Fworkspace%23videos"};
 if(code==="APP_PERMISSION_DENIED"||code==="APP_BINDING_MISMATCH")return {title:"App 賬號資料或權限需核對",action:"",href:""};
 if(code==="TEAM_PERMISSION_DENIED")return {title:"目前沒有視頻操作權限",action:"查看團隊權限",href:"#team"};
 return {title:"視頻服務暫時無法連接",action:"",href:""};
}
