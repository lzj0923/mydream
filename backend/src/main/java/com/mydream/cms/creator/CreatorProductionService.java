package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreatorProductionService {
    private final JdbcTemplate jdbc;
    private final CreatorVideoLookup videos;
    public CreatorProductionService(JdbcTemplate jdbc,CreatorVideoLookup videos){this.jdbc=jdbc;this.videos=videos;}
    public record ProgressInput(@NotBlank String stage,@NotBlank @Size(max=1000) String note,@NotNull @Size(max=200) String contractReference,@Min(0) int version){}
    public record DeliveryInput(@NotEmpty @Size(max=10) List<@NotNull @Positive Long> videoIds,@NotBlank @Size(max=1000) String note,@Min(0) int version){}
    private static final String FIELDS="id,title,status,episode_count AS episodeCount,genre,format,synopsis,created_at AS createdAt,owner_key AS ownerKey,production_stage AS stage,contract_reference AS contractReference,production_note AS note,lock_version AS version,reviewed_at AS approvedAt,updated_at AS updatedAt";
    public record ProjectInput(@NotBlank @Size(max=120) String title,@NotBlank @Size(max=40) String genre,@NotBlank @Size(max=40) String format,@Min(1) @Max(500) int episodeCount,@NotBlank @Size(max=5000) String synopsis,@AssertTrue boolean committed, @NotNull Settings settings){}
    public record Settings(String area,String category,Boolean landscape,java.math.BigDecimal price){}
    public record ContentInput(String title,String genre,String synopsis,int version){}
    @Transactional public Map<String,Object> content(CreatorAccess.Viewer viewer,String id,ContentInput input){
        detail(viewer,id,false);
        if(input.title()==null||input.title().isBlank()||input.title().length()>120||input.genre()==null||input.genre().isBlank()||input.genre().length()>40||input.synopsis()==null||input.synopsis().isBlank()||input.synopsis().length()>5000)throw ApiException.invalid("請完整填寫作品名稱、題材及簡介");
        int changed=jdbc.update("UPDATE cms_creator_script SET title=?,genre=?,synopsis=?,lock_version=lock_version+1 WHERE id=? AND owner_key=? AND lock_version=?",input.title().trim(),input.genre().trim(),input.synopsis().trim(),id,viewer.ownerKey(),input.version());
        if(changed!=1)throw ApiException.conflict("項目已更新，請刷新後再修改");
        if(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_publication WHERE script_id=?",Integer.class,id)>0)jdbc.update("INSERT INTO cms_creator_settings_sync(project_id) VALUES (?) ON DUPLICATE KEY UPDATE revision=revision+1,state='PENDING',message='',claim_token=NULL,claimed_at=NULL",id);
        event(viewer,id,detail(viewer,id,false).get("stage").toString(),"更新作品名稱、題材與簡介；已發佈內容待平台同步");return detail(viewer,id,false);
    }
    private static void validateSettings(Settings value){
        var categories=Map.of("zhf",List.of("22","26","39","28","45","62","19","35","48","56","33"),"en",List.of("74","73","72","71","70","69","68","67","66","65","64"));
        if(value==null||value.area()==null||!categories.containsKey(value.area())||!categories.get(value.area()).contains(value.category())||value.landscape()==null||value.price()==null||value.price().signum()<0||value.price().compareTo(new java.math.BigDecimal("999999.99"))>0||value.price().stripTrailingZeros().scale()>2)throw ApiException.invalid("請完整填寫地區、分類、畫面方向與有效的單集解鎖價格");
    }
    static void requirePublicationInformation(Map<String,Object> project){
        if(project.get("title")==null||project.get("title").toString().isBlank()||project.get("synopsis")==null||project.get("synopsis").toString().isBlank()||!(project.get("episodeCount") instanceof Number count)||count.intValue()<1)throw ApiException.invalid("請先補齊項目名稱、簡介與總集數");
        if(!(project.get("settings") instanceof Map<?,?> settings))throw ApiException.invalid("請先補齊項目上架必填資料：地區、分類、畫面方向與價格");
        try{Object landscape=settings.get("landscape");if(!(landscape instanceof Boolean)&&!(landscape instanceof Number))throw ApiException.invalid("請填寫畫面方向");validateSettings(new Settings(String.valueOf(settings.get("area")),String.valueOf(settings.get("category")),landscape instanceof Boolean b?b:((Number)landscape).intValue()!=0,new java.math.BigDecimal(settings.get("price").toString())));}catch(NullPointerException|NumberFormatException e){throw ApiException.invalid("請完整填寫項目上架必填資料");}
    }    private void storeSettings(String id,Settings value){
        jdbc.update("INSERT INTO cms_creator_project_settings(project_id,area,category_id,landscape,unlock_price) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE area=VALUES(area),category_id=VALUES(category_id),landscape=VALUES(landscape),unlock_price=VALUES(unlock_price)",id,value.area(),value.category(),value.landscape(),value.price());
    }
    @Transactional
    public Map<String,Object> settings(CreatorAccess.Viewer viewer,String id,Settings value){
        var current=detail(viewer,id,false);validateSettings(value);
        jdbc.queryForObject("SELECT id FROM cms_creator_script WHERE id=? FOR UPDATE",String.class,id);

        current=detail(viewer,id,false);
        storeSettings(id,value);if(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_publication WHERE script_id=?",Integer.class,id)>0){jdbc.update("INSERT INTO cms_creator_settings_sync(project_id) VALUES (?) ON DUPLICATE KEY UPDATE revision=revision+1,state='PENDING',message='',claim_token=NULL,claimed_at=NULL",id);}event(viewer,id,current.get("stage").toString(),"更新項目上架資料：原值 "+current.get("settings")+"；新值 "+value+"；已上架內容待平台同步");return detail(viewer,id,false);
    }
    @Transactional
    public Map<String,Object> create(CreatorAccess.Viewer viewer,ProjectInput input){
        if(viewer.admin()||!viewer.ownerKey().startsWith("creator:"))throw new ApiException(HttpStatus.FORBIDDEN,"CREATOR_REQUIRED","請使用創作者賬號建立項目");
        if(input==null||!input.committed()||input.episodeCount()<1||input.episodeCount()>500)throw ApiException.invalid("請確認承諾集數（1 至 500 集）");
        if(input.title()==null||input.title().isBlank()||input.title().length()>120||input.synopsis()==null||input.synopsis().isBlank()||input.synopsis().length()>5000||input.genre()==null||input.genre().isBlank()||input.genre().length()>40||input.format()==null||input.format().isBlank()||input.format().length()>40)throw ApiException.invalid("請完整填寫項目資料");
        validateSettings(input.settings());
        if(viewer.workType()!=null)viewer.workType().requireFormat(input.format());
        String id=Ids.next();
        jdbc.update("INSERT INTO cms_creator_script(id,owner_key,title,genre,format,episode_count,synopsis,body,status,production_stage,production_note) VALUES (?,?,?,?,?,?,?,'','ACTIVE','PRODUCING',?)",id,viewer.ownerKey(),input.title().trim(),input.genre().trim(),input.format().trim(),input.episodeCount(),input.synopsis().trim(),"創作者承諾完成 "+input.episodeCount()+" 集");
        storeSettings(id,input.settings());
        if(viewer.workType()!=null)jdbc.update("UPDATE cms_creator_script SET work_type=? WHERE id=?",viewer.workType().name(),id);
        event(viewer,id,"PRODUCING","建立項目並承諾完成 "+input.episodeCount()+" 集");
        return detail(viewer,id,false);
    }
    public Object list(CreatorAccess.Viewer viewer,boolean admin){
        if(admin)requireAdmin(viewer);
        var rows=admin?jdbc.queryForList("SELECT "+FIELDS+" FROM cms_creator_script WHERE status IN ('APPROVED','ACTIVE') ORDER BY updated_at DESC"):
            jdbc.queryForList("SELECT "+FIELDS+" FROM cms_creator_script WHERE status IN ('APPROVED','ACTIVE') AND owner_key=?"+viewer.typeFilter("")+" ORDER BY updated_at DESC",viewer.ownerKey());
        return rows;
    }
    public Map<String,Object> detail(CreatorAccess.Viewer viewer,String id,boolean admin){
        if(admin)requireAdmin(viewer);
        var rows=admin?jdbc.queryForList("SELECT "+FIELDS+" FROM cms_creator_script WHERE id=? AND status IN ('APPROVED','ACTIVE')",id):
            jdbc.queryForList("SELECT "+FIELDS+" FROM cms_creator_script WHERE id=? AND owner_key=? AND status IN ('APPROVED','ACTIVE')"+viewer.typeFilter(""),id,viewer.ownerKey());
        if(rows.isEmpty())throw ApiException.notFound("已通过的项目不存在");
        var result=new LinkedHashMap<>(rows.get(0));
        var settings=jdbc.queryForList("SELECT area,category_id AS category,landscape,unlock_price AS price FROM cms_creator_project_settings WHERE project_id=?",id);
        result.put("settings",settings.isEmpty()?null:settings.get(0));
        result.put("videos",jdbc.queryForList("SELECT video_id AS id,video_title AS title,linked_at AS linkedAt FROM cms_creator_delivery WHERE script_id=? ORDER BY video_id",id));
        result.put("events",jdbc.queryForList("SELECT actor_key AS actor,stage,note,created_at AS createdAt FROM cms_creator_project_event WHERE script_id=? ORDER BY created_at DESC,id DESC",id));
        return result;
    }
    static void requireAdmin(CreatorAccess.Viewer viewer){if(!viewer.admin())throw new ApiException(HttpStatus.FORBIDDEN,"FORBIDDEN","仅App 管理员可以推进项目进度");}
    static void validateTransition(String from,ProgressInput input){
        if(input.note()==null||input.note().isBlank())throw ApiException.invalid("请填写进度说明");
        boolean allowed=switch(from){case "PENDING_CONTRACT"->input.stage().equals("SIGNED");case "SIGNED"->input.stage().equals("PRODUCING");case "DELIVERED"->List.of("COMPLETED","PRODUCING").contains(input.stage());default->false;};
        if(!allowed)throw ApiException.conflict("当前阶段不能执行此操作，请刷新项目");
        if(input.stage().equals("SIGNED")&&(input.contractReference()==null||input.contractReference().isBlank()))throw ApiException.invalid("请填写已在线下签署的合同编号或凭据说明");
    }
    @Transactional
    public Object progress(CreatorAccess.Viewer viewer,String id,ProgressInput input){
        requireAdmin(viewer);var current=detail(viewer,id,true);String from=current.get("stage").toString();validateTransition(from,input);
        if(input.stage().equals("COMPLETED")&&((List<?>)current.get("videos")).isEmpty())throw ApiException.invalid("项目尚未关联交付视频");
        int n=jdbc.update("UPDATE cms_creator_script SET production_stage=?,production_note=?,contract_reference=?,lock_version=lock_version+1 WHERE id=? AND status IN ('APPROVED','ACTIVE') AND production_stage=? AND lock_version=?",
            input.stage(),input.note().trim(),input.stage().equals("SIGNED")?input.contractReference().trim():current.get("contractReference"),id,from,input.version());
        if(n!=1)throw ApiException.conflict("项目已更新，请刷新后重试");
        event(viewer,id,input.stage(),input.note().trim());return detail(viewer,id,true);
    }
    @Transactional
    public Object deliver(CreatorAccess.Viewer viewer,String id,DeliveryInput input,String authorization){
        var current=detail(viewer,id,false);
        if(jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_episode_submission WHERE script_id=?",Integer.class,id)>0)throw ApiException.conflict("本項目已採用逐集交付，請在對應集數提交驗收");
        if(!current.get("stage").equals("PRODUCING")||((Number)current.get("version")).intValue()!=input.version())throw ApiException.conflict("仅制作中的当前版本可以提交交付");
        if(input.note()==null||input.note().isBlank())throw ApiException.invalid("请填写交付说明");
        var owned=videos.ownedVideos(viewer.ownerKey(),authorization,input.videoIds());
        int n=jdbc.update("UPDATE cms_creator_script SET production_stage='DELIVERED',production_note=?,lock_version=lock_version+1 WHERE id=? AND owner_key=? AND status IN ('APPROVED','ACTIVE') AND production_stage='PRODUCING' AND lock_version=?",input.note().trim(),id,viewer.ownerKey(),input.version());
        if(n!=1)throw ApiException.conflict("项目已更新，请刷新后重试");
        jdbc.update("DELETE FROM cms_creator_delivery WHERE script_id=?",id);
        try{for(var video:owned)jdbc.update("INSERT INTO cms_creator_delivery(script_id,video_id,video_title) VALUES (?,?,?)",id,video.id(),video.title());}
        catch(org.springframework.dao.DuplicateKeyException e){throw ApiException.conflict("所选视频已关联其他剧本，请重新选择");}
        event(viewer,id,"DELIVERED",input.note().trim());return detail(viewer,id,false);
    }
    private void event(CreatorAccess.Viewer viewer,String id,String stage,String note){jdbc.update("INSERT INTO cms_creator_project_event(id,script_id,actor_key,stage,note) VALUES (?,?,?,?,?)",Ids.next(),id,CreatorPublicationChecks.actor(viewer),stage,note);}
}
