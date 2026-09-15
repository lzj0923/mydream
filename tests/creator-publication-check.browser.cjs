const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const auth=await fetch('http://localhost:8080/creator-api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:process.env.TEAM_QA_ACCOUNT,password:process.env.TEAM_QA_PASSWORD,accepted:true,displayName:''})}).then(r=>r.json());
 if(!auth.token)throw Error('Local demo login required');
 let browser,page;
 try{
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--host-resolver-rules=MAP creator-preview.local 127.0.0.1','--no-proxy-server']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addCookies([{name:'md_creator_session',value:auth.token,url:'http://creator-preview.local:3001'}]);
  page=await context.newPage();await page.clock.install();page.on("pageerror",e=>console.log(e.message));
  const project={id:'publication-qa',title:'核對測試',status:'ACTIVE',stage:'PRODUCING',episodeCount:1,version:0,events:[]};
  let checks=0;
  const detail=()=>({...project,submissions:[],synopsis:'',body:'',publications:[{episodeNumber:1,submissionId:'s',appDramaId:723,appEpisodeId:21222,verifiedAt:'2026-09-09T00:00:00Z',checkStatus:checks?'UNAVAILABLE':undefined,checkMessage:'App 劇目尚未上架或不存在',checkedAt:new Date().toISOString()}]});
  await page.route('**/api/creator/projects**',route=>{
   const url=route.request().url();
   let body=url.includes('publication-check')?(checks++, [{status:'UNAVAILABLE',message:'App 劇目尚未上架或不存在'}]):url.endsWith('/episodes')?detail():url.endsWith('/publication-qa')?project:url.endsWith('/projects')?[project]:{fields:{},documents:[],history:[],version:0,locked:false};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('http://creator-preview.local:3001/creator/workspace#projects?project=publication-qa');
  await page.getByRole('heading',{name:'App 關聯記錄 · 上架異常'}).waitFor();
  if(checks!==1)throw Error('Expected one automatic check');
  await page.getByRole('button',{name:'重新核對 App 狀態'}).click();
  await page.getByText('App 劇目尚未上架或不存在',{exact:true}).waitFor();
  if(checks!==2)throw Error('Manual retry did not run');
  await page.reload();
  await page.getByRole('heading',{name:'App 關聯記錄 · 上架異常'}).waitFor();
  await page.screenshot({path:'.data/publication-check-fixed.png',fullPage:true});
  const beforePoll=checks;const polled=page.waitForResponse(r=>r.url().includes('publication-check'));await page.clock.fastForward(61000);await polled;if(checks!==beforePoll+1)throw Error('Visible page did not recheck App after one minute');
  console.log('PASS: automatic check, manual retry, persisted anomaly UI and visible-page periodic recheck');
 }finally{
  await browser?.close();
  await fetch('http://localhost:8080/creator-api/v1/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+auth.token}});
 }
})().catch(error=>{console.error(error);process.exitCode=1});
