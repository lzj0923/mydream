export class AppAccessError extends Error {
 status:number;code:string;
 constructor(message:string,status:number,code:string){super(message);this.status=status;this.code=code;}
}
export function assertAppAccess(code:unknown,httpStatus=200){
 if(httpStatus===401||Number(code)===401)throw new AppAccessError("App 賬號仍已綁定，登錄狀態已過期，請在賬號信息中更新登錄狀態。",409,"APP_REAUTH_REQUIRED");
 if(httpStatus===403||Number(code)===403)throw new AppAccessError("目前 App 賬號沒有此操作權限，請聯繫平台確認。",403,"APP_PERMISSION_DENIED");
}
