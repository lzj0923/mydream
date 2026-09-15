package com.mydream.cms.creator;
import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/creator-api/v1")
public class CreatorWorkflowController {
 private final JdbcTemplate jdbc;private final CreatorAccess access;private final CreatorProductionService projects;
 public CreatorWorkflowController(JdbcTemplate jdbc,CreatorAccess access,CreatorProductionService projects){this.jdbc=jdbc;this.access=access;this.projects=projects;}
 private Map<String,Object> status(String id){var rows=jdbc.queryForList("SELECT revision,state,message,updated_at AS updatedAt FROM cms_creator_settings_sync WHERE project_id=?",id);return rows.isEmpty()?Map.of("state","NOT_REQUIRED","revision",0,"message",""):rows.get(0);}
 @GetMapping("/projects/{id}/sync") Object mine(@PathVariable String id,HttpServletRequest r,Authentication a){projects.detail(access.require(r,a),id,false);return status(id);}
 @GetMapping("/project-reviews/{id}/sync") Object reviewStatus(@PathVariable String id,HttpServletRequest r,Authentication a){projects.detail(access.require(r,a),id,true);return status(id);}
 @PostMapping("/projects/{id}/sync") @Transactional Object retry(@PathVariable String id,HttpServletRequest r,Authentication a){var viewer=access.require(r,a);projects.detail(viewer,id,false);jdbc.queryForObject("SELECT id FROM cms_creator_script WHERE id=? FOR UPDATE",String.class,id);jdbc.update("UPDATE cms_creator_settings_sync SET state='PENDING',message='' WHERE project_id=? AND state='FAILED'",id);return status(id);}
 @PostMapping("/project-reviews/{id}/sync-start") @Transactional Object start(@PathVariable String id,HttpServletRequest r,Authentication a){var viewer=access.require(r,a);var project=projects.detail(viewer,id,true);jdbc.queryForObject("SELECT id FROM cms_creator_script WHERE id=? FOR UPDATE",String.class,id);project=projects.detail(viewer,id,true);CreatorProductionService.requirePublicationInformation(project);
 var publications=jdbc.queryForList("SELECT app_drama_id AS dramaId,app_episode_id AS episodeId,episode_number AS episodeNumber FROM cms_creator_episode_publication WHERE script_id=? ORDER BY episode_number",id);if(publications.isEmpty())throw ApiException.invalid("此項目尚無 App 上架關聯");
 String claim=UUID.randomUUID().toString();int changed=jdbc.update("UPDATE cms_creator_settings_sync SET state='SYNCING',claim_token=?,claimed_at=CURRENT_TIMESTAMP,message='' WHERE project_id=? AND (state IN ('PENDING','FAILED') OR (state='SYNCING' AND claimed_at<DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 30 MINUTE)))",claim,id);if(changed!=1)throw ApiException.conflict("沒有待同步修改，或同步正在執行");
 return Map.of("revision",status(id).get("revision"),"claim",claim,"settings",project.get("settings"),"publications",publications);}
 public record SyncResult(int revision,String claim,boolean success,String message){}
 @PostMapping("/project-reviews/{id}/sync-finish") @Transactional Object finish(@PathVariable String id,@RequestBody SyncResult result,HttpServletRequest r,Authentication a){var viewer=access.require(r,a);projects.detail(viewer,id,true);String message=result.message()==null?"":result.message().substring(0,Math.min(result.message().length(),500));int n=jdbc.update("UPDATE cms_creator_settings_sync SET state=?,message=?,claim_token=NULL,claimed_at=NULL WHERE project_id=? AND revision=? AND claim_token=? AND state='SYNCING'",result.success()?"SYNCED":"FAILED",message,id,result.revision(),result.claim());if(n==1)event(viewer,id,result.success()?"App 上架資料同步成功":"App 上架資料同步失敗："+message);return status(id);}
 private void event(CreatorAccess.Viewer viewer,String id,String note){jdbc.update("INSERT INTO cms_creator_project_event(id,script_id,actor_key,stage,note) SELECT ?,id,?,production_stage,? FROM cms_creator_script WHERE id=?",Ids.next(),viewer.ownerKey(),note,id);}
 @GetMapping("/notifications") Object notifications(HttpServletRequest r,Authentication a){var viewer=access.require(r,a);return Map.of("items",rows(viewer,reader(r,viewer)));}
 private List<Map<String,Object>> rows(CreatorAccess.Viewer viewer,String reader){
 var rows=jdbc.queryForList("SELECT e.id,p.id AS projectId,p.title,e.note AS message,e.created_at AS createdAt,(n.notification_id IS NOT NULL) AS isRead FROM cms_creator_project_event e JOIN cms_creator_script p ON p.id=e.script_id LEFT JOIN cms_creator_notification_read n ON n.notification_id=e.id AND n.owner_key=? WHERE p.owner_key=?"+viewer.typeFilter("p.")+" ORDER BY e.created_at DESC,e.id DESC LIMIT 500",reader,viewer.ownerKey());
 for(var row:rows){String message=row.get("message").toString();String kind=notificationKind(message);row.put("kind",kind);var match=java.util.regex.Pattern.compile("第\\s+(\\d+)\\s+集").matcher(message);row.put("href","#projects?project="+row.get("projectId")+(match.find()?"&episode="+match.group(1):""));}
 return rows;
 }
 static String notificationKind(String message){
  message=message.split("\\R",2)[0];
  // Match the system-written prefix; review comments may mention other statuses.
  if(message.contains("集 · App 作品已刪除")||message.contains("集 · App 上架異常")||message.contains("集 · 暫時無法核對"))return "ALERT";
  if(message.contains("集 · App 上架狀態已恢復正常"))return "PUBLISHED";
  if(message.startsWith("App 上架資料同步")||message.startsWith("更新項目上架資料"))return "SYNC";
  if(message.startsWith("補充資料退回修改："))return "RETURNED";
  if(message.startsWith("補充資料已確認："))return "APPROVED";
  if(message.startsWith("補充資料已提交審核"))return "SUBMITTED";
  if(message.matches("^第\\s+\\d+\\s+集 V\\d+[:：]退回修改.*"))return "RETURNED";
  if(message.matches("^第\\s+\\d+\\s+集 V\\d+[:：]驗收通過.*"))return "APPROVED";
  if(message.matches("^第\\s+\\d+\\s+集 V\\d+ 已提交驗收.*"))return "SUBMITTED";
  if(message.matches("^第\\s+\\d+\\s+集 V\\d+ 已核對 App.*")||message.startsWith("全部計劃集數已驗收並核對 App"))return "PUBLISHED";
  return "PROJECT";
 }
 private String reader(HttpServletRequest r,CreatorAccess.Viewer viewer){Object actor=r==null?null:r.getAttribute("team-actor");return actor==null?viewer.ownerKey():"creator:"+actor;}
 public record ReadInput(List<String> ids){}
 @PostMapping("/notifications/read") Object read(@RequestBody ReadInput input,HttpServletRequest r,Authentication a){var viewer=access.require(r,a);if(input.ids()==null||input.ids().size()>500)throw ApiException.invalid("通知數量無效");for(var id:input.ids())jdbc.update("INSERT IGNORE INTO cms_creator_notification_read(owner_key,notification_id) SELECT ?,e.id FROM cms_creator_project_event e JOIN cms_creator_script p ON p.id=e.script_id WHERE e.id=? AND p.owner_key=?"+viewer.typeFilter("p."),reader(r,viewer),id,viewer.ownerKey());return Map.of("ok",true);}
 public record ReviewInput(String state,String note,int version){}
 @PostMapping("/project-reviews/{id}/materials-review") @Transactional Object materialsReview(@PathVariable String id,@RequestBody ReviewInput input,HttpServletRequest r,Authentication a){var viewer=access.require(r,a);projects.detail(viewer,id,true);if(!List.of("APPROVED","CHANGES_REQUESTED").contains(input.state())||input.note()==null||input.note().isBlank()||input.note().length()>1000)throw ApiException.invalid("請選擇結果並填寫審核意見");jdbc.queryForObject("SELECT id FROM cms_creator_script WHERE id=? FOR UPDATE",String.class,id);int n=jdbc.update("UPDATE cms_creator_material_review SET state=?,note=? WHERE project_id=? AND version=? AND state='PENDING'",input.state(),input.note().trim(),id,input.version());if(n!=1)throw ApiException.conflict("資料已更新或審核完成，請刷新");event(viewer,id,"補充資料"+(input.state().equals("APPROVED")?"已確認：":"退回修改：")+input.note().trim()+"\n資料版本："+input.version());return Map.of("ok",true);}
}
