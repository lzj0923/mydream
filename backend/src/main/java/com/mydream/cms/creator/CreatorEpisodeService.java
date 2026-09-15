package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreatorEpisodeService {
    private CreatorPublicationChecks checks;
    private final JdbcTemplate jdbc;
    private final CreatorProductionService projects;
    private final CreatorMediaGateway media;
    public CreatorEpisodeService(JdbcTemplate jdbc,CreatorProductionService projects,CreatorMediaGateway media){this.jdbc=jdbc;this.projects=projects;this.media=media;this.checks=new CreatorPublicationChecks(jdbc);}
    public record UploadInput(@Min(1) @Max(500) int episodeNumber,@NotBlank @Size(max=128) String title,@NotNull @Size(max=2000) String description,@NotBlank @Size(max=180) String filename,@Min(1) @Max(524288000) long size){}
    public record SubmitInput(@NotBlank @Size(max=128) String title,@NotNull @Size(max=2000) String description,@NotBlank @Size(max=2000) String coverUrl,@NotBlank @Size(max=1000) String note,@Min(0) int version){}
    public record ReviewInput(@NotBlank String decision,@NotBlank @Size(max=1000) String note,@Min(0) int version){}
    public record PublicationInput(@Positive long dramaId,@Positive long episodeId,@Min(0) int version){}
    public record CompleteInput(@NotBlank @Size(max=1000) String note,@Min(0) int version){}
    private static final String FIELDS="s.id,s.script_id AS projectId,s.episode_number AS episodeNumber,s.revision_no AS revision,s.title,s.description,s.filename,s.file_size AS size,s.vod_video_id AS vodVideoId,s.attachment_id AS attachmentId,s.cover_url AS coverUrl,s.media_url AS mediaUrl,s.state,s.note,s.review_note AS reviewNote,s.lock_version AS version,s.created_at AS createdAt,s.updated_at AS updatedAt";
    private Map<String,Object> project(CreatorAccess.Viewer viewer,String id,boolean admin,boolean lock){
        // Acquire the project lock before any snapshot read so withdrawal and review serialize.
        if(lock){
            if(admin)CreatorProductionService.requireAdmin(viewer);
            var locked=jdbc.queryForList("SELECT id FROM cms_creator_script WHERE id=? AND status IN ('ACTIVE','APPROVED')"+(admin?"":" AND owner_key=?")+" FOR UPDATE",admin?new Object[]{id}:new Object[]{id,viewer.ownerKey()});
            if(locked.isEmpty())throw ApiException.notFound("項目不存在或已刪除");
        }
        var result=projects.detail(viewer,id,admin);
        var info=jdbc.queryForMap("SELECT episode_count AS episodeCount,synopsis,body,status,production_stage AS stage,lock_version AS version FROM cms_creator_script WHERE id=?"+(lock?" FOR UPDATE":""),id);
        result.putAll(info);
        // Use the locked row's current state rather than an earlier page snapshot.
        if(lock&&!List.of("ACTIVE","APPROVED").contains(info.get("status")))throw ApiException.conflict("項目已刪除，請刷新");
        return result;
    }
    public Object detail(CreatorAccess.Viewer viewer,String id,boolean admin){
        var result=project(viewer,id,admin,false);
        result.put("publicationAllowed",publicationAllowed(id));
        result.put("submissions",jdbc.queryForList("SELECT "+FIELDS+" FROM cms_creator_episode_submission s WHERE s.script_id=? ORDER BY s.episode_number,s.revision_no DESC",id));
        result.put("publications",checks.publications(id));
        result.put("publicationHistory",checks.history(id));
        return result;
    }
    private boolean publicationAllowed(String projectId){
        var owner=jdbc.queryForObject("SELECT owner_key FROM cms_creator_script WHERE id=?",String.class,projectId);
        if(owner==null)return false;
        if(!owner.startsWith("creator:"))return true; // Historical App-owned projects retain their existing identity flow.
        return jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_verification WHERE owner_key=? AND state='APPROVED'",Integer.class,owner)>0;
    }
    public Object publications(CreatorAccess.Viewer viewer){
        if(viewer.admin())throw ApiException.invalid("請使用創作者賬號讀取作品數據");
        return jdbc.queryForList("SELECT p.id AS projectId,p.title AS projectTitle,l.episode_number AS episodeNumber,l.app_drama_id AS dramaId,l.app_episode_id AS episodeId FROM cms_creator_episode_publication l JOIN cms_creator_script p ON p.id=l.script_id WHERE p.owner_key=?"+viewer.typeFilter("p.")+" ORDER BY p.id,l.episode_number LIMIT 1000",viewer.ownerKey());
    }
    public Object mine(CreatorAccess.Viewer viewer){
        return jdbc.queryForList("SELECT "+FIELDS+",p.title AS projectTitle FROM cms_creator_episode_submission s JOIN cms_creator_script p ON p.id=s.script_id WHERE p.owner_key=? AND p.status IN ('APPROVED','ACTIVE')"+viewer.typeFilter("p.")+" ORDER BY s.updated_at DESC LIMIT 1000",viewer.ownerKey());
    }
    private Map<String,Object> submission(String projectId,String id){
        var rows=jdbc.queryForList("SELECT "+FIELDS+" FROM cms_creator_episode_submission s WHERE s.script_id=? AND s.id=?",projectId,id);
        if(rows.isEmpty())throw ApiException.notFound("交付稿不存在");return rows.get(0);
    }
    static void requireProducing(Map<String,Object> project){if(!"PRODUCING".equals(project.get("stage")))throw ApiException.conflict("項目尚未安排製作，請等待平台確認");}
    private void requireEpisodeUploadable(String projectId,int episodeNumber){
        if(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_publication WHERE script_id=? AND episode_number=?",Integer.class,projectId,episodeNumber)>0)throw ApiException.conflict("本集已上架，不可重複上傳");
        if(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_submission WHERE script_id=? AND episode_number=? AND state='APPROVED'",Integer.class,projectId,episodeNumber)>0)throw ApiException.conflict("本集已驗收通過，不可重複上傳");
        if(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_submission WHERE script_id=? AND episode_number=? AND state='SUBMITTED'",Integer.class,projectId,episodeNumber)>0)throw ApiException.conflict("本集正在驗收，暫時不能替換視頻");
        if(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_submission WHERE script_id=? AND episode_number=? AND state NOT IN ('DRAFT','CHANGES_REQUESTED','ARCHIVED')",Integer.class,projectId,episodeNumber)>0)throw ApiException.conflict("本集狀態不可編輯，請刷新確認");
    }
    @Transactional
    public Object editable(CreatorAccess.Viewer viewer,String projectId,String id){
        requireProducing(project(viewer,projectId,false,true));
        var row=submission(projectId,id);int number=((Number)row.get("episodeNumber")).intValue();
        requireEpisodeUploadable(projectId,number);
        int latest=jdbc.queryForObject("SELECT MAX(revision_no) FROM cms_creator_episode_submission WHERE script_id=? AND episode_number=?",Integer.class,projectId,number);
        if(latest!=((Number)row.get("revision")).intValue())throw ApiException.conflict("舊版本不可編輯，請使用本集最新版本");
        return Map.of("editable",true);
    }
    @Transactional
    public Object create(CreatorAccess.Viewer viewer,String projectId,UploadInput input,String authorization){
        if(!(viewer.ownerKey().startsWith("app:")||viewer.ownerKey().startsWith("creator:"))||authorization==null||!authorization.startsWith("Bearer "))throw ApiException.invalid("請先綁定 App 賬號再上傳");
        var project=project(viewer,projectId,false,true);requireProducing(project);CreatorProductionService.requirePublicationInformation(project);
        if(input.episodeNumber()<1||input.episodeNumber()>((Number)project.get("episodeCount")).intValue())throw ApiException.invalid("集數超出項目承諾範圍");
        if(input.filename().contains("/")||input.filename().contains("\\")||input.filename().chars().anyMatch(c->c<32)||!input.filename().matches("(?i).+\\.(mp4|mov|webm)")||input.size()<1||input.size()>524288000)throw ApiException.invalid("請選擇 500 MB 以內的 MP4、MOV 或 WebM");
        if(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_submission s JOIN cms_creator_script p ON p.id=s.script_id WHERE p.owner_key=? AND s.created_at>=CURRENT_DATE",Integer.class,viewer.ownerKey())>=100)throw ApiException.conflict("今日項目上傳次數較多，請稍後再試");
        requireEpisodeUploadable(projectId,input.episodeNumber());
        int revision=jdbc.queryForObject("SELECT COALESCE(MAX(revision_no),0)+1 FROM cms_creator_episode_submission WHERE script_id=? AND episode_number=?",Integer.class,projectId,input.episodeNumber());
        var auth=media.create(authorization,input.title().trim(),input.filename());String id=Ids.next();
        jdbc.update("INSERT INTO cms_creator_episode_submission(id,script_id,episode_number,revision_no,title,description,filename,file_size,vod_video_id,attachment_id,note,review_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",id,projectId,input.episodeNumber(),revision,input.title().trim(),input.description(),input.filename(),input.size(),auth.path("VideoId").asText(),auth.path("attachment_id").asText(),"","");
        var result=new LinkedHashMap<String,Object>();
        for(String key:List.of("UploadAuth","UploadAddress","VideoId","attachment_id"))result.put(key,auth.path(key).asText());
        result.put("submissionId",id);result.put("revision",revision);return result;
    }
    @Transactional
    public Object submit(CreatorAccess.Viewer viewer,String projectId,String id,SubmitInput input){
        return saveSubmission(viewer,projectId,id,input,true);
    }
    @Transactional public Object draft(CreatorAccess.Viewer viewer,String projectId,String id,SubmitInput input){return saveSubmission(viewer,projectId,id,input,false);}
    @Transactional public Object metadata(CreatorAccess.Viewer viewer,String projectId,String id,SubmitInput input){
        editable(viewer,projectId,id);var row=submission(projectId,id);
        if(((Number)row.get("version")).intValue()!=input.version()||!List.of("DRAFT","CHANGES_REQUESTED").contains(row.get("state")))throw ApiException.conflict("交付稿已更新，請刷新後重試");
        if(CreatorMediaGateway.canonicalMedia(input.coverUrl())==null)throw ApiException.invalid("請先上傳有效封面");
        if(input.title().trim().equals(row.get("title"))&&input.description().equals(row.get("description"))&&input.coverUrl().equals(row.get("coverUrl"))&&input.note().trim().equals(row.get("note")))return row;
        jdbc.update("UPDATE cms_creator_episode_submission SET title=?,description=?,cover_url=?,note=?,lock_version=lock_version+1 WHERE id=?",input.title().trim(),input.description(),input.coverUrl(),input.note().trim(),id);
        event(viewer,projectId,"第 "+row.get("episodeNumber")+" 集 V"+row.get("revision")+" 已保存封面與交付資料，待提交驗收");return submission(projectId,id);
    }
    private Object saveSubmission(CreatorAccess.Viewer viewer,String projectId,String id,SubmitInput input,boolean submit){
        var project=project(viewer,projectId,false,true);requireProducing(project);CreatorProductionService.requirePublicationInformation(project);var row=submission(projectId,id);
        if((submit?"SUBMITTED":"DRAFT").equals(row.get("state"))&&row.get("mediaUrl")!=null&&!row.get("mediaUrl").toString().isBlank()&&input.title().trim().equals(row.get("title"))&&input.description().equals(row.get("description"))&&input.coverUrl().equals(row.get("coverUrl"))&&input.note().trim().equals(row.get("note")))return row;
        if(!List.of("DRAFT","CHANGES_REQUESTED").contains(row.get("state"))||((Number)row.get("version")).intValue()!=input.version())throw ApiException.conflict("交付稿已更新，請重新讀取");
        requireEpisodeUploadable(projectId,((Number)row.get("episodeNumber")).intValue());
        int latest=jdbc.queryForObject("SELECT MAX(revision_no) FROM cms_creator_episode_submission WHERE script_id=? AND episode_number=?",Integer.class,projectId,row.get("episodeNumber"));
        if(latest!=((Number)row.get("revision")).intValue())throw ApiException.conflict("請提交本集最新版本，舊版本僅供查看");
        if(CreatorMediaGateway.canonicalMedia(input.coverUrl())==null)throw ApiException.invalid("請先上傳有效封面");
        String url=media.readyMedia(row.get("attachmentId").toString(),row.get("vodVideoId").toString());
        jdbc.update("UPDATE cms_creator_episode_submission SET title=?,description=?,cover_url=?,media_url=?,note=?,state=?,lock_version=lock_version+1 WHERE id=?",input.title().trim(),input.description(),input.coverUrl(),url,input.note().trim(),submit?"SUBMITTED":"DRAFT",id);
        event(viewer,projectId,"第 "+row.get("episodeNumber")+" 集 V"+row.get("revision")+(submit?" 已提交驗收":" 已保存視頻，待提交驗收"));return submission(projectId,id);
    }
    @Transactional
    public Object review(CreatorAccess.Viewer viewer,String projectId,String id,ReviewInput input){
        project(viewer,projectId,true,true);var row=submission(projectId,id);
        if(!List.of("APPROVED","CHANGES_REQUESTED").contains(input.decision()))throw ApiException.invalid("驗收結果無效");
        if(!"SUBMITTED".equals(row.get("state"))||((Number)row.get("version")).intValue()!=input.version())throw ApiException.conflict("本次交付已處理，請刷新");
        jdbc.update("UPDATE cms_creator_episode_submission SET state=?,review_note=?,lock_version=lock_version+1 WHERE id=?",input.decision(),input.note().trim(),id);
        event(viewer,projectId,"第 "+row.get("episodeNumber")+" 集 V"+row.get("revision")+"："+(input.decision().equals("APPROVED")?"驗收通過":"退回修改")+" · "+input.note().trim());return submission(projectId,id);
    }
    @Transactional
    public Object link(CreatorAccess.Viewer viewer,String projectId,String id,PublicationInput input){
        project(viewer,projectId,true,true);
        if(!publicationAllowed(projectId))throw ApiException.conflict("創作者身份認證尚未通過，暫時不能上架");
        var row=submission(projectId,id);
        if(!"APPROVED".equals(row.get("state"))||((Number)row.get("version")).intValue()!=input.version())throw ApiException.conflict("僅可關聯已驗收通過的指定版本");
        if(jdbc.queryForObject("SELECT MAX(revision_no) FROM cms_creator_episode_submission WHERE script_id=? AND episode_number=?",Integer.class,projectId,row.get("episodeNumber"))!=((Number)row.get("revision")).intValue())throw ApiException.conflict("本集已有更新版本，請先完成最新版本驗收");
        var dramaIds=jdbc.queryForList("SELECT DISTINCT app_drama_id FROM cms_creator_episode_publication WHERE script_id=? AND episode_number<>?",Long.class,projectId,row.get("episodeNumber"));
        if(dramaIds.stream().anyMatch(value->value!=input.dramaId()))throw ApiException.conflict("同一項目各集須對應同一 App 劇目");
        var foreign=jdbc.queryForList("SELECT script_id,episode_number FROM cms_creator_episode_publication WHERE app_episode_id=?",input.episodeId());
        if(foreign.stream().anyMatch(value->!projectId.equals(value.get("script_id"))||!row.get("episodeNumber").equals(value.get("episode_number"))))throw ApiException.conflict("該 App 劇集已關聯其他項目或集數");
        var previous=jdbc.queryForList("SELECT app_drama_id,app_episode_id,submission_id FROM cms_creator_episode_publication WHERE script_id=? AND episode_number=?",projectId,row.get("episodeNumber"));
        var published=media.verify(input.dramaId(),input.episodeId(),((Number)row.get("episodeNumber")).intValue(),row.get("attachmentId").toString(),row.get("vodVideoId").toString());
        try{
            var existing=jdbc.queryForList("SELECT submission_id FROM cms_creator_episode_publication WHERE script_id=? AND episode_number=?",projectId,row.get("episodeNumber"));
            if(existing.isEmpty())jdbc.update("INSERT INTO cms_creator_episode_publication(script_id,episode_number,submission_id,app_drama_id,app_episode_id,app_title,verified_by) VALUES (?,?,?,?,?,?,?)",projectId,row.get("episodeNumber"),id,published.dramaId(),published.episodeId(),published.title(),viewer.ownerKey());
            else jdbc.update("UPDATE cms_creator_episode_publication SET submission_id=?,app_drama_id=?,app_episode_id=?,app_title=?,verified_at=CURRENT_TIMESTAMP,verified_by=? WHERE script_id=? AND episode_number=?",id,published.dramaId(),published.episodeId(),published.title(),viewer.ownerKey(),projectId,row.get("episodeNumber"));
        }
        catch(org.springframework.dao.DuplicateKeyException e){throw ApiException.conflict("該 App 劇集已被關聯，請刷新後檢查");}
        checks.save(viewer,projectId,Map.of("episodeNumber",row.get("episodeNumber"),"submissionId",id,"appDramaId",published.dramaId(),"appEpisodeId",published.episodeId()),"PUBLISHED","核對並保存關聯：App 劇集已上架，視頻與交付一致");
        event(viewer,projectId,"第 "+row.get("episodeNumber")+" 集 V"+row.get("revision")+" 已核對 App 劇目 "+published.dramaId()+" / 劇集 "+published.episodeId()+(previous.isEmpty()?"（首次關聯）":"；原關聯："+previous));return detail(viewer,projectId,true);
    }
    public Object check(CreatorAccess.Viewer viewer,String projectId,boolean admin,int episodeNumber){
        if(episodeNumber<1||episodeNumber>500)throw ApiException.invalid("請選擇有效集數");
        project(viewer,projectId,admin,false);
        var rows=jdbc.queryForList("SELECT p.episode_number AS episodeNumber,p.app_drama_id AS appDramaId,p.app_episode_id AS appEpisodeId,p.submission_id AS submissionId,s.attachment_id AS attachmentId,s.vod_video_id AS vodVideoId FROM cms_creator_episode_publication p JOIN cms_creator_episode_submission s ON s.id=p.submission_id WHERE p.script_id=? AND p.episode_number=?",projectId,episodeNumber);
        // A single refresh is bounded; projects can publish hundreds of episodes.
        return rows.stream().map(row->{var result=new LinkedHashMap<String,Object>();result.put("episodeNumber",row.get("episodeNumber"));result.put("submissionId",row.get("submissionId"));
            try{media.verify(((Number)row.get("appDramaId")).longValue(),((Number)row.get("appEpisodeId")).longValue(),((Number)row.get("episodeNumber")).intValue(),row.get("attachmentId").toString(),row.get("vodVideoId").toString());result.put("status","PUBLISHED");result.put("message","App 劇集已上架，視頻與交付一致");}
            catch(ApiException e){result.put("status",e.status().value()==503?"UNKNOWN":e.code().startsWith("PUBLICATION_")?e.code().substring(12):"UNAVAILABLE");result.put("message",e.getMessage());}
            if("DELETED".equals(result.get("status"))){
                var affected=jdbc.queryForList("SELECT episode_number AS episodeNumber,submission_id AS submissionId,app_drama_id AS appDramaId,app_episode_id AS appEpisodeId FROM cms_creator_episode_publication WHERE script_id=? AND app_drama_id=?",projectId,row.get("appDramaId"));
                for(var item:affected)checks.save(viewer,projectId,item,"DELETED",result.get("message").toString());
                return result;
            }
            if(!checks.save(viewer,projectId,row,result.get("status").toString(),result.get("message").toString()))throw ApiException.conflict("關聯已更新，請重新核對");
            return result;}).toList();
    }
    @Transactional
    public Object complete(CreatorAccess.Viewer viewer,String projectId,CompleteInput input){
        var p=project(viewer,projectId,true,true);requireProducing(p);
        int version=jdbc.queryForObject("SELECT lock_version FROM cms_creator_script WHERE id=?",Integer.class,projectId);
        if(version!=input.version())throw ApiException.conflict("項目已更新，請刷新");
        int done=jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_publication p JOIN cms_creator_episode_submission s ON s.id=p.submission_id WHERE p.script_id=? AND s.state='APPROVED' AND s.revision_no=(SELECT MAX(v.revision_no) FROM cms_creator_episode_submission v WHERE v.script_id=s.script_id AND v.episode_number=s.episode_number)",Integer.class,projectId);
        long checked=checks.publications(projectId).stream().filter(item->"PUBLISHED".equals(item.get("checkStatus"))).count();
        if(checked!=done)throw ApiException.conflict("部分劇集尚未核對或存在上架異常，請先核對當前 App 狀態");
        if(done!=((Number)p.get("episodeCount")).intValue())throw ApiException.conflict("所有計劃集數的最新版本驗收通過並核對 App 關聯後，才能完成項目");
        jdbc.update("UPDATE cms_creator_script SET production_stage='COMPLETED',production_note=?,lock_version=lock_version+1 WHERE id=?",input.note().trim(),projectId);
        event(viewer,projectId,"全部計劃集數已驗收並核對 App 關聯 · "+input.note().trim());
        return detail(viewer,projectId,true);
    }
    public record DeletionInput(int episodeNumber,String submissionId,long dramaId,long episodeId){}
    @Transactional
    public Object confirmDeletion(CreatorAccess.Viewer viewer,String projectId,DeletionInput input){
        project(viewer,projectId,true,true);
        if(!checks.save(viewer,projectId,Map.of("episodeNumber",input.episodeNumber(),"submissionId",input.submissionId(),"appDramaId",input.dramaId(),"appEpisodeId",input.episodeId()),"DELETED","App 管理接口確認原關聯劇集已刪除"))throw ApiException.conflict("關聯已變更，請重新核對");
        return detail(viewer,projectId,true);
    }
    private void event(CreatorAccess.Viewer viewer,String id,String note){
        jdbc.update("INSERT INTO cms_creator_project_event(id,script_id,actor_key,stage,note) SELECT ?,id,?,production_stage,? FROM cms_creator_script WHERE id=?",Ids.next(),CreatorPublicationChecks.actor(viewer),note,id);
    }
}
