const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const auth=await fetch('http://localhost:8080/creator-api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:process.env.TEAM_QA_ACCOUNT,password:process.env.TEAM_QA_PASSWORD,accepted:true,displayName:''})}).then(r=>r.json());
 if(!auth.token)throw Error('Local demo login required');
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addCookies([{name:'md_creator_session',value:auth.token,url:'http://localhost:3000'}]);
  const page=await context.newPage();
  await page.route('**/api/creator-analytics',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({projectComplete:false,projectCount:1,projectIncomeAvailable:false,projectIssues:[{dramaId:723,episodeId:21222,episodeNumber:1,projectTitle:'測試項目',reason:'not_found'}],videos:[{id:'episode:21222',title:'測試項目 · 第 1 集',status:'App 未返回此劇集',publishedAt:null,views:null,likes:null,comments:null,collections:null}],rewards:[],rewardsComplete:true,fans:0,complete:true,updatedAt:new Date().toISOString(),profileUnavailable:false})}));
  await page.goto('http://localhost:3000/creator/workspace#data');
  await page.getByText('部分劇集數據待確認，相關統計暫以「—」顯示。').waitFor();
  await page.getByText('查看 1 集的具體原因').click();
  await page.getByText(/劇目 723 \/ 劇集 21222/).waitFor();
  if(await page.locator('.ca-notice').count()!==1)throw Error('Income explanation must not be a warning');
  if(await page.locator('.ca-kpis section').first().locator('strong').innerText()!=='—')throw Error('Unknown views must not show zero');
  await page.screenshot({path:'.data/project-analytics-fixed.png',fullPage:true});
  console.log('PASS: specific missing episode, unknown totals and neutral income explanation');
 }finally{
  await browser?.close();
  await fetch('http://localhost:8080/creator-api/v1/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+auth.token}});
 }
})().catch(error=>{console.error(error);process.exitCode=1});
