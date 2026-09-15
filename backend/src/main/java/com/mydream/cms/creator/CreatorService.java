package com.mydream.cms.creator;

import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import com.mydream.cms.delivery.SiteDelivery;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreatorService {
    private final JdbcTemplate jdbc;
    private final SiteDelivery delivery;
    public CreatorService(JdbcTemplate jdbc, SiteDelivery delivery) { this.jdbc = jdbc; this.delivery = delivery; }

    public record ScriptInput(@NotBlank @Size(max=120) String title, @NotBlank @Size(max=40) String genre,
        @NotBlank @Size(max=40) String format, @Min(1) @Max(500) int episodeCount,
        @NotNull @Size(max=5000) String synopsis, @NotNull @Size(max=200000) String body, @Min(0) int version) {}
    public record ProfileInput(@NotBlank @Size(max=80) String displayName, @NotNull @Size(max=1000) String bio,
        @NotNull @Size(max=120) String specialty) {}
    public record VersionInput(@Min(0) int version) {}
    public record ReviewInput(@NotBlank String decision, @NotNull @Size(max=1000) String note, @Min(0) int version) {}
    public record InterestInput(@NotBlank @Size(max=180) String workSlug, @NotBlank @Size(max=40) String format,
        @NotBlank @Size(min=20,max=5000) String proposal) {}
    public record FavoriteInput(@NotBlank @Size(max=180) String workSlug, boolean favorite) {}

    private static final String COLUMNS = "id,title,genre,format,episode_count AS episodeCount,synopsis,status,review_note AS reviewNote,lock_version AS version,created_at AS createdAt,updated_at AS updatedAt,submitted_at AS submittedAt";

    public Map<String, Object> workspace(CreatorAccess.Viewer viewer) {
        var profiles = jdbc.queryForList("SELECT display_name AS displayName,bio,specialty FROM cms_creator_profile WHERE owner_key=?", viewer.ownerKey());
        Object profile = profiles.isEmpty() ? Map.of("displayName", viewer.name(), "bio", "", "specialty", "") : profiles.get(0);
        return Map.of("viewer", Map.of("name", viewer.name(), "admin", viewer.admin()), "profile", profile,
                "scripts", jdbc.queryForList("SELECT " + COLUMNS + " FROM cms_creator_script WHERE owner_key=?"+viewer.typeFilter("")+" ORDER BY updated_at DESC", viewer.ownerKey()),
                "interests", jdbc.queryForList("SELECT id,work_slug AS workSlug,work_title AS workTitle,format,proposal,status,review_note AS reviewNote,created_at AS createdAt FROM cms_creator_ip_interest WHERE owner_key=?"+viewer.typeFilter("")+" ORDER BY created_at DESC", viewer.ownerKey()),
                "favorites", jdbc.queryForList("SELECT work_slug FROM cms_creator_favorite WHERE owner_key=?", String.class, viewer.ownerKey()));
    }

    public Map<String, Object> detail(CreatorAccess.Viewer viewer, String id) {
        var rows = jdbc.queryForList("SELECT " + COLUMNS + ",body FROM cms_creator_script WHERE id=? AND owner_key=?"+viewer.typeFilter(""), id, viewer.ownerKey());
        if (rows.isEmpty()) throw ApiException.notFound("剧本不存在");
        return rows.get(0);
    }

    @Transactional
    public Map<String, Object> create(CreatorAccess.Viewer viewer, ScriptInput input) {
        if(viewer.workType()!=null)viewer.workType().requireFormat(input.format());
        var id = Ids.next();
        jdbc.update("INSERT INTO cms_creator_script(id,owner_key,title,genre,format,episode_count,synopsis,body) VALUES (?,?,?,?,?,?,?,?)",
                id, viewer.ownerKey(), input.title().trim(), input.genre(), input.format(), input.episodeCount(), input.synopsis(), input.body());
        if(viewer.workType()!=null)jdbc.update("UPDATE cms_creator_script SET work_type=? WHERE id=? AND owner_key=?",viewer.workType().name(),id,viewer.ownerKey());
        return detail(viewer, id);
    }

    public Map<String, Object> update(CreatorAccess.Viewer viewer, String id, ScriptInput input) {
        detail(viewer,id);if(viewer.workType()!=null)viewer.workType().requireFormat(input.format());
        int changed = jdbc.update("""
                UPDATE cms_creator_script SET title=?,genre=?,format=?,episode_count=?,synopsis=?,body=?,lock_version=lock_version+1
                WHERE id=? AND owner_key=? AND lock_version=? AND status IN ('DRAFT','CHANGES_REQUESTED')
                """, input.title().trim(), input.genre(), input.format(), input.episodeCount(), input.synopsis(), input.body(), id, viewer.ownerKey(), input.version());
        if (changed != 1) throw ApiException.conflict("剧本已更新或已投稿，请刷新后重试");
        return detail(viewer, id);
    }

    @Transactional
    public Map<String, Object> submit(CreatorAccess.Viewer viewer, String id, int version) {
        var script = detail(viewer, id);
        validateSubmission(script.get("synopsis").toString(), script.get("body").toString());
        int changed = jdbc.update("""
                UPDATE cms_creator_script SET status='SUBMITTED',submitted_at=CURRENT_TIMESTAMP,review_note='',reviewed_at=NULL,reviewer=NULL,lock_version=lock_version+1
                WHERE id=? AND owner_key=? AND lock_version=? AND status IN ('DRAFT','CHANGES_REQUESTED')
                """, id, viewer.ownerKey(), version);
        if (changed != 1) throw ApiException.conflict("当前状态无法投稿，请刷新后重试");
        return detail(viewer, id);
    }

    static void validateSubmission(String synopsis, String body) {
        if (synopsis.trim().length() < 20) throw ApiException.invalid("投稿需要至少 20 字的故事梗概");
        if (body.trim().length() < 100) throw ApiException.invalid("投稿需要至少 100 字的剧本正文");
    }

    public Map<String, Object> withdraw(CreatorAccess.Viewer viewer, String id, int version) {
        detail(viewer,id);
        int changed = jdbc.update("UPDATE cms_creator_script SET status='DRAFT',submitted_at=NULL,lock_version=lock_version+1 WHERE id=? AND owner_key=? AND lock_version=? AND status='SUBMITTED'", id, viewer.ownerKey(), version);
        if (changed != 1) throw ApiException.conflict("仅待审核剧本可以撤回，请刷新后重试");
        return detail(viewer, id);
    }

    public ProfileInput profile(CreatorAccess.Viewer viewer, ProfileInput input) {
        jdbc.update("INSERT INTO cms_creator_profile(owner_key,display_name,bio,specialty) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),bio=VALUES(bio),specialty=VALUES(specialty)",
                viewer.ownerKey(), input.displayName().trim(), input.bio(), input.specialty());
        return input;
    }

    public List<Map<String,Object>> reviews() {
        return jdbc.queryForList("SELECT " + COLUMNS + ",body,owner_key AS ownerKey FROM cms_creator_script WHERE status IN ('SUBMITTED','APPROVED','CHANGES_REQUESTED') ORDER BY submitted_at DESC LIMIT 200");
    }

    public Map<String,Object> review(CreatorAccess.Viewer viewer, String id, ReviewInput input) {
        if (!List.of("APPROVED", "CHANGES_REQUESTED").contains(input.decision())) throw ApiException.invalid("审核状态不正确");
        if (input.decision().equals("CHANGES_REQUESTED") && input.note().isBlank()) throw ApiException.invalid("请填写修改建议");
        int changed = jdbc.update("UPDATE cms_creator_script SET status=?,review_note=?,reviewer=?,reviewed_at=CURRENT_TIMESTAMP,lock_version=lock_version+1 WHERE id=? AND lock_version=? AND status='SUBMITTED'",
                input.decision(), input.note(), viewer.ownerKey(), id, input.version());
        if (changed != 1) throw ApiException.conflict("投稿已被处理，请刷新审核列表");
        return Map.of("ok", true);
    }

    public Object interest(CreatorAccess.Viewer viewer, InterestInput input) {
        String title = workTitle(input.workSlug());
        if (input.proposal().trim().length() < 20) throw ApiException.invalid("请填写至少 20 字的合作设想");
        if(viewer.workType()!=null)viewer.workType().requireFormat(input.format());
        var id = Ids.next();
        try {
            jdbc.update("INSERT INTO cms_creator_ip_interest(id,owner_key,work_slug,work_title,format,proposal"+(viewer.workType()!=null?",work_type":"")+") VALUES (?,?,?,?,?,?"+(viewer.workType()!=null?",'"+viewer.workType().name()+"'":"")+")", id, viewer.ownerKey(), input.workSlug(), title, input.format(), input.proposal());
        } catch (org.springframework.dao.DuplicateKeyException exception) { throw ApiException.conflict("你已申请过该作品，请在申请管理中查看进度"); }
        return Map.of("id", id, "status", "PENDING");
    }

    public Object favorite(CreatorAccess.Viewer viewer, FavoriteInput input) {
        if (input.favorite()) {
            workTitle(input.workSlug());
            jdbc.update("INSERT IGNORE INTO cms_creator_favorite(owner_key,work_slug) VALUES (?,?)", viewer.ownerKey(), input.workSlug());
        } else jdbc.update("DELETE FROM cms_creator_favorite WHERE owner_key=? AND work_slug=?", viewer.ownerKey(), input.workSlug());
        return Map.of("ok", true);
    }

    private String workTitle(String slug) {
        return delivery.contentItem("mydream", "work", slug, null).title();
    }

    public Object interestReviews() {
        return jdbc.queryForList("SELECT id,work_title AS workTitle,work_slug AS workSlug,format,proposal,status,review_note AS reviewNote,created_at AS createdAt,owner_key AS ownerKey FROM cms_creator_ip_interest ORDER BY created_at DESC LIMIT 200");
    }

    public Object reviewInterest(String id, ReviewInput input) {
        if (!List.of("CONTACTING", "DECLINED").contains(input.decision()) || input.note().isBlank()) throw ApiException.invalid("请选择处理结果并填写反馈");
        if (jdbc.update("UPDATE cms_creator_ip_interest SET status=?,review_note=? WHERE id=? AND status='PENDING'", input.decision(), input.note(), id) != 1) throw ApiException.conflict("申请已被处理，请刷新列表");
        return Map.of("ok", true);
    }
}
