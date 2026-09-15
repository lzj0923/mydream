package com.mydream.cms.release;

import tools.jackson.databind.ObjectMapper;
import com.mydream.cms.audit.AuditLog;
import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import com.mydream.cms.studio.StudioFacade;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReleaseService {
    private final JdbcTemplate jdbc;
    private final StudioFacade studio;
    private final AuditLog audit;
    private final ObjectMapper mapper;

    public ReleaseService(JdbcTemplate jdbc, StudioFacade studio, AuditLog audit, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.studio = studio;
        this.audit = audit;
        this.mapper = mapper;
    }

    public List<ReleaseView> list(String sitePublicId) {
        return jdbc.query("""
                SELECT r.public_id,r.release_no,r.status,r.change_note,r.published_at,
                       (s.active_release_id=r.id) active
                FROM cms_site_release r JOIN cms_site s ON s.id=r.site_id
                WHERE s.public_id=? ORDER BY r.release_no DESC
                """, (rs, row) -> new ReleaseView(rs.getString("public_id"), rs.getInt("release_no"),
                rs.getString("status"), rs.getString("change_note"), rs.getTimestamp("published_at").toInstant(),
                rs.getBoolean("active")), sitePublicId);
    }

    @Transactional
    public ReleaseView publish(String sitePublicId, PublishRequest request, Authentication auth) {
        var siteId = studio.siteDbId(sitePublicId);
        var configId = latestId("SELECT id FROM cms_site_config_version WHERE site_id=? ORDER BY version_no DESC LIMIT 1", siteId, "站点配置不存在");
        var themeId = latestId("""
                SELECT tv.id FROM cms_theme_version tv JOIN cms_theme t ON t.id=tv.theme_id
                WHERE t.site_id=? ORDER BY tv.version_no DESC LIMIT 1
                """, siteId, "主题不存在");
        var releaseNo = jdbc.queryForObject("SELECT COALESCE(MAX(release_no),0)+1 FROM cms_site_release WHERE site_id=?", Integer.class, siteId);
        var releaseId = Ids.next();
        var actorId = studio.actorId(auth);
        jdbc.update("""
                INSERT INTO cms_site_release(public_id,site_id,release_no,site_config_version_id,theme_version_id,status,change_note,published_by)
                VALUES (?,?,?,?,?,'PUBLISHED',?,?)
                """, releaseId, siteId, releaseNo, configId, themeId, request == null ? null : request.changeNote(), actorId);
        var dbId = latestId("SELECT id FROM cms_site_release WHERE public_id=?", releaseId, "发布记录创建失败");
        jdbc.update("""
                INSERT INTO cms_release_page(release_id,page_id,page_version_id)
                SELECT ?,p.id,v.id FROM cms_page p JOIN cms_page_version v ON v.page_id=p.id
                WHERE p.site_id=? AND p.archived=FALSE
                  AND v.version_no=(SELECT MAX(x.version_no) FROM cms_page_version x WHERE x.page_id=p.id)
                """, dbId, siteId);
        jdbc.update("""
                INSERT INTO cms_release_content(release_id,content_entry_id,content_version_id)
                SELECT ?,e.id,v.id FROM cms_content_entry e JOIN cms_content_version v ON v.content_entry_id=e.id
                WHERE e.site_id=? AND e.archived=FALSE
                  AND v.version_no=(SELECT MAX(x.version_no) FROM cms_content_version x WHERE x.content_entry_id=e.id)
                """, dbId, siteId);
        jdbc.update("""
                INSERT INTO cms_release_navigation(release_id,navigation_id,navigation_version_id)
                SELECT ?,n.id,v.id FROM cms_navigation n JOIN cms_navigation_version v ON v.navigation_id=n.id
                WHERE n.site_id=? AND v.version_no=(SELECT MAX(x.version_no) FROM cms_navigation_version x WHERE x.navigation_id=n.id)
                """, dbId, siteId);
        jdbc.update("UPDATE cms_page_version v JOIN cms_release_page rp ON rp.page_version_id=v.id SET v.status='PUBLISHED' WHERE rp.release_id=?", dbId);
        jdbc.update("UPDATE cms_content_version v JOIN cms_release_content rc ON rc.content_version_id=v.id SET v.status='PUBLISHED' WHERE rc.release_id=?", dbId);
        jdbc.update("UPDATE cms_navigation_version v JOIN cms_release_navigation rn ON rn.navigation_version_id=v.id SET v.status='PUBLISHED' WHERE rn.release_id=?", dbId);
        jdbc.update("UPDATE cms_site_config_version SET status='PUBLISHED' WHERE id=?", configId);
        jdbc.update("UPDATE cms_theme_version SET status='PUBLISHED' WHERE id=?", themeId);
        jdbc.update("UPDATE cms_site SET active_release_id=? WHERE id=?", dbId, siteId);
        audit.record(siteId, actorId, "release.publish", "release", releaseId,
                mapper.valueToTree(java.util.Map.of("releaseNo", releaseNo)));
        return find(releaseId);
    }

    @Transactional
    public ReleaseView activate(String releaseId, Authentication auth) {
        var rows = jdbc.query("SELECT id,site_id FROM cms_site_release WHERE public_id=?",
                (rs, row) -> new ReleaseOwner(rs.getLong("id"), rs.getLong("site_id")), releaseId);
        if (rows.isEmpty()) throw ApiException.notFound("发布版本不存在");
        var row = rows.get(0);
        jdbc.update("UPDATE cms_site SET active_release_id=? WHERE id=?", row.id(), row.siteId());
        audit.record(row.siteId(), studio.actorId(auth), "release.activate", "release", releaseId, null);
        return find(releaseId);
    }

    private ReleaseView find(String publicId) {
        var rows = jdbc.query("""
                SELECT r.public_id,r.release_no,r.status,r.change_note,r.published_at,(s.active_release_id=r.id) active
                FROM cms_site_release r JOIN cms_site s ON s.id=r.site_id WHERE r.public_id=?
                """, (rs, row) -> new ReleaseView(rs.getString("public_id"), rs.getInt("release_no"),
                rs.getString("status"), rs.getString("change_note"), rs.getTimestamp("published_at").toInstant(),
                rs.getBoolean("active")), publicId);
        if (rows.isEmpty()) throw ApiException.notFound("发布版本不存在");
        return rows.get(0);
    }

    private long latestId(String sql, Object value, String missing) {
        var ids = jdbc.query(sql, (rs, row) -> rs.getLong(1), value);
        if (ids.isEmpty()) throw ApiException.notFound(missing);
        return ids.get(0);
    }

    public record PublishRequest(@Size(max = 500) String changeNote) {}
    public record ReleaseView(String id, int releaseNo, String status, String changeNote, Instant publishedAt, boolean active) {}
    private record ReleaseOwner(long id, long siteId) {}
}
