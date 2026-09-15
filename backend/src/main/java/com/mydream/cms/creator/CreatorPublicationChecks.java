package com.mydream.cms.creator;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class CreatorPublicationChecks {
 private final JdbcTemplate jdbc;
 public CreatorPublicationChecks(JdbcTemplate jdbc){this.jdbc=jdbc;}
 static String actor(CreatorAccess.Viewer viewer){
  if(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs){
   Object actor=attrs.getRequest().getAttribute("team-actor");
   if(actor!=null)return "creator:"+actor;
  }
  return viewer.ownerKey();
 }
 public boolean save(CreatorAccess.Viewer viewer,String projectId,Map<String,Object> row,String status,String message){
  return Boolean.TRUE.equals(new org.springframework.transaction.support.TransactionTemplate(new org.springframework.jdbc.datasource.DataSourceTransactionManager(Objects.requireNonNull(jdbc.getDataSource()))).execute(tx->{
  jdbc.queryForObject("SELECT id FROM cms_creator_script WHERE id=? FOR UPDATE",String.class,projectId);
  var previous=publications(projectId).stream().filter(p->Objects.equals(p.get("episodeNumber"),row.get("episodeNumber"))).findFirst().orElse(Map.of());
  // If an administrator replaced the association during the network call, discard the stale result.
  boolean saved=jdbc.update("""
   INSERT INTO cms_creator_publication_check(script_id,episode_number,submission_id,app_drama_id,app_episode_id,status,message,actor_key)
   SELECT script_id,episode_number,submission_id,app_drama_id,app_episode_id,?,?,?
   FROM cms_creator_episode_publication WHERE script_id=? AND episode_number=? AND submission_id=? AND app_drama_id=? AND app_episode_id=?
   """,status,message,actor(viewer),projectId,row.get("episodeNumber"),row.get("submissionId"),row.get("appDramaId"),row.get("appEpisodeId"))==1;
  if(!saved)return false;
  if("DELETED".equals(status)){
   jdbc.update("DELETE FROM cms_creator_episode_publication WHERE script_id=? AND episode_number=?",projectId,row.get("episodeNumber"));
   jdbc.update("UPDATE cms_creator_episode_submission SET state='ARCHIVED',lock_version=lock_version+1 WHERE script_id=? AND episode_number=? AND state='APPROVED'",projectId,row.get("episodeNumber"));
   jdbc.update("UPDATE cms_creator_script SET production_stage='PRODUCING',production_note='App 作品刪除，等待重新交付',lock_version=lock_version+1 WHERE id=? AND production_stage='COMPLETED'",projectId);
  }
  String before=Objects.toString(previous.get("checkStatus"),"");
  if(!status.equals(before)&&(!"PUBLISHED".equals(status)||!before.isEmpty())){
   String note="第 "+row.get("episodeNumber")+" 集 · "+("DELETED".equals(status)?"App 作品已刪除，本集已解鎖，可重新上傳；舊版本與審核記錄已保留。":"PUBLISHED".equals(status)?"App 上架狀態已恢復正常。":"UNKNOWN".equals(status)?"暫時無法核對 App 狀態，系統將重試；本集保持鎖定。":"App 上架異常："+message+"；請由平台核對，本集暫不解鎖。");
   jdbc.update("INSERT INTO cms_creator_project_event(id,script_id,actor_key,stage,note) SELECT ?,id,?,production_stage,? FROM cms_creator_script WHERE id=?",com.mydream.cms.shared.Ids.next(),actor(viewer),note,projectId);
  }
  return true;
  }));
 }
 public List<Map<String,Object>> history(String projectId){
  return jdbc.queryForList("SELECT episode_number AS episodeNumber,app_drama_id AS appDramaId,app_episode_id AS appEpisodeId,status,message,actor_key AS actor,checked_at AS checkedAt FROM cms_creator_publication_check WHERE script_id=? ORDER BY id DESC LIMIT 100",projectId);
 }
 public List<Map<String,Object>> publications(String projectId){
  return jdbc.queryForList("""
   SELECT p.episode_number AS episodeNumber,p.submission_id AS submissionId,p.app_drama_id AS appDramaId,p.app_episode_id AS appEpisodeId,p.app_title AS title,p.verified_at AS verifiedAt,
   c.status AS checkStatus,c.message AS checkMessage,c.checked_at AS checkedAt
   FROM cms_creator_episode_publication p LEFT JOIN cms_creator_publication_check c ON c.id=(
    SELECT MAX(x.id) FROM cms_creator_publication_check x WHERE x.script_id=p.script_id AND x.episode_number=p.episode_number
    AND x.submission_id=p.submission_id AND x.app_drama_id=p.app_drama_id AND x.app_episode_id=p.app_episode_id AND x.checked_at>=p.verified_at)
   WHERE p.script_id=? ORDER BY p.episode_number
   """,projectId);
 }
}
