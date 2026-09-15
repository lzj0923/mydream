package com.mydream.cms.creator;
import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
/** A unified read-only view of existing durable workflow histories; never invents missing before-values. */
@RestController
public class CreatorOperationsController {
 private final CreatorAccess access;private final JdbcTemplate jdbc;
 public CreatorOperationsController(CreatorAccess access,JdbcTemplate jdbc){this.access=access;this.jdbc=jdbc;}
 @GetMapping("/creator-api/v1/project-reviews/operations")
 Object list(HttpServletRequest request,Authentication auth){
  CreatorProductionService.requireAdmin(access.require(request,auth));
  return jdbc.queryForList("""
   SELECT * FROM (
    SELECT CONCAT('project:',id) id,'project' entity_type,script_id entity_id,'PROJECT_PROGRESS' action,actor_key actor,NULL before_json,JSON_OBJECT('stage',stage,'note',note) after_json,UNIX_TIMESTAMP(created_at) created_at FROM cms_creator_project_event
    UNION ALL
    SELECT CONCAT('verification:',id),'verification',verification_id,action,actor,NULL,JSON_OBJECT('version',version,'note',note),UNIX_TIMESTAMP(created_at) FROM cms_creator_verification_event
    UNION ALL
    SELECT CONCAT('agreement:',id),'agreement',id,state,reviewer,NULL,JSON_OBJECT('note',review_note,'attempt',attempt),UNIX_TIMESTAMP(reviewed_at) FROM cms_creator_agreement WHERE reviewed_at IS NOT NULL
    UNION ALL
    SELECT CONCAT('publication:',id),'project',script_id,'PUBLICATION_CHECK',actor_key,NULL,JSON_OBJECT('episode',episode_number,'dramaId',app_drama_id,'episodeId',app_episode_id,'status',status,'message',message),UNIX_TIMESTAMP(checked_at) FROM cms_creator_publication_check
    UNION ALL
    SELECT CONCAT('team:',id),'team',company_owner,'TEAM_CHANGE',CONCAT('creator:',actor_id),NULL,JSON_OBJECT('detail',action),UNIX_TIMESTAMP(created_at) FROM cms_creator_team_audit
   ) events ORDER BY created_at DESC,id DESC LIMIT 500
   """);
 }
}
