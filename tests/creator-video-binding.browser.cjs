const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {execFileSync}=require('node:child_process');
(async()=>{
 const who='invite_qa_'+Date.now();let member,browser;
 const auth=await fetch('http://localhost:8080/creator-api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:process.env.TEAM_QA_ACCOUNT,password:process.env.TEAM_QA_PASSWORD,accepted:true,displayName:''})}).then(r=>r.json());
 if(!auth.account?.id||!auth.token)throw Error('Set TEAM_QA_ACCOUNT / TEAM_QA_PASSWORD for local demo');
 try{
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'md_creator_session',value:auth.token,url:'http://localhost:3000'}]);const page=await context.newPage();
 let count=0;let code='APP_CONNECTION_UNAVAILABLE';
 await page.route('**/api/creator-videos?*',route=>{count++;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'App 暫時無法連接，請稍後重試；不需要重複綁定。',code})});});
 await page.goto('http://localhost:3000/creator/workspace#videos');await page.getByRole('heading',{name:'視頻服務暫時無法連接'}).waitFor();if(await page.getByRole('link',{name:'綁定 App 賬號',exact:true}).count())throw Error('Unexpected binding link');const before=count;const retried=page.waitForResponse(r=>r.url().includes('/api/creator-videos?'));await page.getByRole('button',{name:'重新連接',exact:true}).click();await retried;if(count<=before)throw Error('Retry not requested');
 code='APP_BINDING_REQUIRED';await page.reload();await page.getByRole('heading',{name:'綁定 App 賬號開啟視頻創作'}).waitFor();
 code='APP_REAUTH_REQUIRED';await page.reload();await page.getByRole('heading',{name:'App 賬號已綁定，登錄狀態需更新'}).waitFor();console.log('PASS: connection error has retry only; missing binding and expired session have distinct UI');

 }finally{await browser?.close();if(member){execFileSync('D:/MySQL/mysql-5.7.37-winx64/mysql-5.7.37-winx64/bin/mysql.exe',['--host=127.0.0.1','--port=3309','--user=root','--database=mydream_cms','-e',`DELETE FROM cms_creator_team_member WHERE account_id='${member}'; DELETE FROM cms_creator_team_audit WHERE company_owner='${auth.account.id}' AND action='邀請成員 ${who}'; DELETE FROM cms_creator_session WHERE account_id='${member}'; DELETE FROM cms_creator_account WHERE id='${member}'`]);}await fetch('http://localhost:8080/creator-api/v1/auth/logout',{method:'POST',headers:{Authorization:'Bearer '+auth.token}});}
})().catch(e=>{console.error(e);process.exitCode=1});
