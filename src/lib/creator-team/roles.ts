export const memberPermissions = {
 "project.edit":"建立與編輯項目", "video.edit":"上傳與編輯視頻", "delivery.submit":"提交平台審核",
 "traffic.view":"查看作品流量", "traffic.export":"導出流量表格", "cooperation.view":"查看合作邀約",
 "cooperation.edit":"編輯合作草稿", "contract.summary.view":"查看合同摘要",
} as const;
export type MemberPermission = keyof typeof memberPermissions;
export const memberRoles = {
 VIEWER:{label:"只讀成員",description:"查看項目、視頻與交付進度",permissions:[]},
 CREATOR:{label:"創作成員",description:"建立項目、上傳視頻、修改並提交審核",permissions:["project.edit","video.edit","delivery.submit"]},
 OPERATOR:{label:"運營成員",description:"管理創作內容，同時查看作品流量",permissions:["project.edit","video.edit","delivery.submit","traffic.view"]},
 ANALYST:{label:"數據觀察員",description:"查看與導出流量，不修改創作內容",permissions:["traffic.view","traffic.export"]},
 BUSINESS:{label:"商務協作員",description:"查看邀約、整理合作草稿及合同摘要",permissions:["cooperation.view","cooperation.edit","contract.summary.view"]},
} satisfies Record<string,{label:string;description:string;permissions:MemberPermission[]}>;
export function roleLabel(role?:string){return role==="OWNER"?"總管理員":memberRoles[role as keyof typeof memberRoles]?.label||"自定義成員";}
export type PermissionScope={member:boolean;canEdit:boolean;canUpload:boolean;canSubmit:boolean;permissions?:string[];role?:string};
export function hasPermission(scope:PermissionScope,permission:MemberPermission){return !scope.member||!!scope.permissions?.includes(permission);}
export function memberPermissionValues(member:PermissionScope & {extraPermissions?:string}){
 return [...new Set([...(member.permissions??member.extraPermissions?.split(",").filter(Boolean)??[]),...(member.canEdit?["project.edit"]:[]),...(member.canUpload?["video.edit"]:[]),...(member.canSubmit?["delivery.submit"]:[])])] as MemberPermission[];
}
export function memberIdentityLabel(member:PermissionScope & {extraPermissions?:string}){
 const preset=memberRoles[member.role as keyof typeof memberRoles];
 const custom=preset&&[...preset.permissions].sort().join(",")!==memberPermissionValues(member).sort().join(",");
 return roleLabel(member.role)+(custom?" · 自定義":"");
}
