export type ProjectSettings={area:string;category:string;landscape:boolean;price:string|number};
export const projectAreas=[{value:"zhf",label:"台灣"},{value:"en",label:"英語"}];
export const projectCategories:Record<string,{value:string;label:string}[]>={
 zhf:[["22","漫劇"],["26","古風"],["39","都市"],["28","奇幻"],["45","穿越"],["62","重生"],["19","愛情"],["35","宮鬥宅鬥"],["48","女性成長"],["56","逆襲"],["33","腦洞"]].map(([value,label])=>({value,label})),
 en:[["74","Rebirth"],["73","Revenge"],["72","Women Growth"],["71","Time Travel"],["70","Urban"],["69","Palace Drama"],["68","Creative"],["67","Fantasy"],["66","Historical"],["65","Comic"],["64","Romance"]].map(([value,label])=>({value,label}))
};
export function settingsFromForm(form:FormData):ProjectSettings{return {area:String(form.get("area")||""),category:String(form.get("category")||""),landscape:form.get("landscape")==="1",price:String(form.get("price")||"")};}
