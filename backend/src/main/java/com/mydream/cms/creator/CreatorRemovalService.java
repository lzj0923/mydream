package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creator removal never deletes App media, contracts, publication links or financial records. */
@Service
public class CreatorRemovalService {
    private final JdbcTemplate jdbc;
    private final CreatorProductionService projects;
    private final CreatorMediaGateway media;
    public CreatorRemovalService(JdbcTemplate jdbc, CreatorProductionService projects, CreatorMediaGateway media) {
        this.jdbc=jdbc; this.projects=projects; this.media=media;
    }
    public record Input(@NotBlank String action, @Min(0) int version, @NotNull @Size(max=1000) String note) {}
    private int count(String sql,Object... args) {return Objects.requireNonNull(jdbc.queryForObject(sql,Integer.class,args));}
    private Map<String,Object> project(CreatorAccess.Viewer viewer,String id,boolean admin) {
        if(admin)CreatorProductionService.requireAdmin(viewer);
        var rows=jdbc.queryForList("SELECT id FROM cms_creator_script WHERE id=? AND status IN ('ACTIVE','APPROVED')"+(admin?"":" AND owner_key=?")+" FOR UPDATE",admin?new Object[]{id}:new Object[]{id,viewer.ownerKey()});
        if(rows.isEmpty())throw ApiException.notFound("項目不存在");
        return projects.detail(viewer,id,admin);
    }
    public Object queue(CreatorAccess.Viewer viewer) {
        CreatorProductionService.requireAdmin(viewer);
        return jdbc.queryForList("SELECT p.id AS projectId,p.title,r.state,COUNT(*) AS requestCount FROM cms_creator_removal_request r JOIN cms_creator_script p ON p.id=r.script_id WHERE r.state IN ('PENDING','ACCEPTED') GROUP BY p.id,p.title,r.state ORDER BY MIN(r.created_at)");
    }
    private Map<String,Object> episode(String projectId,String id) {
        var rows=jdbc.queryForList("SELECT id,episode_number AS episodeNumber,state,lock_version AS version FROM cms_creator_episode_submission WHERE script_id=? AND id=?",projectId,id);
        if(rows.isEmpty())throw ApiException.notFound("項目視頻不存在");
        return rows.get(0);
    }
    private void owner(CreatorAccess.Viewer viewer) {
        if(viewer.admin()||!CreatorPublicationChecks.actor(viewer).equals(viewer.ownerKey()))throw ApiException.invalid("僅項目所有者或公司總管理員可以操作");
    }
    private String action(Map<String,Object> p,Map<String,Object> e) {
        String id=p.get("id").toString();
        if(e!=null) {
            if("ARCHIVED".equals(e.get("state")))return "NONE";
            if(count("SELECT COUNT(*) FROM cms_creator_episode_publication WHERE script_id=? AND episode_number=?",id,e.get("episodeNumber"))>0)return "REQUEST";
            if("SUBMITTED".equals(e.get("state")))return "WITHDRAW";
            if(List.of("DRAFT","CHANGES_REQUESTED").contains(e.get("state"))&&count("SELECT COUNT(*) FROM cms_creator_publication_check WHERE script_id=? AND submission_id=?",id,e.get("id"))==0)return "DELETE";
            return "REQUEST";
        }
        if(count("SELECT COUNT(*) FROM cms_creator_episode_submission WHERE script_id=? AND state='SUBMITTED'",id)>0||"DELIVERED".equals(p.get("stage")))return "WITHDRAW";
        if(!"ACTIVE".equals(p.get("status"))||!"PRODUCING".equals(p.get("stage"))||!Objects.toString(p.get("contractReference"),"").isBlank())return "REQUEST";
        if(count("SELECT COUNT(*) FROM cms_creator_episode_submission WHERE script_id=? AND state NOT IN ('DRAFT','CHANGES_REQUESTED','ARCHIVED')",id)>0
            ||count("SELECT COUNT(*) FROM cms_creator_episode_publication WHERE script_id=?",id)>0
            ||count("SELECT COUNT(*) FROM cms_creator_publication_check WHERE script_id=?",id)>0
            ||count("SELECT COUNT(*) FROM cms_creator_delivery WHERE script_id=?",id)>0
            ||count("SELECT COUNT(*) FROM cms_creator_agreement WHERE scope_key=?", id)>0)return "REQUEST";
        return "DELETE";
    }
    private List<Map<String,Object>> history(String id) {
        return jdbc.queryForList("SELECT r.id,r.submission_id AS submissionId,s.episode_number AS episodeNumber,r.state,r.reason,r.review_note AS reviewNote,r.lock_version AS version,r.created_at AS createdAt FROM cms_creator_removal_request r LEFT JOIN cms_creator_episode_submission s ON s.id=r.submission_id WHERE r.script_id=? ORDER BY r.created_at DESC,r.id DESC",id);
    }
    @Transactional public Object detail(CreatorAccess.Viewer viewer,String id,String submissionId,boolean admin) {
        var p=project(viewer,id,admin);var e=submissionId.isEmpty()?null:episode(id,submissionId);
        var rows=history(id);
        if(!submissionId.isEmpty())rows=rows.stream().filter(r->submissionId.equals(r.get("submissionId"))).toList();
        boolean pending=rows.stream().anyMatch(r->List.of("PENDING","ACCEPTED").contains(r.get("state")));
        return Map.of("action",pending?"NONE":action(p,e),"version",e==null?p.get("version"):e.get("version"),"requests",rows);
    }
    private void event(CreatorAccess.Viewer viewer,String id,String note) {
        jdbc.update("INSERT INTO cms_creator_project_event(id,script_id,actor_key,stage,note) SELECT ?,id,?,production_stage,? FROM cms_creator_script WHERE id=?",Ids.next(),CreatorPublicationChecks.actor(viewer),note,id);
    }
    @Transactional public Object change(CreatorAccess.Viewer viewer,String id,String submissionId,Input input) {
        owner(viewer);var p=project(viewer,id,false);var e=submissionId.isEmpty()?null:episode(id,submissionId);
        if(((Number)(e==null?p.get("version"):e.get("version"))).intValue()!=input.version())throw ApiException.conflict("內容已更新，請重新讀取");
        String allowed=action(p,e);
        if(!allowed.equals(input.action())||allowed.equals("NONE"))throw ApiException.conflict("当前狀態不允許此操作，請刷新；待驗收內容須先撤回，已驗收內容須申請下架");
        if(history(id).stream().anyMatch(r->List.of("PENDING","ACCEPTED").contains(r.get("state"))&&(submissionId.isEmpty()||submissionId.equals(r.get("submissionId"))||"".equals(r.get("submissionId")))))throw ApiException.conflict("已有待處理的下架申請，請勿重複操作");
        String target=e==null?"項目":"第 "+e.get("episodeNumber")+" 集";
        if(allowed.equals("REQUEST")) {
            if(input.note().isBlank())throw ApiException.invalid("請填寫下架原因");
            jdbc.update("INSERT INTO cms_creator_removal_request(id,script_id,submission_id,reason,actor_key) VALUES (?,?,?,?,?)",Ids.next(),id,submissionId,input.note().trim(),viewer.ownerKey());
            event(viewer,id,target+"申請下架："+input.note().trim());
        } else if(e!=null) {
            jdbc.update("UPDATE cms_creator_episode_submission SET state=?,lock_version=lock_version+1 WHERE id=?",allowed.equals("WITHDRAW")?"DRAFT":"ARCHIVED",submissionId);
            event(viewer,id,target+(allowed.equals("WITHDRAW")?"已撤回驗收，可繼續編輯或刪除":"已由創作者刪除草稿，保留歷史記錄"));
        } else if(allowed.equals("WITHDRAW")) {
            jdbc.update("UPDATE cms_creator_episode_submission SET state='DRAFT',lock_version=lock_version+1 WHERE script_id=? AND state='SUBMITTED'",id);
            jdbc.update("UPDATE cms_creator_script SET production_stage=IF(production_stage='DELIVERED','PRODUCING',production_stage),lock_version=lock_version+1 WHERE id=?",id);
            event(viewer,id,"創作者撤回項目待驗收內容，已退回草稿");
        } else {
            jdbc.update("UPDATE cms_creator_episode_submission SET state='ARCHIVED',lock_version=lock_version+1 WHERE script_id=? AND state IN ('DRAFT','CHANGES_REQUESTED')",id);
            jdbc.update("UPDATE cms_creator_script SET status='ARCHIVED',lock_version=lock_version+1 WHERE id=?",id);
            event(viewer,id,"創作者刪除草稿項目，原始記錄已保留");
            return Map.of("removed",true);
        }
        return Map.of("removed",false);
    }
    @Transactional public Object review(CreatorAccess.Viewer viewer,String id,String requestId,Input input) {
        project(viewer,id,true);
        var rows=jdbc.queryForList("SELECT submission_id AS submissionId,state,lock_version AS version FROM cms_creator_removal_request WHERE id=? AND script_id=?",requestId,id);
        if(rows.isEmpty())throw ApiException.notFound("下架申請不存在");var r=rows.get(0);
        if(((Number)r.get("version")).intValue()!=input.version())throw ApiException.conflict("申請已更新，請刷新");
        boolean valid="PENDING".equals(r.get("state"))&&List.of("ACCEPTED","REJECTED").contains(input.action())||"ACCEPTED".equals(r.get("state"))&&List.of("COMPLETED","REJECTED").contains(input.action());
        if(!valid||input.note().isBlank())throw ApiException.invalid("請選擇有效處理結果並填寫說明");
        if("COMPLETED".equals(input.action()))verifyOffline(id,r.get("submissionId").toString());
        jdbc.update("UPDATE cms_creator_removal_request SET state=?,review_note=?,reviewer=?,lock_version=lock_version+1 WHERE id=?",input.action(),input.note().trim(),viewer.ownerKey(),requestId);
        event(viewer,id,"下架申請 "+requestId+"："+Map.of("ACCEPTED","已受理，等待 App 下架","REJECTED","已駁回","COMPLETED","已核對下架").get(input.action())+" · "+input.note().trim());
        return Map.of("ok",true);
    }
    private void verifyOffline(String id,String submissionId) {
        if(submissionId.isEmpty()&&count("SELECT COUNT(*) FROM cms_creator_delivery WHERE script_id=?",id)>0)throw ApiException.conflict("此項目包含歷史 App 獨立視頻關聯，暫不支持自動核對，請保留受理狀態並聯絡平台處理");
        var rows=jdbc.queryForList("SELECT p.app_drama_id,p.app_episode_id,p.episode_number,s.attachment_id,s.vod_video_id FROM cms_creator_episode_publication p JOIN cms_creator_episode_submission s ON s.id=p.submission_id WHERE p.script_id=?"+(submissionId.isEmpty()?"":" AND p.episode_number=(SELECT episode_number FROM cms_creator_episode_submission WHERE id=?)"),submissionId.isEmpty()?new Object[]{id}:new Object[]{id,submissionId});
        for(var row:rows) {
            try {media.verify(((Number)row.get("app_drama_id")).longValue(),((Number)row.get("app_episode_id")).longValue(),((Number)row.get("episode_number")).intValue(),Objects.toString(row.get("attachment_id"),""),Objects.toString(row.get("vod_video_id"),""));}
            catch(ApiException ex) {if(List.of("PUBLICATION_OFFLINE","PUBLICATION_DELETED").contains(ex.code()))continue;throw ex;}
            throw ApiException.conflict("App 仍有已上架劇集，請先在 App 管理後台下架，再核對完成");
        }
    }
}
