package com.mydream.cms.creator;

import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import com.mydream.cms.shared.ApiException;

@RestController
@RequestMapping("/creator-api/v1/team/business")
public class CreatorBusinessController {
 private final CreatorTeamService teams;private final CreatorAccountService accounts;private final JdbcTemplate jdbc;
 public CreatorBusinessController(CreatorTeamService t,CreatorAccountService a,JdbcTemplate j){teams=t;accounts=a;jdbc=j;}
 @GetMapping Object list(HttpServletRequest r){
  var actor=accounts.require(CreatorAccountController.token(r));var s=teams.scope(actor.id());
  if(!s.has("cooperation.view")&&!s.has("contract.summary.view"))throw CreatorTeamService.denied();
  var viewer=accounts.viewer(CreatorAccountController.token(r));String owner=viewer.ownerKey();
  var result=new LinkedHashMap<String,Object>();
  result.put("invitations",s.has("cooperation.view")?jdbc.queryForList("SELECT id,work_title AS title,status,proposal,review_note AS reviewNote FROM cms_creator_ip_interest WHERE owner_key=?"+viewer.typeFilter("")+" ORDER BY created_at DESC",owner):List.of());
  result.put("drafts",s.has("cooperation.view")?jdbc.queryForList("SELECT id,title,body,version,updated_at AS updatedAt FROM cms_creator_cooperation_draft WHERE company_owner=?"+viewer.typeFilter("")+" ORDER BY updated_at DESC",s.owner()):List.of());
  result.put("contracts",s.has("contract.summary.view")?jdbc.queryForList("SELECT id,title,kind,state,created_at AS createdAt FROM cms_creator_agreement WHERE owner_key=?"+viewer.agreementFilter()+" ORDER BY created_at DESC",owner):List.of());
  return result;
 }
 public record Draft(String id,String title,String body,int version){}
 @PostMapping @Transactional Object save(@RequestBody Draft d,HttpServletRequest r){
  var actor=accounts.require(CreatorAccountController.token(r));var s=teams.scope(actor.id());if(!s.has("cooperation.edit"))throw CreatorTeamService.denied();
  if(d.title()==null||d.title().isBlank()||d.title().length()>120||d.body()==null||d.body().length()>5000)throw ApiException.invalid("請填寫標題（最多120字）及方案（最多5000字）");
  var viewer=accounts.viewer(CreatorAccountController.token(r));String id=d.id();if(id==null||id.isBlank()){
   id=UUID.randomUUID().toString();jdbc.update("INSERT INTO cms_creator_cooperation_draft(company_owner,id,title,body,updated_by) VALUES (?,?,?,?,?)",s.owner(),id,d.title().trim(),d.body(),actor.id());
   if(viewer.workType()!=null)jdbc.update("UPDATE cms_creator_cooperation_draft SET work_type=? WHERE company_owner=? AND id=?",viewer.workType().name(),s.owner(),id);
  }else if(jdbc.update("UPDATE cms_creator_cooperation_draft SET title=?,body=?,updated_by=?,version=version+1 WHERE company_owner=? AND id=? AND version=?"+viewer.typeFilter(""),d.title().trim(),d.body(),actor.id(),s.owner(),id,d.version())!=1)throw ApiException.conflict("草稿已變更或不可訪問，請刷新後重試");
  teams.audit(s.owner(),actor.id(),"保存合作草稿 "+id);return Map.of("id",id,"ok",true);
 }
}
