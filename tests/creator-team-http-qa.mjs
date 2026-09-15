import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomBytes,randomUUID,createCipheriv} from 'node:crypto';
import assert from 'node:assert/strict';
const mysql='D:/MySQL/mysql-5.7.37-winx64/mysql-5.7.37-winx64/bin/mysql.exe';
const sql=q=>execFileSync(mysql,['--host=127.0.0.1','--port=3309','--user=root','--database=mydream_cms','--default-character-set=utf8mb4','--batch','--skip-column-names','-e',q],{encoding:'utf8'}).trim();
const base='http://127.0.0.1:3001';let actors=[],project;
async function req(path,who,body,expected=200,method){const r=await fetch(base+path,{method:method||(body===undefined?'GET':'POST'),headers:{Host:'creator-preview.local:3001',Origin:base,'Content-Type':'application/json',...(who?{Cookie:who.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,expected,`${path}: ${r.status} ${JSON.stringify(data)}`);return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
try{
 for(const role of ['boss','member','other']){const name=`qa_team_${Date.now()}_${role}`;const response=await fetch('http://localhost:8080/creator-api/v1/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({account:name,password:randomBytes(18).toString('hex'),displayName:'Team QA',accepted:true})});assert.equal(response.status,200);const data=await response.json();actors.push({id:data.account.id,name,cookie:'md_creator_session='+data.token});}
 const [boss,member,other]=actors;
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(readFileSync('backend/data/creator-local.key','utf8').trim(),'base64'),iv);const body=Buffer.concat([cipher.update(JSON.stringify({name:'Team QA Company'}),'utf8'),cipher.final()]);const packed=Buffer.concat([iv,body,cipher.getAuthTag()]).toString('base64');
 sql(`INSERT INTO cms_creator_verification(id,owner_key,creator_type,entity_type,state,payload_encrypted) VALUES ('${randomUUID()}','creator:${boss.id}','SHORT_DRAMA','BUSINESS','APPROVED','${packed}')`);
 await req('/api/creator/team/invite',boss,{account:member.name,canEdit:true,canUpload:true,canSubmit:false});
 const invites=(await req('/api/creator/team',member)).data;assert.equal(invites.invitations.length,1);
 await req('/api/creator/team/select',other,{ownerId:boss.id,action:'ACCEPT'},409);
 await req('/api/creator/team/select',member,{ownerId:boss.id,action:'ACCEPT'});
 for(const path of ['/api/creator/bank-account','/api/creator/withdrawals','/api/creator-settlement/summary'])await req(path,member,undefined,403);
 await req('/api/creator/bank-account',member,{},403);
 await req('/api/creator/withdrawals',member,{},403);
 await req('/api/creator/team/member',member,{accountId:member.id,action:'PERMISSIONS',canEdit:true,canUpload:true,canSubmit:true},403);
 project=(await req('/api/creator/projects',member,{title:'Temporary team QA',genre:'其他',format:'漫劇',episodeCount:1,synopsis:'Temporary local integration test',committed:true,settings:{area:'zhf',category:'22',landscape:false,price:0}})).data;
 assert.equal(project.ownerKey,'creator:'+boss.id);
 assert.equal((await req('/api/creator/projects',boss)).data.some(p=>p.id===project.id),true);
 assert.equal((await req('/api/creator/projects',other)).data.some(p=>p.id===project.id),false);
 await req(`/api/creator/projects/${project.id}/episodes`,member);
 await req(`/api/creator/projects/${project.id}/episodes/invalid/submit`,member,{},403);
 await req('/api/creator/team/member',boss,{accountId:member.id,action:'REMOVE',canEdit:false,canUpload:false,canSubmit:false});
 await req('/api/creator/projects',member,undefined,403);
 assert.equal((await req('/api/creator/projects',boss)).data.some(p=>p.id===project.id),true);
 await req('/api/creator/team/select',member,{action:'PERSONAL'});
 assert.equal((await req('/api/creator/projects',member)).data.length,0);
 assert.equal((await req('/api/creator/team',boss)).data.history.some(h=>h.username===member.name&&h.action.includes('/projects')),true);
 console.log('PASS: invitation, acceptance, cross-account ownership, finance API denial, permission escalation denial, submission denial, removal, project retention, personal space, actor audit');
}finally{
 if(project?.id){assert.match(project.id,/^[a-z0-9-]+$/i);sql(`DELETE FROM cms_creator_project_event WHERE script_id='${project.id}'; DELETE FROM cms_creator_project_settings WHERE project_id='${project.id}'; DELETE FROM cms_creator_script WHERE id='${project.id}'`);}
 for(const a of actors){assert.match(a.id,/^[a-z0-9-]+$/i);sql(`DELETE FROM cms_creator_team_context WHERE account_id='${a.id}'; DELETE FROM cms_creator_team_member WHERE company_owner='${a.id}' OR account_id='${a.id}'; DELETE FROM cms_creator_team_audit WHERE company_owner='${a.id}' OR actor_id='${a.id}'; DELETE FROM cms_creator_verification WHERE owner_key='creator:${a.id}'; DELETE FROM cms_creator_session WHERE account_id='${a.id}'; DELETE FROM cms_creator_account WHERE id='${a.id}'`);}
 console.log('Temporary local fixtures removed');
}
