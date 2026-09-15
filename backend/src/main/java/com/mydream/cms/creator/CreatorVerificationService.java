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
public class CreatorVerificationService {
    private final JdbcTemplate jdbc; private final PiiCipher cipher; private final ObjectMapper mapper;
    public CreatorVerificationService(JdbcTemplate jdbc,PiiCipher cipher,ObjectMapper mapper){this.jdbc=jdbc;this.cipher=cipher;this.mapper=mapper;}
    public record Document(String name,String data,String kind){ public Document(String name,String data){this(name,data,null);} }
    public record Input(String creatorType,String entityType,String name,String documentNumber,String contactName,String contact,String region,List<Document> documents,boolean accepted,int version,Map<String,String> profile){
        public Input(String creatorType,String entityType,String name,String documentNumber,String contactName,String contact,String region,List<Document> documents,boolean accepted,int version){this(creatorType,entityType,name,documentNumber,contactName,contact,region,documents,accepted,version,null);}
    }
    public record Decision(String decision,String note,int version){}
    private void creator(CreatorAccess.Viewer viewer){if(viewer.admin() || !viewer.ownerKey().startsWith("creator:"))throw new ApiException(HttpStatus.FORBIDDEN,"CREATOR_REQUIRED","請使用獨立創作者賬號提交認證");}
    private void admin(CreatorAccess.Viewer viewer){if(!viewer.admin())throw new ApiException(HttpStatus.FORBIDDEN,"ADMIN_REQUIRED","僅App 管理員可以審核認證");}
    public Map<String,Object> status(CreatorAccess.Viewer viewer){
        var rows=jdbc.queryForList("SELECT id,creator_type AS creatorType,entity_type AS entityType,state,review_note AS reviewNote,version,submitted_at AS submittedAt,reviewed_at AS reviewedAt FROM cms_creator_verification WHERE owner_key=?",viewer.ownerKey());
        if(rows.isEmpty())return Map.of("state","NONE","version",0);
        return rows.get(0);
    }
    public void requireApproved(CreatorAccess.Viewer viewer){
        if(!"APPROVED".equals(status(viewer).get("state")))throw new ApiException(HttpStatus.FORBIDDEN,"VERIFICATION_REQUIRED","身份認證通過後才可正式發佈，仍可瀏覽平台和保存草稿");
    }
    private static String field(String value,int max,String label){if(value==null||value.isBlank()||value.length()>max)throw ApiException.invalid("請正確填寫"+label);return value.trim();}
    static void document(Document d){
        if(d==null)throw ApiException.invalid("請上傳認證證明");field(d.name(),120,"文件名稱");
        if(d.data()==null||d.data().length()>7_000_000)throw ApiException.invalid("每張證明圖片不得超過 5 MB");
        String prefix=d.data().startsWith("data:image/png;base64,")?"data:image/png;base64,":d.data().startsWith("data:image/jpeg;base64,")?"data:image/jpeg;base64,":null;
        if(prefix==null)throw ApiException.invalid("證明圖片僅支持 PNG 或 JPG");
        byte[] bytes;try{bytes=Base64.getDecoder().decode(d.data().substring(prefix.length()));}catch(IllegalArgumentException e){throw ApiException.invalid("圖片格式無效");}
        boolean png=bytes.length>=8&&bytes[0]==(byte)137&&bytes[1]==80&&bytes[2]==78&&bytes[3]==71&&bytes[4]==13&&bytes[5]==10&&bytes[6]==26&&bytes[7]==10;
        boolean jpg=bytes.length>=3&&bytes[0]==(byte)255&&bytes[1]==(byte)216&&bytes[2]==(byte)255;
        if(bytes.length>5*1024*1024 || !(prefix.contains("png")?png:jpg))throw ApiException.invalid("圖片格式或大小無效");
    }
    static void validateMaterials(Input input){
        // Existing clients can finish the original form during a rolling release.
        if(input.profile()==null){
            if(input.documents()==null||input.documents().size()!=("PERSONAL".equals(input.entityType())?2:1))throw ApiException.invalid("請上傳完整認證證明");
            return;
        }
        var p=input.profile();
        if(p.size()>11)throw ApiException.invalid("認證資料格式無效");
        field(p.get("displayName"),80,"創作者或品牌名稱");
        String email=field(p.get("email"),120,"電子郵箱");
        if(!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))throw ApiException.invalid("請填寫有效電子郵箱");
        String phone=field(p.get("phone"),40,"聯絡電話");
        if(!phone.matches("[+0-9() .-]{6,40}"))throw ApiException.invalid("請填寫有效聯絡電話");
        field(p.get("city"),80,"所在城市");field(p.get("introduction"),1000,"創作簡介");
        String url=p.get("portfolioUrl");
        if(url!=null&&!url.isBlank()){
            try {var uri=java.net.URI.create(url);if(url.length()>500||uri.getHost()==null||!("https".equals(uri.getScheme())||"http".equals(uri.getScheme())))throw new IllegalArgumentException();}
            catch(IllegalArgumentException e){throw ApiException.invalid("作品集連結請使用完整的 HTTP 或 HTTPS 網址");}
        }
        Set<String> required;
        if("BUSINESS".equals(input.entityType())){
            field(p.get("representative"),80,"企業負責人");field(p.get("address"),240,"企業登記地址");field(p.get("contactRole"),80,"聯絡人職務");
            if(!"BUSINESS_LICENSE".equals(p.get("documentType")))throw ApiException.invalid("請選擇企業登記證明");
            required=Set.of("BUSINESS_LICENSE","AUTHORIZATION");
        }else if("ID_CARD".equals(p.get("documentType")))required=Set.of("ID_FRONT","ID_BACK","HANDHELD");
        else if("PASSPORT".equals(p.get("documentType")))required=Set.of("PASSPORT","HANDHELD");
        else throw ApiException.invalid("請選擇證件類型");
        if(input.documents()==null||input.documents().size()!=required.size())throw ApiException.invalid("請分別上傳完整的證明圖片");
        var kinds=new HashSet<String>();
        for(var d:input.documents()){if(d==null||d.kind()==null||!kinds.add(d.kind()))throw ApiException.invalid("證明圖片類型缺失或重複");}
        if(!kinds.equals(required))throw ApiException.invalid("請按所選證件類型上傳對應圖片");
    }
    @Transactional public Map<String,Object> submit(CreatorAccess.Viewer viewer,Input input){
        creator(viewer);
        if(input==null||input.creatorType()==null||input.entityType()==null||!List.of("COMIC","SHORT_DRAMA").contains(input.creatorType())||!List.of("PERSONAL","BUSINESS").contains(input.entityType()))throw ApiException.invalid("請選擇創作身份和認證主體");
        field(input.name(),120,"姓名或企業名稱");field(input.documentNumber(),80,"證件或登記編號");field(input.contact(),120,"聯絡方式");field(input.region(),80,"國家或地區");
        if("BUSINESS".equals(input.entityType()))field(input.contactName(),80,"企業聯絡人");
        if(!input.accepted())throw ApiException.invalid("請確認認證資料真實有效");
        validateMaterials(input);
        input.documents().forEach(CreatorVerificationService::document);
        // Lock the account row to serialize first submissions and prevent duplicate certification records.
        jdbc.queryForObject("SELECT id FROM cms_creator_account WHERE id=? FOR UPDATE",String.class,viewer.ownerKey().substring(8));
        var current=status(viewer);String state=current.get("state").toString();int version=((Number)current.get("version")).intValue();
        if(!List.of("NONE","REJECTED").contains(state)||input.version()!=version)throw ApiException.conflict("認證狀態已更新，請刷新後重試");
        String encrypted=cipher.encrypt(mapper.writeValueAsString(input));String id=state.equals("NONE")?UUID.randomUUID().toString():current.get("id").toString();
        if(state.equals("NONE"))jdbc.update("INSERT INTO cms_creator_verification(id,owner_key,creator_type,entity_type,state,payload_encrypted) VALUES (?,?,?,?,'PENDING',?)",id,viewer.ownerKey(),input.creatorType(),input.entityType(),encrypted);
        else jdbc.update("UPDATE cms_creator_verification SET creator_type=?,entity_type=?,state='PENDING',payload_encrypted=?,review_note='',reviewer=NULL,reviewed_at=NULL,submitted_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?",input.creatorType(),input.entityType(),encrypted,id);
        event(id,viewer.ownerKey(),"SUBMITTED",version+1,"");return status(viewer);
    }
    public List<Map<String,Object>> list(CreatorAccess.Viewer viewer){admin(viewer);return jdbc.queryForList("SELECT v.id,a.username,v.creator_type AS creatorType,v.entity_type AS entityType,v.state,v.version,v.submitted_at AS submittedAt,v.review_note AS reviewNote FROM cms_creator_verification v LEFT JOIN cms_creator_account a ON v.owner_key=CONCAT('creator:',a.id) ORDER BY (v.state='PENDING') DESC,v.submitted_at DESC LIMIT 500");}
    public Map<String,Object> detail(CreatorAccess.Viewer viewer,String id){
        admin(viewer);var rows=jdbc.queryForList("SELECT * FROM cms_creator_verification WHERE id=?",id);if(rows.isEmpty())throw ApiException.notFound("認證申請不存在");var row=rows.get(0);
        return Map.of("id",id,"state",row.get("state"),"version",row.get("version"),"reviewNote",row.get("review_note"),"payload",mapper.readTree(cipher.decrypt(row.get("payload_encrypted").toString())),"history",jdbc.queryForList("SELECT action,note,actor,version,created_at AS createdAt FROM cms_creator_verification_event WHERE verification_id=? ORDER BY created_at,version",id));
    }
    @Transactional public Map<String,Object> review(CreatorAccess.Viewer viewer,String id,Decision input){
        admin(viewer);if(input==null||input.decision()==null||!List.of("APPROVED","REJECTED").contains(input.decision()))throw ApiException.invalid("審核決定無效");String note=input.note()==null?"":input.note().trim();
        if(note.length()>1000||("REJECTED".equals(input.decision())&&note.isEmpty()))throw ApiException.invalid("退回時請填寫補充資料原因（最多 1000 字）");
        int changed=jdbc.update("UPDATE cms_creator_verification SET state=?,review_note=?,reviewer=?,reviewed_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND state='PENDING' AND version=? AND owner_key<>?",input.decision(),note,viewer.ownerKey(),id,input.version(),viewer.ownerKey());
        if(changed!=1)throw ApiException.conflict("申請已被處理或版本已更新，請刷新列表");event(id,viewer.ownerKey(),input.decision(),input.version()+1,note);return Map.of("ok",true);
    }
    private void event(String id,String actor,String action,int version,String note){jdbc.update("INSERT INTO cms_creator_verification_event(id,verification_id,actor,action,version,note) VALUES (?,?,?,?,?,?)",UUID.randomUUID().toString(),id,actor,action,version,note);}
}
