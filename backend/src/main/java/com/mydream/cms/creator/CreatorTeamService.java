package com.mydream.cms.creator;
import com.mydream.cms.forms.PiiCipher;
import com.mydream.cms.shared.ApiException;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class CreatorTeamService {
 private final JdbcTemplate jdbc;private final PiiCipher cipher;private final ObjectMapper mapper;
 public CreatorTeamService(JdbcTemplate jdbc,PiiCipher cipher,ObjectMapper mapper){this.jdbc=jdbc;this.cipher=cipher;this.mapper=mapper;}
 public record Scope(String owner,boolean member,boolean edit,boolean upload,boolean submit,String role,Set<String> permissions){
  public Scope(String owner,boolean member,boolean edit,boolean upload,boolean submit){this(owner,member,edit,upload,submit,"CUSTOM",Set.of());}
  public boolean has(String permission){return !member||permissions.contains(permission);}
 }
 static ApiException denied(){return new ApiException(HttpStatus.FORBIDDEN,"TEAM_PERMISSION_DENIED","您沒有此公司操作權限，請聯絡總管理員");}
 boolean company(String id){return jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_verification WHERE owner_key=? AND entity_type='BUSINESS' AND state='APPROVED'",Integer.class,"creator:"+id)>0;}
 String companyName(String id){var rows=jdbc.queryForList("SELECT payload_encrypted FROM cms_creator_verification WHERE owner_key=?",String.class,"creator:"+id);if(rows.isEmpty())return "公司";return mapper.readTree(cipher.decrypt(rows.get(0))).path("name").asText("公司");}
 public Scope scope(String actor){
  var choices=jdbc.queryForList("SELECT company_owner FROM cms_creator_team_context WHERE account_id=?",String.class,actor);
  String owner=choices.isEmpty()?actor:choices.get(0);
  if(owner.equals(actor))return new Scope(actor,false,true,true,true);
  if(!company(owner))throw denied();
  var rows=jdbc.queryForList("SELECT can_edit,can_upload,can_submit,role_key,extra_permissions FROM cms_creator_team_member WHERE company_owner=? AND account_id=? AND state='ACTIVE'",owner,actor);
  if(rows.isEmpty())throw denied();var r=rows.get(0);
  return new Scope(owner,true,flag(r.get("can_edit")),flag(r.get("can_upload")),flag(r.get("can_submit")),String.valueOf(r.get("role_key")),extras(r.get("extra_permissions")));
 }
 static Set<String> extras(Object value){if(value==null||value.toString().isBlank())return Set.of();return Set.copyOf(Arrays.asList(value.toString().split(",")));}
 static boolean flag(Object v){return Boolean.TRUE.equals(v)||(v instanceof Number n&&n.intValue()!=0);}
 static void permit(Scope s,String path,String method){
  if(!s.member())return;
  if(path.equals("team")||path.startsWith("team/"))return;
  boolean read=method.equals("GET");
  if(read&&(path.equals("workspace")||path.equals("verification")||path.equals("notifications")||path.equals("projects")||path.matches("projects/[a-zA-Z0-9-]+(?:/(?:materials|sync|publication-check|episodes))?")||path.equals("project-episodes")))return;
  if(path.equals("notifications/read")&&method.equals("POST"))return;
  if(read&&path.equals("project-publications")&&s.has("traffic.view"))return;
  if(path.equals("verification/check")&&s.upload())return;
  if(path.equals("contracts/check")&&(s.upload()||s.submit()))return;
  if(!read&&s.edit()&&(path.equals("projects")||path.matches("projects/[a-zA-Z0-9-]+/(?:settings|materials|content)")))return;
  if(method.equals("POST")&&s.upload()&&path.matches("projects/[a-zA-Z0-9-]+/(?:uploads|episodes/[a-zA-Z0-9-]+/(?:draft|edit-check|metadata))"))return;
  if(!read&&s.submit()&&path.matches("projects/[a-zA-Z0-9-]+/(?:delivery|episodes/[a-zA-Z0-9-]+/submit)"))return;
  throw denied();
 }
 public Scope authorize(String actor,String path,String method){var s=scope(actor);permit(s,path,method);return s;}
 public String appOwner(String actor,String purpose){var s=scope(actor);if(s.member()&&!(purpose.equals("UPLOAD")&&s.upload()||purpose.equals("SUBMIT")&&s.submit()||purpose.equals("TRAFFIC")&&s.has("traffic.view")||purpose.equals("TRAFFIC_EXPORT")&&s.has("traffic.export")))throw denied();return s.owner();}
 public void audit(String company,String actor,String action){jdbc.update("INSERT INTO cms_creator_team_audit(id,company_owner,actor_id,action) VALUES (?,?,?,?)",UUID.randomUUID().toString(),company,actor,action);}
 public static Set<String> permissionList(Scope s){var p=new HashSet<>(s.permissions());if(s.edit())p.add("project.edit");if(s.upload())p.add("video.edit");if(s.submit())p.add("delivery.submit");return p;}
 public Map<String,Object> status(String actor){
  Scope s;boolean unavailable=false;try{s=scope(actor);}catch(ApiException e){s=new Scope(actor,false,false,false,false);unavailable=true;}
  var result=new LinkedHashMap<String,Object>();result.put("unavailable",unavailable);result.put("member",s.member());result.put("company",company(s.owner()));result.put("ownerId",s.owner());result.put("name",company(s.owner())?companyName(s.owner()):"個人空間");result.put("canEdit",s.edit());result.put("canUpload",s.upload());result.put("canSubmit",s.submit());result.put("role",s.member()?s.role():"OWNER");result.put("permissions",permissionList(s));
  var invites=jdbc.queryForList("SELECT m.company_owner AS ownerId,m.state FROM cms_creator_team_member m JOIN cms_creator_verification v ON v.owner_key=CONCAT('creator:',m.company_owner) AND v.entity_type='BUSINESS' AND v.state='APPROVED' WHERE m.account_id=? AND m.state IN ('INVITED','ACTIVE')",actor);
  for(var row:invites)row.put("name",companyName(row.get("ownerId").toString()));result.put("invitations",invites);
  if(!s.member()&&company(actor)){
   result.put("members",jdbc.queryForList("SELECT m.account_id AS accountId,a.username,a.display_name AS displayName,m.state,m.can_edit AS canEdit,m.can_upload AS canUpload,m.can_submit AS canSubmit,m.role_key AS role,m.extra_permissions AS extraPermissions FROM cms_creator_team_member m JOIN cms_creator_account a ON a.id=m.account_id WHERE company_owner=? ORDER BY m.updated_at DESC",actor));
   result.put("history",jdbc.queryForList("SELECT a.username,t.action,t.created_at AS createdAt FROM cms_creator_team_audit t JOIN cms_creator_account a ON a.id=t.actor_id WHERE t.company_owner=? ORDER BY t.created_at DESC LIMIT 100",actor));
  }
  return result;
 }
 public record Invite(String account,Boolean canEdit,Boolean canUpload,Boolean canSubmit,String role,List<String> permissions){public Invite(String a,boolean e,boolean u,boolean s){this(a,e,u,s,null,null);}}
 public record Change(String accountId,String action,Boolean canEdit,Boolean canUpload,Boolean canSubmit,String role,List<String> permissions){public Change(String a,String action,boolean e,boolean u,boolean s){this(a,action,e,u,s,null,null);}}
 void owner(String actor){if(!company(actor)||scope(actor).member())throw denied();}
 @Transactional public Object invite(String actor,Invite input){
  owner(actor);var role=CreatorMemberRole.input(input.role(),input.permissions(),Boolean.TRUE.equals(input.canEdit()),Boolean.TRUE.equals(input.canUpload()),Boolean.TRUE.equals(input.canSubmit()));String username=CreatorAccountService.username(input.account());
  var ids=jdbc.queryForList("SELECT id FROM cms_creator_account WHERE username=?",String.class,username);if(ids.isEmpty())throw ApiException.invalid("未找到此創作者賬號，請對方先註冊");String id=ids.get(0);
  if(id.equals(actor)||company(id))throw ApiException.invalid("請邀請個人創作者賬號");
  var active=jdbc.queryForList("SELECT state FROM cms_creator_team_member WHERE company_owner=? AND account_id=?",String.class,actor,id);
  if(!active.isEmpty()&&List.of("ACTIVE","INVITED").contains(active.get(0)))throw ApiException.conflict("此賬號已受邀或已加入公司");
  jdbc.update("INSERT INTO cms_creator_team_member(company_owner,account_id,state,can_edit,can_upload,can_submit,role_key,extra_permissions) VALUES (?,?,'INVITED',?,?,?,?,?) ON DUPLICATE KEY UPDATE state='INVITED',can_edit=VALUES(can_edit),can_upload=VALUES(can_upload),can_submit=VALUES(can_submit),role_key=VALUES(role_key),extra_permissions=VALUES(extra_permissions)",actor,id,role.has("project.edit"),role.has("video.edit"),role.has("delivery.submit"),role.key(),role.extra());audit(actor,actor,"邀請成員 "+username+" "+role.key()+" "+role.permissions());return status(actor);
 }
 @Transactional public Object change(String actor,Change input){
  owner(actor);if(input.action()==null||!List.of("PERMISSIONS","REMOVE").contains(input.action()))throw ApiException.invalid("操作無效");
  var role=CreatorMemberRole.input(input.role(),input.permissions(),Boolean.TRUE.equals(input.canEdit()),Boolean.TRUE.equals(input.canUpload()),Boolean.TRUE.equals(input.canSubmit()));
  var before=jdbc.queryForList("SELECT state,can_edit,can_upload,can_submit,role_key,extra_permissions FROM cms_creator_team_member WHERE company_owner=? AND account_id=? FOR UPDATE",actor,input.accountId());
  int n=jdbc.update("UPDATE cms_creator_team_member SET can_edit=?,can_upload=?,can_submit=?,role_key=?,extra_permissions=?,state=IF(?='REMOVE','REMOVED',state) WHERE company_owner=? AND account_id=? AND state IN ('ACTIVE','INVITED')",role.has("project.edit"),role.has("video.edit"),role.has("delivery.submit"),role.key(),role.extra(),input.action(),actor,input.accountId());if(n==0)throw ApiException.conflict("成員狀態已改變，請刷新");audit(actor,actor,input.action()+" "+input.accountId()+" 原值 "+before+" 新值 編輯="+role.key()+" "+role.permissions());return status(actor);
 }
 @Transactional public Object choose(String actor,String owner,String action){
  if(action==null)throw ApiException.invalid("操作無效");
  if(action.equals("PERSONAL")){jdbc.update("DELETE FROM cms_creator_team_context WHERE account_id=?",actor);return status(actor);}
  if(!company(owner))throw denied();
  if(action.equals("ACCEPT")){
   if(company(actor))throw ApiException.invalid("公司總管理員不能加入另一家公司");
   if(jdbc.update("UPDATE cms_creator_team_member SET state='ACTIVE' WHERE company_owner=? AND account_id=? AND state='INVITED'",owner,actor)!=1)throw ApiException.conflict("邀請已失效");audit(owner,actor,"接受公司邀請");
  }else if(action.equals("DECLINE")){
   jdbc.update("UPDATE cms_creator_team_member SET state='DECLINED' WHERE company_owner=? AND account_id=? AND state='INVITED'",owner,actor);return status(actor);
  }else if(!action.equals("ENTER"))throw ApiException.invalid("操作無效");
  if(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_team_member WHERE company_owner=? AND account_id=? AND state='ACTIVE'",Integer.class,owner,actor)!=1)throw denied();
  jdbc.update("INSERT INTO cms_creator_team_context(account_id,company_owner) VALUES (?,?) ON DUPLICATE KEY UPDATE company_owner=VALUES(company_owner)",actor,owner);return status(actor);
 }
}
