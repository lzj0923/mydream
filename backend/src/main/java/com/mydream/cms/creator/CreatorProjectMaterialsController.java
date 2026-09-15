package com.mydream.cms.creator;
import com.mydream.cms.forms.PiiCipher;
import com.mydream.cms.shared.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/creator-api/v1")
public class CreatorProjectMaterialsController {
    private final CreatorAccess access;private final CreatorProductionService projects;private final JdbcTemplate jdbc;private final PiiCipher cipher;private final ObjectMapper mapper;
    public CreatorProjectMaterialsController(CreatorAccess access,CreatorProductionService projects,JdbcTemplate jdbc,PiiCipher cipher,ObjectMapper mapper){this.access=access;this.projects=projects;this.jdbc=jdbc;this.cipher=cipher;this.mapper=mapper;}
    public record Document(String kind,String name,String data){}
    public record Input(Map<String,String> fields,List<Document> documents,int version){}
    static final Set<String> FIELDS=Set.of("paidAlias","freeAlias","isAi","audience","series","adaptation","company","producer","director","writer","characters","budgetRange","productionCost","contractId");
    static final Set<String> KINDS=Set.of("portraitCover","posterCover","costSheet","rights","promise","projectScreenshot");
    static void validate(Input input){
        if(input==null||input.version()<0||input.fields()==null||input.documents()==null||input.documents().size()>10)throw ApiException.invalid("作品資料格式無效");
        input.fields().forEach((key,value)->{if(!FIELDS.contains(key)||value==null||value.length()>2000)throw ApiException.invalid("作品資料字段無效或過長");});
        if(input.documents().isEmpty()&&input.fields().values().stream().allMatch(String::isBlank))throw ApiException.invalid("請至少填寫一項資料或添加一份附件");
        long total=0;
        for(var d:input.documents()){
            if(d==null||!KINDS.contains(d.kind())||d.name()==null||d.name().isBlank()||d.name().length()>160||d.data()==null||d.data().length()>7_000_000)throw ApiException.invalid("附件格式無效，每份最多 5 MB");
            String prefix=d.data().startsWith("data:application/pdf;base64,")?"data:application/pdf;base64,":d.data().startsWith("data:image/png;base64,")?"data:image/png;base64,":d.data().startsWith("data:image/jpeg;base64,")?"data:image/jpeg;base64,":null;
            if(prefix==null)throw ApiException.invalid("附件僅支持 JPG、PNG 或 PDF");
            byte[] bytes;try{bytes=Base64.getDecoder().decode(d.data().substring(prefix.length()));}catch(Exception e){throw ApiException.invalid("附件內容無效");}
            boolean valid=prefix.contains("pdf")?bytes.length>4&&bytes[0]==37&&bytes[1]==80&&bytes[2]==68&&bytes[3]==70:prefix.contains("png")?bytes.length>8&&bytes[0]==(byte)137&&bytes[1]==80&&bytes[2]==78&&bytes[3]==71&&bytes[4]==13&&bytes[5]==10&&bytes[6]==26&&bytes[7]==10:bytes.length>3&&bytes[0]==(byte)255&&bytes[1]==(byte)216&&bytes[2]==(byte)255;
            if(!valid||bytes.length>5*1024*1024||(d.kind().endsWith("Cover")&&prefix.contains("pdf")))throw ApiException.invalid("附件內容或大小不符合要求");
            total+=bytes.length;
        }
        if(total>12*1024*1024)throw ApiException.invalid("本項目附件合計不得超過 12 MB");
    }
    static String updateStatus(int total,int published){ return total>0&&published>=total?"已完結":published>0?"連載中":"未上架"; }
    private Map<String,Object> load(String id,boolean locked){
        int total=jdbc.queryForObject("SELECT episode_count FROM cms_creator_script WHERE id=?",Integer.class,id);
        int published=jdbc.queryForObject("SELECT COUNT(DISTINCT p.episode_number) FROM cms_creator_episode_publication p JOIN cms_creator_episode_submission s ON s.id=p.submission_id WHERE p.script_id=? AND p.episode_number BETWEEN 1 AND ? AND s.state='APPROVED'",Integer.class,id,total);
        String status=updateStatus(total,published);
        var rows=jdbc.queryForList("SELECT payload_encrypted,version FROM cms_creator_project_materials WHERE project_id=?",id);
        if(rows.isEmpty())return Map.of("fields",Map.of(),"documents",List.of(),"version",0,"locked",false,"updateStatus",status);
        var row=rows.get(0);var result=new LinkedHashMap<String,Object>();var payload=mapper.readTree(cipher.decrypt(row.get("payload_encrypted").toString()));var fields=payload.path("fields").deepCopy();if(fields instanceof tools.jackson.databind.node.ObjectNode object)object.remove("updateStatus");result.put("fields",fields);result.put("updateStatus",status);result.put("documents",payload.path("documents"));result.put("version",row.get("version"));result.put("locked",locked);var reviews=jdbc.queryForList("SELECT state,note,updated_at FROM cms_creator_material_review WHERE project_id=?",id);result.put("reviewState",reviews.isEmpty()?"UNREVIEWED":reviews.get(0).get("state"));result.put("reviewNote",reviews.isEmpty()?"":reviews.get(0).get("note"));result.put("reviewUpdatedAt",reviews.isEmpty()?null:reviews.get(0).get("updated_at"));result.put("history",jdbc.queryForList("SELECT note,created_at AS createdAt FROM cms_creator_project_event WHERE script_id=? AND note LIKE '補充資料%' ORDER BY created_at DESC,id DESC LIMIT 50",id));return result;
    }
    private boolean locked(String id){return jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_material_review WHERE project_id=? AND state IN ('PENDING','APPROVED')",Integer.class,id)>0;}
    @GetMapping("/projects/{id}/materials") Object mine(@PathVariable String id,HttpServletRequest r,Authentication a){projects.detail(access.require(r,a),id,false);return load(id,locked(id));}
    @GetMapping("/project-reviews/{id}/materials") Object review(@PathVariable String id,HttpServletRequest r,Authentication a){projects.detail(access.require(r,a),id,true);return load(id,true);}
    @PostMapping("/projects/{id}/materials") @Transactional Object save(@PathVariable String id,@RequestBody Input input,HttpServletRequest r,Authentication a){
        var viewer=access.require(r,a);var project=projects.detail(viewer,id,false);validate(input);
        jdbc.queryForObject("SELECT id FROM cms_creator_script WHERE id=? FOR UPDATE",String.class,id);
        if(!List.of("PRODUCING","DELIVERED","COMPLETED").contains(project.get("stage")))throw ApiException.conflict("項目開始製作後才可提交補充資料");
        var versions=jdbc.queryForList("SELECT version FROM cms_creator_project_materials WHERE project_id=?",Integer.class,id);
        if(!versions.isEmpty()&&locked(id))throw ApiException.conflict("補充資料正在審核或已確認，退回後可重新提交");
        int version=versions.isEmpty()?0:versions.get(0);if(input.version()!=version)throw ApiException.conflict("資料已更新，請重新讀取後編輯");
        String contract=input.fields().get("contractId");if(contract!=null&&!contract.isBlank()&&jdbc.queryForObject("SELECT COUNT(*) FROM cms_creator_agreement WHERE id=? AND owner_key=? AND scope IN (?, 'membership')",Integer.class,contract,viewer.ownerKey(),id)==0)throw ApiException.invalid("請選擇本人的項目或入駐合同");
        String payload=cipher.encrypt(mapper.writeValueAsString(Map.of("fields",input.fields(),"documents",input.documents())));
        jdbc.update("INSERT INTO cms_creator_project_materials(project_id,payload_encrypted,version) VALUES (?,?,1) ON DUPLICATE KEY UPDATE payload_encrypted=VALUES(payload_encrypted),version=version+1",id,payload);jdbc.update("INSERT INTO cms_creator_material_review(project_id,version) VALUES (?,?) ON DUPLICATE KEY UPDATE version=VALUES(version),state='PENDING',note=''",id,version+1);jdbc.update("INSERT INTO cms_creator_project_event(id,script_id,actor_key,stage,note) VALUES (?,?,?,?,?)",UUID.randomUUID().toString(),id,viewer.ownerKey(),project.get("stage"),"補充資料已提交審核 · 第 "+(version+1)+" 版");return load(id,locked(id));
    }
}
