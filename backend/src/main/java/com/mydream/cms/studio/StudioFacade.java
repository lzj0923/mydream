package com.mydream.cms.studio;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.NullNode;
import com.mydream.cms.audit.AuditLog;
import com.mydream.cms.delivery.AppContentWriter;
import com.mydream.cms.shared.ApiException;
import com.mydream.cms.shared.Ids;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudioFacade {
    private static final Set<String> FORBIDDEN_JSON_KEYS = Set.of(
            "html", "rawHtml", "css", "script", "javascript", "dangerouslySetInnerHTML"
    );

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final BlockRegistry blockRegistry;
    private final AuditLog audit;
    private final ObjectProvider<AppContentWriter> appContentWriterProvider;

    public StudioFacade(JdbcTemplate jdbc, ObjectMapper mapper, BlockRegistry blockRegistry, AuditLog audit,
                        ObjectProvider<AppContentWriter> appContentWriterProvider) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.blockRegistry = blockRegistry;
        this.audit = audit;
        this.appContentWriterProvider = appContentWriterProvider;
    }

    public List<StudioModels.PageSummary> listPages(String siteId) {
        return jdbc.query("""
                SELECT p.public_id,p.path,p.page_key,p.locale,
                       COALESCE((SELECT pv.title FROM cms_page_version pv WHERE pv.page_id=p.id ORDER BY pv.version_no DESC LIMIT 1),p.page_key) title,
                       p.archived,p.lock_version
                FROM cms_page p JOIN cms_site s ON s.id=p.site_id
                WHERE s.public_id=? ORDER BY p.path
                """, (rs, row) -> new StudioModels.PageSummary(
                rs.getString("public_id"), rs.getString("path"), rs.getString("page_key"),
                rs.getString("locale"), rs.getString("title"), rs.getBoolean("archived"),
                rs.getInt("lock_version")), siteId);
    }

    public StudioModels.PageDraft page(String pageId) {
        var rows = jdbc.query("""
                SELECT p.id,p.public_id,p.path,p.page_key,p.locale,p.lock_version,
                       pv.id version_db_id,pv.public_id version_id,pv.version_no,pv.status,pv.title,pv.seo_json,pv.created_at
                FROM cms_page p JOIN cms_page_version pv ON pv.page_id=p.id
                WHERE p.public_id=? AND pv.version_no=(SELECT MAX(x.version_no) FROM cms_page_version x WHERE x.page_id=p.id)
                """, (rs, row) -> pageRow(rs), pageId);
        if (rows.isEmpty()) throw ApiException.notFound("页面不存在");
        var page = rows.get(0);
        var blocks = jdbc.query("""
                SELECT b.public_id,d.type_key,d.schema_version,b.zone_key,b.sort_order,b.visible,b.props_json,b.style_json
                FROM cms_page_block b JOIN cms_block_definition d ON d.id=b.block_definition_id
                WHERE b.page_version_id=? ORDER BY b.zone_key,b.sort_order,b.id
                """, (rs, row) -> new StudioModels.BlockDraft(
                rs.getString("public_id"), rs.getString("type_key"), rs.getInt("schema_version"),
                rs.getString("zone_key"), rs.getInt("sort_order"), rs.getBoolean("visible"),
                json(rs.getString("props_json")), json(rs.getString("style_json"))), page.versionDbId());
        return new StudioModels.PageDraft(page.id(), page.path(), page.pageKey(), page.locale(), page.lockVersion(),
                page.version(), page.versionId(), page.status(), page.title(), page.seo(), blocks, page.createdAt());
    }

    @Transactional
    public StudioModels.PageDraft createPage(String sitePublicId, StudioModels.CreatePageRequest request, Authentication auth) {
        blockRegistry.validate(request.blocks());
        rejectForbiddenKeys(request.seo(), "seo");
        var siteId = siteDbId(sitePublicId);
        var actorId = actorId(auth);
        var pageId = Ids.next();
        jdbc.update("INSERT INTO cms_page(public_id,site_id,locale,path,page_key) VALUES (?,?,?,?,?)",
                pageId, siteId, request.locale(), normalizePath(request.path()), request.pageKey());
        var pageDbId = requiredLong("SELECT id FROM cms_page WHERE public_id=?", pageId, "新页面创建失败");
        insertPageVersion(pageDbId, 1, request.title(), request.seo(), request.blocks(), request.changeNote(), actorId);
        audit.record(siteId, actorId, "page.create", "page", pageId, mapper.valueToTree(request));
        return page(pageId);
    }

    @Transactional
    public StudioModels.PageDraft savePage(String pageId, StudioModels.SavePageRequest request, Authentication auth) {
        blockRegistry.validate(request.blocks());
        rejectForbiddenKeys(request.seo(), "seo");
        var owner = pageOwner(pageId);
        requireVersion(owner.lockVersion(), request.lockVersion());
        var nextVersion = jdbc.queryForObject("SELECT COALESCE(MAX(version_no),0)+1 FROM cms_page_version WHERE page_id=?", Integer.class, owner.id());
        insertPageVersion(owner.id(), nextVersion, request.title(), request.seo(), request.blocks(), request.changeNote(), actorId(auth));
        var updated = jdbc.update("UPDATE cms_page SET lock_version=lock_version+1 WHERE id=? AND lock_version=?", owner.id(), request.lockVersion());
        if (updated != 1) throw ApiException.conflict("页面已被其他人修改，请刷新后重试");
        audit.record(owner.siteId(), actorId(auth), "page.save", "page", pageId, mapper.valueToTree(request));
        return page(pageId);
    }

    public List<StudioModels.ContentSummary> listContent(String siteId, String type) {
        var sql = """
                SELECT e.public_id,e.content_type,e.slug,e.locale,v.title,v.featured,e.archived,e.lock_version,
                       JSON_UNQUOTE(JSON_EXTRACT(v.data_json,'$.episodeNumber')) episode_number,
                       JSON_UNQUOTE(JSON_EXTRACT(v.data_json,'$.publishedAt')) published_at,
                       (SELECT target.public_id FROM cms_content_relation relation_row
                        JOIN cms_content_entry target ON target.id=relation_row.target_entry_id
                        WHERE relation_row.source_version_id=v.id AND relation_row.relation_type='episode-of'
                        ORDER BY relation_row.sort_order LIMIT 1) related_work_id,
                       (SELECT target_version.title FROM cms_content_relation relation_row
                        JOIN cms_content_version target_version ON target_version.content_entry_id=relation_row.target_entry_id
                          AND target_version.version_no=(SELECT MAX(latest.version_no) FROM cms_content_version latest WHERE latest.content_entry_id=relation_row.target_entry_id)
                        WHERE relation_row.source_version_id=v.id AND relation_row.relation_type='episode-of'
                        ORDER BY relation_row.sort_order LIMIT 1) related_work_title
                FROM cms_content_entry e JOIN cms_site s ON s.id=e.site_id
                JOIN cms_content_version v ON v.content_entry_id=e.id
                  AND v.version_no=(SELECT MAX(x.version_no) FROM cms_content_version x WHERE x.content_entry_id=e.id)
                WHERE s.public_id=? AND (? IS NULL OR e.content_type=?)
                ORDER BY v.featured DESC,v.sort_weight DESC,v.created_at DESC
                """;
        return jdbc.query(sql, (rs, row) -> new StudioModels.ContentSummary(
                rs.getString("public_id"), rs.getString("content_type"), rs.getString("slug"),
                rs.getString("locale"), rs.getString("title"), rs.getBoolean("featured"),
                rs.getBoolean("archived"), rs.getInt("lock_version"), rs.getString("related_work_id"),
                rs.getString("related_work_title"), rs.getString("episode_number"), rs.getString("published_at")), siteId, type, type);
    }

    public StudioModels.ContentDraft content(String contentId) {
        var rows = jdbc.query("""
                SELECT e.id,e.public_id,e.content_type,e.slug,e.locale,e.lock_version,v.id version_db_id,
                       v.public_id version_id,v.version_no,v.status,v.title,v.summary,m.public_id cover_media_id,
                       v.data_json,v.featured,v.sort_weight,v.created_at
                FROM cms_content_entry e JOIN cms_content_version v ON v.content_entry_id=e.id
                LEFT JOIN cms_media_asset m ON m.id=v.cover_media_id
                WHERE e.public_id=? AND v.version_no=(SELECT MAX(x.version_no) FROM cms_content_version x WHERE x.content_entry_id=e.id)
                """, (rs, row) -> new StudioModels.ContentDraft(
                rs.getString("public_id"), rs.getString("content_type"), rs.getString("slug"),
                rs.getString("locale"), rs.getInt("lock_version"), rs.getInt("version_no"),
                rs.getString("version_id"), rs.getString("status"), rs.getString("title"),
                rs.getString("summary"), rs.getString("cover_media_id"), json(rs.getString("data_json")),
                rs.getBoolean("featured"), rs.getInt("sort_weight"), contentRelations(rs.getLong("version_db_id")),
                rs.getTimestamp("created_at").toInstant()), contentId);
        if (rows.isEmpty()) throw ApiException.notFound("内容不存在");
        return rows.get(0);
    }

    @Transactional
    public StudioModels.ContentDraft createContent(String sitePublicId, StudioModels.CreateContentRequest request, Authentication auth) {
        rejectForbiddenKeys(request.data(), "data");
        var siteId = siteDbId(sitePublicId);
        var actorId = actorId(auth);
        var publicId = Ids.next();
        try {
            jdbc.update("INSERT INTO cms_content_entry(public_id,site_id,locale,content_type,slug) VALUES (?,?,?,?,?)",
                    publicId, siteId, request.locale(), request.type(), request.slug());
        } catch (DuplicateKeyException exception) {
            throw ApiException.conflict("唯一标识“" + request.slug() + "”已存在，请更换后重试");
        }
        var dbId = requiredLong("SELECT id FROM cms_content_entry WHERE public_id=?", publicId, "新内容创建失败");
        var versionDbId = insertContentVersion(dbId, 1, request.title(), request.summary(), mediaId(siteId, request.coverMediaId()),
                request.data(), request.featured(), request.sortWeight(), request.changeNote(), actorId);
        insertContentRelations(versionDbId, siteId, request.relations());
        audit.record(siteId, actorId, "content.create", request.type(), publicId, mapper.valueToTree(request));
        var created = content(publicId);
        syncAppContent(created);
        return created;
    }

    @Transactional
    public StudioModels.ContentDraft saveContent(String contentId, StudioModels.SaveContentRequest request, Authentication auth) {
        rejectForbiddenKeys(request.data(), "data");
        var owner = contentOwner(contentId);
        requireVersion(owner.lockVersion(), request.lockVersion());
        var next = jdbc.queryForObject("SELECT COALESCE(MAX(version_no),0)+1 FROM cms_content_version WHERE content_entry_id=?", Integer.class, owner.id());
        var versionDbId = insertContentVersion(owner.id(), next, request.title(), request.summary(), mediaId(owner.siteId(), request.coverMediaId()),
                request.data(), request.featured(), request.sortWeight(), request.changeNote(), actorId(auth));
        insertContentRelations(versionDbId, owner.siteId(), request.relations());
        var updated = jdbc.update("UPDATE cms_content_entry SET lock_version=lock_version+1 WHERE id=? AND lock_version=?", owner.id(), request.lockVersion());
        if (updated != 1) throw ApiException.conflict("内容已被其他人修改，请刷新后重试");
        audit.record(owner.siteId(), actorId(auth), "content.save", "content", contentId, mapper.valueToTree(request));
        var saved = content(contentId);
        syncAppContent(saved);
        return saved;
    }

    @Transactional
    public void archiveContent(String contentId, int lockVersion, Authentication auth) {
        var owner = contentOwner(contentId);
        requireVersion(owner.lockVersion(), lockVersion);
        var draft = content(contentId);
        var contentType = jdbc.queryForObject("SELECT content_type FROM cms_content_entry WHERE id=?", String.class, owner.id());
        if ("work".equals(contentType)) {
            var relatedEpisodes = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM cms_content_relation relation_row
                    JOIN cms_content_version episode_version ON episode_version.id=relation_row.source_version_id
                    JOIN cms_content_entry episode ON episode.id=episode_version.content_entry_id
                    WHERE relation_row.target_entry_id=? AND relation_row.relation_type='episode-of'
                      AND episode.archived=FALSE
                      AND episode_version.version_no=(SELECT MAX(latest.version_no) FROM cms_content_version latest WHERE latest.content_entry_id=episode.id)
                    """, Integer.class, owner.id());
            if (relatedEpisodes != null && relatedEpisodes > 0) {
                throw ApiException.conflict("该作品仍有关联剧集，请先删除关联剧集");
            }
        }
        var updated = jdbc.update("""
                UPDATE cms_content_entry
                SET archived=TRUE,
                    slug=CASE
                        WHEN content_type='episode'
                        THEN CONCAT(LEFT(slug,162),'-archived-',LEFT(REPLACE(public_id,'-',''),8))
                        ELSE slug
                    END,
                    lock_version=lock_version+1
                WHERE id=? AND lock_version=? AND archived=FALSE
                """, owner.id(), lockVersion);
        if (updated != 1) throw ApiException.conflict("作品已删除或已被其他人修改，请刷新后重试");
        audit.record(owner.siteId(), actorId(auth), "content.archive", "content", contentId, null);
        var writer = appContentWriterProvider.getIfAvailable();
        if (writer != null && writer.supports(draft.type())) writer.archive(draft);
    }

    private void syncAppContent(StudioModels.ContentDraft content) {
        var writer = appContentWriterProvider.getIfAvailable();
        if (writer != null && writer.supports(content.type())) writer.upsert(content);
    }

    public StudioModels.JsonDraft siteConfig(String sitePublicId) {
        var rows = jdbc.query("""
                SELECT s.public_id,s.site_key,s.name,s.lock_version,v.version_no,v.config_json
                FROM cms_site s JOIN cms_site_config_version v ON v.site_id=s.id
                WHERE s.public_id=? AND v.version_no=(SELECT MAX(x.version_no) FROM cms_site_config_version x WHERE x.site_id=s.id)
                """, (rs, row) -> new StudioModels.JsonDraft(rs.getString("public_id"), rs.getString("site_key"),
                rs.getString("name"), rs.getInt("lock_version"), rs.getInt("version_no"), json(rs.getString("config_json"))), sitePublicId);
        if (rows.isEmpty()) throw ApiException.notFound("站点配置不存在");
        return rows.get(0);
    }

    @Transactional
    public StudioModels.JsonDraft saveSiteConfig(String sitePublicId, StudioModels.SaveJsonDraftRequest request, Authentication auth) {
        rejectForbiddenKeys(request.value(), "config");
        var siteId = siteDbId(sitePublicId);
        var lock = jdbc.queryForObject("SELECT lock_version FROM cms_site WHERE id=?", Integer.class, siteId);
        requireVersion(lock, request.lockVersion());
        var next = jdbc.queryForObject("SELECT COALESCE(MAX(version_no),0)+1 FROM cms_site_config_version WHERE site_id=?", Integer.class, siteId);
        jdbc.update("""
                INSERT INTO cms_site_config_version(public_id,site_id,version_no,config_json,change_note,created_by)
                VALUES (?,?,?,CAST(? AS JSON),?,?)
                """, Ids.next(), siteId, next, jsonString(request.value()), request.changeNote(), actorId(auth));
        optimisticUpdate("UPDATE cms_site SET lock_version=lock_version+1 WHERE id=? AND lock_version=?", siteId, lock);
        audit.record(siteId, actorId(auth), "site-config.save", "site", sitePublicId, request.value());
        return siteConfig(sitePublicId);
    }

    public StudioModels.JsonDraft theme(String themeId) {
        var rows = jdbc.query("""
                SELECT t.public_id,t.theme_key,t.name,t.lock_version,v.version_no,v.tokens_json
                FROM cms_theme t JOIN cms_theme_version v ON v.theme_id=t.id
                WHERE t.public_id=? AND v.version_no=(SELECT MAX(x.version_no) FROM cms_theme_version x WHERE x.theme_id=t.id)
                """, (rs, row) -> new StudioModels.JsonDraft(rs.getString("public_id"), rs.getString("theme_key"),
                rs.getString("name"), rs.getInt("lock_version"), rs.getInt("version_no"), json(rs.getString("tokens_json"))), themeId);
        if (rows.isEmpty()) throw ApiException.notFound("主题不存在");
        return rows.get(0);
    }

    @Transactional
    public StudioModels.JsonDraft saveTheme(String themeId, StudioModels.SaveJsonDraftRequest request, Authentication auth) {
        rejectForbiddenKeys(request.value(), "theme");
        var owner = themeOwner(themeId);
        requireVersion(owner.lockVersion(), request.lockVersion());
        var next = jdbc.queryForObject("SELECT COALESCE(MAX(version_no),0)+1 FROM cms_theme_version WHERE theme_id=?", Integer.class, owner.id());
        jdbc.update("""
                INSERT INTO cms_theme_version(public_id,theme_id,version_no,tokens_json,change_note,created_by)
                VALUES (?,?,?,CAST(? AS JSON),?,?)
                """, Ids.next(), owner.id(), next, jsonString(request.value()), request.changeNote(), actorId(auth));
        optimisticUpdate("UPDATE cms_theme SET lock_version=lock_version+1 WHERE id=? AND lock_version=?", owner.id(), owner.lockVersion());
        audit.record(owner.siteId(), actorId(auth), "theme.save", "theme", themeId, request.value());
        return theme(themeId);
    }

    public StudioModels.NavigationDraft navigation(String navigationId) {
        var headers = jdbc.query("""
                SELECT n.public_id,n.nav_key,n.name,n.lock_version,v.id version_db_id,v.version_no
                FROM cms_navigation n JOIN cms_navigation_version v ON v.navigation_id=n.id
                WHERE n.public_id=? AND v.version_no=(SELECT MAX(x.version_no) FROM cms_navigation_version x WHERE x.navigation_id=n.id)
                """, (rs, row) -> new NavRow(rs.getString("public_id"), rs.getString("nav_key"), rs.getString("name"),
                rs.getInt("lock_version"), rs.getLong("version_db_id"), rs.getInt("version_no")), navigationId);
        if (headers.isEmpty()) throw ApiException.notFound("导航不存在");
        var nav = headers.get(0);
        var items = jdbc.query("""
                SELECT i.public_id,p.public_id parent_public_id,i.label,i.link_type,i.link_value,i.target,i.sort_order,i.visible
                FROM cms_navigation_item i LEFT JOIN cms_navigation_item p ON p.id=i.parent_id
                WHERE i.navigation_version_id=? ORDER BY i.sort_order,i.id
                """, (rs, row) -> new StudioModels.NavigationItemDraft(rs.getString("public_id"),
                rs.getString("parent_public_id"), rs.getString("label"), rs.getString("link_type"),
                rs.getString("link_value"), rs.getString("target"), rs.getInt("sort_order"), rs.getBoolean("visible")), nav.versionDbId());
        return new StudioModels.NavigationDraft(nav.id(), nav.key(), nav.name(), nav.lockVersion(), nav.version(), items);
    }

    @Transactional
    public StudioModels.NavigationDraft saveNavigation(String navigationId, StudioModels.SaveNavigationRequest request, Authentication auth) {
        var owner = navigationOwner(navigationId);
        requireVersion(owner.lockVersion(), request.lockVersion());
        validateNavigation(request.items());
        var next = jdbc.queryForObject("SELECT COALESCE(MAX(version_no),0)+1 FROM cms_navigation_version WHERE navigation_id=?", Integer.class, owner.id());
        var versionId = Ids.next();
        jdbc.update("""
                INSERT INTO cms_navigation_version(public_id,navigation_id,version_no,change_note,created_by)
                VALUES (?,?,?,?,?)
                """, versionId, owner.id(), next, request.changeNote(), actorId(auth));
        var versionDbId = requiredLong("SELECT id FROM cms_navigation_version WHERE public_id=?", versionId, "导航版本创建失败");
        var keys = new HashMap<String, Long>();
        var normalized = new ArrayList<StudioModels.NavigationItemDraft>();
        for (var item : safeList(request.items())) {
            var itemId = freshVersionChildId(item.id());
            jdbc.update("""
                    INSERT INTO cms_navigation_item(public_id,navigation_version_id,label,link_type,link_value,target,sort_order,visible)
                    VALUES (?,?,?,?,?,?,?,?)
                    """, itemId, versionDbId, item.label(), item.linkType().toUpperCase(Locale.ROOT), item.linkValue(),
                    item.target() == null ? "_self" : item.target(), item.order(), item.visible());
            var itemDbId = requiredLong("SELECT id FROM cms_navigation_item WHERE public_id=?", itemId, "导航项创建失败");
            keys.put(itemId, itemDbId);
            if (item.id() != null && !item.id().isBlank()) keys.put(item.id(), itemDbId);
            normalized.add(new StudioModels.NavigationItemDraft(itemId, item.parentId(), item.label(), item.linkType(),
                    item.linkValue(), item.target(), item.order(), item.visible()));
        }
        for (var item : normalized) {
            if (item.parentId() == null || item.parentId().isBlank()) continue;
            var parent = keys.get(item.parentId());
            if (parent == null) throw ApiException.invalid("导航父级必须属于同一版本: " + item.parentId());
            jdbc.update("UPDATE cms_navigation_item SET parent_id=? WHERE public_id=?", parent, item.id());
        }
        optimisticUpdate("UPDATE cms_navigation SET lock_version=lock_version+1 WHERE id=? AND lock_version=?", owner.id(), owner.lockVersion());
        audit.record(owner.siteId(), actorId(auth), "navigation.save", "navigation", navigationId, mapper.valueToTree(request));
        return navigation(navigationId);
    }

    public long siteDbId(String publicId) {
        return requiredLong("SELECT id FROM cms_site WHERE public_id=?", publicId, "站点不存在");
    }

    public Long actorId(Authentication auth) {
        if (auth == null) return null;
        var ids = jdbc.query("SELECT id FROM cms_admin_user WHERE email=?", (rs, row) -> rs.getLong(1), auth.getName());
        return ids.isEmpty() ? null : ids.get(0);
    }

    private void insertPageVersion(long pageDbId, int version, String title, JsonNode seo,
                                   List<StudioModels.BlockDraft> blocks, String note, Long actorId) {
        var versionId = Ids.next();
        jdbc.update("""
                INSERT INTO cms_page_version(public_id,page_id,version_no,title,seo_json,change_note,created_by)
                VALUES (?,?,?,?,CAST(? AS JSON),?,?)
                """, versionId, pageDbId, version, title, jsonString(seo), note, actorId);
        var versionDbId = requiredLong("SELECT id FROM cms_page_version WHERE public_id=?", versionId, "页面版本创建失败");
        for (var block : safeList(blocks)) {
            jdbc.update("""
                    INSERT INTO cms_page_block(public_id,page_version_id,block_definition_id,zone_key,sort_order,visible,props_json,style_json)
                    VALUES (?,?,?,?,?,?,CAST(? AS JSON),CAST(? AS JSON))
                    """, freshVersionChildId(block.id()), versionDbId,
                    blockRegistry.definitionId(block.type(), block.schemaVersion()),
                    block.zone() == null || block.zone().isBlank() ? "main" : block.zone(), block.order(), block.visible(),
                    jsonString(block.props()), jsonString(block.style()));
        }
    }

    static String freshVersionChildId(String previousId) {
        return Ids.next();
    }

    private long insertContentVersion(long contentDbId, int version, String title, String summary, Long coverMediaId,
                                      JsonNode data, boolean featured, int sortWeight, String note, Long actorId) {
        var publicId = Ids.next();
        jdbc.update("""
                INSERT INTO cms_content_version(public_id,content_entry_id,version_no,title,summary,cover_media_id,data_json,featured,sort_weight,change_note,created_by)
                VALUES (?,?,?,?,?,?,CAST(? AS JSON),?,?,?,?)
                """, publicId, contentDbId, version, title, summary, coverMediaId, jsonString(data), featured, sortWeight, note, actorId);
        return requiredLong("SELECT id FROM cms_content_version WHERE public_id=?", publicId, "内容版本创建失败");
    }

    private void insertContentRelations(long sourceVersionId, long siteId, List<StudioModels.ContentRelationDraft> relations) {
        for (var relation : safeList(relations)) {
            var targets = jdbc.query("SELECT id FROM cms_content_entry WHERE public_id=? AND site_id=? AND archived=FALSE",
                    (rs, row) -> rs.getLong(1), relation.targetContentId(), siteId);
            if (targets.isEmpty()) throw ApiException.invalid("关联内容不存在或已下架: " + relation.targetContentId());
            jdbc.update("INSERT INTO cms_content_relation(source_version_id,relation_type,target_entry_id,sort_order) VALUES (?,?,?,?)",
                    sourceVersionId, relation.type(), targets.get(0), relation.order());
        }
    }

    private List<StudioModels.ContentRelationDraft> contentRelations(long sourceVersionId) {
        return jdbc.query("""
                SELECT relation_row.relation_type,target.public_id,target_version.title,relation_row.sort_order
                FROM cms_content_relation relation_row
                JOIN cms_content_entry target ON target.id=relation_row.target_entry_id
                JOIN cms_content_version target_version ON target_version.content_entry_id=target.id
                  AND target_version.version_no=(SELECT MAX(latest.version_no) FROM cms_content_version latest WHERE latest.content_entry_id=target.id)
                WHERE relation_row.source_version_id=? ORDER BY relation_row.sort_order,relation_row.id
                """, (rs, row) -> new StudioModels.ContentRelationDraft(rs.getString("relation_type"),
                rs.getString("public_id"), rs.getString("title"), rs.getInt("sort_order")), sourceVersionId);
    }

    private Long mediaId(long siteId, String publicId) {
        if (publicId == null || publicId.isBlank()) return null;
        var ids = jdbc.query("SELECT id FROM cms_media_asset WHERE public_id=? AND site_id=? AND status='READY'",
                (rs, row) -> rs.getLong(1), publicId, siteId);
        if (ids.isEmpty()) throw ApiException.invalid("封面媒体不存在或尚未就绪");
        return ids.get(0);
    }

    private PageRow pageRow(ResultSet rs) throws SQLException {
        return new PageRow(rs.getLong("id"), rs.getString("public_id"), rs.getString("path"), rs.getString("page_key"),
                rs.getString("locale"), rs.getInt("lock_version"), rs.getLong("version_db_id"),
                rs.getString("version_id"), rs.getInt("version_no"), rs.getString("status"), rs.getString("title"),
                json(rs.getString("seo_json")), rs.getTimestamp("created_at").toInstant());
    }

    private Owner pageOwner(String publicId) {
        return owner("SELECT id,site_id,lock_version FROM cms_page WHERE public_id=?", publicId, "页面不存在");
    }

    private Owner contentOwner(String publicId) {
        return owner("SELECT id,site_id,lock_version FROM cms_content_entry WHERE public_id=?", publicId, "内容不存在");
    }

    private Owner themeOwner(String publicId) {
        return owner("SELECT id,site_id,lock_version FROM cms_theme WHERE public_id=?", publicId, "主题不存在");
    }

    private Owner navigationOwner(String publicId) {
        return owner("SELECT id,site_id,lock_version FROM cms_navigation WHERE public_id=?", publicId, "导航不存在");
    }

    private Owner owner(String sql, String publicId, String missing) {
        var rows = jdbc.query(sql, (rs, row) -> new Owner(rs.getLong("id"), rs.getLong("site_id"), rs.getInt("lock_version")), publicId);
        if (rows.isEmpty()) throw ApiException.notFound(missing);
        return rows.get(0);
    }

    private long requiredLong(String sql, String parameter, String missing) {
        var rows = jdbc.query(sql, (rs, row) -> rs.getLong(1), parameter);
        if (rows.isEmpty()) throw ApiException.notFound(missing);
        return rows.get(0);
    }

    private void optimisticUpdate(String sql, long id, int lockVersion) {
        if (jdbc.update(sql, id, lockVersion) != 1) throw ApiException.conflict("数据已被其他人修改，请刷新后重试");
    }

    private void requireVersion(Integer actual, int expected) {
        if (actual == null || actual != expected) throw ApiException.conflict("数据版本已变化，请刷新后重试");
    }

    private void validateNavigation(List<StudioModels.NavigationItemDraft> items) {
        if (items == null) return;
        if (items.size() > 100) throw ApiException.invalid("单个导航最多允许 100 项");
        var ids = new java.util.HashSet<String>();
        for (var item : items) {
            if (item.id() != null && !item.id().isBlank() && !ids.add(item.id())) throw ApiException.invalid("导航项 ID 重复");
            var type = item.linkType().toUpperCase(Locale.ROOT);
            if (!Set.of("INTERNAL", "EXTERNAL", "ANCHOR").contains(type)) throw ApiException.invalid("不支持的导航链接类型");
            var link = item.linkValue().trim().toLowerCase(Locale.ROOT);
            if (link.startsWith("javascript:") || link.startsWith("data:") || link.contains("\\")) {
                throw ApiException.invalid("导航链接不安全");
            }
            if ("INTERNAL".equals(type) && !link.startsWith("/")) throw ApiException.invalid("站内链接必须以 / 开头");
            if (item.target() != null && !Set.of("_self", "_blank").contains(item.target())) throw ApiException.invalid("不支持的打开方式");
        }
    }

    private void rejectForbiddenKeys(JsonNode node, String path) {
        if (node == null || node.isNull()) return;
        if (node.isObject()) {
            node.properties().forEach(entry -> {
                if (FORBIDDEN_JSON_KEYS.contains(entry.getKey())) throw ApiException.invalid("不允许的字段: " + path + "." + entry.getKey());
                rejectForbiddenKeys(entry.getValue(), path + "." + entry.getKey());
            });
        } else if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) rejectForbiddenKeys(node.get(i), path + "[" + i + "]");
        }
    }

    private String normalizePath(String value) {
        if (value == null || value.isBlank()) return "/";
        var path = value.trim().replaceAll("/{2,}", "/");
        return path.length() > 1 && path.endsWith("/") ? path.substring(0, path.length() - 1) : path;
    }

    private JsonNode json(String value) {
        if (value == null) return NullNode.getInstance();
        try { return mapper.readTree(value); }
        catch (JacksonException exception) { throw new IllegalStateException("数据库 JSON 无法解析", exception); }
    }

    private String jsonString(JsonNode value) {
        try { return mapper.writeValueAsString(value == null ? NullNode.getInstance() : value); }
        catch (JacksonException exception) { throw new IllegalArgumentException("JSON 无法序列化", exception); }
    }

    private static <T> List<T> safeList(List<T> values) {
        return values == null ? List.of() : values;
    }

    private record Owner(long id, long siteId, int lockVersion) {}
    private record PageRow(long dbId, String id, String path, String pageKey, String locale, int lockVersion,
                           long versionDbId, String versionId, int version, String status, String title,
                           JsonNode seo, Instant createdAt) {}
    private record NavRow(String id, String key, String name, int lockVersion, long versionDbId, int version) {}
}
