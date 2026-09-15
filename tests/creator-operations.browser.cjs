const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--host-resolver-rules=MAP creator-preview.local 127.0.0.1','--no-proxy-server']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));let writes=0;
  await page.route('**/api/app-admin/**',route=>{
   const req=route.request(),url=new URL(req.url());let body={rows:[],total:0};if(req.method()!=='GET')writes++;
   if(url.pathname.endsWith('/session'))body={user:{id:7,username:'local_test_admin'},captcha:false,originalUrl:'https://example.invalid/admin'};
   if(url.pathname.endsWith('/operations'))body=url.searchParams.get('view')==='withdrawals'?{rows:[{id:77,user:{username:'Synthetic User'},amount:'100',actual_amount:'10',status:'0'}],total:1}:{rows:[{id:3,entity_type:'project',entity_id:'qa',action:'UPDATE',actor:'creator:test',before_json:{title:'旧名称'},after_json:{title:'新名称'},created_at:1789200000}],total:1};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('http://creator-preview.local:3001/admin/app#withdrawals');
  await page.getByText('請在完整管理後台處理',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'處理申請',exact:true}).count(),0);
  await page.screenshot({path:'.data/withdrawal-readonly-preview.png',fullPage:true});
  await page.getByRole('button',{name:'創作者操作記錄',exact:true}).click();
  await page.getByText('查看變更前後',{exact:true}).click();await page.getByText('新名称',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('記錄來源').count(),0);assert.equal(writes,0);assert.deepEqual(errors,[]);
  await page.screenshot({path:'.data/creator-operation-audit-preview.png',fullPage:true});
  console.log('PASS: existing-App withdrawal records are read-only, CMS audit details work; mocked App responses only');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
