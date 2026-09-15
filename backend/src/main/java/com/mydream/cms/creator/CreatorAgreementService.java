package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Placeholder confirmations are deliberately distinct from legally signed contracts. */
@Service
public class CreatorAgreementService {
    private final JdbcTemplate jdbc;
    public CreatorAgreementService(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public record SubmitInput(@NotBlank @Pattern(regexp="membership|[a-zA-Z0-9-]{1,80}") String scope,
        @Min(1) int templateVersion,@Min(0) int previousAttempt,
        @NotBlank @Size(max=80) String signerName,@NotBlank @Size(max=160) String contact,
        @AssertTrue boolean agreed,@AssertTrue boolean placeholderAcknowledged){}
    public record ReviewInput(@NotBlank String decision,@NotBlank @Size(max=1000) String note){}
    public record TemplateInput(@NotBlank @Size(max=120) String title,@NotBlank @Size(max=20000) String body,@Min(1) int version){}
    private static final String FIELDS="id,owner_key AS ownerKey,scope_key AS scope,attempt,kind,title,body,template_version AS templateVersion,document_hash AS documentHash,context_text AS contextText,signer_name AS signerName,contact,state,review_note AS reviewNote,reviewer,created_at AS createdAt,reviewed_at AS reviewedAt";
    private Map<String,Object> latest(String owner,String scope){
        var rows=jdbc.queryForList("SELECT "+FIELDS+" FROM cms_creator_agreement WHERE owner_key=? AND scope_key=? ORDER BY attempt DESC LIMIT 1",owner,scope);
        return rows.isEmpty()?Map.of():rows.get(0);
    }
    public boolean ready(String owner,String scope){return "DEMO_ACTIVE".equals(latest(owner,scope).get("state"));}
    public void requireMembership(CreatorAccess.Viewer viewer){
        if(viewer.admin())return;
        if(!ready(viewer.ownerKey(),"membership"))throw ApiException.conflict("請先在合同管理完成創作者合作協議確認，並等待平台審核");
    }
    public void requireProject(CreatorAccess.Viewer viewer,String id){
        var rows=jdbc.queryForList("SELECT owner_key,status FROM cms_creator_script WHERE id=? AND status IN ('APPROVED','ACTIVE')",id);
        if(rows.isEmpty()||(!viewer.admin()&&!rows.get(0).get("owner_key").equals(viewer.ownerKey())))throw ApiException.notFound("項目不存在");
        if("ACTIVE".equals(rows.get(0).get("status")))return; // Direct projects do not require a cooperation contract to create episodes.
        String owner=rows.get(0).get("owner_key").toString();
        if(!ready(owner,"membership")||!ready(owner,id))throw ApiException.conflict("請先在合同管理完成平台合作協議及本項目的合作確認，並等待平台審核");
    }
    public Object list(CreatorAccess.Viewer viewer,boolean admin){
        if(admin)CreatorProductionService.requireAdmin(viewer);
        return Map.of("placeholder",true,"ready",!admin&&ready(viewer.ownerKey(),"membership"),
            "templates",jdbc.queryForList("SELECT kind,title,body,version FROM cms_creator_agreement_template ORDER BY kind"),
            "contracts",admin?jdbc.queryForList("SELECT "+FIELDS+" FROM cms_creator_agreement ORDER BY created_at DESC,id DESC"):
                jdbc.queryForList("SELECT "+FIELDS+" FROM cms_creator_agreement WHERE owner_key=?"+viewer.agreementFilter()+" ORDER BY created_at DESC,attempt DESC",viewer.ownerKey()),
            "projects",admin?List.of():jdbc.queryForList("SELECT id,title,episode_count AS episodeCount,production_stage AS stage FROM cms_creator_script WHERE owner_key=? AND status='APPROVED'"+viewer.typeFilter("")+" ORDER BY updated_at DESC",viewer.ownerKey()));
    }
    @Transactional
    public Object submit(CreatorAccess.Viewer viewer,SubmitInput input){
        if(viewer.admin())throw ApiException.invalid("請使用創作者 App 賬號提交合作申請");
        if(!input.agreed()||!input.placeholderAcknowledged())throw ApiException.invalid("請閱讀並確認本次演示文件及聲明");
        String kind=input.scope().equals("membership")?"MEMBERSHIP":"PROJECT";
        // Always lock membership first, serializing concurrent submissions and reviews consistently.
        jdbc.queryForList("SELECT kind FROM cms_creator_agreement_template WHERE kind='MEMBERSHIP' FOR UPDATE");
        var template=jdbc.queryForMap("SELECT * FROM cms_creator_agreement_template WHERE kind=? FOR UPDATE",kind);
        if(((Number)template.get("version")).intValue()!=input.templateVersion())throw ApiException.conflict("協議模板已更新，請刷新後重新閱讀");
        String context="創作者入駐申請";
        if(kind.equals("PROJECT")){
            requireMembership(viewer);
            var projects=jdbc.queryForList("SELECT title,episode_count,production_stage FROM cms_creator_script WHERE id=? AND owner_key=? AND status='APPROVED'"+viewer.typeFilter("")+" FOR UPDATE",input.scope(),viewer.ownerKey());
            if(projects.isEmpty())throw ApiException.notFound("已通過的項目不存在");
            var p=projects.get(0);
            if(!List.of("PENDING_CONTRACT","SIGNED","PRODUCING").contains(p.get("production_stage")))throw ApiException.conflict("本項目已進入驗收或完成，不能提交合作確認");
            context="項目："+p.get("title")+"\n計劃集數："+p.get("episode_count");
        }
        var previous=latest(viewer.ownerKey(),input.scope());
        int attempt=previous.isEmpty()?0:((Number)previous.get("attempt")).intValue();
        if(attempt!=input.previousAttempt())throw ApiException.conflict("申請已更新，請刷新後重試");
        if(!previous.isEmpty()&&!"CHANGES_REQUESTED".equals(previous.get("state")))throw ApiException.conflict("已有待確認或已確認的協議，請勿重複提交");
        String title=template.get("title").toString(),body=template.get("body").toString();
        String hash=hash(title+"\n"+context+"\n"+body);
        jdbc.update("INSERT INTO cms_creator_agreement(id,owner_key,scope_key,attempt,kind,title,body,template_version,document_hash,context_text,signer_name,contact) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            Ids.next(),viewer.ownerKey(),input.scope(),attempt+1,kind,title,body,input.templateVersion(),hash,context,input.signerName().trim(),input.contact().trim());
        return latest(viewer.ownerKey(),input.scope());
    }
    static String hash(String text){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    @Transactional
    public Object review(CreatorAccess.Viewer viewer,String id,ReviewInput input){
        CreatorProductionService.requireAdmin(viewer);
        if(!List.of("APPROVED","CHANGES_REQUESTED").contains(input.decision())||input.note()==null||input.note().isBlank())throw ApiException.invalid("請選擇確認結果並填寫說明");
        jdbc.queryForList("SELECT kind FROM cms_creator_agreement_template WHERE kind='MEMBERSHIP' FOR UPDATE");
        var rows=jdbc.queryForList("SELECT "+FIELDS+" FROM cms_creator_agreement WHERE id=? FOR UPDATE",id);
        if(rows.isEmpty())throw ApiException.notFound("協議記錄不存在");
        var c=rows.get(0);if(!c.get("state").equals("PENDING"))throw ApiException.conflict("本次申請已處理，請刷新列表");
        if(!id.equals(latest(c.get("ownerKey").toString(),c.get("scope").toString()).get("id")))throw ApiException.conflict("存在更新的申請版本");
        if(input.decision().equals("APPROVED")&&c.get("kind").equals("PROJECT")){
            if(!ready(c.get("ownerKey").toString(),"membership"))throw ApiException.conflict("請先確認創作者平台合作協議");
            int n=jdbc.update("UPDATE cms_creator_script SET production_stage='PRODUCING',contract_reference=?,production_note=?,lock_version=lock_version+1 WHERE id=? AND owner_key=? AND status='APPROVED' AND production_stage IN ('PENDING_CONTRACT','SIGNED','PRODUCING')",
                "DEMO-"+id,"項目合作確認已完成（演示），可開始逐集上傳。",c.get("scope"),c.get("ownerKey"));
            if(n!=1)throw ApiException.conflict("項目狀態已變更，請重新核對");
            jdbc.update("INSERT INTO cms_creator_project_event(id,script_id,actor_key,stage,note) VALUES (?,?,?,?,?)",Ids.next(),c.get("scope"),viewer.ownerKey(),"PRODUCING","演示合作確認：DEMO-"+id+"；"+input.note().trim());
        }
        jdbc.update("UPDATE cms_creator_agreement SET state=?,review_note=?,reviewer=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?",input.decision().equals("APPROVED")?"DEMO_ACTIVE":"CHANGES_REQUESTED",input.note().trim(),viewer.ownerKey(),id);
        return Map.of("ok",true);
    }
    @Transactional
    public Object template(CreatorAccess.Viewer viewer,String kind,TemplateInput input){
        CreatorProductionService.requireAdmin(viewer);
        if(!List.of("MEMBERSHIP","PROJECT").contains(kind))throw ApiException.invalid("模板類型無效");
        if(jdbc.update("UPDATE cms_creator_agreement_template SET title=?,body=?,version=version+1 WHERE kind=? AND version=?",input.title().trim(),input.body().trim(),kind,input.version())!=1)throw ApiException.conflict("模板已更新，請重新讀取");
        return Map.of("ok",true);
    }
}
